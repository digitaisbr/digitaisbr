import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NivelPlano, Role } from '@prisma/client';
import { PLANO_MINIMO_KEY } from '../decorators/plano-minimo.decorator';
import { UsuarioAutenticado } from '../decorators/current-user.decorator';

/** Ordem de precedência dos planos — usada para comparar níveis. */
export const ORDEM_PLANO: Record<NivelPlano, number> = {
  [NivelPlano.BASICO]: 1,
  [NivelPlano.INTERMEDIARIO]: 2,
  [NivelPlano.AVANCADO]: 3,
};

@Injectable()
export class PlanoGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const exigido = this.reflector.getAllAndOverride<NivelPlano>(PLANO_MINIMO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!exigido) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: UsuarioAutenticado }>();
    if (user?.role === Role.ADMIN) return true;

    const atual = user?.nivelPlano as NivelPlano | undefined;
    if (!atual || ORDEM_PLANO[atual] < ORDEM_PLANO[exigido]) {
      throw new ForbiddenException(
        `Recurso disponível a partir do plano ${exigido}. Faça upgrade para acessar.`,
      );
    }
    return true;
  }
}
