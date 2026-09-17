import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Autor } from '../auditoria/auditoria.service';
import type { UsuarioAutenticado } from './current-user.decorator';

/**
 * Quem está fazendo a operação, para a trilha de auditoria.
 *
 * Reúne usuário e endereço num parâmetro só — os dois sempre andam juntos, e
 * separá-los acrescentaria um argumento a cada método de escrita.
 */
export const QuemFez = createParamDecorator((_: unknown, ctx: ExecutionContext): Autor => {
  const req = ctx.switchToHttp().getRequest<Request & { user?: UsuarioAutenticado }>();
  return { usuarioId: req.user?.id ?? null, ip: req.ip ?? null };
});
