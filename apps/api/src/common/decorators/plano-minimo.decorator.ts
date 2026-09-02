import { SetMetadata } from '@nestjs/common';
import { NivelPlano } from '@prisma/client';

export const PLANO_MINIMO_KEY = 'planoMinimo';

/** Exige que o associado tenha ao menos o plano informado. */
export const PlanoMinimo = (nivel: NivelPlano) => SetMetadata(PLANO_MINIMO_KEY, nivel);
