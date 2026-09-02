import { ConflictException, Injectable } from '@nestjs/common';
import {
  CanalNotificacao,
  NivelPlano,
  Prisma,
  StatusAssociado,
  StatusCampanha,
  TipoNotificacao,
} from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CriarCampanhaDto,
  EnviarNotificacaoDto,
  FiltrarCampanhasDto,
  FiltrarNotificacoesDto,
} from './dto/notificacao.dto';

@Injectable()
export class NotificacoesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- notificações

  async listar(associadoId: string, f: FiltrarNotificacoesDto): Promise<PaginatedResult<unknown>> {
    const where: Prisma.NotificacaoWhereInput = {
      // inclui os broadcasts (associadoId nulo)
      OR: [{ associadoId }, { associadoId: null }],
      ...(f.tipo ? { tipo: f.tipo } : {}),
      ...(f.canal ? { canal: f.canal } : {}),
      ...(f.lida !== undefined ? { lida: f.lida } : {}),
    };

    const [total, notificacoes] = await this.prisma.$transaction([
      this.prisma.notificacao.count({ where }),
      this.prisma.notificacao.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: { criadoEm: 'desc' },
      }),
    ]);

    return paginate(notificacoes, total, f.page, f.limit);
  }

  /** Contadores por tipo e canal, para os filtros da central. */
  async resumo(associadoId: string) {
    const base: Prisma.NotificacaoWhereInput = { OR: [{ associadoId }, { associadoId: null }] };

    const [total, naoLidas, porTipo, porCanal] = await Promise.all([
      this.prisma.notificacao.count({ where: base }),
      this.prisma.notificacao.count({ where: { ...base, lida: false } }),
      this.prisma.notificacao.groupBy({ by: ['tipo'], where: base, _count: true }),
      this.prisma.notificacao.groupBy({ by: ['canal'], where: base, _count: true }),
    ]);

    return {
      total,
      naoLidas,
      lidas: total - naoLidas,
      porTipo: Object.fromEntries(porTipo.map((t) => [t.tipo, t._count])),
      porCanal: Object.fromEntries(porCanal.map((c) => [c.canal, c._count])),
    };
  }

  async marcarComoLida(id: string, associadoId: string) {
    const { count } = await this.prisma.notificacao.updateMany({
      where: { id, OR: [{ associadoId }, { associadoId: null }] },
      data: { lida: true, lidaEm: new Date() },
    });
    if (count === 0) throw new ConflictException('Notificação não encontrada para este associado.');
    return { id, lida: true };
  }

  async marcarTodasComoLidas(associadoId: string) {
    const { count } = await this.prisma.notificacao.updateMany({
      where: { OR: [{ associadoId }, { associadoId: null }], lida: false },
      data: { lida: true, lidaEm: new Date() },
    });
    return { marcadas: count };
  }

  async remover(id: string, associadoId: string) {
    const { count } = await this.prisma.notificacao.deleteMany({ where: { id, associadoId } });
    if (count === 0) throw new ConflictException('Notificação não encontrada para este associado.');
    return { id, removida: true };
  }

  /**
   * Dispara uma notificação. Sem destinatários explícitos, envia para todos
   * os associados ativos (opcionalmente filtrados por plano).
   */
  async enviar(dto: EnviarNotificacaoDto) {
    const destinatarios = await this.resolverDestinatarios(dto.associadoIds, dto.planos);

    const { count } = await this.prisma.notificacao.createMany({
      data: destinatarios.map((associadoId) => ({
        associadoId,
        titulo: dto.titulo,
        mensagem: dto.mensagem,
        tipo: dto.tipo ?? TipoNotificacao.SISTEMA,
        canal: dto.canal ?? CanalNotificacao.IN_APP,
        link: dto.link,
      })),
    });

    return { enviadas: count, destinatarios: destinatarios.length };
  }

  // ---------------------------------------------------------------- campanhas

  async listarCampanhas(f: FiltrarCampanhasDto): Promise<PaginatedResult<unknown>> {
    const where: Prisma.CampanhaWhereInput = f.status ? { status: f.status } : {};

    const [total, campanhas] = await this.prisma.$transaction([
      this.prisma.campanha.count({ where }),
      this.prisma.campanha.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: { criadoEm: 'desc' },
      }),
    ]);

    const data = campanhas.map((c) => ({
      ...c,
      taxaAbertura: c.enviados ? Number(((c.aberturas / c.enviados) * 100).toFixed(1)) : 0,
    }));

    return paginate(data, total, f.page, f.limit);
  }

  async criarCampanha(dto: CriarCampanhaDto) {
    return this.prisma.campanha.create({
      data: {
        codigo: await this.proximoCodigo(),
        titulo: dto.titulo,
        corpo: dto.corpo,
        canal: dto.canal,
        publicoAlvo: dto.publicoAlvo ?? [],
        status: dto.agendadaPara ? StatusCampanha.AGENDADA : StatusCampanha.RASCUNHO,
        agendadaPara: dto.agendadaPara ? new Date(dto.agendadaPara) : null,
      },
    });
  }

  /** Dispara a campanha, criando uma notificação por destinatário. */
  async enviarCampanha(id: string) {
    const campanha = await this.prisma.campanha.findUniqueOrThrow({ where: { id } });

    if (campanha.status === StatusCampanha.ENVIADA) {
      throw new ConflictException('Esta campanha já foi enviada.');
    }
    if (campanha.status === StatusCampanha.CANCELADA) {
      throw new ConflictException('Campanha cancelada não pode ser enviada.');
    }

    const destinatarios = await this.resolverDestinatarios(
      undefined,
      campanha.publicoAlvo.length ? campanha.publicoAlvo : undefined,
    );

    await this.prisma.$transaction([
      this.prisma.notificacao.createMany({
        data: destinatarios.map((associadoId) => ({
          associadoId,
          titulo: campanha.titulo,
          mensagem: campanha.corpo,
          tipo: TipoNotificacao.SISTEMA,
          canal: campanha.canal ?? CanalNotificacao.IN_APP,
        })),
      }),
      this.prisma.campanha.update({
        where: { id },
        data: {
          status: StatusCampanha.ENVIADA,
          enviados: destinatarios.length,
          enviadaEm: new Date(),
        },
      }),
    ]);

    return { id, enviados: destinatarios.length, enviadaEm: new Date() };
  }

  async cancelarCampanha(id: string) {
    const campanha = await this.prisma.campanha.findUniqueOrThrow({ where: { id } });
    if (campanha.status === StatusCampanha.ENVIADA) {
      throw new ConflictException('Campanha já enviada não pode ser cancelada.');
    }
    return this.prisma.campanha.update({
      where: { id },
      data: { status: StatusCampanha.CANCELADA },
    });
  }

  async estatisticasCampanhas() {
    const [porStatus, agregado] = await Promise.all([
      this.prisma.campanha.groupBy({ by: ['status'], _count: true }),
      this.prisma.campanha.aggregate({ _sum: { enviados: true, aberturas: true } }),
    ]);

    const enviados = agregado._sum.enviados ?? 0;
    const aberturas = agregado._sum.aberturas ?? 0;

    return {
      enviadas: porStatus.find((s) => s.status === StatusCampanha.ENVIADA)?._count ?? 0,
      agendadas: porStatus.find((s) => s.status === StatusCampanha.AGENDADA)?._count ?? 0,
      rascunhos: porStatus.find((s) => s.status === StatusCampanha.RASCUNHO)?._count ?? 0,
      totalEnvios: enviados,
      taxaAbertura: enviados ? Number(((aberturas / enviados) * 100).toFixed(1)) : 0,
    };
  }

  // ---------------------------------------------------------------- internos

  private async resolverDestinatarios(
    ids?: string[],
    planos?: NivelPlano[],
  ): Promise<string[]> {
    if (ids?.length) return ids;

    const associados = await this.prisma.associado.findMany({
      where: {
        status: StatusAssociado.ATIVO,
        ...(planos?.length ? { plano: { nivel: { in: planos } } } : {}),
      },
      select: { id: true },
    });
    return associados.map((a) => a.id);
  }

  private async proximoCodigo(): Promise<string> {
    const ultima = await this.prisma.campanha.findFirst({
      where: { codigo: { startsWith: 'CAMP-' } },
      orderBy: { codigo: 'desc' },
      select: { codigo: true },
    });
    const n = ultima ? Number.parseInt(ultima.codigo.replace('CAMP-', ''), 10) + 1 : 1;
    return `CAMP-${String(n).padStart(3, '0')}`;
  }
}
