import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface UsuarioAutenticado {
  id: string;
  email: string;
  nome: string;
  role: Role;
  associadoId: string | null;
  nivelPlano: string | null;
}

export const CurrentUser = createParamDecorator(
  (campo: keyof UsuarioAutenticado | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user: UsuarioAutenticado }>();
    return campo ? req.user?.[campo] : req.user;
  },
);
