import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, StatusComissao, TipoNotificacao } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../common/prisma/prisma.service';
import { intervaloDatas, num, ordenar } from '../../common/utils/query.util';
import { AlterarStatusComissaoDto, FiltrarComissoesDto, PagarComissoesDto } from './dto/comissao.dto';

const CAMPOS_ORDENAVEIS = ['valor', 'percentual', 'criadoEm', 'pagoEm'];

/** Status a partir dos quais uma comissão pode ser liquidada. */
const LIQUIDAVEIS: StatusComissao[] = [StatusComissao.AGUARDANDO_PGTO, StatusComissao.PROCESSANDO];

@Injectable()
export class ComissoesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(f: FiltrarComissoesDto): Promise<PaginatedResult<unknown>> {
    const periodo = intervaloDatas(f.de, f.ate);
    const where: Prisma.ComissaoWhereInput = {
      ...(f.status ? { status: f.status } : {}),
      ...(f.associadoId ? { associadoId: f.associadoId } : {}),
      ...(periodo ? { venda: { dataVenda: periodo } } : {}),
      ...(f.search
        ? {
            OR: [
              { associado: { nome: { contains: f.search, mode: Prisma.QueryMode.insensitive } } },
              { venda: { produto: { nome: { contains: f.search, mode: Prisma.QueryMode.insensitive } } } },
              { venda: { ref: { contains: f.search, mode: Prisma.QueryMode.insensitive } } },
            ],
          }
        : {}),
    };

