import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  Prisma,
  StatusComissao,
  StatusProduto,
  StatusVenda,
  TipoDesconto,
  TipoNotificacao,
} from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buscaTextual, intervaloDatas, num, ordenar } from '../../common/utils/query.util';
import { AtualizarStatusVendaDto, CriarVendaDto, FiltrarVendasDto } from './dto/venda.dto';

const CAMPOS_ORDENAVEIS = ['dataVenda', 'total', 'criadoEm', 'ref'];

/** Transições de status permitidas — impede reembolsar uma venda cancelada, etc. */
const TRANSICOES: Record<StatusVenda, StatusVenda[]> = {
  [StatusVenda.AGUARDANDO_PGTO]: [StatusVenda.PAGA, StatusVenda.CANCELADA],
  [StatusVenda.PAGA]: [StatusVenda.REEMBOLSADA],
  [StatusVenda.CANCELADA]: [],
  [StatusVenda.REEMBOLSADA]: [],
};

@Injectable()
export class VendasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(f: FiltrarVendasDto): Promise<PaginatedResult<unknown>> {
    const periodo = intervaloDatas(f.de, f.ate);
    const where: Prisma.VendaWhereInput = {
      ...(f.status ? { status: f.status } : {}),
      ...(f.associadoId ? { associadoId: f.associadoId } : {}),
      ...(f.produtoId ? { produtoId: f.produtoId } : {}),
      ...(periodo ? { dataVenda: periodo } : {}),
      ...buscaTextual(f.search, ['ref', 'clienteNome', 'clienteEmail']),
    };

