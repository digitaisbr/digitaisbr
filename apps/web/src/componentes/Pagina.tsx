import type { ReactNode } from 'react';
import { Breadcrumb, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';

interface Props {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  trilha?: { rotulo: string; para?: string }[];
  children: ReactNode;
}

/** Moldura padrão de página: trilha, título, ações e conteúdo. */
export function Pagina({ titulo, descricao, acoes, trilha, children }: Props) {
  return (
    <div>
      {trilha && trilha.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 12 }}
          items={trilha.map((t) => ({
            title: t.para ? <Link to={t.para}>{t.rotulo}</Link> : t.rotulo,
          }))}
        />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0, letterSpacing: -0.4 }}>
            {titulo}
          </Typography.Title>
          {descricao && (
            <Typography.Text type="secondary" style={{ fontSize: 13.5 }}>
              {descricao}
            </Typography.Text>
          )}
        </div>
        {acoes && <Space wrap>{acoes}</Space>}
      </div>

      {children}
    </div>
  );
}