    const [total, comissoes] = await this.prisma.$transaction([
      this.prisma.comissao.count({ where }),
      this.prisma.comissao.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: ordenar(f.sort, f.order, CAMPOS_ORDENAVEIS, { criadoEm: 'desc' }),
        include: {
          associado: { select: { id: true, nome: true, handle: true, email: true } },
          venda: {
            select: {
              id: true, ref: true, total: true, dataVenda: true, status: true,
              produto: { select: { nome: true, categoria: { select: { nome: true } } } },
            },
          },
          saque: { select: { id: true, status: true, solicitadoEm: true } },
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

  async buscar(id: string) {
    const c = await this.prisma.comissao.findUniqueOrThrow({
      where: { id },
      include: {
        associado: { select: { id: true, nome: true, handle: true, email: true } },
        venda: { include: { produto: { select: { nome: true, sku: true } } } },
        saque: true,
      },
    });
    return {
      ...c,
      valor: num(c.valor),
      percentual: num(c.percentual),
      venda: { ...c.venda, total: num(c.venda.total) },
    };
  }

  async alterarStatus(id: string, dto: AlterarStatusComissaoDto) {
    const comissao = await this.prisma.comissao.update({
      where: { id },
      data: {
        status: dto.status,
        pagoEm: dto.status === StatusComissao.PAGA ? new Date() : null,
      },
      include: { associado: { select: { id: true, nome: true } } },
    });
    return { ...comissao, valor: num(comissao.valor), percentual: num(comissao.percentual) };
  }

  /** Liquida um lote de comissões e notifica cada associado envolvido. */
  async pagarLote(dto: PagarComissoesDto) {
    return this.prisma.$transaction(async (tx) => {
      const comissoes = await tx.comissao.findMany({
        where: { id: { in: dto.ids } },
        include: { associado: { select: { id: true, nome: true } } },
      });

      if (comissoes.length !== dto.ids.length) {
        throw new ConflictException('Uma ou mais comissões informadas não existem.');
      }

      const invalidas = comissoes.filter((c) => !LIQUIDAVEIS.includes(c.status));
      if (invalidas.length) {
        throw new ConflictException(
          `${invalidas.length} comissão(ões) não estão em estado liquidável (já pagas ou canceladas).`,
        );
      }

      const agora = new Date();
      await tx.comissao.updateMany({
        where: { id: { in: dto.ids } },
        data: { status: StatusComissao.PAGA, pagoEm: agora },
      });

      // uma notificação por associado, com o total consolidado
      const porAssociado = new Map<string, { nome: string; total: number }>();
      for (const c of comissoes) {
        const atual = porAssociado.get(c.associadoId) ?? { nome: c.associado.nome, total: 0 };
        atual.total += num(c.valor);
        porAssociado.set(c.associadoId, atual);
      }

      await tx.notificacao.createMany({
        data: [...porAssociado].map(([associadoId, { total }]) => ({
          associadoId,
          titulo: 'Comissões pagas',
          mensagem: `R$ ${total.toFixed(2)} em comissões foram liquidados.`,
          tipo: TipoNotificacao.COMISSAO,
        })),
      });

      const totalPago = comissoes.reduce((s, c) => s + num(c.valor), 0);

      return {
        quantidade: comissoes.length,
        totalPago: Number(totalPago.toFixed(2)),
        associados: porAssociado.size,
        pagoEm: agora,
      };
    });
  }

  /** Cards do topo da tela de comissões. */
  async estatisticas(f: Pick<FiltrarComissoesDto, 'de' | 'ate' | 'associadoId'>) {
    const periodo = intervaloDatas(f.de, f.ate);
    const where: Prisma.ComissaoWhereInput = {
      ...(f.associadoId ? { associadoId: f.associadoId } : {}),
      ...(periodo ? { venda: { dataVenda: periodo } } : {}),
    };

    const [porStatus, geral, mediaPct] = await Promise.all([
      this.prisma.comissao.groupBy({ by: ['status'], where, _count: true, _sum: { valor: true } }),
      this.prisma.comissao.aggregate({ where, _sum: { valor: true }, _count: true }),
      this.prisma.comissao.aggregate({ where, _avg: { percentual: true } }),
    ]);

    const soma = (s: StatusComissao): number =>
      num(porStatus.find((g) => g.status === s)?._sum.valor);

    return {
      total: geral._count,
      valorTotal: num(geral._sum.valor),
      pagas: soma(StatusComissao.PAGA),
      processando: soma(StatusComissao.PROCESSANDO),
      aguardando: soma(StatusComissao.AGUARDANDO_PGTO),
      pendentes: soma(StatusComissao.PROCESSANDO) + soma(StatusComissao.AGUARDANDO_PGTO),
      percentualMedio: Number(num(mediaPct._avg.percentual).toFixed(2)),
      porStatus: porStatus.map((g) => ({
        status: g.status,
        quantidade: g._count,
        valor: num(g._sum.valor),
      })),
    };
  }

  /** Saldo disponível para saque de um associado. */
  async saldoDisponivel(associadoId: string) {
    const [pagas, pendentes, sacado, emProcessamento] = await Promise.all([
      this.prisma.comissao.aggregate({
        where: { associadoId, status: StatusComissao.PAGA },
        _sum: { valor: true },
      }),
      this.prisma.comissao.aggregate({
        where: { associadoId, status: { in: LIQUIDAVEIS } },
        _sum: { valor: true },
      }),
      this.prisma.saque.aggregate({
        where: { associadoId, status: 'CONCLUIDO' },
        _sum: { valor: true },
      }),
      this.prisma.saque.aggregate({
        where: { associadoId, status: { in: ['PENDENTE', 'PROCESSANDO'] } },
        _sum: { valor: true },
      }),
    ]);

    const ganho = num(pagas._sum.valor);
    const jaSacado = num(sacado._sum.valor);
    const bloqueado = num(emProcessamento._sum.valor);

    return {
      totalGanho: ganho,
      comissoesPendentes: num(pendentes._sum.valor),
      saquesRealizados: jaSacado,
      emProcessamento: bloqueado,
      disponivelParaSaque: Number(Math.max(ganho - jaSacado - bloqueado, 0).toFixed(2)),
    };
  }

  /** Ranking de associados por comissão acumulada. */
  async topAssociados(limite = 10) {
    const grupos = await this.prisma.comissao.groupBy({
      by: ['associadoId'],
      where: { status: StatusComissao.PAGA },
      _sum: { valor: true },
      _count: true,
      orderBy: { _sum: { valor: 'desc' } },
      take: limite,
    });

    const associados = await this.prisma.associado.findMany({
      where: { id: { in: grupos.map((g) => g.associadoId) } },
      select: { id: true, nome: true, handle: true, plano: { select: { nome: true } } },
    });
    const porId = new Map(associados.map((a) => [a.id, a]));

    return grupos.map((g, i) => ({
      posicao: i + 1,
      associadoId: g.associadoId,
      nome: porId.get(g.associadoId)?.nome ?? '—',
      handle: porId.get(g.associadoId)?.handle ?? '—',
      plano: porId.get(g.associadoId)?.plano.nome ?? '—',
      comissoes: g._count,
      total: num(g._sum.valor),
    }));
  }
}
