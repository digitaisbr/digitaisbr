import { Alert, Empty, Skeleton, Spin } from 'antd';
import type { ReactNode } from 'react';
import { mensagemDeErro } from '@/api/cliente';

interface Props {
  carregando?: boolean;
  erro?: unknown;
  vazio?: boolean;
  mensagemVazio?: string;
  children: ReactNode;
  /** esqueleto no lugar do spinner, para blocos de conteúdo */
  esqueleto?: boolean;
}

/** Trata os três estados de uma consulta — carregando, erro e vazio — num só lugar. */
export function Estado({ carregando, erro, vazio, mensagemVazio, children, esqueleto }: Props) {
  if (carregando) {
    return esqueleto ? (
      <Skeleton active paragraph={{ rows: 5 }} />
    ) : (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (erro) {
    return (
      <Alert
        type="error"
        showIcon
        message="Não foi possível carregar"
        description={mensagemDeErro(erro)}
      />
    );
  }

  if (vazio) {
    return <Empty description={mensagemVazio ?? 'Nada por aqui ainda'} style={{ padding: 32 }} />;
  }

  return <>{children}</>;
}
