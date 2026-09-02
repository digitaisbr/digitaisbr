import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, StatusSolicitacao, TipoEscritorio, TipoNotificacao } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { num } from '../../common/utils/query.util';
import {
  AtualizarEscritorioDto,
  AtualizarProfissionalDto,
  AtualizarSolicitacaoDto,
  CriarEscritorioDto,
  CriarProfissionalDto,
  SolicitarServicoDto,
} from './dto/servico.dto';

@Injectable()
export class ServicosService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- escritórios

  async listarEscritorios(tipo?: TipoEscritorio, apenasAtivos = false) {
    const escritorios = await this.prisma.escritorioParceiro.findMany({
      where: { ...(tipo ? { tipo } : {}), ...(apenasAtivos ? { ativo: true } : {}) },
      orderBy: { nome: 'asc' },
      include: { _count: { select: { profissionais: true } } },
    });

    return escritorios.map(({ _count, ...e }) => ({
      ...e,
      nota: e.nota ? num(e.nota) : null,
      totalProfissionais: _count.profissionais,
    }));
  }

  criarEscritorio(dto: CriarEscritorioDto) {
    return this.prisma.escritorioParceiro.create({
      data: { ...dto, especialidades: dto.especialidades ?? [] },
    });
  }

  atualizarEscritorio(id: string, dto: AtualizarEscritorioDto) {
    return this.prisma.escritorioParceiro.update({ where: { id }, data: dto });
  }

  async removerEscritorio(id: string) {
    const profissionais = await this.prisma.profissional.count({ where: { escritorioId: id } });
    if (profissionais > 0) {
      throw new ConflictException(
        `Escritório possui ${profissionais} profissional(is) vinculado(s) — desvincule-os antes de remover.`,
      );
    }
    await this.prisma.escritorioParceiro.delete({ where: { id } });
    return { id, removido: true };
  }

  // ---------------------------------------------------------------- profissionais

  async listarProfissionais(apenasDisponiveis = false) {
    const profissionais = await this.prisma.profissional.findMany({
      where: apenasDisponiveis ? { disponivel: true } : {},
      orderBy: [{ disponivel: 'desc' }, { nota: 'desc' }],
      include: { escritorio: { select: { id: true, nome: true, tipo: true } } },
    });

    return profissionais.map((p) => ({
      ...p,
      nota: p.nota ? num(p.nota) : null,
      valorHora: p.valorHora ? num(p.valorHora) : null,
    }));
  }

  criarProfissional(dto: CriarProfissionalDto) {
    return this.prisma.profissional.create({ data: dto });
  }

  atualizarProfissional(id: string, dto: AtualizarProfissionalDto) {
    return this.prisma.profissional.update({ where: { id }, data: dto });
  }

  async removerProfissional(id: string) {
    await this.prisma.profissional.delete({ where: { id } });
    return { id, removido: true };
  }

  // ---------------------------------------------------------------- solicitações

  async listarSolicitacoes(status?: StatusSolicitacao, associadoId?: string) {
    const where: Prisma.SolicitacaoServicoWhereInput = {
      ...(status ? { status } : {}),
      ...(associadoId ? { associadoId } : {}),
    };

    const [solicitacoes, porStatus] = await Promise.all([
      this.prisma.solicitacaoServico.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        include: {
          associado: { select: { id: true, nome: true, handle: true } },
          profissional: {
            select: { id: true, nome: true, especialidade: true, escritorio: { select: { nome: true } } },
          },
        },
      }),
      this.prisma.solicitacaoServico.groupBy({ by: ['status'], where: associadoId ? { associadoId } : {}, _count: true }),
    ]);

    return {
      solicitacoes,
      resumo: Object.fromEntries(porStatus.map((s) => [s.status, s._count])),
    };
  }

  async solicitar(associadoId: string, dto: SolicitarServicoDto) {
    if (dto.profissionalId) {
      const profissional = await this.prisma.profissional.findUniqueOrThrow({
        where: { id: dto.profissionalId },
      });
      if (!profissional.disponivel) {
        throw new ConflictException(`${profissional.nome} está indisponível no momento.`);
      }
    }

    return this.prisma.solicitacaoServico.create({
      data: { associadoId, ...dto, status: StatusSolicitacao.ABERTA },
      include: { profissional: { select: { nome: true } } },
    });
  }

  async atualizarSolicitacao(id: string, dto: AtualizarSolicitacaoDto) {
    const solicitacao = await this.prisma.solicitacaoServico.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.status === StatusSolicitacao.CONCLUIDA ? { concluidaEm: new Date() } : {}),
      },
      include: { profissional: { select: { nome: true, escritorioId: true } } },
    });

    // atendimento concluído entra na contagem do escritório
    if (dto.status === StatusSolicitacao.CONCLUIDA && solicitacao.profissional?.escritorioId) {
      await this.prisma.escritorioParceiro.update({
        where: { id: solicitacao.profissional.escritorioId },
        data: { atendimentos: { increment: 1 } },
      });
    }

    await this.prisma.notificacao.create({
      data: {
        associadoId: solicitacao.associadoId,
        titulo: 'Solicitação de serviço atualizada',
        mensagem: `Sua solicitação "${solicitacao.assunto}" está ${dto.status.toLowerCase()}.`,
        tipo: TipoNotificacao.SISTEMA,
      },
    });

    return solicitacao;
  }

  /** Cards do topo da tela de serviços. */
  async estatisticas() {
    const [escritorios, ativos, profissionais, disponiveis, porStatus] = await Promise.all([
      this.prisma.escritorioParceiro.count(),
      this.prisma.escritorioParceiro.count({ where: { ativo: true } }),
      this.prisma.profissional.count(),
      this.prisma.profissional.count({ where: { disponivel: true } }),
      this.prisma.solicitacaoServico.groupBy({ by: ['status'], _count: true }),
    ]);

    const contar = (s: StatusSolicitacao): number =>
      porStatus.find((g) => g.status === s)?._count ?? 0;

    return {
      escritorios: { total: escritorios, ativos },
      profissionais: { total: profissionais, disponiveis },
      solicitacoes: {
        abertas: contar(StatusSolicitacao.ABERTA),
        emAndamento: contar(StatusSolicitacao.EM_ANDAMENTO),
        concluidas: contar(StatusSolicitacao.CONCLUIDA),
        total: porStatus.reduce((s, g) => s + g._count, 0),
      },
    };
  }
}
