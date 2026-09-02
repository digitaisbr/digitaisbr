import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { api } from './cliente';
import type { FiltrosBase, Paginado } from './tipos';

/** Remove chaves vazias para não poluir a query string. */
function limpar(filtros: FiltrosBase = {}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
}

/** GET simples, com cache por chave. */
export function useApi<T>(
  chave: unknown[],
  url: string,
  params?: FiltrosBase,
  opcoes?: Partial<UseQueryOptions<T>>,
) {
  return useQuery<T>({
    queryKey: [...chave, params ?? {}],
    queryFn: async () => {
      const { data } = await api.get<T>(url, { params: limpar(params) });
      return data;
    },
    ...opcoes,
  });
}

/** GET de listagem paginada. */
export function useLista<T>(chave: unknown[], url: string, filtros?: FiltrosBase) {
  return useApi<Paginado<T>>(chave, url, filtros, { placeholderData: (anterior) => anterior });
}

type Metodo = 'post' | 'patch' | 'put' | 'delete';

/**
 * Mutação que invalida as chaves informadas ao concluir — assim as listas
 * e os cartões de métrica se atualizam sozinhos após uma escrita.
 */
export function useAcao<TEntrada = unknown, TSaida = unknown>(
  metodo: Metodo,
  url: string | ((entrada: TEntrada) => string),
  invalidar: unknown[][] = [],
) {
  const qc = useQueryClient();
  return useMutation<TSaida, unknown, TEntrada>({
    mutationFn: async (entrada) => {
      const caminho = typeof url === 'function' ? url(entrada) : url;
      const { data } = await api.request<TSaida>({
        method: metodo,
        url: caminho,
        data: metodo === 'delete' ? undefined : entrada,
      });
      return data;
    },
    onSuccess: () => {
      invalidar.forEach((chave) => void qc.invalidateQueries({ queryKey: chave }));
    },
  });
}
