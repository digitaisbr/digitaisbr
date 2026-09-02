import { Injectable } from '@nestjs/common';
import {
  Prisma,
  StatusAssociado,
  StatusComissao,
  StatusProduto,
  StatusTicket,
  StatusVenda,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { intervaloDatas, num } from '../../common/utils/query.util';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cards e gráficos da home administrativa. */
  async admin() {
    const [
      associados,
      associadosAtivos,
      vendas,
      vendasAprovadas,
      receita,
      lojas,
      lojasAtivas,
      produtos,
      produtosAtivos,
      comissoes,
      entradas,
      saidas,
      beneficios,
      parceiros,
      conteudos,
      posts,
      naoLidas,
      tickets,
    ] = await Promise.all([
      this.prisma.associado.count(),
      this.prisma.associado.count({ where: { status: StatusAssociado.ATIVO } }),
      this.prisma.venda.count(),
      this.prisma.venda.count({ where: { status: StatusVenda.PAGA } }),
      this.prisma.venda.aggregate({ where: { status: StatusVenda.PAGA }, _sum: { total: true } }),
      this.prisma.loja.count(),
      this.prisma.loja.count({ where: { ativa: true } }),
      this.prisma.produto.count(),
      this.prisma.produto.count({ where: { status: StatusProduto.ATIVO } }),
      this.prisma.comissao.groupBy({ by: ['status'], _sum: { valor: true } }),
      this.prisma.lancamentoFinanceiro.aggregate({ where: { tipo: 'ENTRADA' }, _sum: { valor: true } }),
      this.prisma.lancamentoFinanceiro.aggregate({ where: { tipo: 'SAIDA' }, _sum: { valor: true } }),
      this.prisma.beneficio.count({ where: { ativo: true } }),
      this.prisma.parceiro.count({ where: { ativo: true } }),
      this.prisma.conteudo.count({ where: { status: 'PUBLICADO' } }),
      this.prisma.postComunidade.count(),
      this.prisma.notificacao.count({ where: { lida: false } }),
      this.prisma.ticket.count(),
    ]);

    const comissaoPor = (s: StatusComissao): number =>
      num(comissoes.find((c) => c.status === s)?._sum.valor);

    return {
      associados: { total: associados, ativos: associadosAtivos },
      vendas: { total: vendas, aprovadas: vendasAprovadas, receita: num(receita._sum.total) },
      lojas: { total: lojas, ativas: lojasAtivas },
      produtos: { total: produtos, ativos: produtosAtivos },
      comissoes: {
        pagas: comissaoPor(StatusComissao.PAGA),
        pendentes:
          comissaoPor(StatusComissao.AGUARDANDO_PGTO) + comissaoPor(StatusComissao.PROCESSANDO),
      },
      saldoFinanceiro: Number((num(entradas._sum.valor) - num(saidas._sum.valor)).toFixed(2)),
      resumo: {
        beneficios,
        parceiros,
        conteudos,
        topicos: posts,
        naoLidas,
        tickets,
      },
    };
  }

  /**
   * Série de receita e comissões dos últimos N meses.
   *
   * A janela é ancorada na venda mais recente, não em "hoje": numa base cujo
   * histórico não chega ao mês corrente, ancorar no relógio devolveria um
   * gráfico vazio em vez do período que de fato tem movimento. O intervalo
   * usado volta na resposta, para a interface poder rotulá-lo.
   */
  async receitaEComissoes(meses = 6) {
    const ultima = await this.prisma.venda.findFirst({
      where: { status: StatusVenda.PAGA },
      orderBy: { dataVenda: 'desc' },
      select: { dataVenda: true },
    });

    if (!ultima) return { periodo: null, serie: [] };

    const fim = new Date(ultima.dataVenda);
    const desde = new Date(fim);
    desde.setMonth(desde.getMonth() - (meses - 1));
    desde.setDate(1);
    desde.setHours(0, 0, 0, 0);

    const linhas = await this.prisma.$queryRaw<
      Array<{ mes: Date; receita: number | null; comissao: number | null; vendas: bigint }>
    >`
      SELECT date_trunc('month', v."dataVenda") AS mes,
             SUM(v.total)::float               AS receita,
             SUM(c.valor)::float               AS comissao,
             COUNT(*)                          AS vendas
        FROM vendas v
        LEFT JOIN comissoes c ON c."vendaId" = v.id
       WHERE v."dataVenda" >= ${desde}
         AND v.status = 'PAGA'
       GROUP BY 1
       ORDER BY 1
    `;

    return {
      periodo: { de: desde.toISOString().slice(0, 7), ate: fim.toISOString().slice(0, 7) },
      serie: linhas.map((l) => ({
        mes: l.mes.toISOString().slice(0, 7),
        receita: Number((l.receita ?? 0).toFixed(2)),
        comissao: Number((l.comissao ?? 0).toFixed(2)),
        vendas: Number(l.vendas),
      })),
    };
  }

  /** Painel inicial do portal do associado. */
  async associado(associadoId: string) {
    const [dados, vendas, comissoes, loja, beneficiosUsados, conteudosVistos, totalBeneficios, totalConteudos] =
      await Promise.all([
        this.prisma.associado.findUniqueOrThrow({
          where: { id: associadoId },
          include: { plano: true },
        }),
        this.prisma.venda.groupBy({
          by: ['status'],
          where: { associadoId },
          _count: true,
          _sum: { total: true },
        }),
        this.prisma.comissao.groupBy({
          by: ['status'],
          where: { associadoId },
          _sum: { valor: true },
        }),
        this.prisma.loja.findUnique({
          where: { associadoId },
          include: { _count: { select: { produtos: true } } },
        }),
        this.prisma.beneficioUso.count({ where: { associadoId } }),
        this.prisma.conteudoInteracao.count({ where: { associadoId } }),
        this.prisma.beneficio.count({ where: { ativo: true } }),
        this.prisma.conteudo.count({ where: { status: 'PUBLICADO' } }),
      ]);

    const vendaPor = (s: StatusVenda) => vendas.find((v) => v.status === s);
    const comissaoPor = (s: StatusComissao): number =>
      num(comissoes.find((c) => c.status === s)?._sum.valor);

    const vendasRecentes = await this.prisma.venda.findMany({
      where: { associadoId },
      orderBy: { dataVenda: 'desc' },
      take: 5,
      include: { produto: { select: { nome: true } } },
    });

    return {
      associado: {
        id: dados.id,
        nome: dados.nome,
        handle: dados.handle,
        nicho: dados.nicho,
        seguidores: dados.seguidores,
        engajamento: num(dados.engajamento),
        pontuacao: dados.pontuacao,
        plano: { ...dados.plano, preco: num(dados.plano.preco) },
      },
      vendas: {
        total: vendas.reduce((s, v) => s + v._count, 0),
        aprovadas: vendaPor(StatusVenda.PAGA)?._count ?? 0,
        receita: num(vendaPor(StatusVenda.PAGA)?._sum.total),
      },
      comissoes: {
        recebidas: comissaoPor(StatusComissao.PAGA),
        pendentes:
          comissaoPor(StatusComissao.AGUARDANDO_PGTO) + comissaoPor(StatusComissao.PROCESSANDO),
      },
      loja: loja
        ? {
            id: loja.id,
            nome: loja.nome,
            slug: loja.slug,
            ativa: loja.ativa,
            produtos: loja._count.produtos,
            visitas: loja.visualizacoes,
          }
        : null,
      uso: {
        beneficiosUsados,
        beneficiosDisponiveis: totalBeneficios,
        conteudosVistos,
        conteudosDisponiveis: totalConteudos,
      },
      vendasRecentes: vendasRecentes.map((v) => ({
        id: v.id,
        ref: v.ref,
        produto: v.produto.nome,
        cliente: v.clienteNome,
        total: num(v.total),
        status: v.status,
        data: v.dataVenda,
      })),
    };
  }

  /**
   * Relatório analítico consolidado — alimenta a tela de Relatórios,
   * com todas as séries em uma única chamada.
   */
  async relatorios(de?: string, ate?: string) {
    const periodo = intervaloDatas(de, ate);
    const whereVenda: Prisma.VendaWhereInput = periodo ? { dataVenda: periodo } : {};

    const [aprovadas, porStatus, porPlano, topProdutos, topAssociados, lojas] = await Promise.all([
      this.prisma.venda.aggregate({
        where: { ...whereVenda, status: StatusVenda.PAGA },
        _sum: { total: true },
        _avg: { total: true },
        _count: true,
      }),
      this.prisma.venda.groupBy({ by: ['status'], where: whereVenda, _count: true, _sum: { total: true } }),
      this.prisma.associado.groupBy({
        by: ['planoId'],
        where: { status: StatusAssociado.ATIVO },
        _count: true,
      }),
      this.prisma.venda.groupBy({
        by: ['produtoId'],
        where: { ...whereVenda, status: StatusVenda.PAGA },
        _sum: { total: true, quantidade: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      this.prisma.venda.groupBy({
        by: ['associadoId'],
        where: { ...whereVenda, status: StatusVenda.PAGA },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      this.prisma.loja.aggregate({ _sum: { visualizacoes: true }, _count: true }),
    ]);

    const [produtos, associados, planos] = await Promise.all([
      this.prisma.produto.findMany({
        where: { id: { in: topProdutos.map((p) => p.produtoId) } },
        select: { id: true, nome: true },
      }),
      this.prisma.associado.findMany({
        where: { id: { in: topAssociados.map((a) => a.associadoId) } },
        select: { id: true, nome: true, handle: true },
      }),
      this.prisma.plano.findMany({ select: { id: true, nome: true, nivel: true } }),
    ]);

    const nomeProduto = new Map(produtos.map((p) => [p.id, p.nome]));
    const dadosAssociado = new Map(associados.map((a) => [a.id, a]));
    const nomePlano = new Map(planos.map((p) => [p.id, p]));
    const totalVendas = porStatus.reduce((s, g) => s + g._count, 0);
    const totalAtivos = porPlano.reduce((s, g) => s + g._count, 0);

    return {
      periodo: { de: de ?? null, ate: ate ?? null },
      indicadores: {
        receitaTotal: num(aprovadas._sum.total),
        vendasAprovadas: aprovadas._count,
        ticketMedio: Number(num(aprovadas._avg.total).toFixed(2)),
        taxaConversao: totalVendas ? Number(((aprovadas._count / totalVendas) * 100).toFixed(1)) : 0,
        associadosAtivos: totalAtivos,
        visualizacoesLojas: lojas._sum.visualizacoes ?? 0,
      },
      vendasPorStatus: porStatus.map((g) => ({
        status: g.status,
        quantidade: g._count,
        valor: num(g._sum.total),
      })),
      associadosPorPlano: porPlano.map((g) => ({
        plano: nomePlano.get(g.planoId)?.nome ?? '—',
        nivel: nomePlano.get(g.planoId)?.nivel,
        total: g._count,
        percentual: totalAtivos ? Number(((g._count / totalAtivos) * 100).toFixed(1)) : 0,
      })),
      topProdutos: topProdutos.map((p) => ({
        nome: nomeProduto.get(p.produtoId) ?? '—',
        unidades: p._sum.quantidade ?? 0,
        receita: num(p._sum.total),
      })),
      topAssociados: topAssociados.map((a) => ({
        nome: dadosAssociado.get(a.associadoId)?.nome ?? '—',
        handle: dadosAssociado.get(a.associadoId)?.handle ?? '—',
        vendas: a._count,
        receita: num(a._sum.total),
      })),
    };
  }

  /** Resumo de suporte para o card do dashboard. */
  async resumoSuporte() {
    const [porStatus, porPrioridade] = await Promise.all([
      this.prisma.ticket.groupBy({ by: ['status'], _count: true }),
      this.prisma.ticket.groupBy({ by: ['prioridade'], _count: true }),
    ]);

    const contar = (s: StatusTicket): number => porStatus.find((g) => g.status === s)?._count ?? 0;

    return {
      abertos: contar(StatusTicket.ABERTO),
      emAndamento: contar(StatusTicket.EM_ANDAMENTO),
      resolvidos: contar(StatusTicket.RESOLVIDO),
      porPrioridade: Object.fromEntries(porPrioridade.map((p) => [p.prioridade, p._count])),
    };
  }
}
