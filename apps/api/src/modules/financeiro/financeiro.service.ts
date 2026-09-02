import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  CategoriaLancamento,
  Prisma,
  StatusComissao,
  StatusSaque,
  StatusVenda,
  TipoLancamento,
  TipoNotificacao,
} from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../common/prisma/prisma.service';
import { intervaloDatas, num } from '../../common/utils/query.util';
import { ComissoesService } from '../comissoes/comissoes.service';
import {
  AtualizarSaqueDto,
  CriarLancamentoDto,
  FiltrarSaquesDto,
  PeriodoDto,
  SolicitarSaqueDto,
} from './dto/financeiro.dto';

/** Status a partir dos quais um saque ainda pode mudar de estado. */
const TRANSICOES_SAQUE: Record<StatusSaque, StatusSaque[]> = {
  [StatusSaque.PENDENTE]: [StatusSaque.PROCESSANDO, StatusSaque.REJEITADO],
  [StatusSaque.PROCESSANDO]: [StatusSaque.CONCLUIDO, StatusSaque.REJEITADO],
  [StatusSaque.CONCLUIDO]: [],
  [StatusSaque.REJEITADO]: [],
};

@Injectable()
export class FinanceiroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comissoes: ComissoesService,
  ) {}

  // ---------------------------------------------------------------- visão geral

  /** Painel financeiro: saldo, MRR, margem e comissões a pagar. */
  async visaoGeral() {
    const [entradas, saidas, mrr, comissoesPendentes, comissoesPagas, receitaVendas] =
      await Promise.all([
        this.prisma.lancamentoFinanceiro.aggregate({
          where: { tipo: TipoLancamento.ENTRADA },
          _sum: { valor: true },
        }),
        this.prisma.lancamentoFinanceiro.aggregate({
          where: { tipo: TipoLancamento.SAIDA },
          _sum: { valor: true },
        }),
        this.prisma.assinatura.aggregate({ where: { ativa: true }, _sum: { valor: true } }),
        this.prisma.comissao.aggregate({
          where: { status: { in: [StatusComissao.AGUARDANDO_PGTO, StatusComissao.PROCESSANDO] } },
          _sum: { valor: true },
        }),
        this.prisma.comissao.aggregate({
          where: { status: StatusComissao.PAGA },
          _sum: { valor: true },
        }),
        this.prisma.venda.aggregate({
          where: { status: StatusVenda.PAGA },
          _sum: { total: true },
        }),
      ]);

    const totalEntradas = num(entradas._sum.valor);
    const totalSaidas = num(saidas._sum.valor);
    const saldo = totalEntradas - totalSaidas;
    const receitaRecorrente = num(mrr._sum.valor);

    return {
      saldoAtual: Number(saldo.toFixed(2)),
      totalEntradas: Number(totalEntradas.toFixed(2)),
      totalSaidas: Number(totalSaidas.toFixed(2)),
      mrr: Number(receitaRecorrente.toFixed(2)),
      arr: Number((receitaRecorrente * 12).toFixed(2)),
      margemLiquida: totalEntradas ? Number(((saldo / totalEntradas) * 100).toFixed(1)) : 0,
      comissoesAPagar: num(comissoesPendentes._sum.valor),
      comissoesPagas: num(comissoesPagas._sum.valor),
      receitaVendas: num(receitaVendas._sum.total),
      aReceberPlanos: Number(receitaRecorrente.toFixed(2)),
      lucroLiquido: Number(saldo.toFixed(2)),
    };
  }

  /** Fluxo de caixa mensal — entradas × saídas. */
  async fluxoCaixa(p: PeriodoDto) {
    const periodo = intervaloDatas(p.de, p.ate);
    const linhas = await this.prisma.lancamentoFinanceiro.groupBy({
      by: ['competencia', 'tipo'],
      where: periodo ? { competencia: periodo } : {},
      _sum: { valor: true },
      orderBy: { competencia: 'asc' },
    });

    const meses = new Map<string, { entradas: number; saidas: number }>();
    for (const l of linhas) {
      const chave = l.competencia.toISOString().slice(0, 7);
      const atual = meses.get(chave) ?? { entradas: 0, saidas: 0 };
      if (l.tipo === TipoLancamento.ENTRADA) atual.entradas += num(l._sum.valor);
      else atual.saidas += num(l._sum.valor);
      meses.set(chave, atual);
    }

    return [...meses]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, v]) => ({
        mes,
        entradas: Number(v.entradas.toFixed(2)),
        saidas: Number(v.saidas.toFixed(2)),
        resultado: Number((v.entradas - v.saidas).toFixed(2)),
      }));
  }

  /** Demonstrativo de resultado: receitas, custos por categoria e margem. */
  async dre(p: PeriodoDto) {
    const periodo = intervaloDatas(p.de, p.ate);
    const where = periodo ? { competencia: periodo } : {};

    const linhas = await this.prisma.lancamentoFinanceiro.groupBy({
      by: ['tipo', 'categoria'],
      where,
      _sum: { valor: true },
    });

    const receitas = linhas.filter((l) => l.tipo === TipoLancamento.ENTRADA);
    const custos = linhas.filter((l) => l.tipo === TipoLancamento.SAIDA);

    const totalReceitas = receitas.reduce((s, l) => s + num(l._sum.valor), 0);
    const totalCustos = custos.reduce((s, l) => s + num(l._sum.valor), 0);
    const resultado = totalReceitas - totalCustos;

    const detalhar = (
      linhas: typeof receitas,
      total: number,
    ): Array<{ categoria: CategoriaLancamento; valor: number; percentual: number }> =>
      linhas
        .map((l) => ({
          categoria: l.categoria,
          valor: Number(num(l._sum.valor).toFixed(2)),
          percentual: total ? Number(((num(l._sum.valor) / total) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.valor - a.valor);

    return {
      receitas: {
        total: Number(totalReceitas.toFixed(2)),
        composicao: detalhar(receitas, totalReceitas),
      },
      custos: {
        total: Number(totalCustos.toFixed(2)),
        composicao: detalhar(custos, totalCustos),
      },
      resultadoLiquido: Number(resultado.toFixed(2)),
      margem: totalReceitas ? Number(((resultado / totalReceitas) * 100).toFixed(1)) : 0,
    };
  }

  /** Projeção linear do MRR a partir da base ativa e do crescimento recente. */
  async projecaoMrr(meses = 6) {
    const [mrr, ativos, novosUltimoMes] = await Promise.all([
      this.prisma.assinatura.aggregate({ where: { ativa: true }, _sum: { valor: true } }),
      this.prisma.assinatura.count({ where: { ativa: true } }),
      this.prisma.assinatura.count({
        where: { inicioEm: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      }),
    ]);

    const base = num(mrr._sum.valor);
    const ticket = ativos ? base / ativos : 0;
    // taxa de crescimento observada nos últimos 30 dias, limitada a 20% ao mês
    const crescimento = ativos ? Math.min(novosUltimoMes / ativos, 0.2) : 0;

    return Array.from({ length: meses }, (_, i) => {
      const mes = new Date();
      mes.setMonth(mes.getMonth() + i + 1);
      const assinantes = Math.round(ativos * (1 + crescimento) ** (i + 1));
      return {
        mes: mes.toISOString().slice(0, 7),
        assinantesProjetados: assinantes,
        mrrProjetado: Number((assinantes * ticket).toFixed(2)),
      };
    });
  }

  // ---------------------------------------------------------------- lançamentos

  async listarLancamentos(p: PeriodoDto & { tipo?: TipoLancamento }) {
    const periodo = intervaloDatas(p.de, p.ate);
    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        ...(periodo ? { competencia: periodo } : {}),
        ...(p.tipo ? { tipo: p.tipo } : {}),
      },
      orderBy: { competencia: 'desc' },
      take: 200,
    });
    return lancamentos.map((l) => ({ ...l, valor: num(l.valor) }));
  }

  criarLancamento(dto: CriarLancamentoDto) {
    return this.prisma.lancamentoFinanceiro.create({
      data: { ...dto, competencia: new Date(`${dto.competencia}T00:00:00Z`) },
    });
  }

  async removerLancamento(id: string) {
    await this.prisma.lancamentoFinanceiro.delete({ where: { id } });
    return { id, removido: true };
  }

  // ---------------------------------------------------------------- saques

  async listarSaques(f: FiltrarSaquesDto): Promise<PaginatedResult<unknown>> {
    const where: Prisma.SaqueWhereInput = {
      ...(f.status ? { status: f.status } : {}),
      ...(f.associadoId ? { associadoId: f.associadoId } : {}),
    };

    const [total, saques] = await this.prisma.$transaction([
      this.prisma.saque.count({ where }),
      this.prisma.saque.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: { solicitadoEm: 'desc' },
        include: { associado: { select: { id: true, nome: true, handle: true } } },
      }),
    ]);

    return paginate(
      saques.map((s) => ({ ...s, valor: num(s.valor) })),
      total,
      f.page,
      f.limit,
    );
  }

  /** Solicita um saque, validando o saldo realmente disponível. */
  async solicitarSaque(associadoId: string, dto: SolicitarSaqueDto) {
    const saldo = await this.comissoes.saldoDisponivel(associadoId);

    if (dto.valor > saldo.disponivelParaSaque) {
      throw new BadRequestException(
        `Saldo insuficiente: disponível R$ ${saldo.disponivelParaSaque.toFixed(2)}, solicitado R$ ${dto.valor.toFixed(2)}.`,
      );
    }

    const saque = await this.prisma.saque.create({
      data: { associadoId, ...dto, status: StatusSaque.PENDENTE },
    });

    await this.prisma.notificacao.create({
      data: {
        associadoId,
        titulo: 'Saque solicitado',
        mensagem: `Seu saque de R$ ${dto.valor.toFixed(2)} via ${dto.metodo} está em análise.`,
        tipo: TipoNotificacao.COMISSAO,
      },
    });

    return { ...saque, valor: num(saque.valor) };
  }

  /** Atualiza o status de um saque respeitando as transições válidas. */
  async atualizarSaque(id: string, dto: AtualizarSaqueDto) {
    const saque = await this.prisma.saque.findUniqueOrThrow({ where: { id } });

    if (!TRANSICOES_SAQUE[saque.status].includes(dto.status)) {
      throw new ConflictException(
        `Transição inválida: ${saque.status} → ${dto.status}. Permitidas: ${
          TRANSICOES_SAQUE[saque.status].join(', ') || 'nenhuma (status final)'
        }.`,
      );
    }
    if (dto.status === StatusSaque.REJEITADO && !dto.motivoRejeicao) {
      throw new BadRequestException('Informe o motivo da rejeição.');
    }

    const atualizado = await this.prisma.saque.update({
      where: { id },
      data: {
        status: dto.status,
        motivoRejeicao: dto.motivoRejeicao,
        concluidoEm: dto.status === StatusSaque.CONCLUIDO ? new Date() : null,
      },
    });

    if (dto.status === StatusSaque.CONCLUIDO) {
      // o saque efetivado vira uma saída no caixa
      await this.prisma.lancamentoFinanceiro.create({
        data: {
          tipo: TipoLancamento.SAIDA,
          categoria: CategoriaLancamento.COMISSAO,
          descricao: `Saque de comissões — ${saque.metodo}`,
          valor: saque.valor,
          competencia: new Date(),
          referencia: saque.id,
        },
      });
    }

    await this.prisma.notificacao.create({
      data: {
        associadoId: saque.associadoId,
        titulo: `Saque ${dto.status.toLowerCase()}`,
        mensagem:
          `Seu saque de R$ ${num(saque.valor).toFixed(2)} está ${dto.status.toLowerCase()}.` +
          (dto.motivoRejeicao ? ` Motivo: ${dto.motivoRejeicao}` : ''),
        tipo: TipoNotificacao.COMISSAO,
      },
    });

    return { ...atualizado, valor: num(atualizado.valor) };
  }

  /** Extrato consolidado do associado: comissões e saques em ordem cronológica. */
  async extratoAssociado(associadoId: string) {
    const [saldo, comissoes, saques] = await Promise.all([
      this.comissoes.saldoDisponivel(associadoId),
      this.prisma.comissao.findMany({
        where: { associadoId },
        orderBy: { criadoEm: 'desc' },
        take: 50,
        include: { venda: { select: { ref: true, produto: { select: { nome: true } } } } },
      }),
      this.prisma.saque.findMany({
        where: { associadoId },
        orderBy: { solicitadoEm: 'desc' },
        take: 50,
      }),
    ]);

    const movimentos = [
      ...comissoes.map((c) => ({
        tipo: 'CREDITO' as const,
        data: c.criadoEm,
        descricao: `Comissão — ${c.venda.produto.nome} (${c.venda.ref})`,
        valor: num(c.valor),
        status: c.status,
      })),
      ...saques.map((s) => ({
        tipo: 'DEBITO' as const,
        data: s.solicitadoEm,
        descricao: `Saque via ${s.metodo} — ${s.destino}`,
        valor: num(s.valor),
        status: s.status,
      })),
    ].sort((a, b) => b.data.getTime() - a.data.getTime());

    return { saldo, movimentos };
  }
}
