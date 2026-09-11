import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/** Cabeçalho onde o parceiro envia a assinatura, no formato `sha256=<hex>`. */
export const CABECALHO_ASSINATURA = 'x-digitaisbr-assinatura';

interface RequisicaoComCorpoCru extends Request {
  rawBody?: Buffer;
}

/**
 * Confere que o webhook veio mesmo do parceiro.
 *
 * A assinatura é um HMAC-SHA256 do corpo **cru** com o segredo do parceiro.
 * Tem de ser o corpo cru: o JSON reserializado pode diferir do original em
 * espaços e ordem de chaves, e a assinatura não fecharia.
 *
 * Um token no corpo não serviria — quem interceptasse uma requisição poderia
 * reenviá-la alterada. Com HMAC, alterar qualquer byte invalida a assinatura.
 */
@Injectable()
export class AssinaturaWebhookGuard implements CanActivate {
  private readonly logger = new Logger('Webhook');

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const req = contexto.switchToHttp().getRequest<RequisicaoComCorpoCru>();
    const parceiroId = typeof req.params?.parceiroId === 'string' ? req.params.parceiroId : undefined;
    const recebida = req.headers[CABECALHO_ASSINATURA];

    if (typeof recebida !== 'string' || !parceiroId) {
      throw new ForbiddenException('Assinatura ausente.');
    }

    const parceiro = await this.prisma.parceiro.findUnique({
      where: { id: parceiroId },
      select: { id: true, nome: true, ativo: true, webhookSecret: true },
    });

    // a mesma resposta para parceiro inexistente, inativo e sem segredo: quem
    // envia não deve conseguir descobrir qual dos três é o caso
    if (!parceiro?.webhookSecret || !parceiro.ativo) {
      this.logger.warn(`Webhook recusado para parceiro ${parceiroId}: sem integração ativa.`);
      throw new ForbiddenException('Assinatura inválida.');
    }

    if (!req.rawBody) {
      // sem o corpo cru não há o que assinar — falha fechada, nunca aberta
      throw new ForbiddenException('Assinatura inválida.');
    }

    const esperada =
      'sha256=' + createHmac('sha256', parceiro.webhookSecret).update(req.rawBody).digest('hex');

    // comparação de tempo constante: comparar com === vazaria, pelo tempo até
    // divergir, quantos caracteres iniciais da assinatura estão corretos
    const a = Buffer.from(recebida);
    const b = Buffer.from(esperada);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      this.logger.warn(`Assinatura inválida de "${parceiro.nome}".`);
      throw new ForbiddenException('Assinatura inválida.');
    }

    return true;
  }
}
