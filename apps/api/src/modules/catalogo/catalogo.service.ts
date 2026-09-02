import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { NivelPlano, Prisma, StatusProduto, StatusVenda } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ORDEM_PLANO } from '../../common/guards/plano.guard';
import { buscaTextual, num, ordenar } from '../../common/utils/query.util';
import {
  AtualizarCategoriaDto,
  AtualizarProdutoDto,
  CriarCategoriaDto,
  CriarProdutoDto,
  FiltrarProdutosDto,
} from './dto/produto.dto';

const CAMPOS_ORDENAVEIS = ['nome', 'preco', 'comissaoPct', 'totalVendas', 'criadoEm'];

const slugify = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- categorias

  async listarCategorias() {
    const cats = await this.prisma.categoriaProduto.findMany({
      orderBy: { ordem: 'asc' },
      include: { _count: { select: { produtos: true } } },
    });
    return cats.map(({ _count, ...c }) => ({ ...c, totalProdutos: _count.produtos }));
  }

  criarCategoria(dto: CriarCategoriaDto) {
    return this.prisma.categoriaProduto.create({
      data: { ...dto, slug: slugify(dto.nome), ordem: dto.ordem ?? 0 },
    });
  }

  atualizarCategoria(id: string, dto: AtualizarCategoriaDto) {
    return this.prisma.categoriaProduto.update({
      where: { id },
      data: { ...dto, ...(dto.nome ? { slug: slugify(dto.nome) } : {}) },
    });
  }

  async removerCategoria(id: string) {
    const emUso = await this.prisma.produto.count({ where: { categoriaId: id } });
    if (emUso > 0) {
      throw new ConflictException(`Categoria possui ${emUso} produto(s) — realoque-os antes de remover.`);
    }
    await this.prisma.categoriaProduto.delete({ where: { id } });
    return { id, removida: true };
  }

  // ---------------------------------------------------------------- produtos

  /**
   * Lista o catálogo. Quando `nivelAssociado` é informado, produtos acima do
   * plano do associado vêm marcados como bloqueados (ou são omitidos com
   * `apenasDisponiveis`).
   */
  async listarProdutos(
    f: FiltrarProdutosDto,
    nivelAssociado?: NivelPlano | null,
  ): Promise<PaginatedResult<unknown>> {
    const where: Prisma.ProdutoWhereInput = {
      ...(f.status ? { status: f.status } : {}),
      ...(f.categoria
        ? { categoria: { OR: [{ id: f.categoria }, { slug: f.categoria }] } }
        : {}),
      ...(f.planoMinimo ? { planoMinimo: { nivel: f.planoMinimo } } : {}),
      ...(f.precoMin !== undefined || f.precoMax !== undefined
        ? {
            preco: {
              ...(f.precoMin !== undefined ? { gte: f.precoMin } : {}),
              ...(f.precoMax !== undefined ? { lte: f.precoMax } : {}),
            },
          }
        : {}),
      ...(f.comissaoMin !== undefined ? { comissaoPct: { gte: f.comissaoMin } } : {}),
      ...buscaTextual(f.search, ['nome', 'sku', 'descricao']),
    };

    if (f.apenasDisponiveis && nivelAssociado) {
      where.OR = [
        { planoMinimoId: null },
        { planoMinimo: { nivel: { in: this.niveisAteh(nivelAssociado) } } },
      ];
    }

    const [total, produtos] = await this.prisma.$transaction([
      this.prisma.produto.count({ where }),
      this.prisma.produto.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: ordenar(f.sort, f.order, CAMPOS_ORDENAVEIS, { nome: 'asc' }),
        include: {
          categoria: { select: { id: true, nome: true, slug: true, cor: true } },
          planoMinimo: { select: { nivel: true, nome: true } },
          _count: { select: { lojas: true } },
        },
      }),
    ]);

    const data = produtos.map((p) => this.formatar(p, nivelAssociado));
    return paginate(data, total, f.page, f.limit);
  }

  async buscarProduto(id: string, nivelAssociado?: NivelPlano | null) {
    const produto = await this.prisma.produto.findFirstOrThrow({
      where: { OR: [{ id }, { sku: id }] },
      include: {
        categoria: { select: { id: true, nome: true, slug: true, cor: true } },
        planoMinimo: { select: { nivel: true, nome: true } },
        lojas: {
          include: {
            loja: {
              select: { id: true, nome: true, slug: true, ativa: true, associado: { select: { nome: true } } },
            },
          },
        },
        _count: { select: { lojas: true, vendas: true } },
      },
    });

    const receita = await this.prisma.venda.aggregate({
      where: { produtoId: produto.id, status: StatusVenda.PAGA },
      _sum: { total: true, quantidade: true },
    });

    return {
      ...this.formatar(produto, nivelAssociado),
      lojas: produto.lojas.map((lp) => ({
        id: lp.loja.id,
        nome: lp.loja.nome,
        slug: lp.loja.slug,
        ativa: lp.loja.ativa,
        associado: lp.loja.associado.nome,
        destaque: lp.destaque,
      })),
      desempenho: {
        unidadesVendidas: receita._sum.quantidade ?? 0,
        receita: num(receita._sum.total),
        totalVendas: produto._count.vendas,
      },
    };
  }

  async criarProduto(dto: CriarProdutoDto) {
    const planoMinimoId = await this.resolverPlano(dto.planoMinimo);

    const { planoMinimo, ...resto } = dto;
    void planoMinimo;

    return this.prisma.produto.create({
      data: { ...resto, sku: dto.sku.toUpperCase(), planoMinimoId, estoque: dto.estoque ?? -1 },
      include: { categoria: { select: { nome: true } } },
    });
  }

  async atualizarProduto(id: string, dto: AtualizarProdutoDto) {
    const { planoMinimo, sku, ...resto } = dto;

    const data: Prisma.ProdutoUpdateInput = {
      ...resto,
      ...(sku ? { sku: sku.toUpperCase() } : {}),
    };

    if (planoMinimo !== undefined) {
      const planoId = await this.resolverPlano(planoMinimo);
      data.planoMinimo = planoId ? { connect: { id: planoId } } : { disconnect: true };
    }

    return this.prisma.produto.update({ where: { id }, data });
  }

  async removerProduto(id: string) {
    const vendas = await this.prisma.venda.count({ where: { produtoId: id } });
    if (vendas > 0) {
      throw new ConflictException(
        `Produto possui ${vendas} venda(s) — inative-o em vez de excluir, para preservar o histórico.`,
      );
    }
    await this.prisma.produto.delete({ where: { id } });
    return { id, removido: true };
  }

  /** Baixa de estoque; -1 significa ilimitado e não é decrementado. */
  async baixarEstoque(produtoId: string, quantidade: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const produto = await client.produto.findUniqueOrThrow({ where: { id: produtoId } });

    if (produto.estoque === -1) return produto;
    if (produto.estoque < quantidade) {
      throw new ConflictException(
        `Estoque insuficiente para "${produto.nome}": disponível ${produto.estoque}, solicitado ${quantidade}.`,
      );
    }

    const restante = produto.estoque - quantidade;
    return client.produto.update({
      where: { id: produtoId },
      data: {
        estoque: restante,
        ...(restante === 0 ? { status: StatusProduto.ESGOTADO } : {}),
      },
    });
  }

  /** Cards do topo da tela de catálogo. */
  async estatisticas() {
    const [total, porStatus, porCategoria, agregados] = await Promise.all([
      this.prisma.produto.count(),
      this.prisma.produto.groupBy({ by: ['status'], _count: true }),
      this.prisma.produto.groupBy({ by: ['categoriaId'], _count: true }),
      this.prisma.produto.aggregate({ _avg: { preco: true, comissaoPct: true } }),
    ]);

    const categorias = await this.prisma.categoriaProduto.findMany({ select: { id: true, nome: true } });
    const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));

    return {
      total,
      porStatus: Object.fromEntries(porStatus.map((s) => [s.status, s._count])),
      porCategoria: porCategoria.map((c) => ({
        categoria: nomeCategoria.get(c.categoriaId) ?? '—',
        total: c._count,
      })),
      precoMedio: Number(num(agregados._avg.preco).toFixed(2)),
      comissaoMedia: Number(num(agregados._avg.comissaoPct).toFixed(2)),
    };
  }

  /** Produtos mais vendidos por receita. */
  async maisVendidos(limite = 5) {
    const top = await this.prisma.venda.groupBy({
      by: ['produtoId'],
      where: { status: StatusVenda.PAGA },
      _sum: { total: true, quantidade: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limite,
    });

    const produtos = await this.prisma.produto.findMany({
      where: { id: { in: top.map((t) => t.produtoId) } },
      select: { id: true, nome: true, preco: true, sku: true },
    });
    const porId = new Map(produtos.map((p) => [p.id, p]));

    return top.map((t) => ({
      id: t.produtoId,
      nome: porId.get(t.produtoId)?.nome ?? '—',
      sku: porId.get(t.produtoId)?.sku ?? '—',
      preco: num(porId.get(t.produtoId)?.preco),
      unidades: t._sum.quantidade ?? 0,
      receita: num(t._sum.total),
    }));
  }

  // ---------------------------------------------------------------- internos

  private niveisAteh(nivel: NivelPlano): NivelPlano[] {
    return (Object.keys(ORDEM_PLANO) as NivelPlano[]).filter(
      (n) => ORDEM_PLANO[n] <= ORDEM_PLANO[nivel],
    );
  }

  private async resolverPlano(nivel?: NivelPlano): Promise<string | null> {
    if (!nivel) return null;
    const plano = await this.prisma.plano.findUnique({ where: { nivel }, select: { id: true } });
    if (!plano) throw new BadRequestException('Plano informado não existe.');
    return plano.id;
  }

  private formatar(
    p: {
      preco: Prisma.Decimal;
      comissaoPct: Prisma.Decimal;
      estoque: number;
      planoMinimo?: { nivel: NivelPlano; nome: string } | null;
      _count?: { lojas: number };
      [k: string]: unknown;
    },
    nivelAssociado?: NivelPlano | null,
  ) {
    const preco = num(p.preco);
    const comissaoPct = num(p.comissaoPct);
    const exigido = p.planoMinimo?.nivel;

    return {
      ...p,
      preco,
      comissaoPct,
      estoqueIlimitado: p.estoque === -1,
      ganhoEstimado: Number(((preco * comissaoPct) / 100).toFixed(2)),
      emLojas: p._count?.lojas ?? 0,
      bloqueado:
        Boolean(exigido) && Boolean(nivelAssociado)
          ? ORDEM_PLANO[nivelAssociado!] < ORDEM_PLANO[exigido!]
          : false,
    };
  }
}
