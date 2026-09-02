import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, sessao } from '@/api/cliente';
import type { RespostaLogin, UsuarioSessao } from '@/api/tipos';

interface ContextoAuth {
  usuario: UsuarioSessao | null;
  autenticado: boolean;
  ehAdmin: boolean;
  ehAssociado: boolean;
  entrar: (email: string, senha: string) => Promise<UsuarioSessao>;
  sair: () => Promise<void>;
}

const Auth = createContext<ContextoAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(() => sessao.usuario);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { data } = await api.post<RespostaLogin>('/auth/login', { email, senha });
    sessao.salvar(data);
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  const sair = useCallback(async () => {
    // o logout revoga os refresh tokens no servidor; se falhar, a sessão
    // local é limpa de qualquer forma
    try {
      await api.post('/auth/logout');
    } catch {
      /* sessão já expirada — seguir com a limpeza local */
    }
    sessao.limpar();
    setUsuario(null);
  }, []);

  const valor = useMemo<ContextoAuth>(
    () => ({
      usuario,
      autenticado: Boolean(usuario),
      ehAdmin: usuario?.role === 'ADMIN',
      ehAssociado: usuario?.role === 'ASSOCIADO',
      entrar,
      sair,
    }),
    [usuario, entrar, sair],
  );

  return <Auth.Provider value={valor}>{children}</Auth.Provider>;
}

export function useAuth(): ContextoAuth {
  const ctx = useContext(Auth);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
