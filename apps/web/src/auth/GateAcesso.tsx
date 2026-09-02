import { Navigate, Outlet } from 'react-router-dom';

const CHAVE = 'digitaisbr_access';

export const gate = {
  liberado: () => sessionStorage.getItem(CHAVE) === 'granted',
  liberar: () => sessionStorage.setItem(CHAVE, 'granted'),
};

/** Reproduz o gate de código de acesso que a plataforma original exigia antes do login. */
export function GateAcesso() {
  return gate.liberado() ? <Outlet /> : <Navigate to="/acesso" replace />;
}
