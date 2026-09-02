import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { NivelPlano, Prisma, StatusConteudo, TipoMaterial } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ORDEM_PLANO } from '../../common/guards/plano.guard';
import { buscaTextual, ordenar } from '../../common/utils/query.util';
import {
  AtualizarConteudoDto,
  AtualizarMaterialDto,
  CriarConteudoDto,
  CriarMaterialDto,
  FiltrarConteudosDto,
} from './dto/conteudo.dto';

const slugify = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

@Injectable()
export class ConteudosService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- conteúdos

  async listar(
    f: FiltrarConteudosDto,
    nivelAssociado?: NivelPlano | null,
    somentePublicados = false,
  ): Promise<PaginatedResult<unknown>> {
    const where: Prisma.ConteudoWhereInput = {
      ...(f.tipo ? { tipo: f.tipo } : {}),
      ...(f.status ? { status: f.status } : {}),
      ...(somentePublicados ? { status: StatusConteudo.PUBLICADO } : {}),
      ...(f.planoMinimo ? { planoMinimo: { nivel: f.planoMinimo } } : {}),
      ...buscaTextual(f.search, ['titulo', 'descricao', 'autor']),
    };

    if (f.apenasLiberados && nivelAssociado) {
      where.planoMinimo = { nivel: { in: this.niveisAteh(nivelAssociado) } };
    }

    const [total, conteudos] = await this.prisma.$transaction([
      this.prisma.conteudo.count({ where }),
      this.prisma.conteudo.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: ordenar(
          f.sort,
          f.order,
          ['titulo', 'visualizacoes', 'curtidas', 'publicadoEm', 'criadoEm'],
          { publicadoEm: 'desc' },
        ),
        include: { planoMinimo: { select: { nome: true, nivel: true } } },
      }),
    ]);

    const data = conteudos.map((c) => ({
      ...c,
      bloqueado: nivelAssociado
        ? ORDEM_PLANO[nivelAssociado] < ORDEM_PLANO[c.planoMinimo.nivel]
        : false,
    }));

    return paginate(data, total, f.page, f.limit);
  }

  /**
   * Abre um conteúdo. Para associados, valida o plano e registra a
   * visualização (uma vez por associado).
   */
  async buscar(idOuSlug: string, associadoId?: string | null, nivelAssociado?: NivelPlano | null) {
    const conteudo = await this.prisma.conteudo.findFirstOrThrow({
      where: { OR: [{ id: idOuSlug }, { slug: idOuSlug }] },
      include: { planoMinimo: { select: { nome: true, nivel: true } } },
    });

    if (nivelAssociado && ORDEM_PLANO[nivelAssociado] < ORDEM_PLANO[conteudo.planoMinimo.nivel]) {
      throw new ForbiddenException(
        `"${conteudo.titulo}" está disponível a partir do plano ${conteudo.planoMinimo.nome}.`,
      );
    }

    let curtido = false;
    if (associadoId) {
      const interacao = await this.prisma.conteudoInteracao.upsert({
        where: { conteudoId_associadoId: { conteudoId: conteudo.id, associadoId } },
        create: { conteudoId: conteudo.id, associadoId, visualizado: true },
        update: {},
      });
      curtido = interacao.curtido;

      // o contador só sobe na primeira visualização de cada associado
      if (interacao.criadoEm.getTime() > Date.now() - 2_000) {
        await this.prisma.conteudo.update({
          where: { id: conteudo.id },
          data: { visualizacoes: { increment: 1 } },
        });
      }
    }

    return { ...conteudo, curtido };
  }

  async criar(dto: CriarConteudoDto) {
    const { planoMinimo, ...resto } = dto;
    const plano = await this.prisma.plano.findUnique({ where: { nivel: planoMinimo } });
    if (!plano) throw new BadRequestException('Plano informado não existe.');

    return this.prisma.conteudo.create({
      data: {
        ...resto,
        slug: slugify(dto.titulo),
        planoMinimoId: plano.id,
        publicadoEm: dto.status === StatusConteudo.PUBLICADO ? new Date() : null,
      },
    });
  }

  async atualizar(id: string, dto: AtualizarConteudoDto) {
    const { planoMinimo, titulo, status, ...resto } = dto;
    const atual = await this.prisma.conteudo.findUniqueOrThrow({ where: { id } });

    const data: Prisma.ConteudoUpdateInput = {
      ...resto,
      ...(titulo ? { titulo, slug: slugify(titulo) } : {}),
      ...(status ? { status } : {}),
    };

    // publicar pela primeira vez carimba a data
    if (status === StatusConteudo.PUBLICADO && !atual.publicadoEm) {
      data.publicadoEm = new Date();
    }

    if (planoMinimo) {
      const plano = await this.prisma.plano.findUnique({ where: { nivel: planoMinimo } });
      if (!plano) throw new BadRequestException('Plano informado não existe.');
      data.planoMinimo = { connect: { id: plano.id } };
    }

    return this.prisma.conteudo.update({ where: { id }, data });
  }

  async remover(id: string) {
    await this.prisma.conteudo.delete({ where: { id } });
    return { id, removido: true };
  }

  /** Alterna a curtida do associado e mantém o contador do conteúdo em dia. */
  async alternarCurtida(conteudoId: string, associadoId: string) {
    const interacao = await this.prisma.conteudoInteracao.findUnique({
      where: { conteudoId_associadoId: { conteudoId, associadoId } },
    });

    const curtido = !interacao?.curtido;

    await this.prisma.$transaction([
      this.prisma.conteudoInteracao.upsert({
        where: { conteudoId_associadoId: { conteudoId, associadoId } },
        create: { conteudoId, associadoId, curtido, visualizado: true },
        update: { curtido },
      }),
      this.prisma.conteudo.update({
        where: { id: conteudoId },
        data: { curtidas: curtido ? { increment: 1 } : { decrement: 1 } },
      }),
    ]);

    return { conteudoId, curtido };
  }

  async estatisticas() {
    const [total, porStatus, porTipo, engajamento] = await Promise.all([
      this.prisma.conteudo.count(),
      this.prisma.conteudo.groupBy({ by: ['status'], _count: true }),
      this.prisma.conteudo.groupBy({ by: ['tipo'], _count: true }),
      this.prisma.conteudo.aggregate({ _sum: { visualizacoes: true, curtidas: true } }),
    ]);

    return {
      total,
      publicados: porStatus.find((s) => s.status === StatusConteudo.PUBLICADO)?._count ?? 0,
      rascunhos: porStatus.find((s) => s.status === StatusConteudo.RASCUNHO)?._count ?? 0,
      totalVisualizacoes: engajamento._sum.visualizacoes ?? 0,
      totalCurtidas: engajamento._sum.curtidas ?? 0,
      porTipo: Object.fromEntries(porTipo.map((t) => [t.tipo, t._count])),
    };
  }

  // ---------------------------------------------------------------- materiais de divulgação

  async listarMateriais(tipo?: TipoMaterial) {
    const materiais = await this.prisma.materialDivulgacao.findMany({
      where: { ativo: true, ...(tipo ? { tipo } : {}) },
      orderBy: { criadoEm: 'desc' },
    });

    const porTipo = await this.prisma.materialDivulgacao.groupBy({
      by: ['tipo'],
      where: { ativo: true },
      _count: true,
    });

    return {
      materiais,
      total: materiais.length,
      porTipo: Object.fromEntries(porTipo.map((t) => [t.tipo, t._count])),
    };
  }

  criarMaterial(dto: CriarMaterialDto) {
    return this.prisma.materialDivulgacao.create({ data: dto });
  }

  atualizarMaterial(id: string, dto: AtualizarMaterialDto) {
    return this.prisma.materialDivulgacao.update({ where: { id }, data: dto });
  }

  async removerMaterial(id: string) {
    await this.prisma.materialDivulgacao.delete({ where: { id } });
    return { id, removido: true };
  }

  /** Contabiliza o download e devolve o link (ou o texto, para copies). */
  async baixarMaterial(id: string) {
    const material = await this.prisma.materialDivulgacao.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });
    return {
      nome: material.nome,
      tipo: material.tipo,
      arquivoUrl: material.arquivoUrl,
      textoCopy: material.textoCopy,
      downloads: material.downloads,
    };
  }

  private niveisAteh(nivel: NivelPlano): NivelPlano[] {
    return (Object.keys(ORDEM_PLANO) as NivelPlano[]).filter(
      (n) => ORDEM_PLANO[n] <= ORDEM_PLANO[nivel],
    );
  }
}
