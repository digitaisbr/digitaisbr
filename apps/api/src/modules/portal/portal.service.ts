import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NivelPlano, Prisma, RedeSocial, StatusComissao, StatusVenda } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ORDEM_PLANO } from '../../common/guards/plano.guard';
import { intervaloDatas, num } from '../../common/utils/query.util';
import { ComissoesService } from '../comissoes/comissoes.service';
import { LojasService } from '../lojas/lojas.service';
import {
  AtualizarCupomDto,
  AtualizarPerfilDto,
  ConectarRedeDto,
  CriarCupomDto,
  GerarLinkDto,
  PersonalizarLojaDto,
} from './dto/portal.dto';

/** Meia-noite UTC de hoje — chave da métrica diária. */
function inicioDoDia(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Anexa o código de origem à URL do fornecedor, preservando os parâmetros que
 * ela já tenha. URL malformada volta intacta — melhor mandar o cliente ao
 * checkout sem rastreio do que quebrar a compra.
 */
function comOrigem(checkoutUrl: string, codigo: string): string {
  try {
    const url = new URL(checkoutUrl);
    url.searchParams.set('ref', codigo);
    url.searchParams.set('utm_source', 'digitaisbr');
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lojas: LojasService,
    private readonly comissoes: ComissoesService,
  ) {}

  // ---------------------------------------------------------------- perfil

  async meuPerfil(associadoId: string) {
    const a = await this.prisma.associado.findUniqueOrThrow({
      where: { id: associadoId },
      include: {
        plano: true,
        loja: { select: { id: true, nome: true, slug: true, ativa: true } },
        redesSociais: true,
        usuario: { select: { email: true, ultimoLogin: true } },
      },
    });

    return {
      ...a,
      engajamento: num(a.engajamento),
      plano: { ...a.plano, preco: num(a.plano.preco), comissaoExtraPct: num(a.plano.comissaoExtraPct) },
      redesSociais: a.redesSociais.map((r) => ({ ...r, engajamento: num(r.engajamento) })),
      linkPublico: `/perfil/${a.handle}`,
    };
  }

  atualizarPerfil(associadoId: string, dto: AtualizarPerfilDto) {
    return this.prisma.associado.update({ where: { id: associadoId }, data: dto });
  }

  /** Uso do plano atual e o que o próximo nível desbloqueia. */
  async meuPlano(associadoId: string) {
    const associado = await this.prisma.associado.findUniqueOrThrow({
      where: { id: associadoId },
      include: {
        plano: true,
        loja: { include: { _count: { select: { produtos: true } } } },
        assinaturas: { where: { ativa: true }, take: 1 },
      },
    });

    const nivel = associado.plano.nivel;

    const [beneficiosLiberados, beneficiosTotais, conteudosLiberados, conteudosTotais, receita] =
      await Promise.all([
        this.prisma.beneficio.count({
          where: { ativo: true, planoMinimo: { nivel: { in: this.niveisAteh(nivel) } } },
        }),
        this.prisma.beneficio.count({ where: { ativo: true } }),
        this.prisma.conteudo.count({
          where: { status: 'PUBLICADO', planoMinimo: { nivel: { in: this.niveisAteh(nivel) } } },
        }),
        this.prisma.conteudo.count({ where: { status: 'PUBLICADO' } }),
        this.prisma.venda.aggregate({
          where: { associadoId, status: StatusVenda.PAGA },
          _sum: { total: true },
        }),
      ]);

    const proximo = await this.prisma.plano.findFirst({
      where: { ordem: { gt: associado.plano.ordem }, ativo: true },
      orderBy: { ordem: 'asc' },
    });

    const mensalidade = num(associado.plano.preco);
    const receitaGerada = num(receita._sum.total);
    const diasAtivo = Math.floor(
      (Date.now() - associado.membroDesde.getTime()) / 86_400_000,
    );

    let upgrade = null;
    if (proximo) {
      const [beneficiosProximo, conteudosProximo] = await Promise.all([
        this.prisma.beneficio.count({
          where: { ativo: true, planoMinimo: { nivel: { in: this.niveisAteh(proximo.nivel) } } },
        }),
        this.prisma.conteudo.count({
          where: { status: 'PUBLICADO', planoMinimo: { nivel: { in: this.niveisAteh(proximo.nivel) } } },
        }),
      ]);

      upgrade = {
        plano: proximo.nome,
        nivel: proximo.nivel,
        preco: num(proximo.preco),
        diferenca: Number((num(proximo.preco) - mensalidade).toFixed(2)),
        beneficiosAdicionais: beneficiosProximo - beneficiosLiberados,
        conteudosAdicionais: conteudosProximo - conteudosLiberados,
        comissaoExtra: num(proximo.comissaoExtraPct) - num(associado.plano.comissaoExtraPct),
        suporte: proximo.suporte,
      };
    }

    return {
      plano: {
        ...associado.plano,
        preco: mensalidade,
        comissaoExtraPct: num(associado.plano.comissaoExtraPct),
      },
      assinatura: associado.assinaturas[0]
        ? { ...associado.assinaturas[0], valor: num(associado.assinaturas[0].valor) }
        : null,
      uso: {
        produtos: {
          atual: associado.loja?._count.produtos ?? 0,
          limite: associado.plano.limiteProdutos,
        },
        beneficios: { liberados: beneficiosLiberados, total: beneficiosTotais },
        conteudos: { liberados: conteudosLiberados, total: conteudosTotais },
      },
      resumo: {
        mensalidade,
        receitaGerada,
        roi: mensalidade ? Number((receitaGerada / mensalidade).toFixed(1)) : 0,
        diasAtivo,
      },
      upgrade,
    };
  }

  // ---------------------------------------------------------------- minhas vendas e comissões

  /**
   * Vendas do próprio associado. Existe em separado de `/vendas` porque
   * aquela rota é exclusiva da administração — aqui o filtro por associado
   * é imposto pelo servidor, não pelo cliente.
   */
  async minhasVendas(
    associadoId: string,
    f: { page: number; limit: number; skip: number; search?: string; status?: StatusVenda },
  ): Promise<PaginatedResult<unknown>> {
    const where: Prisma.VendaWhereInput = {
      associadoId,
      ...(f.status ? { status: f.status } : {}),
      ...(f.search
        ? {
            OR: [
              { ref: { contains: f.search, mode: Prisma.QueryMode.insensitive } },
              { clienteNome: { contains: f.search, mode: Prisma.QueryMode.insensitive } },
              { produto: { nome: { contains: f.search, mode: Prisma.QueryMode.insensitive } } },
            ],
          }
        : {}),
    };

    const [total, vendas] = await this.prisma.$transaction([
      this.prisma.venda.count({ where }),
      this.prisma.venda.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: { dataVenda: 'desc' },
        include: {
          produto: { select: { id: true, nome: true, sku: true, categoria: { select: { nome: true } } } },
          comissao: { select: { id: true, valor: true, percentual: true, status: true } },
        },
      }),
    ]);

    const data = vendas.map((v) => ({
      ...v,
      precoUnitario: num(v.precoUnitario),
      desconto: num(v.desconto),
      total: num(v.total),
      comissao: v.comissao
        ? { ...v.comissao, valor: num(v.comissao.valor), percentual: num(v.comissao.percentual) }
        : null,
    }));

    return paginate(data, total, f.page, f.limit);
  }

  /** Comissões do próprio associado. */
  async minhasComissoes(
    associadoId: string,
    f: { page: number; limit: number; skip: number; status?: StatusComissao },
  ): Promise<PaginatedResult<unknown>> {
    const where: Prisma.ComissaoWhereInput = {
      associadoId,
      ...(f.status ? { status: f.status } : {}),
    };

    const [total, comissoes] = await this.prisma.$transaction([
      this.prisma.comissao.count({ where }),
      this.prisma.comissao.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: { criadoEm: 'desc' },
        include: {
          venda: {
            select: {
              id: true, ref: true, total: true, dataVenda: true, status: true,
              produto: { select: { nome: true, categoria: { select: { nome: true } } } },
            },
          },
        },
      }),
    ]);

    const data = comissoes.map((c) => ({
      ...c,
      valor: num(c.valor),
      percentual: num(c.percentual),
      venda: { ...c.venda, total: num(c.venda.total) },
    }));

    return paginate(data, total, f.page, f.limit);
  }

  // ---------------------------------------------------------------- meu financeiro

  /** Saldo do próprio associado — o cálculo é o mesmo usado pela administração. */
  meuSaldo(associadoId: string) {
    return this.comissoes.saldoDisponivel(associadoId);
  }

  /** Saques do próprio associado, do mais recente para o mais antigo. */
  async meusSaques(associadoId: string) {
    const saques = await this.prisma.saque.findMany({
      where: { associadoId },
      orderBy: { solicitadoEm: 'desc' },
    });
    return saques.map((s) => ({ ...s, valor: num(s.valor) }));
  }

  // ---------------------------------------------------------------- minha loja

  async minhaLoja(associadoId: string) {
    const loja = await this.prisma.loja.findUnique({ where: { associadoId } });
    if (!loja) throw new NotFoundException('Você ainda não tem uma loja criada.');
    return this.lojas.buscar(loja.id);
  }

  async personalizarLoja(associadoId: string, dto: PersonalizarLojaDto) {
    const loja = await this.prisma.loja.findUnique({
      where: { associadoId },
      include: { associado: { select: { plano: { select: { nivel: true, nome: true } } } } },
    });
    if (!loja) throw new NotFoundException('Você ainda não tem uma loja criada.');

    // personalização visual é recurso do plano Intermediário em diante
    const visual = dto.corPrimaria ?? dto.bannerUrl ?? dto.logoUrl;
    if (visual && ORDEM_PLANO[loja.associado.plano.nivel] < ORDEM_PLANO[NivelPlano.INTERMEDIARIO]) {
      throw new ForbiddenException(
        'Personalização de cores, banner e logo está disponível a partir do plano Intermediário.',
      );
    }

    return this.prisma.loja.update({ where: { id: loja.id }, data: dto });
  }

  async adicionarProdutoNaLoja(associadoId: string, produtoId: string) {
    const loja = await this.prisma.loja.findUnique({ where: { associadoId } });
    if (!loja) throw new NotFoundException('Você ainda não tem uma loja criada.');

    // adicionarProduto já cria o link rastreável
    return this.lojas.adicionarProduto(loja.id, { produtoId });
  }

  async removerProdutoDaLoja(associadoId: string, produtoId: string) {
    const loja = await this.prisma.loja.findUnique({ where: { associadoId } });
    if (!loja) throw new NotFoundException('Você ainda não tem uma loja criada.');
    return this.lojas.removerProduto(loja.id, produtoId);
  }

  // ---------------------------------------------------------------- cupons

  async meusCupons(associadoId: string) {
    const cupons = await this.prisma.cupom.findMany({
      where: { associadoId },
      orderBy: { criadoEm: 'desc' },
    });

    const formatados = cupons.map((c) => ({
      ...c,
      desconto: num(c.desconto),
      compraMinima: c.compraMinima ? num(c.compraMinima) : null,
      esgotado: c.limiteUsos !== null && c.usos >= c.limiteUsos,
      expirado: Boolean(c.validoAte && c.validoAte < new Date()),
    }));

    const ativos = formatados.filter((c) => c.ativo && !c.esgotado && !c.expirado);

    return {
      cupons: formatados,
      resumo: {
        total: formatados.length,
        ativos: ativos.length,
        totalUsos: formatados.reduce((s, c) => s + c.usos, 0),
        descontoMedio: formatados.length
          ? Number((formatados.reduce((s, c) => s + c.desconto, 0) / formatados.length).toFixed(1))
          : 0,
      },
    };
  }

  async criarCupom(associadoId: string, dto: CriarCupomDto) {
    const existente = await this.prisma.cupom.findUnique({
      where: { associadoId_codigo: { associadoId, codigo: dto.codigo } },
    });
    if (existente) throw new ConflictException('Você já tem um cupom com este código.');

    return this.prisma.cupom.create({
      data: {
        associadoId,
        ...dto,
        validoAte: dto.validoAte ? new Date(dto.validoAte) : null,
      },
    });
  }

  async atualizarCupom(associadoId: string, id: string, dto: AtualizarCupomDto) {
    const cupom = await this.prisma.cupom.findUniqueOrThrow({ where: { id } });
    if (cupom.associadoId !== associadoId) {
      throw new ForbiddenException('Este cupom pertence a outro associado.');
    }

    return this.prisma.cupom.update({
      where: { id },
      data: { ...dto, ...(dto.validoAte ? { validoAte: new Date(dto.validoAte) } : {}) },
    });
  }

  async removerCupom(associadoId: string, id: string) {
    const cupom = await this.prisma.cupom.findUniqueOrThrow({ where: { id } });
    if (cupom.associadoId !== associadoId) {
      throw new ForbiddenException('Este cupom pertence a outro associado.');
    }
    if (cupom.usos > 0) {
      throw new ConflictException('Cupom já utilizado — desative-o em vez de excluir.');
    }

    await this.prisma.cupom.delete({ where: { id } });
    return { id, removido: true };
  }

  // ---------------------------------------------------------------- links de afiliado

  async meusLinks(associadoId: string) {
    const links = await this.prisma.linkAfiliado.findMany({
      where: { associadoId },
      orderBy: { cliques: 'desc' },
      include: { produto: { select: { id: true, nome: true, preco: true } } },
    });

    const formatados = links.map((l) => ({
      ...l,
      receita: num(l.receita),
      comissao: num(l.comissao),
      taxaConversao: l.cliques ? Number(((l.conversoes / l.cliques) * 100).toFixed(1)) : 0,
      produto: { ...l.produto, preco: num(l.produto.preco) },
    }));

    const cliques = formatados.reduce((s, l) => s + l.cliques, 0);
    const conversoes = formatados.reduce((s, l) => s + l.conversoes, 0);

    return {
      links: formatados,
      resumo: {
        ativos: formatados.filter((l) => l.ativo).length,
        cliques,
        conversoes,
        taxaMedia: cliques ? Number(((conversoes / cliques) * 100).toFixed(1)) : 0,
        receita: Number(formatados.reduce((s, l) => s + l.receita, 0).toFixed(2)),
        comissao: Number(formatados.reduce((s, l) => s + l.comissao, 0).toFixed(2)),
      },
    };
  }

  /** Gera (ou recupera) o link rastreável do produto para o associado. */
  async gerarLink(associadoId: string, dto: GerarLinkDto) {
    // a criação vive em LojasService, que é por onde todo produto entra numa vitrine
    const link = await this.lojas.garantirLinkAfiliado(associadoId, dto.produtoId);
    return this.prisma.linkAfiliado.findUniqueOrThrow({
      where: { id: link.id },
      include: { produto: { select: { nome: true } } },
    });
  }

  /**
   * Registra o clique e resolve o destino do link de afiliado.
   *
   * O checkout acontece no fornecedor, então a origem precisa viajar junto na
   * URL — é isso que permite atribuir a venda ao associado quando ela voltar.
   */
  async resolverLink(codigo: string): Promise<{ destino: string; produto: string }> {
    const link = await this.prisma.linkAfiliado.findUnique({
      where: { codigo },
      include: {
        produto: { select: { id: true, nome: true, checkoutUrl: true } },
        associado: { select: { handle: true } },
      },
    });

    if (!link) throw new NotFoundException('Link de divulgação inválido ou expirado.');

    await this.prisma.$transaction([
      this.prisma.linkAfiliado.update({
        where: { id: link.id },
        data: { cliques: { increment: 1 } },
      }),
      // o mesmo clique alimenta a série diária de performance
      this.prisma.metricaDiaria.upsert({
        where: { associadoId_data: { associadoId: link.associadoId, data: inicioDoDia() } },
        create: { associadoId: link.associadoId, data: inicioDoDia(), cliques: 1 },
        update: { cliques: { increment: 1 } },
      }),
    ]);

    return {
      produto: link.produto.nome,
      destino: link.produto.checkoutUrl
        ? comOrigem(link.produto.checkoutUrl, link.codigo)
        : // sem checkout externo cadastrado, devolve o visitante à loja de origem
          `/loja/${link.associado.handle}`,
    };
  }

  // ---------------------------------------------------------------- performance

  async performance(associadoId: string, de?: string, ate?: string) {
    const periodo = intervaloDatas(de, ate);

    const [metricas, agregado, topProdutos] = await Promise.all([
      this.prisma.metricaDiaria.findMany({
        where: { associadoId, ...(periodo ? { data: periodo } : {}) },
        orderBy: { data: 'desc' },
        take: 90,
      }),
      this.prisma.metricaDiaria.aggregate({
        where: { associadoId, ...(periodo ? { data: periodo } : {}) },
        _sum: { cliques: true, conversoes: true, receita: true, comissao: true },
      }),
      this.prisma.venda.groupBy({
        by: ['produtoId'],
        where: { associadoId, status: StatusVenda.PAGA },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ]);

    const produtos = await this.prisma.produto.findMany({
      where: { id: { in: topProdutos.map((p) => p.produtoId) } },
      select: { id: true, nome: true },
    });
    const nomeProduto = new Map(produtos.map((p) => [p.id, p.nome]));

    const cliques = agregado._sum.cliques ?? 0;
    const conversoes = agregado._sum.conversoes ?? 0;

    return {
      indicadores: {
        cliques,
        conversoes,
        taxaConversao: cliques ? Number(((conversoes / cliques) * 100).toFixed(1)) : 0,
        receita: num(agregado._sum.receita),
        comissao: num(agregado._sum.comissao),
      },
      serieDiaria: metricas.map((m) => ({
        data: m.data.toISOString().slice(0, 10),
        cliques: m.cliques,
        conversoes: m.conversoes,
        taxa: m.cliques ? Number(((m.conversoes / m.cliques) * 100).toFixed(1)) : 0,
        receita: num(m.receita),
        comissao: num(m.comissao),
      })),
      topProdutos: topProdutos.map((p) => ({
        nome: nomeProduto.get(p.produtoId) ?? '—',
        receita: num(p._sum.total),
      })),
    };
  }

  // ---------------------------------------------------------------- redes sociais

  async minhasRedes(associadoId: string) {
    const contas = await this.prisma.redeSocialConta.findMany({ where: { associadoId } });

    const conectadas = contas.filter((c) => c.conectada);

    return {
      contas: contas.map((c) => ({ ...c, engajamento: num(c.engajamento) })),
      resumo: {
        conectadas: conectadas.length,
        disponiveis: Object.keys(RedeSocial).length,
        totalSeguidores: conectadas.reduce((s, c) => s + c.seguidores, 0),
        engajamentoMedio: conectadas.length
          ? Number(
              (conectadas.reduce((s, c) => s + num(c.engajamento), 0) / conectadas.length).toFixed(1),
            )
          : 0,
        totalPosts: conectadas.reduce((s, c) => s + c.posts, 0),
      },
    };
  }

  conectarRede(associadoId: string, dto: ConectarRedeDto) {
    return this.prisma.redeSocialConta.upsert({
      where: { associadoId_rede: { associadoId, rede: dto.rede } },
      create: { associadoId, ...dto, conectada: true, sincronizadaEm: new Date() },
      update: { ...dto, conectada: true, sincronizadaEm: new Date() },
    });
  }

  async desconectarRede(associadoId: string, rede: ConectarRedeDto['rede']) {
    await this.prisma.redeSocialConta.update({
      where: { associadoId_rede: { associadoId, rede } },
      data: { conectada: false },
    });
    return { rede, conectada: false };
  }

  private niveisAteh(nivel: NivelPlano): NivelPlano[] {
    return (Object.keys(ORDEM_PLANO) as NivelPlano[]).filter(
      (n) => ORDEM_PLANO[n] <= ORDEM_PLANO[nivel],
    );
  }
}
