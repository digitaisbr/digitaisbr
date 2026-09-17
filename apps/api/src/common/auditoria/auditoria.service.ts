import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Quem fez a operação. Vem do token, não do corpo da requisição. */
export interface Autor {
  usuarioId?: string | null;
  ip?: string | null;
}

/** Só o que mudou, com o valor de antes e o de depois. */
export type Diferencas = Record<string, { de: unknown; para: unknown }>;

/**
 * Campos que nunca entram na trilha.
 *
 * Os primeiros são segredos. Os carimbos de tempo saem por outro motivo:
 * mudam a cada escrita e apareceriam em todo registro, escondendo no ruído o
 * campo que de fato foi alterado.
 */
const NUNCA_REGISTRAR = new Set([
  'senha', 'senhaHash', 'webhookSecret', 'token', 'refreshToken',
  'criadoEm', 'atualizadoEm',
]);

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger('Auditoria');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compara o registro antes e depois, devolvendo só o que mudou.
   *
   * Guardar o objeto inteiro a cada edição incharia a tabela e esconderia a
   * informação útil no meio do que ficou igual.
   */
  static diferencas(antes: Record<string, unknown>, depois: Record<string, unknown>): Diferencas {
    const saida: Diferencas = {};
    for (const [campo, valorNovo] of Object.entries(depois)) {
      if (NUNCA_REGISTRAR.has(campo)) continue;
      const valorAntigo = antes[campo];
      // comparação por texto: cobre Decimal e Date sem caso especial para cada
      if (String(valorAntigo ?? '') !== String(valorNovo ?? '')) {
        saida[campo] = { de: valorAntigo ?? null, para: valorNovo ?? null };
      }
    }
    return saida;
  }

  /**
   * Grava um evento na trilha.
   *
   * Nunca deixa a operação principal falhar: se a auditoria quebrar, perde-se
   * o registro, não o cadastro que o usuário acabou de salvar. A falha vai
   * para o log do servidor, onde é visível sem afetar quem está usando.
   */
  async registrar(
    acao: 'CRIAR' | 'ATUALIZAR' | 'REMOVER' | 'ALTERAR_STATUS' | 'ALTERAR_PLANO',
    entidade: string,
    entidadeId: string,
    autor: Autor,
    dados?: Diferencas | Record<string, unknown>,
  ): Promise<void> {
    try {
      const limpo = dados
        ? Object.fromEntries(Object.entries(dados).filter(([k]) => !NUNCA_REGISTRAR.has(k)))
        : undefined;

      await this.prisma.logAuditoria.create({
        data: {
          usuarioId: autor.usuarioId ?? null,
          acao,
          entidade,
          entidadeId,
          ip: autor.ip ?? null,
          dados: (limpo as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });
    } catch (erro) {
      this.logger.error(
        `Falha ao registrar ${acao} em ${entidade}/${entidadeId}: ${
          erro instanceof Error ? erro.message : String(erro)
        }`,
      );
    }
  }

  /** Histórico de um registro, do mais recente para o mais antigo. */
  async historico(entidade: string, entidadeId: string) {
    const eventos = await this.prisma.logAuditoria.findMany({
      where: { entidade, entidadeId },
      orderBy: { criadoEm: 'desc' },
      take: 100,
      include: { usuario: { select: { nome: true, email: true } } },
    });

    return eventos.map((e) => ({
      id: e.id,
      acao: e.acao,
      quando: e.criadoEm,
      por: e.usuario?.nome ?? 'Sistema',
      ip: e.ip,
      mudancas: e.dados,
    }));
  }
}
