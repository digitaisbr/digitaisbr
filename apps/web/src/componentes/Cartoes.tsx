import type { ReactNode } from 'react';
import { Card, Col, Row, Skeleton, Statistic, Typography, theme } from 'antd';

export interface Metrica {
  titulo: string;
  valor: ReactNode;
  sufixo?: ReactNode;
  detalhe?: ReactNode;
  icone?: ReactNode;
  cor?: string;
}

interface Props {
  metricas: Metrica[];
  carregando?: boolean;
  /** quantas colunas em telas grandes */
  colunas?: 2 | 3 | 4 | 6;
}

/** Faixa de cartões de métrica — o padrão visual do topo de quase toda tela. */
export function Cartoes({ metricas, carregando, colunas = 4 }: Props) {
  const span = 24 / colunas;
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      {metricas.map((m) => (
        <Col key={m.titulo} xs={24} sm={12} lg={span} xl={span}>
          <Card size="small" styles={{ body: { padding: '16px 18px' } }}>
            {carregando ? (
              <Skeleton active paragraph={false} title={{ width: '70%' }} />
            ) : (
              <>
                <Statistic
                  title={m.titulo}
                  value={m.valor as string | number}
                  suffix={m.sufixo}
                  prefix={m.icone}
                  valueStyle={{ fontSize: 22, fontWeight: 600, color: m.cor }}
                />
                {m.detalhe && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {m.detalhe}
                  </Typography.Text>
                )}
              </>
            )}
          </Card>
        </Col>
      ))}
    </Row>
  );
}

/** Cartão com barra colorida no topo — usado nos destaques. */
export function CartaoDestaque({
  cor,
  children,
  ...resto
}: { cor?: string; children: ReactNode } & React.ComponentProps<typeof Card>) {
  const { token } = theme.useToken();
  return (
    <Card {...resto} style={{ borderTop: `3px solid ${cor ?? token.colorPrimary}`, ...resto.style }}>
      {children}
    </Card>
  );
}
