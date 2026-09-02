import { Card, Col, List, Row, Statistic, Tag, Typography } from 'antd';
import { CheckCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { moeda, percentual } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { Plano } from '@/api/tipos';
import { marca } from '@/marca';

interface Metricas {
  mrr: number;
  arr: number;
  totalAssociadosAtivos: number;
  distribuicao: { nivel: string; nome: string; associados: number; percentual: number; receita: number }[];
}

const COR: Record<string, string> = { BASICO: marca.digitalBlue, INTERMEDIARIO: marca.violet, AVANCADO: '#faad14' };

export function Planos() {
  const planos = useApi<Plano[]>(['planos'], '/planos');
  const metricas = useApi<Metricas>(['planos', 'metricas'], '/planos/metricas');

  const m = metricas.data;

  return (
    <Pagina titulo="Planos" descricao="Níveis de assinatura e o que cada um libera">
      <Cartoes
        carregando={metricas.isLoading}
        colunas={3}
        metricas={[
          { titulo: 'MRR', valor: moeda(m?.mrr), detalhe: 'receita recorrente mensal', cor: marca.mintLeaf },
          { titulo: 'ARR', valor: moeda(m?.arr), detalhe: 'projeção anual' },
          { titulo: 'Assinantes ativos', valor: m?.totalAssociadosAtivos ?? 0, icone: <TeamOutlined /> },
        ]}
      />

      <Estado carregando={planos.isLoading} erro={planos.error} esqueleto>
        <Row gutter={[16, 16]}>
          {(planos.data ?? []).map((p) => {
            const dist = m?.distribuicao.find((d) => d.nivel === p.nivel);
            return (
              <Col key={p.id} xs={24} md={8}>
                <Card
                  style={{ borderTop: `3px solid ${COR[p.nivel]}`, height: '100%' }}
                  title={
                    <div style={{ textAlign: 'center' }}>
                      <Typography.Title level={4} style={{ margin: 0 }}>
                        {p.nome}
                      </Typography.Title>
                      <Typography.Text style={{ fontSize: 26, fontWeight: 700, color: COR[p.nivel] }}>
                        {moeda(p.preco)}
                      </Typography.Text>
                      <Typography.Text type="secondary">/mês</Typography.Text>
                    </div>
                  }
                >
                  <Typography.Paragraph type="secondary" style={{ textAlign: 'center', minHeight: 44 }}>
                    {p.descricao}
                  </Typography.Paragraph>

                  <Row gutter={8} style={{ textAlign: 'center', marginBottom: 16 }}>
                    <Col span={12}>
                      <Statistic
                        title="Associados"
                        value={p.associadosAtivos ?? 0}
                        valueStyle={{ fontSize: 20 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Receita"
                        value={dist ? moeda(dist.receita) : '—'}
                        valueStyle={{ fontSize: 20 }}
                      />
                    </Col>
                  </Row>

                  <List
                    size="small"
                    dataSource={p.recursos}
                    renderItem={(r) => (
                      <List.Item style={{ padding: '5px 0', border: 'none' }}>
                        <CheckCircleOutlined style={{ color: COR[p.nivel], marginRight: 8 }} />
                        <Typography.Text style={{ fontSize: 13 }}>{r}</Typography.Text>
                      </List.Item>
                    )}
                  />

                  <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Tag>
                      {p.limiteProdutos === -1 ? 'Produtos ilimitados' : `Até ${p.limiteProdutos} produtos`}
                    </Tag>
                    {p.comissaoExtraPct > 0 && (
                      <Tag color="green">+{percentual(p.comissaoExtraPct, 0)} de comissão</Tag>
                    )}
                    <Tag>Suporte {p.suporte}</Tag>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Estado>
    </Pagina>
  );
}