    const [total, vendas] = await this.prisma.$transaction([
      this.prisma.venda.count({ where }),
      this.prisma.venda.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: ordenar(f.sort, f.order, CAMPOS_ORDENAVEIS, { dataVenda: 'desc' }),
        include: {
          produto: {
            select: { id: true, nome: true, sku: true, categoria: { select: { nome: true } } },
          },
          associado: { select: { id: true, nome: true, handle: true } },
          loja: { select: { id: true, nome: true, slug: true } },
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

  async buscar(id: string) {
    const v = await this.prisma.venda.findFirstOrThrow({
      where: { OR: [{ id }, { ref: id }] },
      include: {
        produto: { include: { categoria: { select: { nome: true, cor: true } } } },
        associado: { select: { id: true, nome: true, handle: true, email: true } },
        loja: { select: { id: true, nome: true, slug: true } },
        cupom: { select: { codigo: true, desconto: true, tipoDesconto: true } },
        comissao: true,
      },
    });

    return {
      ...v,
      precoUnitario: num(v.precoUnitario),
      desconto: num(v.desconto),
      total: num(v.total),
      produto: { ...v.produto, preco: num(v.produto.preco), comissaoPct: num(v.produto.comissaoPct) },
      comissao: v.comissao
        ? { ...v.comissao, valor: num(v.comissao.valor), percentual: num(v.comissao.percentual) }
        : null,
    };
  }

  /**
   * Registra uma venda: aplica cupom, calcula o total, gera a comissão
   * (percentual do produto + bônus do plano) e baixa o estoque — tudo em
   * uma transação, para que nada fique pela metade.
   */
  async criar(dto: CriarVendaDto) {
    const quantidade = dto.quantidade ?? 1;

    return this.prisma.$transaction(async (tx) => {
      // O checkout acontece no fornecedor, que devolve o `ref` do link de origem.
      // É por ele que a venda é atribuída — sem isso, a loja venderia sem dono.
      const linkOrigem = dto.ref
        ? await tx.linkAfiliado.findUnique({ where: { codigo: dto.ref } })
        : null;

      if (dto.ref && !linkOrigem) {
        throw new BadRequestException(`Código de origem "${dto.ref}" não existe.`);
      }

      const associadoOrigem = linkOrigem?.associadoId ?? dto.associadoId;
      if (!associadoOrigem) {
        throw new BadRequestException('Informe o associado (`associadoId`) ou a origem (`ref`).');
      }

      if (linkOrigem && dto.produtoId !== linkOrigem.produtoId) {
        throw new BadRequestException(
          'O código de origem pertence a outro produto — a atribuição seria incorreta.',
        );
      }

      const produto = await tx.produto.findUniqueOrThrow({ where: { id: dto.produtoId } });
      if (produto.status !== StatusProduto.ATIVO) {
        throw new ConflictException(`"${produto.nome}" não está disponível para venda.`);
      }

      const associado = await tx.associado.findUniqueOrThrow({
        where: { id: associadoOrigem },
        include: { plano: true, loja: { select: { id: true } } },
      });

      const bruto = num(produto.preco) * quantidade;

      // cupom: precisa pertencer ao associado, estar ativo, dentro da validade e do limite
      let desconto = 0;
      let cupomId: string | null = null;
      if (dto.cupom) {
        const cupom = await tx.cupom.findUnique({
          where: { associadoId_codigo: { associadoId: associadoOrigem, codigo: dto.cupom.toUpperCase() } },
        });
        if (!cupom || !cupom.ativo) throw new BadRequestException('Cupom inválido ou inativo.');
        if (cupom.validoAte && cupom.validoAte < new Date()) {
          throw new BadRequestException('Cupom expirado.');
        }
        if (cupom.limiteUsos !== null && cupom.usos >= cupom.limiteUsos) {
          throw new BadRequestException('Cupom atingiu o limite de usos.');
        }
        if (cupom.compraMinima && bruto < num(cupom.compraMinima)) {
          throw new BadRequestException(
            `Cupom exige compra mínima de R$ ${num(cupom.compraMinima).toFixed(2)}.`,
          );
        }

        desconto =
          cupom.tipoDesconto === TipoDesconto.PERCENTUAL
            ? (bruto * num(cupom.desconto)) / 100
            : Math.min(num(cupom.desconto), bruto);
        cupomId = cupom.id;

        await tx.cupom.update({ where: { id: cupom.id }, data: { usos: { increment: 1 } } });
      }

      const total = Number((bruto - desconto).toFixed(2));

      // comissão = percentual do produto + bônus do plano do associado
      const percentual = num(produto.comissaoPct) + num(associado.plano.comissaoExtraPct);
      const valorComissao = Number(((total * percentual) / 100).toFixed(2));

      // estoque: -1 é ilimitado e não é decrementado
      if (produto.estoque !== -1) {
        if (produto.estoque < quantidade) {
          throw new ConflictException(
            `Estoque insuficiente para "${produto.nome}": disponível ${produto.estoque}.`,
          );
        }
        const restante = produto.estoque - quantidade;
        await tx.produto.update({
          where: { id: produto.id },
          data: {
            estoque: restante,
            ...(restante === 0 ? { status: StatusProduto.ESGOTADO } : {}),
          },
        });
      }

      const venda = await tx.venda.create({
        data: {
          ref: await this.proximaRef(tx),
          produtoId: produto.id,
          associadoId: associado.id,
          lojaId: dto.lojaId ?? associado.loja?.id ?? null,
          cupomId,
          clienteNome: dto.clienteNome,
          clienteEmail: dto.clienteEmail,
          quantidade,
          precoUnitario: produto.preco,
          desconto,
          total,
          status: StatusVenda.AGUARDANDO_PGTO,
          dataVenda: dto.dataVenda ? new Date(dto.dataVenda) : new Date(),
          comissao: {
            create: {
              associadoId: associado.id,
              percentual,
              valor: valorComissao,
              status: StatusComissao.AGUARDANDO_PGTO,
            },
          },
        },
        include: { comissao: true, produto: { select: { nome: true } } },
      });

      if (linkOrigem) {
        // conversão e receita do link, que alimentam o relatório de performance
        await tx.linkAfiliado.update({
          where: { id: linkOrigem.id },
          data: {
            conversoes: { increment: 1 },
            receita: { increment: total },
            comissao: { increment: valorComissao },
          },
        });
      }

      await tx.notificacao.create({
        data: {
          associadoId: associado.id,
          titulo: 'Nova venda registrada',
          mensagem: `${dto.clienteNome} comprou "${produto.nome}" — R$ ${total.toFixed(2)}.`,
          tipo: TipoNotificacao.VENDA,
          link: `/vendas/${venda.id}`,
        },
      });

      return {
        ...venda,
        precoUnitario: num(venda.precoUnitario),
        desconto: num(venda.desconto),
        total: num(venda.total),
        comissao: venda.comissao
          ? { ...venda.comissao, valor: num(venda.comissao.valor), percentual: num(venda.comissao.percentual) }
          : null,
      };
    });
  }

  /**
   * Muda o status da venda respeitando as transições válidas e propaga
   * o efeito para a comissão, o estoque e o contador do produto.
   */
  async alterarStatus(id: string, dto: AtualizarStatusVendaDto) {
    return this.prisma.$transaction(async (tx) => {
      const venda = await tx.venda.findUniqueOrThrow({
        where: { id },
        include: { comissao: true, produto: true },
      });

      if (venda.status === dto.status) {
        throw new ConflictException(`A venda já está com status ${dto.status}.`);
      }
      if (!TRANSICOES[venda.status].includes(dto.status)) {
        throw new ConflictException(
          `Transição inválida: ${venda.status} → ${dto.status}. Permitidas: ${
            TRANSICOES[venda.status].join(', ') || 'nenhuma (status final)'
          }.`,
        );
      }

      const atualizada = await tx.venda.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.status === StatusVenda.REEMBOLSADA ? { reembolsadaEm: new Date() } : {}),
        },
      });

      if (venda.comissao) {
        // comissão acompanha o destino da venda
        const statusComissao =
          dto.status === StatusVenda.PAGA
            ? StatusComissao.PROCESSANDO
            : StatusComissao.CANCELADA;
        await tx.comissao.update({
          where: { id: venda.comissao.id },
          data: { status: statusComissao },
        });
      }

      const efetivada = dto.status === StatusVenda.PAGA;
      const desfeita = dto.status === StatusVenda.CANCELADA || dto.status === StatusVenda.REEMBOLSADA;

      if (efetivada) {
        await tx.produto.update({
          where: { id: venda.produtoId },
          data: { totalVendas: { increment: venda.quantidade } },
        });
      } else if (desfeita) {
        // devolve ao estoque o que havia sido reservado
        if (venda.produto.estoque !== -1) {
          await tx.produto.update({
            where: { id: venda.produtoId },
            data: {
              estoque: { increment: venda.quantidade },
              ...(venda.produto.status === StatusProduto.ESGOTADO ? { status: StatusProduto.ATIVO } : {}),
            },
          });
        }
        if (venda.status === StatusVenda.PAGA) {
          await tx.produto.update({
            where: { id: venda.produtoId },
            data: { totalVendas: { decrement: venda.quantidade } },
          });
        }
      }

      await tx.notificacao.create({
        data: {
          associadoId: venda.associadoId,
          titulo: `Venda ${dto.status.toLowerCase().replace('_', ' ')}`,
          mensagem:
            `A venda ${venda.ref} passou para ${dto.status}.` + (dto.motivo ? ` Motivo: ${dto.motivo}` : ''),
          tipo: TipoNotificacao.VENDA,
        },
      });

      return { ...atualizada, total: num(atualizada.total) };
    });
  }

  /** Indicadores do topo da tela de vendas. */
  async estatisticas(f: Pick<FiltrarVendasDto, 'de' | 'ate' | 'associadoId'>) {
    const periodo = intervaloDatas(f.de, f.ate);
    const base: Prisma.VendaWhereInput = {
      ...(periodo ? { dataVenda: periodo } : {}),
      ...(f.associadoId ? { associadoId: f.associadoId } : {}),
    };

    const [porStatus, aprovadas, comissoes] = await Promise.all([
      this.prisma.venda.groupBy({ by: ['status'], where: base, _count: true, _sum: { total: true } }),
      this.prisma.venda.aggregate({
        where: { ...base, status: StatusVenda.PAGA },
        _sum: { total: true },
        _avg: { total: true },
        _count: true,
      }),
      this.prisma.comissao.aggregate({
        where: { venda: base },
        _sum: { valor: true },
      }),
    ]);

    const total = porStatus.reduce((s, g) => s + g._count, 0);
    const contar = (s: StatusVenda): number => porStatus.find((g) => g.status === s)?._count ?? 0;
    const canceladas = contar(StatusVenda.CANCELADA) + contar(StatusVenda.REEMBOLSADA);

    return {
      totalVendas: total,
      vendasAprovadas: aprovadas._count,
      receitaTotal: num(aprovadas._sum.total),
      ticketMedio: Number(num(aprovadas._avg.total).toFixed(2)),
      comissoesGeradas: num(comissoes._sum.valor),
      taxaConversao: total ? Number(((aprovadas._count / total) * 100).toFixed(1)) : 0,
      taxaCancelamento: total ? Number(((canceladas / total) * 100).toFixed(1)) : 0,
      porStatus: porStatus.map((g) => ({
        status: g.status,
        quantidade: g._count,
        valor: num(g._sum.total),
      })),
    };
  }

  /** Série mensal de receita e comissões, para os gráficos. */
  async serieMensal(meses = 6) {
    const desde = new Date();
    desde.setMonth(desde.getMonth() - meses);
    desde.setDate(1);

    const linhas = await this.prisma.$queryRaw<
      Array<{ mes: Date; vendas: bigint; receita: number | null; comissao: number | null }>
    >`
      SELECT date_trunc('month', v."dataVenda") AS mes,
             COUNT(*)                          AS vendas,
             SUM(v.total)::float               AS receita,
             SUM(c.valor)::float               AS comissao
        FROM vendas v
        LEFT JOIN comissoes c ON c."vendaId" = v.id
       WHERE v."dataVenda" >= ${desde}
         AND v.status = 'PAGA'
       GROUP BY 1
       ORDER BY 1
    `;

    return linhas.map((l) => ({
      mes: l.mes.toISOString().slice(0, 7),
      vendas: Number(l.vendas),
      receita: Number((l.receita ?? 0).toFixed(2)),
      comissao: Number((l.comissao ?? 0).toFixed(2)),
    }));
  }

  /** Exportação CSV da listagem — equivalente ao botão "Exportar CSV" da tela. */
  async exportarCsv(f: FiltrarVendasDto): Promise<string> {
    const filtros = Object.assign(new FiltrarVendasDto(), f, { page: 1, limit: 100 });
    const { data } = await this.listar(filtros);
    const linhas = data as Array<Record<string, any>>;

    const cabecalho = ['Ref', 'Produto', 'Associado', 'Cliente', 'Qtd', 'Total', 'Comissão', 'Data', 'Status'];
    const escapar = (v: unknown): string => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const corpo = linhas.map((v) =>
      [
        v.ref,
        v.produto?.nome,
        v.associado?.nome,
        v.clienteNome,
        v.quantidade,
        v.total,
        v.comissao?.valor ?? 0,
        new Date(v.dataVenda).toLocaleDateString('pt-BR'),
        v.status,
      ]
        .map(escapar)
        .join(','),
    );

    return [cabecalho.map(escapar).join(','), ...corpo].join('\n');
  }

  // ---------------------------------------------------------------- internos

  /** Gera a próxima referência no formato CHK-NNNNN, contínuo com o histórico. */
  private async proximaRef(tx: Prisma.TransactionClient): Promise<string> {
    const ultima = await tx.venda.findFirst({
      where: { ref: { startsWith: 'CHK-' } },
      orderBy: { ref: 'desc' },
      select: { ref: true },
    });
    const n = ultima ? Number.parseInt(ultima.ref.replace('CHK-', ''), 10) + 1 : 10_000;
    return `CHK-${n}`;
  }
}
