import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buscaTextual } from '../../common/utils/query.util';
import {
  AtualizarPostDto,
  ComentarDto,
  CriarCategoriaComunidadeDto,
  CriarPostDto,
  FiltrarPostsDto,
} from './dto/comunidade.dto';

const slugify = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

/** Projeção padrão do autor exibida no feed. */
const AUTOR = {
  select: {
    id: true,
    nome: true,
    handle: true,
    plano: { select: { nome: true, nivel: true } },
  },
} satisfies Prisma.AssociadoDefaultArgs;

@Injectable()
export class ComunidadeService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- categorias

  async listarCategorias() {
    const cats = await this.prisma.categoriaComunidade.findMany({
      orderBy: { ordem: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
    return cats.map(({ _count, ...c }) => ({ ...c, totalPosts: _count.posts }));
  }

  criarCategoria(dto: CriarCategoriaComunidadeDto) {
    return this.prisma.categoriaComunidade.create({
      data: { ...dto, slug: slugify(dto.nome) },
    });
  }

  // ---------------------------------------------------------------- feed

  /**
   * Feed da comunidade. Posts fixados sempre vêm primeiro; a aba "populares"
   * ordena por engajamento em vez de data.
   */
  async listarPosts(f: FiltrarPostsDto, associadoId?: string | null): Promise<PaginatedResult<unknown>> {
    const where: Prisma.PostComunidadeWhereInput = {
      ...(f.categoriaId ? { categoriaId: f.categoriaId } : {}),
      ...(f.autorId ? { autorId: f.autorId } : {}),
      ...(f.fixados ? { fixado: true } : {}),
      ...buscaTextual(f.search, ['conteudo']),
    };

    const orderBy: Prisma.PostComunidadeOrderByWithRelationInput[] =
      f.aba === 'populares'
        ? [{ curtidas: { _count: 'desc' } }, { visualizacoes: 'desc' }]
        : [{ fixado: 'desc' }, { criadoEm: 'desc' }];

    const [total, posts] = await this.prisma.$transaction([
      this.prisma.postComunidade.count({ where }),
      this.prisma.postComunidade.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy,
        include: {
          autor: AUTOR,
          categoria: { select: { id: true, nome: true, slug: true, icone: true } },
          _count: { select: { curtidas: true, comentarios: true } },
          ...(associadoId
            ? { curtidas: { where: { associadoId }, select: { id: true } } }
            : {}),
        },
      }),
    ]);

    const data = posts.map(({ _count, curtidas, ...p }) => ({
      ...p,
      curtidas: _count.curtidas,
      comentarios: _count.comentarios,
      curtidoPorMim: Array.isArray(curtidas) ? curtidas.length > 0 : false,
    }));

    return paginate(data, total, f.page, f.limit);
  }

  /** Abre um post com seus comentários e contabiliza a visualização. */
  async buscarPost(id: string, associadoId?: string | null) {
    const post = await this.prisma.postComunidade.update({
      where: { id },
      data: { visualizacoes: { increment: 1 } },
      include: {
        autor: AUTOR,
        categoria: { select: { id: true, nome: true, icone: true } },
        comentarios: { orderBy: { criadoEm: 'asc' }, include: { autor: AUTOR } },
        _count: { select: { curtidas: true, comentarios: true } },
        ...(associadoId ? { curtidas: { where: { associadoId }, select: { id: true } } } : {}),
      },
    });

    const { _count, curtidas, ...resto } = post;
    return {
      ...resto,
      curtidas: _count.curtidas,
      totalComentarios: _count.comentarios,
      curtidoPorMim: Array.isArray(curtidas) ? curtidas.length > 0 : false,
    };
  }

  criarPost(autorId: string, dto: CriarPostDto) {
    return this.prisma.postComunidade.create({
      data: { autorId, ...dto },
      include: { autor: AUTOR, categoria: { select: { nome: true, icone: true } } },
    });
  }

  /** Edição restrita ao autor (administradores usam a moderação). */
  async atualizarPost(id: string, autorId: string, dto: AtualizarPostDto) {
    const post = await this.prisma.postComunidade.findUniqueOrThrow({ where: { id } });
    if (post.autorId !== autorId) {
      throw new ForbiddenException('Só o autor pode editar este post.');
    }
    return this.prisma.postComunidade.update({ where: { id }, data: dto });
  }

  /** Remoção pelo autor ou por um administrador. */
  async removerPost(id: string, autorId: string | null, ehAdmin: boolean) {
    const post = await this.prisma.postComunidade.findUniqueOrThrow({ where: { id } });
    if (!ehAdmin && post.autorId !== autorId) {
      throw new ForbiddenException('Só o autor ou um administrador pode remover este post.');
    }
    await this.prisma.postComunidade.delete({ where: { id } });
    return { id, removido: true };
  }

  async fixarPost(id: string, fixado: boolean) {
    return this.prisma.postComunidade.update({
      where: { id },
      data: { fixado },
      select: { id: true, fixado: true },
    });
  }

  /** Curtir/descurtir — a unicidade é garantida pela chave (post, associado). */
  async alternarCurtida(postId: string, associadoId: string) {
    const existente = await this.prisma.curtidaPost.findUnique({
      where: { postId_associadoId: { postId, associadoId } },
    });

    if (existente) {
      await this.prisma.curtidaPost.delete({ where: { id: existente.id } });
    } else {
      await this.prisma.curtidaPost.create({ data: { postId, associadoId } });
    }

    const curtidas = await this.prisma.curtidaPost.count({ where: { postId } });
    return { postId, curtido: !existente, curtidas };
  }

  async comentar(postId: string, autorId: string, dto: ComentarDto) {
    return this.prisma.comentarioPost.create({
      data: { postId, autorId, conteudo: dto.conteudo },
      include: { autor: AUTOR },
    });
  }

  async removerComentario(id: string, autorId: string | null, ehAdmin: boolean) {
    const comentario = await this.prisma.comentarioPost.findUniqueOrThrow({ where: { id } });
    if (!ehAdmin && comentario.autorId !== autorId) {
      throw new ForbiddenException('Só o autor ou um administrador pode remover este comentário.');
    }
    await this.prisma.comentarioPost.delete({ where: { id } });
    return { id, removido: true };
  }

  /** Cards do topo da comunidade. */
  async estatisticas() {
    const [posts, comentarios, curtidas, fixados, categorias, membrosAtivos] = await Promise.all([
      this.prisma.postComunidade.count(),
      this.prisma.comentarioPost.count(),
      this.prisma.curtidaPost.count(),
      this.prisma.postComunidade.count({ where: { fixado: true } }),
      this.prisma.categoriaComunidade.count(),
      this.prisma.postComunidade
        .groupBy({ by: ['autorId'] })
        .then((g) => g.length),
    ]);

    return { posts, comentarios, curtidas, fixados, categorias, membrosAtivos };
  }

  /** Tópicos com mais engajamento — alimenta o card do dashboard. */
  async topicosRecentes(limite = 5) {
    const posts = await this.prisma.postComunidade.findMany({
      orderBy: [{ fixado: 'desc' }, { criadoEm: 'desc' }],
      take: limite,
      include: {
        autor: { select: { nome: true, handle: true } },
        _count: { select: { comentarios: true } },
      },
    });

    return posts.map((p) => ({
      id: p.id,
      titulo: p.conteudo.slice(0, 80) + (p.conteudo.length > 80 ? '…' : ''),
      autor: p.autor.nome,
      respostas: p._count.comentarios,
      visualizacoes: p.visualizacoes,
      fixado: p.fixado,
      criadoEm: p.criadoEm,
    }));
  }
}
