import { Prisma } from '@prisma/client';

/** Monta um filtro OR de `contains` case-insensitive sobre os campos informados. */
export function buscaTextual<T extends string>(
  termo: string | undefined,
  campos: T[],
): Record<string, unknown> | undefined {
  if (!termo?.trim()) return undefined;
  return {
    OR: campos.map((campo) => ({
      [campo]: { contains: termo.trim(), mode: Prisma.QueryMode.insensitive },
    })),
  };
}

/** Traduz `sort`/`order` em cláusula orderBy, com fallback seguro. */
export function ordenar(
  sort: string | undefined,
  order: 'asc' | 'desc',
  permitidos: string[],
  padrao: Record<string, 'asc' | 'desc'>,
): Record<string, 'asc' | 'desc'> {
  return sort && permitidos.includes(sort) ? { [sort]: order } : padrao;
}

/** Converte Decimal do Prisma (ou null) em number. */
export const num = (v: Prisma.Decimal | number | null | undefined): number => (v ? Number(v) : 0);

/** Intervalo [inicio, fim] pronto para filtro de datas. */
export function intervaloDatas(
  de?: string,
  ate?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!de && !ate) return undefined;
  return {
    ...(de ? { gte: new Date(`${de}T00:00:00.000Z`) } : {}),
    ...(ate ? { lte: new Date(`${ate}T23:59:59.999Z`) } : {}),
  };
}
