import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, StatusEventoWebhook, StatusVenda } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { VendasService } from '../vendas/vendas.service';
import { EventoWebhookDto, TipoEventoWebhook } from './dto/evento-webhook.dto';

/** Resposta devolvida ao parceiro. Enxuta de propósito: ele só precisa saber se pegou. */
export interface ResultadoEvento {
  recebido: true;
  status: StatusEventoWebhook;
  vendaId?: string;
  detalhe?: string;
}

/** Erros que não adianta reprocessar — o payload nunca vai dar certo como está. */
class EventoRejeitado extends Error {}

@Injectable()
export class IntegracoesService {
  private readonly logger = new Logger('Integracoes');

  constructor(
    private readonly prisma: PrismaService,
    private readonly vendas: VendasService,
  ) {}

  /**
   * Recebe um evento de parceiro.
   *
   * O evento é gravado **antes** de ser interpretado. Se o processamento
   * falhar, o payload continua no banco e é reprocessável — nenhuma venda se
   * perde por um erro nosso.
   */
  async receber(parceiroId: string, dto: EventoWebhookDto): Promise<ResultadoEvento> {
    // idempotência: o mesmo evento, do mesmo pedido, do mesmo parceiro, vale
    // uma vez só. Todo parceiro reenvia webhook, e sem isto a comissão dobraria.
    const existente = await this.prisma.eventoWebhook.findUnique({
      where: {
        parceiroId_externoId_evento: {
          parceiroId,
          externoId: dto.pedidoId,
          evento: dto.evento,
        },
      },
    });

    if (existente) {
      return {
        recebido: true,
        status: StatusEventoWebhook.DUPLICADO,
        vendaId: existente.vendaId ?? undefined,
        detalhe: 'Evento já recebido anteriormente.',
      };
    }

    const registro = await this.prisma.eventoWebhook.create({
      data: {
        parceiroId,
        externoId: dto.pedidoId,
        evento: dto.evento,
        payload: dto as unknown as Prisma.InputJsonValue,
        tentativas: 1,
      },
    });

    return this.processar(registro.id, parceiroId, dto);
  }

  /**
   * Interpreta o evento e aplica o efeito na venda.
   *
   * Separa falha definitiva de transitória: a primeira vira REJEITADO e não
   * será tentada de novo; a segunda vira ERRO e fica na fila de reprocesso.
   * Tratar as duas igual faria a plataforma insistir para sempre num payload
   * que nunca vai funcionar.
   */
  private async processar(
    eventoId: string,
    parceiroId: string,
    dto: EventoWebhookDto,
  ): Promise<ResultadoEvento> {
    try {
      const vendaId =
        dto.evento === TipoEventoWebhook.VENDA_APROVADA
          ? await this.registrarVenda(dto)
          : await this.encerrarVenda(parceiroId, dto);

      await this.prisma.eventoWebhook.update({
        where: { id: eventoId },
        data: { status: StatusEventoWebhook.PROCESSADO, vendaId, processadoEm: new Date() },
      });

      return { recebido: true, status: StatusEventoWebhook.PROCESSADO, vendaId };
    } catch (erro) {
      const definitivo = erro instanceof EventoRejeitado;
      const mensagem = erro instanceof Error ? erro.message : String(erro);

      await this.prisma.eventoWebhook.update({
        where: { id: eventoId },
        data: {
          status: definitivo ? StatusEventoWebhook.REJEITADO : StatusEventoWebhook.ERRO,
          erro: mensagem.slice(0, 500),
        },
      });

      this.logger.error(`Evento ${dto.evento} de ${dto.pedidoId}: ${mensagem}`);

      // transitório sobe como exceção para o parceiro receber 5xx e reenviar;
      // definitivo devolve 200 com o motivo, para ele parar de tentar
      if (!definitivo) throw erro;
      return { recebido: true, status: StatusEventoWebhook.REJEITADO, detalhe: mensagem };
    }
  }

