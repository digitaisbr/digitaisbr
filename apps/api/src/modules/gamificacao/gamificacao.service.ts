import { Injectable } from '@nestjs/common';
import { StatusAssociado, StatusComissao } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { num } from '../../common/utils/query.util';

@Injectable()
export class GamificacaoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ranking geral com a posição do associado consultante destacada. */
  async ranking(limite = 10, associadoId?: string | null) {
    const todos = await this.prisma.associado.findMany({
      where: { status: StatusAssociado.ATIVO },
      orderBy: [{ pontuacao: 'desc' }, { nome: 'asc' }],
      select: {
        id: true,
        nome: true,
        handle: true,
        pontuacao: true,
        plano: { select: { nome: true } },
        _count: { select: { vendas: true } },
      },
    });

    const posicaoDe = (id: string): number => todos.findIndex((a) => a.id === id) + 1;

    const top = todos.slice(0, limite).map((a, i) => ({
      posicao: i + 1,
      id: a.id,
      nome: a.nome,
      handle: a.handle,
      plano: a.plano.nome,
      vendas: a._count.vendas,
      pontos: a.pontuacao,
      voce: a.id === associadoId,
    }));

    const posicao = associadoId ? posicaoDe(associadoId) : 0;

    return {
      top,
      minhaPosicao: posicao || null,
      totalParticipantes: todos.length,
      percentilTopo:
        posicao && todos.length
          ? Number((((todos.length - posicao + 1) / todos.length) * 100).toFixed(0))
          : null,
    };
  }

  /** Conquistas do associado, com progresso calculado sobre os dados reais. */
  async conquistasDoAssociado(associadoId: string) {
    const [catalogo, progresso] = await Promise.all([
      this.prisma.conquista.findMany({ orderBy: { ordem: 'asc' } }),
      this.prisma.conquistaAssociado.findMany({ where: { associadoId } }),
    ]);

    const porConquista = new Map(progresso.map((p) => [p.conquistaId, p]));

    const conquistas = catalogo.map((c) => {
      const p = porConquista.get(c.id);
      const atual = p?.progresso ?? 0;
      return {
        id: c.id,
        nome: c.nome,
        descricao: c.descricao,
        icone: c.icone,
        meta: c.meta,
        pontos: c.pontos,
        progresso: atual,
        percentual: c.meta ? Math.min(Number(((atual / c.meta) * 100).toFixed(0)), 100) : 0,
        desbloqueada: p?.desbloqueada ?? false,
        desbloqueadaEm: p?.desbloqueadaEm ?? null,
      };
    });

    return {
      conquistas,
      desbloqueadas: conquistas.filter((c) => c.desbloqueada).length,
      total: conquistas.length,
      pontosGanhos: conquistas.filter((c) => c.desbloqueada).reduce((s, c) => s + c.pontos, 0),
    };
  }

  /**
   * Recalcula a pontuação e o progresso das conquistas a partir dos dados
   * reais de vendas e comissões do associado.
   */
  async recalcular(associadoId: string) {
    const [vendas, comissoes, produtosNaLoja, cupons, posts] = await Promise.all([
      this.prisma.venda.count({ where: { associadoId } }),
      this.prisma.comissao.aggregate({
        where: { associadoId, status: StatusComissao.PAGA },
        _sum: { valor: true },
      }),
      this.prisma.lojaProduto.count({ where: { loja: { associadoId } } }),
      this.prisma.cupom.count({ where: { associadoId } }),
      this.prisma.postComunidade.count({ where: { autorId: associadoId } }),
    ]);

    const totalComissao = num(comissoes._sum.valor);
    const pontuacao = Math.round(vendas * 100 + totalComissao);

    await this.prisma.associado.update({ where: { id: associadoId }, data: { pontuacao } });

    // cada conquista mede uma métrica diferente, inferida pelo nome
    const metricaDe = (nome: string): number => {
      const n = nome.toLowerCase();
      if (n.includes('comiss')) return Math.round(totalComissao);
      if (n.includes('loja')) return produtosNaLoja;
      if (n.includes('cupom')) return cupons;
      if (n.includes('network')) return posts;
      return vendas;
    };

    const catalogo = await this.prisma.conquista.findMany();
    for (const c of catalogo) {
      const progresso = Math.min(metricaDe(c.nome), c.meta);
      const desbloqueada = progresso >= c.meta;

      await this.prisma.conquistaAssociado.upsert({
        where: { conquistaId_associadoId: { conquistaId: c.id, associadoId } },
        create: {
          conquistaId: c.id,
          associadoId,
          progresso,
          desbloqueada,
          desbloqueadaEm: desbloqueada ? new Date() : null,
        },
        update: {
          progresso,
          desbloqueada,
          ...(desbloqueada ? { desbloqueadaEm: new Date() } : { desbloqueadaEm: null }),
        },
      });
    }

    return { associadoId, pontuacao, conquistasAvaliadas: catalogo.length };
  }

  listarConquistas() {
    return this.prisma.conquista.findMany({
      orderBy: { ordem: 'asc' },
      include: { _count: { select: { associados: { where: { desbloqueada: true } } } } },
    });
  }
}
