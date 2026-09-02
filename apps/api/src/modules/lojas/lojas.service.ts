import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, StatusProduto, StatusVenda } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ORDEM_PLANO } from '../../common/guards/plano.guard';
import { buscaTextual, num, ordenar } from '../../common/utils/query.util';
import {
  AdicionarProdutoDto,
  AtualizarLojaDto,
  CriarLojaDto,
  FiltrarLojasDto,
} from './dto/loja.dto';

const CAMPOS_ORDENAVEIS = ['nome', 'visualizacoes', 'criadoEm'];

@Injectable()
export class LojasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(f: FiltrarLojasDto): Promise<PaginatedResult<unknown>> {
    const where: Prisma.LojaWhereInput = {
      ...(f.ativa !== undefined ? { ativa: f.ativa } : {}),
      ...(f.plano ? { associado: { plano: { nivel: f.plano } } } : {}),
      ...buscaTextual(f.search, ['nome', 'slug', 'descricao']),
    };

    const [total, lojas] = await this.prisma.$transaction([
      this.prisma.loja.count({ where }),
      this.prisma.loja.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: ordenar(f.sort, f.order, CAMPOS_ORDENAVEIS, { nome: 'asc' }),
        include: {
          associado: {
            select: { id: true, nome: true, handle: true, plano: { select: { nome: true, nivel: true } } },
          },
          _count: { select: { produtos: true, vendas: true } },
        },
      }),
    ]);

    const data = lojas.map(({ _count, ...l }) => ({
      ...l,
      totalProdutos: _count.produtos,
      totalVendas: _count.vendas,
    }));

    return paginate(data, total, f.page, f.limit);
  }

  async buscar(id: string) {
    const loja = await this.prisma.loja.findUniqueOrThrow({
      where: { id },
      include: {
        associado: {
          select: {
            id: true, nome: true, handle: true, email: true, bio: true,
            plano: { select: { nome: true, nivel: true, limiteProdutos: true } },
          },
        },
        produtos: {
          orderBy: [{ destaque: 'desc' }, { ordem: 'asc' }],
          include: {
            produto: {
              include: { categoria: { select: { nome: true, slug: true, cor: true } } },
            },
          },
        },
      },
    });

    const vendas = await this.prisma.venda.aggregate({
      where: { lojaId: id, status: StatusVenda.PAGA },
      _sum: { total: true },
      _count: true,
    });

    return {
      ...loja,
      produtos: loja.produtos.map((lp) => ({
        ...lp.produto,
        preco: num(lp.produto.preco),
        comissaoPct: num(lp.produto.comissaoPct),
        destaque: lp.destaque,
        ordem: lp.ordem,
      })),
      desempenho: {
        vendasAprovadas: vendas._count,
        receita: num(vendas._sum.total),
        visualizacoes: loja.visualizacoes,
        conversao: loja.visualizacoes
          ? Number(((vendas._count / loja.visualizacoes) * 100).toFixed(2))
          : 0,
      },
    };
  }

  /** Vitrine pública por slug — registra a visita e devolve só o que é publicável. */
  async vitrinePublica(slug: string) {
    const loja = await this.prisma.loja.findUniqueOrThrow({
      where: { slug },
      include: {
        associado: { select: { nome: true, handle: true, bio: true } },
        produtos: {
          where: { produto: { status: StatusProduto.ATIVO } },
          orderBy: [{ destaque: 'desc' }, { ordem: 'asc' }],
          include: { produto: { include: { categoria: { select: { nome: true, cor: true } } } } },
        },
      },
    });

    if (!loja.ativa) {
      throw new ForbiddenException('Esta loja está temporariamente indisponível.');
    }

    await this.prisma.loja.update({
      where: { id: loja.id },
      data: { visualizacoes: { increment: 1 } },
    });

    // o código de origem de cada produto: é o que liga a compra ao associado
    const links = await this.prisma.linkAfiliado.findMany({
      where: {
        associadoId: loja.associadoId,
        produtoId: { in: loja.produtos.map((lp) => lp.produtoId) },
      },
      select: { produtoId: true, codigo: true },
    });
    const codigoPorProduto = new Map(links.map((l) => [l.produtoId, l.codigo]));

    return {
      nome: loja.nome,
      slug: loja.slug,
      descricao: loja.descricao,
      corPrimaria: loja.corPrimaria,
      bannerUrl: loja.bannerUrl,
      logoUrl: loja.logoUrl,
      associado: loja.associado,
      produtos: loja.produtos.map((lp) => ({
        id: lp.produto.id,
        nome: lp.produto.nome,
        descricao: lp.produto.descricao,
        preco: num(lp.produto.preco),
        imagemUrl: lp.produto.imagemUrl,
        checkoutUrl: lp.produto.checkoutUrl,
        categoria: lp.produto.categoria.nome,
        destaque: lp.destaque,
        /** usar com /portal/r/{codigo}; ausente = produto sem rastreio */
        codigoAfiliado: codigoPorProduto.get(lp.produtoId) ?? null,
      })),
    };
  }

  /**
   * Garante o link rastreável de (associado, produto). Idempotente.
   *
   * Vive aqui porque é o ponto por onde todo produto entra numa vitrine —
   * tanto pelo portal quanto pela administração. Sem link, a venda originada
   * na loja não teria como ser atribuída ao associado.
   */
  async garantirLinkAfiliado(associadoId: string, produtoId: string) {
    const existente = await this.prisma.linkAfiliado.findUnique({
      where: { associadoId_produtoId: { associadoId, produtoId } },
    });
    if (existente) return existente;

    const { handle } = await this.prisma.associado.findUniqueOrThrow({
      where: { id: associadoId },
      select: { handle: true },
    });

    const prefixo = handle.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase() || 'DBR';

    // deriva do maior sufixo já usado, e não da contagem: se um link for
    // removido, a contagem cairia e o próximo código colidiria
    const existentes = await this.prisma.linkAfiliado.findMany({
      where: { associadoId, codigo: { startsWith: prefixo } },
      select: { codigo: true },
    });
    const maior = existentes.reduce((max, { codigo }) => {
      const n = Number.parseInt(codigo.slice(prefixo.length), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);

    return this.prisma.linkAfiliado.create({
      data: { associadoId, produtoId, codigo: `${prefixo}${maior + 1}` },
    });
  }

  criar(dto: CriarLojaDto) {
    return this.prisma.loja.create({ data: dto });
  }

  atualizar(id: string, dto: AtualizarLojaDto) {
    const { associadoId, ...resto } = dto;
    void associadoId; // a loja não muda de dono
    return this.prisma.loja.update({ where: { id }, data: resto });
  }

  async alterarStatus(id: string, ativa: boolean) {
    return this.prisma.loja.update({
      where: { id },
      data: { ativa },
      select: { id: true, nome: true, ativa: true },
    });
  }

  /**
   * Adiciona um produto à vitrine, respeitando o limite de produtos do plano
   * e a exclusividade do produto.
   */
  async adicionarProduto(lojaId: string, dto: AdicionarProdutoDto) {
    const [loja, produto] = await Promise.all([
      this.prisma.loja.findUniqueOrThrow({
        where: { id: lojaId },
        include: {
          associado: { select: { plano: { select: { nivel: true, nome: true, limiteProdutos: true } } } },
          _count: { select: { produtos: true } },
        },
      }),
      this.prisma.produto.findUniqueOrThrow({
        where: { id: dto.produtoId },
        include: { planoMinimo: { select: { nivel: true, nome: true } } },
      }),
    ]);

    const { limiteProdutos, nivel, nome: nomePlano } = loja.associado.plano;

    if (limiteProdutos !== -1 && loja._count.produtos >= limiteProdutos) {
      throw new ConflictException(
        `O plano ${nomePlano} permite até ${limiteProdutos} produtos na loja. Faça upgrade para adicionar mais.`,
      );
    }

    if (produto.planoMinimo && ORDEM_PLANO[nivel] < ORDEM_PLANO[produto.planoMinimo.nivel]) {
      throw new ForbiddenException(
        `"${produto.nome}" é exclusivo do plano ${produto.planoMinimo.nome} ou superior.`,
      );
    }

    if (produto.status !== StatusProduto.ATIVO) {
      throw new ConflictException(`"${produto.nome}" não está ativo no catálogo.`);
    }

    const item = await this.prisma.lojaProduto.create({
      data: {
        lojaId,
        produtoId: dto.produtoId,
        destaque: dto.destaque ?? false,
        ordem: dto.ordem ?? loja._count.produtos + 1,
      },
      include: { produto: { select: { nome: true, sku: true } } },
    });

    const link = await this.garantirLinkAfiliado(loja.associadoId, dto.produtoId);
    return { ...item, codigoAfiliado: link.codigo };
  }

  async removerProduto(lojaId: string, produtoId: string) {
    await this.prisma.lojaProduto.delete({
      where: { lojaId_produtoId: { lojaId, produtoId } },
    });
    return { lojaId, produtoId, removido: true };
  }

  async reordenarProdutos(lojaId: string, ordens: Array<{ produtoId: string; ordem: number }>) {
    await this.prisma.$transaction(
      ordens.map((o) =>
        this.prisma.lojaProduto.update({
          where: { lojaId_produtoId: { lojaId, produtoId: o.produtoId } },
          data: { ordem: o.ordem },
        }),
      ),
    );
    return { lojaId, atualizados: ordens.length };
  }

  async estatisticas() {
    const [total, ativas, visualizacoes, produtosNaVitrine] = await Promise.all([
      this.prisma.loja.count(),
      this.prisma.loja.count({ where: { ativa: true } }),
      this.prisma.loja.aggregate({ _sum: { visualizacoes: true }, _avg: { visualizacoes: true } }),
      this.prisma.lojaProduto.count(),
    ]);

    return {
      total,
      ativas,
      inativas: total - ativas,
      visualizacoesTotais: visualizacoes._sum.visualizacoes ?? 0,
      visualizacoesMedia: Math.round(visualizacoes._avg.visualizacoes ?? 0),
      produtosNaVitrine,
      mediaProdutosPorLoja: total ? Number((produtosNaVitrine / total).toFixed(1)) : 0,
    };
  }
}
