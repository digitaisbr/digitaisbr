import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, StatusTicket, TipoNotificacao } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ordenar } from '../../common/utils/query.util';
import {
  AbrirTicketDto,
  AtualizarTicketDto,
  FiltrarTicketsDto,
  ResponderTicketDto,
} from './dto/ticket.dto';

@Injectable()
export class SuporteService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(f: FiltrarTicketsDto): Promise<PaginatedResult<unknown>> {
    const where: Prisma.TicketWhereInput = {
      ...(f.status ? { status: f.status } : {}),
      ...(f.prioridade ? { prioridade: f.prioridade } : {}),
      ...(f.categoria ? { categoria: f.categoria } : {}),
      ...(f.atribuidoAId ? { atribuidoAId: f.atribuidoAId } : {}),
      ...(f.associadoId ? { associadoId: f.associadoId } : {}),
      ...(f.search
        ? {
            OR: [
              { numero: { contains: f.search, mode: Prisma.QueryMode.insensitive } },
              { assunto: { contains: f.search, mode: Prisma.QueryMode.insensitive } },
              { associado: { nome: { contains: f.search, mode: Prisma.QueryMode.insensitive } } },
            ],
          }
        : {}),
    };

    const [total, tickets] = await this.prisma.$transaction([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        skip: f.skip,
        take: f.limit,
        orderBy: ordenar(f.sort, f.order, ['criadoEm', 'atualizadoEm', 'numero'], { criadoEm: 'desc' }),
        include: {
          associado: {
            select: { id: true, nome: true, handle: true, plano: { select: { nome: true } } },
          },
          atribuidoA: { select: { id: true, nome: true } },
          _count: { select: { mensagens: true } },
        },
      }),
    ]);

    const data = tickets.map(({ _count, ...t }) => ({ ...t, totalMensagens: _count.mensagens }));
    return paginate(data, total, f.page, f.limit);
  }

  /** Abre o ticket por ID ou número (SUP-…), com a thread completa. */
  async buscar(idOuNumero: string, associadoId?: string | null, ehAdmin = false) {
    const ticket = await this.prisma.ticket.findFirstOrThrow({
      where: { OR: [{ id: idOuNumero }, { numero: idOuNumero }] },
      include: {
        associado: {
          select: { id: true, nome: true, handle: true, email: true, plano: { select: { nome: true } } },
        },
        atribuidoA: { select: { id: true, nome: true, email: true } },
        mensagens: {
          // notas internas ficam fora da visão do associado
          where: ehAdmin ? {} : { interna: false },
          orderBy: { criadoEm: 'asc' },
          include: { autor: { select: { id: true, nome: true, role: true } } },
        },
      },
    });

    if (!ehAdmin && ticket.associadoId !== associadoId) {
      throw new ForbiddenException('Este chamado pertence a outro associado.');
    }

    return ticket;
  }

  /** Abre um chamado com a primeira mensagem já na thread. */
  async abrir(associadoId: string, usuarioId: string, dto: AbrirTicketDto) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          numero: await this.proximoNumero(tx),
          associadoId,
          assunto: dto.assunto,
          categoria: dto.categoria,
          prioridade: dto.prioridade,
          status: StatusTicket.ABERTO,
          mensagens: { create: { autorId: usuarioId, conteudo: dto.mensagem } },
        },
        include: { mensagens: true },
      });

      await tx.notificacao.create({
        data: {
          associadoId,
          titulo: 'Chamado aberto',
          mensagem: `Seu chamado ${ticket.numero} foi registrado. Em breve o atendimento responde.`,
          tipo: TipoNotificacao.SUPORTE,
          link: `/suporte/${ticket.id}`,
        },
      });

      return ticket;
    });
  }

  /** Responde na thread; a resposta do atendimento move o ticket para "em andamento". */
  async responder(ticketId: string, usuarioId: string, ehAdmin: boolean, dto: ResponderTicketDto) {
    const ticket = await this.prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });

    if (ticket.status === StatusTicket.FECHADO) {
      throw new ForbiddenException('Este chamado está fechado — abra um novo para seguir o atendimento.');
    }
    if (!ehAdmin && dto.interna) {
      throw new ForbiddenException('Notas internas são exclusivas do atendimento.');
    }

    const mensagem = await this.prisma.ticketMensagem.create({
      data: {
        ticketId,
        autorId: usuarioId,
        conteudo: dto.conteudo,
        interna: dto.interna ?? false,
      },
      include: { autor: { select: { nome: true, role: true } } },
    });

    if (ehAdmin && ticket.status === StatusTicket.ABERTO) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: StatusTicket.EM_ANDAMENTO },
      });
    }

    // o associado é avisado apenas de mensagens públicas do atendimento
    if (ehAdmin && !dto.interna && ticket.associadoId) {
      await this.prisma.notificacao.create({
        data: {
          associadoId: ticket.associadoId,
          titulo: 'Ticket respondido',
          mensagem: `Seu chamado ${ticket.numero} recebeu uma resposta.`,
          tipo: TipoNotificacao.SUPORTE,
          link: `/suporte/${ticketId}`,
        },
      });
    }

    return mensagem;
  }

  async atualizar(id: string, dto: AtualizarTicketDto) {
    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.status === StatusTicket.RESOLVIDO ? { resolvidoEm: new Date() } : {}),
      },
      include: { associado: { select: { id: true } } },
    });

    if (dto.status === StatusTicket.RESOLVIDO && ticket.associadoId) {
      await this.prisma.notificacao.create({
        data: {
          associadoId: ticket.associadoId,
          titulo: 'Ticket resolvido',
          mensagem: `Seu chamado ${ticket.numero} foi marcado como resolvido.`,
          tipo: TipoNotificacao.SUPORTE,
        },
      });
    }

    return ticket;
  }

  /** Assume o atendimento — equivalente ao botão "Atender". */
  async atender(id: string, usuarioId: string) {
    return this.prisma.ticket.update({
      where: { id },
      data: { atribuidoAId: usuarioId, status: StatusTicket.EM_ANDAMENTO },
      include: { atribuidoA: { select: { nome: true } } },
    });
  }

  /** Cards do topo e tempo médio de resolução. */
  async estatisticas() {
    const [porStatus, porPrioridade, porCategoria, resolvidos] = await Promise.all([
      this.prisma.ticket.groupBy({ by: ['status'], _count: true }),
      this.prisma.ticket.groupBy({ by: ['prioridade'], _count: true }),
      this.prisma.ticket.groupBy({ by: ['categoria'], _count: true, orderBy: { _count: { categoria: 'desc' } } }),
      this.prisma.ticket.findMany({
        where: { status: StatusTicket.RESOLVIDO, resolvidoEm: { not: null } },
        select: { criadoEm: true, resolvidoEm: true },
      }),
    ]);

    const horas = resolvidos.map(
      (t) => (t.resolvidoEm!.getTime() - t.criadoEm.getTime()) / 3_600_000,
    );
    const tempoMedio = horas.length ? horas.reduce((s, h) => s + h, 0) / horas.length : 0;

    const contar = (s: StatusTicket): number => porStatus.find((g) => g.status === s)?._count ?? 0;

    return {
      abertos: contar(StatusTicket.ABERTO),
      emAndamento: contar(StatusTicket.EM_ANDAMENTO),
      resolvidos: contar(StatusTicket.RESOLVIDO),
      fechados: contar(StatusTicket.FECHADO),
      total: porStatus.reduce((s, g) => s + g._count, 0),
      tempoMedioResolucaoHoras: Number(tempoMedio.toFixed(1)),
      porPrioridade: Object.fromEntries(porPrioridade.map((p) => [p.prioridade, p._count])),
      porCategoria: porCategoria.map((c) => ({ categoria: c.categoria, total: c._count })),
    };
  }

  /** Chamados do associado logado. */
  async meusTickets(associadoId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: { associadoId },
      orderBy: { criadoEm: 'desc' },
      include: {
        atribuidoA: { select: { nome: true } },
        _count: { select: { mensagens: { where: { interna: false } } } },
      },
    });

    return {
      tickets: tickets.map(({ _count, ...t }) => ({ ...t, totalMensagens: _count.mensagens })),
      abertos: tickets.filter((t) => t.status === StatusTicket.ABERTO).length,
      resolvidos: tickets.filter((t) => t.status === StatusTicket.RESOLVIDO).length,
    };
  }

  /** Gera o próximo número no formato SUP-NNN, contínuo com o histórico. */
  private async proximoNumero(tx: Prisma.TransactionClient): Promise<string> {
    const ultimo = await tx.ticket.findFirst({
      where: { numero: { startsWith: 'SUP-' } },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const n = ultimo ? Number.parseInt(ultimo.numero.replace('SUP-', ''), 10) + 1 : 1;
    return `SUP-${String(n).padStart(3, '0')}`;
  }
}
