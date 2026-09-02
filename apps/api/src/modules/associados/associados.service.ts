import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { NivelPlano, Prisma, Role, StatusAssociado, StatusComissao, StatusVenda } from '@prisma/client';
// bcrypt nativo (Rust): roda no threadpool do libuv em vez de bloquear o event loop
import { hash as hashSenha, verify as conferirSenha } from '@node-rs/bcrypt';
import { randomBytes } from 'node:crypto';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buscaTextual, num, ordenar } from '../../common/utils/query.util';
import {
  AlterarPlanoDto,
  AtualizarAssociadoDto,
  CriarAssociadoDto,
  FiltrarAssociadosDto,
  VincularRedeSocialDto,
} from './dto/associado.dto';

const CAMPOS_ORDENAVEIS = ['nome', 'seguidores', 'engajamento', 'pontuacao', 'membroDesde', 'criadoEm'];

const RESUMO = {
  id: true,
  nome: true,
  handle: true,
  email: true,
  nicho: true,
  seguidores: true,
  engajamento: true,
  status: true,
  pontuacao: true,
  membroDesde: true,
  plano: { select: { nivel: true, nome: true, preco: true } },
  loja: { select: { id: true, nome: true, slug: true, ativa: true } },
  redesSociais: { select: { rede: true, handle: true, seguidores: true, conectada: true } },
} satisfies Prisma.AssociadoSelect;

@Injectable()
export class AssociadosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(f: FiltrarAssociadosDto): Promise<PaginatedResult<unknown>> {
    const where: Prisma.AssociadoWhereInput = {
      ...(f.status ? { status: f.status } : {}),
      ...(f.plano ? { plano: { nivel: f.plano } } : {}),
      ...(f.nicho ? { nicho: { equals: f.nicho, mode: 'insensitive' } } : {}),
      ...(f.seguidoresMin ? { seguidores: { gte: f.seguidoresMin } } : {}),
      ...buscaTextual(f.search, ['nome', 'handle', 'email', 'nicho']),
    };

