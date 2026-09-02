import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';
import type { Role } from '@/api/tipos';
import { useAuth } from './AuthContext';

interface Props {
  /** restringe ao papel informado */
  papel?: Role;
  /**
   * exige que a conta tenha um associado vinculado.
   * O portal depende disso: um administrador sem associado não tem loja, vendas
   * nem comissões, e cada tela lá dentro responderia 403.
   */
  exigeAssociado?: boolean;
}

export function RotaProtegida({ papel, exigeAssociado }: Props) {
  const { autenticado, usuario } = useAuth();
  const local = useLocation();

  if (!autenticado) {
    return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  }

  if (papel && usuario?.role !== papel) {
    return (
      <Result
        status="403"
        title="Área restrita"
        subTitle="Esta seção não faz parte do seu perfil de acesso."
        extra={
          <Link to={usuario?.role === 'ADMIN' ? '/' : '/portal'}>
            <Button type="primary">Ir para a minha área</Button>
          </Link>
        }
        style={{ paddingTop: 72 }}
      />
    );
  }

  // explica o motivo em vez de deixar cada tela falhar isoladamente
  if (exigeAssociado && !usuario?.associadoId) {
    return (
      <Result
        status="info"
        title="O portal é do associado"
        subTitle={
          <>
            Sua conta é de <strong>administração</strong> e não tem um associado vinculado, então
            não há loja, vendas ou comissões para exibir aqui.
            <br />
            Para ver os dados de um associado, use a ficha dele na área administrativa.
          </>
        }
        extra={
          <>
            <Link to="/">
              <Button type="primary">Voltar ao painel</Button>
            </Link>
            <Link to="/associados">
              <Button>Ver associados</Button>
            </Link>
          </>
        }
        style={{ paddingTop: 72 }}
      />
    );
  }

  return <Outlet />;
}