  /** Cria a venda e a comissão, reaproveitando a regra já validada de vendas. */
  private async registrarVenda(dto: EventoWebhookDto): Promise<string> {
    // o código de origem já diz o produto e o associado — o parceiro não
    // precisa conhecer os identificadores internos da plataforma
    const link = await this.prisma.linkAfiliado.findUnique({
      where: { codigo: dto.ref },
      select: { produtoId: true, ativo: true },
    });

    if (!link) throw new EventoRejeitado(`Código de origem "${dto.ref}" não existe.`);
    if (!link.ativo) throw new EventoRejeitado(`Código de origem "${dto.ref}" está inativo.`);

    const venda = await this.vendas.criar({
      produtoId: link.produtoId,
      ref: dto.ref,
      clienteNome: dto.cliente?.nome ?? 'Cliente do parceiro',
      clienteEmail: dto.cliente?.email,
      quantidade: dto.quantidade ?? 1,
      cupom: dto.cupom,
      dataVenda: dto.ocorridoEm,
    });

    // a venda nasce aguardando pagamento; o evento diz que já foi aprovada
    await this.vendas.alterarStatus(venda.id, { status: StatusVenda.PAGA });

    if (dto.valor !== undefined && Math.abs(dto.valor - Number(venda.total)) > 0.01) {
      // não bloqueia: o parceiro pode ter promoção que não conhecemos. Mas fica
      // registrado, porque divergência sistemática indica catálogo desatualizado.
      this.logger.warn(
        `Pedido ${dto.pedidoId}: parceiro cobrou ${dto.valor}, catálogo diz ${venda.total}.`,
      );
    }

    return venda.id;
  }

  /** Estorna ou cancela. A reversão da comissão e do estoque já é tratada em vendas. */
  private async encerrarVenda(parceiroId: string, dto: EventoWebhookDto): Promise<string> {
    const aprovacao = await this.prisma.eventoWebhook.findUnique({
      where: {
        parceiroId_externoId_evento: {
          parceiroId,
          externoId: dto.pedidoId,
          evento: TipoEventoWebhook.VENDA_APROVADA,
        },
      },
      select: { vendaId: true },
    });

    if (!aprovacao?.vendaId) {
      throw new EventoRejeitado(
        `Não há venda aprovada para o pedido "${dto.pedidoId}" — nada a estornar.`,
      );
    }

    const status =
      dto.evento === TipoEventoWebhook.VENDA_REEMBOLSADA
        ? StatusVenda.REEMBOLSADA
        : StatusVenda.CANCELADA;

    await this.vendas.alterarStatus(aprovacao.vendaId, { status });
    return aprovacao.vendaId;
  }

  /**
   * Reprocessa um evento que falhou por causa transitória.
   *
   * Só ERRO é reprocessável: REJEITADO falhou pelo conteúdo, e tentar de novo
   * daria o mesmo resultado.
   */
  async reprocessar(eventoId: string): Promise<ResultadoEvento> {
    const evento = await this.prisma.eventoWebhook.findUniqueOrThrow({ where: { id: eventoId } });

    if (evento.status !== StatusEventoWebhook.ERRO) {
      throw new NotFoundException(
        `O evento está como ${evento.status} — só eventos em ERRO são reprocessáveis.`,
      );
    }

    await this.prisma.eventoWebhook.update({
      where: { id: eventoId },
      data: { tentativas: { increment: 1 }, erro: null },
    });

    return this.processar(
      evento.id,
      evento.parceiroId,
      evento.payload as unknown as EventoWebhookDto,
    );
  }

  listar(status?: StatusEventoWebhook) {
    return this.prisma.eventoWebhook.findMany({
      where: status ? { status } : undefined,
      orderBy: { criadoEm: 'desc' },
      take: 100,
      include: { parceiro: { select: { nome: true } } },
    });
  }

  /**
   * Gera e grava um segredo novo para o parceiro. Devolve em claro uma única
   * vez — depois disso só existe no banco, e trocar invalida o anterior.
   */
  async gerarSegredo(parceiroId: string) {
    const webhookSecret = randomBytes(32).toString('hex');
    const parceiro = await this.prisma.parceiro.update({
      where: { id: parceiroId },
      data: { webhookSecret },
      select: { id: true, nome: true },
    });

    return {
      ...parceiro,
      webhookSecret,
      url: `/api/integracoes/${parceiro.id}/eventos`,
      aviso: 'Guarde o segredo agora: ele não será exibido de novo.',
    };
  }
}