    const [total, registros] = await this.prisma.$transaction([
      this.prisma.associado.count({ where }),
      this.prisma.associado.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: ordenar(f.sort, f.order, CAMPOS_ORDENAVEIS, { nome: 'asc' }),
        select: {
          ...RESUMO,
          _count: { select: { vendas: true } },
          comissoes: { select: { valor: true }, where: { status: StatusComissao.PAGA } },
        },
      }),
    ]);

    const data = registros.map(({ _count, comissoes, ...a }) => ({
      ...a,
      engajamento: num(a.engajamento),
      plano: { ...a.plano, preco: num(a.plano.preco) },
      totalVendas: _count.vendas,
      comissaoAcumulada: Number(comissoes.reduce((s, c) => s + num(c.valor), 0).toFixed(2)),
    }));

    return paginate(data, total, f.page, f.limit);
  }

  /** Ficha completa: cadastro, plano, loja, métricas e histórico. */
  async buscar(id: string) {
    const a = await this.prisma.associado.findUniqueOrThrow({
      where: { id },
      include: {
        usuario: { select: { email: true, ativo: true, ultimoLogin: true } },
        plano: true,
        loja: { include: { _count: { select: { produtos: true } } } },
        redesSociais: true,
        assinaturas: { orderBy: { inicioEm: 'desc' }, take: 5, include: { plano: { select: { nome: true } } } },
        _count: { select: { vendas: true, cupons: true, posts: true, tickets: true } },
      },
    });

    const [vendas, comissoes] = await Promise.all([
      this.prisma.venda.aggregate({
        where: { associadoId: id, status: StatusVenda.PAGA },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.comissao.groupBy({
        by: ['status'],
        where: { associadoId: id },
        _sum: { valor: true },
      }),
    ]);

    const porStatus = Object.fromEntries(comissoes.map((c) => [c.status, num(c._sum.valor)]));

    return {
      ...a,
      engajamento: num(a.engajamento),
      plano: { ...a.plano, preco: num(a.plano.preco), comissaoExtraPct: num(a.plano.comissaoExtraPct) },
      metricas: {
        vendasAprovadas: vendas._count,
        receitaGerada: num(vendas._sum.total),
        comissaoPaga: porStatus[StatusComissao.PAGA] ?? 0,
        comissaoPendente:
          (porStatus[StatusComissao.AGUARDANDO_PGTO] ?? 0) + (porStatus[StatusComissao.PROCESSANDO] ?? 0),
        totalVendas: a._count.vendas,
        produtosNaLoja: a.loja?._count.produtos ?? 0,
      },
    };
  }

  async buscarPorHandle(handle: string) {
    const a = await this.prisma.associado.findUniqueOrThrow({
      where: { handle },
      select: {
        ...RESUMO,
        bio: true,
        mostrarEmail: true,
        mostrarTelefone: true,
        telefone: true,
      },
    });
    // respeita as preferências de privacidade do perfil público
    return {
      ...a,
      engajamento: num(a.engajamento),
      plano: { ...a.plano, preco: num(a.plano.preco) },
      email: a.mostrarEmail ? a.email : null,
      telefone: a.mostrarTelefone ? a.telefone : null,
    };
  }

  async criar(dto: CriarAssociadoDto) {
    const email = dto.email.toLowerCase();

    const [emailEmUso, handleEmUso, plano] = await Promise.all([
      this.prisma.usuario.findUnique({ where: { email }, select: { id: true } }),
      this.prisma.associado.findUnique({ where: { handle: dto.handle }, select: { id: true } }),
      this.prisma.plano.findUnique({ where: { nivel: dto.plano } }),
    ]);

    if (emailEmUso) throw new ConflictException('Já existe um usuário com este email.');
    if (handleEmUso) throw new ConflictException('Este handle já está em uso.');
    if (!plano) throw new BadRequestException('Plano informado não existe.');

    const senhaGerada = dto.senha ?? randomBytes(6).toString('base64url');

    const usuario = await this.prisma.usuario.create({
      data: {
        email,
        nome: dto.nome,
        senhaHash: await hashSenha(senhaGerada, 10),
        role: Role.ASSOCIADO,
        associado: {
          create: {
            planoId: plano.id,
            nome: dto.nome,
            handle: dto.handle,
            email,
            cpfCnpj: dto.cpfCnpj,
            telefone: dto.telefone,
            nicho: dto.nicho,
            bio: dto.bio,
            seguidores: dto.seguidores ?? 0,
            engajamento: dto.engajamento ?? 0,
            endereco: dto.endereco,
            cidade: dto.cidade,
            uf: dto.uf?.toUpperCase(),
            status: dto.status ?? StatusAssociado.ATIVO,
            assinaturas: { create: { planoId: plano.id, valor: plano.preco } },
            ...(dto.criarLoja === false
              ? {}
              : {
                  loja: {
                    create: {
                      nome: `Loja ${dto.nome.split(' ')[0]}`,
                      slug: dto.handle,
                      descricao: `Loja oficial de ${dto.nome} na DigitaisBR.`,
                    },
                  },
                }),
          },
        },
      },
      include: { associado: { select: { id: true } } },
    });

    return {
      id: usuario.associado!.id,
      usuarioId: usuario.id,
      // devolvida uma única vez, para repasse ao associado
      senhaInicial: dto.senha ? undefined : senhaGerada,
    };
  }

  async atualizar(id: string, dto: AtualizarAssociadoDto) {
    const { plano, senha, criarLoja, email, uf, ...resto } = dto;
    void senha;
    void criarLoja;

    const data: Prisma.AssociadoUpdateInput = {
      ...resto,
      ...(uf ? { uf: uf.toUpperCase() } : {}),
      ...(email ? { email: email.toLowerCase() } : {}),
    };

    if (plano) {
      const p = await this.prisma.plano.findUnique({ where: { nivel: plano } });
      if (!p) throw new BadRequestException('Plano informado não existe.');
      data.plano = { connect: { id: p.id } };
    }

    return this.prisma.associado.update({ where: { id }, data });
  }

  /** Troca de plano: encerra a assinatura vigente e abre uma nova. */
  async alterarPlano(id: string, dto: AlterarPlanoDto) {
    const [associado, plano] = await Promise.all([
      this.prisma.associado.findUniqueOrThrow({ where: { id }, include: { plano: true } }),
      this.prisma.plano.findUnique({ where: { nivel: dto.plano } }),
    ]);
    if (!plano) throw new BadRequestException('Plano informado não existe.');
    if (associado.planoId === plano.id) {
      throw new ConflictException('O associado já está neste plano.');
    }

    await this.prisma.$transaction([
      this.prisma.assinatura.updateMany({
        where: { associadoId: id, ativa: true },
        data: { ativa: false, fimEm: new Date() },
      }),
      this.prisma.assinatura.create({
        data: { associadoId: id, planoId: plano.id, valor: plano.preco },
      }),
      this.prisma.associado.update({ where: { id }, data: { planoId: plano.id } }),
      this.prisma.notificacao.create({
        data: {
          associadoId: id,
          titulo: 'Plano alterado',
          mensagem: `Seu plano passou de ${associado.plano.nome} para ${plano.nome}.`,
          tipo: 'SISTEMA',
        },
      }),
    ]);

    return { id, planoAnterior: associado.plano.nome, planoAtual: plano.nome };
  }

  async alterarStatus(id: string, status: StatusAssociado) {
    const associado = await this.prisma.associado.update({
      where: { id },
      data: { status },
      select: { id: true, nome: true, status: true, usuarioId: true, loja: { select: { id: true } } },
    });

    // suspensão/inativação também desativa o acesso e a vitrine
    const habilitado = status === StatusAssociado.ATIVO;
    await this.prisma.usuario.update({ where: { id: associado.usuarioId }, data: { ativo: habilitado } });
    if (associado.loja) {
      await this.prisma.loja.update({ where: { id: associado.loja.id }, data: { ativa: habilitado } });
    }

    return associado;
  }

  async remover(id: string) {
    const associado = await this.prisma.associado.findUniqueOrThrow({
      where: { id },
      select: { usuarioId: true, _count: { select: { vendas: true } } },
    });

    if (associado._count.vendas > 0) {
      throw new ConflictException(
        'Associado possui vendas registradas — use a inativação em vez da exclusão.',
      );
    }

    // o associado é removido em cascata junto com o usuário
    await this.prisma.usuario.delete({ where: { id: associado.usuarioId } });
    return { id, removido: true };
  }

  async vincularRedeSocial(id: string, dto: VincularRedeSocialDto) {
    return this.prisma.redeSocialConta.upsert({
      where: { associadoId_rede: { associadoId: id, rede: dto.rede } },
      create: { associadoId: id, ...dto, conectada: dto.conectada ?? true },
      update: { ...dto, sincronizadaEm: new Date() },
    });
  }

  async desvincularRedeSocial(id: string, rede: VincularRedeSocialDto['rede']) {
    await this.prisma.redeSocialConta.delete({
      where: { associadoId_rede: { associadoId: id, rede } },
    });
    return { rede, desconectada: true };
  }

  /** Ranking por pontuação (vendas × 100 + comissões acumuladas). */
  async ranking(limite = 10) {
    const top = await this.prisma.associado.findMany({
      where: { status: StatusAssociado.ATIVO },
      orderBy: { pontuacao: 'desc' },
      take: limite,
      select: {
        id: true,
        nome: true,
        handle: true,
        pontuacao: true,
        plano: { select: { nome: true, nivel: true } },
        _count: { select: { vendas: true } },
      },
    });

    return top.map((a, i) => ({
      posicao: i + 1,
      id: a.id,
      nome: a.nome,
      handle: a.handle,
      plano: a.plano.nome,
      vendas: a._count.vendas,
      pontos: a.pontuacao,
    }));
  }

  /** Estatísticas agregadas para os cards do dashboard de cadastros. */
  async estatisticas() {
    const [porStatus, porPlano, porNicho, total] = await Promise.all([
      this.prisma.associado.groupBy({ by: ['status'], _count: true }),
      this.prisma.associado.groupBy({ by: ['planoId'], _count: true }),
      this.prisma.associado.groupBy({ by: ['nicho'], _count: true, orderBy: { _count: { nicho: 'desc' } }, take: 10 }),
      this.prisma.associado.count(),
    ]);

    const planos = await this.prisma.plano.findMany({ select: { id: true, nome: true, nivel: true } });
    const nomePlano = new Map(planos.map((p) => [p.id, p]));

    return {
      total,
      porStatus: Object.fromEntries(porStatus.map((s) => [s.status, s._count])),
      porPlano: porPlano.map((p) => ({
        plano: nomePlano.get(p.planoId)?.nome ?? '—',
        nivel: nomePlano.get(p.planoId)?.nivel ?? NivelPlano.BASICO,
        total: p._count,
        percentual: total ? Number(((p._count / total) * 100).toFixed(1)) : 0,
      })),
      porNicho: porNicho.filter((n) => n.nicho).map((n) => ({ nicho: n.nicho, total: n._count })),
    };
  }
}
