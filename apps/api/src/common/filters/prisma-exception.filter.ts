import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/** Converte erros conhecidos do Prisma em respostas HTTP legíveis. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    const { status, message } = this.traduzir(exception);
    if (status >= 500) this.logger.error(exception.message, exception.stack);

    res.status(status).json({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message,
      code: exception.code,
      timestamp: new Date().toISOString(),
    });
  }

  private traduzir(e: Prisma.PrismaClientKnownRequestError): { status: number; message: string } {
    const alvo = (e.meta?.target as string[] | string | undefined) ?? [];
    const campos = Array.isArray(alvo) ? alvo.join(', ') : String(alvo);

    switch (e.code) {
      case 'P2002':
        return { status: HttpStatus.CONFLICT, message: `Já existe um registro com este valor: ${campos}.` };
      case 'P2003':
        return { status: HttpStatus.BAD_REQUEST, message: 'Referência inválida: registro relacionado não existe.' };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Registro não encontrado.' };
      case 'P2014':
        return { status: HttpStatus.BAD_REQUEST, message: 'A operação violaria uma relação obrigatória.' };
      default:
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Erro ao acessar o banco de dados.' };
    }
  }
}
