import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { NivelPlano, Prisma, TipoNotificacao } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ORDEM_PLANO } from '../../common/guards/plano.guard';
import { buscaTextual, ordenar } from '../../common/utils/query.util';
import {
  AtualizarBeneficioDto,
  AtualizarParceiroDto,
  CriarBeneficioDto,
  CriarParceiroDto,
  FiltrarBeneficiosDto,
} from './dto/parceiro.dto';

@Injectable()
export class ParceirosService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- parceiros

  async listarParceiros(f: FiltrarBeneficiosDto): Promise<PaginatedResult<unknown>> {
    const where: Prisma.ParceiroWhereInput = buscaTextual(f.search, ['nome', 'segmento', 'email', 'cnpj']) ?? {};

    const [total, parceiros] = await this.prisma.$transaction([
      this.prisma.parceiro.count({ where }),
      this.prisma.parceiro.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: ordenar(f.sort, f.order, ['nome', 'criadoEm'], { nome: 'asc' }),
        include: { _count: { select: { beneficios: true } } },
      }),
    ]);

    const data = parceiros.map(({ _count, ...p }) => ({ ...p, totalBeneficios: _count.beneficios }));
    return paginate(data, total, f.page, f.limit);
  }

  buscarParceiro(id: string) {
    return this.prisma.parceiro.findUniqueOrThrow({
      where: { id },
      include: {
        beneficios: {
          include: { planoMinimo: { select: { nome: true, nivel: true } } },
          orderBy: { nome: 'asc' },
        },
      },
    });
  }

  criarParceiro(dto: CriarParceiroDto) {
    return this.prisma.parceiro.create({ data: dto });
  }

  atualizarParceiro(id: string, dto: AtualizarParceiroDto) {
    return this.prisma.parceiro.update({ where: { id }, data: dto });
  }

  async removerParceiro(id: string) {
    const beneficios = await this.prisma.beneficio.count({ where: { parceiroId: id } });
    if (beneficios > 0) {
      throw new ConflictException(
        `Parceiro possui ${beneficios} benefício(s) — remova-os ou apenas inative o parceiro.`,
      );
    }
    await this.prisma.parceiro.delete({ where: { id } });
    return { id, removido: true };
  }

  // ---------------------------------------------------------------- benefícios

  /**
   * Lista os benefícios. Com `nivelAssociado`, os acima do plano vêm marcados
   * como bloqueados — reproduzindo as seções "Disponíveis" e "Bloqueados".
   */
  async listarBeneficios(
    f: FiltrarBeneficiosDto,
    nivelAssociado?: NivelPlano | null,
  ): Promise<PaginatedResult<unknown>> {
    const where: Prisma.BeneficioWhereInput = {
      ...(f.tipo ? { tipo: f.tipo } : {}),
      ...(f.planoMinimo ? { planoMinimo: { nivel: f.planoMinimo } } : {}),
      ...(f.parceiroId ? { parceiroId: f.parceiroId } : {}),
      ...buscaTextual(f.search, ['nome', 'descricao']),
    };

    if (f.apenasLiberados && nivelAssociado) {
      where.planoMinimo = { nivel: { in: this.niveisAteh(nivelAssociado) } };
    }

    const [total, beneficios] = await this.prisma.$transaction([
      this.prisma.beneficio.count({ where }),
      this.prisma.beneficio.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: ordenar(f.sort, f.order, ['nome', 'utilizacoes', 'criadoEm'], { utilizacoes: 'desc' }),
        include: {
          parceiro: { select: { id: true, nome: true, segmento: true, logoUrl: true } },
          planoMinimo: { select: { nome: true, nivel: true } },
        },
      }),
    ]);

    const data = beneficios.map((b) => ({
      ...b,
      bloqueado: nivelAssociado
        ? ORDEM_PLANO[nivelAssociado] < ORDEM_PLANO[b.planoMinimo.nivel]
        : false,
    }));

    return paginate(data, total, f.page, f.limit);
  }

  buscarBeneficio(id: string) {
    return this.prisma.beneficio.findUniqueOrThrow({
      where: { id },
      include: {
        parceiro: true,
        planoMinimo: { select: { nome: true, nivel: true } },
        _count: { select: { usos: true } },
      },
    });
  }

  async criarBeneficio(dto: CriarBeneficioDto) {
    const { planoMinimo, ...resto } = dto;
    const plano = await this.prisma.plano.findUnique({ where: { nivel: planoMinimo } });
    if (!plano) throw new BadRequestException('Plano informado não existe.');

    return this.prisma.beneficio.create({ data: { ...resto, planoMinimoId: plano.id } });
  }

  async atualizarBeneficio(id: string, dto: AtualizarBeneficioDto) {
    const { planoMinimo, ...resto } = dto;
    const data: Prisma.BeneficioUpdateInput = { ...resto };

    if (planoMinimo) {
      const plano = await this.prisma.plano.findUnique({ where: { nivel: planoMinimo } });
      if (!plano) throw new BadRequestException('Plano informado não existe.');
      data.planoMinimo = { connect: { id: plano.id } };
    }

    return this.prisma.beneficio.update({ where: { id }, data });
  }

  async removerBeneficio(id: string) {
    await this.prisma.beneficio.delete({ where: { id } });
    return { id, removido: true };
  }

  /** Registra o uso de um benefício, validando plano e disponibilidade. */
  async registrarUso(beneficioId: string, associadoId: string) {
    const [beneficio, associado] = await Promise.all([
      this.prisma.beneficio.findUniqueOrThrow({
        where: { id: beneficioId },
        include: { planoMinimo: { select: { nivel: true, nome: true } }, parceiro: { select: { nome: true } } },
      }),
      this.prisma.associado.findUniqueOrThrow({
        where: { id: associadoId },
        include: { plano: { select: { nivel: true } } },
      }),
    ]);

    if (!beneficio.ativo) {
      throw new ConflictException('Este benefício não está ativo.');
    }
    if (ORDEM_PLANO[associado.plano.nivel] < ORDEM_PLANO[beneficio.planoMinimo.nivel]) {
      throw new ForbiddenException(
        `"${beneficio.nome}" exige o plano ${beneficio.planoMinimo.nome} ou superior.`,
      );
    }

    const [uso] = await this.prisma.$transaction([
      this.prisma.beneficioUso.create({ data: { beneficioId, associadoId } }),
      this.prisma.beneficio.update({
        where: { id: beneficioId },
        data: { utilizacoes: { increment: 1 } },
      }),
      this.prisma.notificacao.create({
        data: {
          associadoId,
          titulo: 'Benefício resgatado',
          mensagem: `Você resgatou "${beneficio.nome}"${
            beneficio.parceiro ? ` — parceiro ${beneficio.parceiro.nome}` : ''
          }.`,
          tipo: TipoNotificacao.BENEFICIO,
        },
      }),
    ]);

    return { ...uso, beneficio: beneficio.nome, instrucoes: beneficio.instrucoes };
  }

  /** Histórico de benefícios usados por um associado. */
  async usosDoAssociado(associadoId: string) {
    const usos = await this.prisma.beneficioUso.findMany({
      where: { associadoId },
      orderBy: { usadoEm: 'desc' },
      include: {
        beneficio: {
          select: {
            id: true, nome: true, tipo: true, valorLabel: true,
            parceiro: { select: { nome: true } },
          },
        },
      },
    });
    return usos;
  }

  /** Cards do topo: parceiros ativos, benefícios e mais utilizados. */
  async estatisticas() {
    const [parceiros, parceirosAtivos, beneficios, beneficiosAtivos, porTipo, top] = await Promise.all([
      this.prisma.parceiro.count(),
      this.prisma.parceiro.count({ where: { ativo: true } }),
      this.prisma.beneficio.count(),
      this.prisma.beneficio.count({ where: { ativo: true } }),
      this.prisma.beneficio.groupBy({ by: ['tipo'], _count: true }),
      this.prisma.beneficio.findMany({
        orderBy: { utilizacoes: 'desc' },
        take: 5,
        select: {
          id: true, nome: true, valorLabel: true, utilizacoes: true,
          parceiro: { select: { nome: true } },
        },
      }),
    ]);

    return {
      parceiros: { total: parceiros, ativos: parceirosAtivos },
      beneficios: { total: beneficios, ativos: beneficiosAtivos },
      porTipo: Object.fromEntries(porTipo.map((t) => [t.tipo, t._count])),
      maisUtilizados: top,
    };
  }

  private niveisAteh(nivel: NivelPlano): NivelPlano[] {
    return (Object.keys(ORDEM_PLANO) as NivelPlano[]).filter(
      (n) => ORDEM_PLANO[n] <= ORDEM_PLANO[nivel],
    );
  }
}
