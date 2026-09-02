import { Alert, Card, Col, List, Progress, Row, Space, Statistic, Tag, Typography } from 'antd';
import { ArrowUpOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { moeda, percentual } from '@/api/formato';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import { corDoPlano, marca } from '@/marca';
import type { NivelPlano } from '@/api/tipos';

interface Resposta {
  plano: {
    nivel: NivelPlano; nome: string; preco: number; descricao: string;
    recursos: string[]; limiteProdutos: number; comissaoExtraPct: number; suporte: string;
  };
  assinatura: { valor: number; inicioEm: string; ativa: boolean } | null;
  uso: {
    produtos: { atual: number; limite: number };
    beneficios: { liberados: number; total: number };
    conteudos: { liberados: number; total: number };
  };
  resumo: { mensalidade: number; receitaGerada: number; roi: number; diasAtivo: number };
  upgrade: {
    plano: string; nivel: NivelPlano; preco: number; diferenca: number;
    beneficiosAdicionais: number; conteudosAdicionais: number; comissaoExtra: number; suporte: string;
  } | null;
}

export function MeuPlano() {
  const consulta = useApi<Resposta>(['portal', 'plano'], '/portal/plano');
  const d = consulta.data;

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

  return (
    <Pagina titulo="Meu Plano" descricao="O que seu plano libera e o que o próximo desbloqueia">
      <Estado carregando={consulta.isLoading} erro={consulta.error} esqueleto>
        {d && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card style={{ borderTop: `3px solid ${corDoPlano[d.plano.nivel]}` }}>
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {d.plano.nome}
                </Typography.Title>
                <Typography.Title level={2} style={{ margin: '4px 0', color: corDoPlano[d.plano.nivel] }}>
                  {moeda(d.plano.preco)}
                  <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                    {' '}
                    /mês
                  </Typography.Text>
                </Typography.Title>
                <Typography.Paragraph type="secondary">{d.plano.descricao}</Typography.Paragraph>

                <List
                  size="small"
                  dataSource={d.plano.recursos}
                  renderItem={(r) => (
                    <List.Item style={{ padding: '5px 0', border: 'none' }}>
                      <CheckCircleOutlined style={{ color: corDoPlano[d.plano.nivel], marginRight: 8 }} />
                      <Typography.Text style={{ fontSize: 13 }}>{r}</Typography.Text>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card title="Uso do plano" style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 14 }}>
                  <Typography.Text style={{ fontSize: 13 }}>
                    Produtos na loja — {d.uso.produtos.atual}
                    {d.uso.produtos.limite === -1 ? ' (ilimitado)' : ` de ${d.uso.produtos.limite}`}
                  </Typography.Text>
                  <Progress
                    percent={d.uso.produtos.limite === -1 ? 100 : pct(d.uso.produtos.atual, d.uso.produtos.limite)}
                    strokeColor={corDoPlano[d.plano.nivel]}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <Typography.Text style={{ fontSize: 13 }}>
                    Benefícios liberados — {d.uso.beneficios.liberados} de {d.uso.beneficios.total}
                  </Typography.Text>
                  <Progress
                    percent={pct(d.uso.beneficios.liberados, d.uso.beneficios.total)}
                    strokeColor="#00AD9A"
                  />
                </div>
                <div>
                  <Typography.Text style={{ fontSize: 13 }}>
                    Conteúdos acessíveis — {d.uso.conteudos.liberados} de {d.uso.conteudos.total}
                  </Typography.Text>
                  <Progress percent={pct(d.uso.conteudos.liberados, d.uso.conteudos.total)} />
                </div>

                <Row gutter={12} style={{ marginTop: 18 }}>
                  <Col span={12}>
                    <Tag style={{ width: '100%', textAlign: 'center', padding: 4 }}>
                      Suporte {d.plano.suporte}
                    </Tag>
                  </Col>
                  <Col span={12}>
                    <Tag
                      color={d.plano.comissaoExtraPct > 0 ? 'green' : 'default'}
                      style={{ width: '100%', textAlign: 'center', padding: 4 }}
                    >
                      {d.plano.comissaoExtraPct > 0
                        ? `+${percentual(d.plano.comissaoExtraPct, 0)} comissão`
                        : 'Sem bônus'}
                    </Tag>
                  </Col>
                </Row>
              </Card>

              <Card title="Resumo da assinatura">
                <Row gutter={12}>
                  <Col span={12}>
                    <Statistic title="Mensalidade" value={moeda(d.resumo.mensalidade)} valueStyle={{ fontSize: 18 }} />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Receita gerada"
                      value={moeda(d.resumo.receitaGerada)}
                      valueStyle={{ fontSize: 18, color: marca.mintLeaf }}
                    />
                  </Col>
                  <Col span={12} style={{ marginTop: 12 }}>
                    <Statistic title="ROI" value={`${d.resumo.roi}x`} valueStyle={{ fontSize: 18 }} />
                  </Col>
                  <Col span={12} style={{ marginTop: 12 }}>
                    <Statistic title="Dias ativo" value={d.resumo.diasAtivo} valueStyle={{ fontSize: 18 }} />
                  </Col>
                </Row>
                {d.resumo.roi > 0 && (
                  <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
                    Sua receita já cobre {d.resumo.roi}x o valor da assinatura.
                  </Typography.Paragraph>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              {d.upgrade ? (
                <Card
                  title={
                    <Space>
                      <ArrowUpOutlined /> Fazer upgrade
                    </Space>
                  }
                  style={{ borderTop: `3px solid ${corDoPlano[d.upgrade.nivel]}` }}
                >
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {d.upgrade.plano}
                  </Typography.Title>
                  <Typography.Title level={3} style={{ margin: '4px 0', color: corDoPlano[d.upgrade.nivel] }}>
                    {moeda(d.upgrade.preco)}
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      {' '}
                      /mês
                    </Typography.Text>
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    Apenas {moeda(d.upgrade.diferenca)} a mais por mês
                  </Typography.Text>

                  <List
                    size="small"
                    style={{ marginTop: 16 }}
                    dataSource={[
                      d.upgrade.beneficiosAdicionais > 0
                        ? `Mais ${d.upgrade.beneficiosAdicionais} benefício(s)`
                        : null,
                      d.upgrade.conteudosAdicionais > 0
                        ? `Mais ${d.upgrade.conteudosAdicionais} conteúdo(s)`
                        : null,
                      d.upgrade.comissaoExtra > 0
                        ? `+${percentual(d.upgrade.comissaoExtra, 0)} de comissão em cada venda`
                        : null,
                      `Suporte ${d.upgrade.suporte}`,
                    ].filter(Boolean) as string[]}
                    renderItem={(x) => (
                      <List.Item style={{ padding: '5px 0', border: 'none' }}>
                        <CheckCircleOutlined style={{ color: corDoPlano[d.upgrade!.nivel], marginRight: 8 }} />
                        <Typography.Text style={{ fontSize: 13 }}>{x}</Typography.Text>
                      </List.Item>
                    )}
                  />

                  <Alert
                    type="info"
                    showIcon
                    style={{ marginTop: 14 }}
                    message="Fale com o administrador"
                    description="A troca de plano é feita pela administração da associação."
                  />
                </Card>
              ) : (
                <Card>
                  <Alert
                    type="success"
                    showIcon
                    message="Você já está no plano mais completo"
                    description="Todos os benefícios, conteúdos e vantagens da associação estão liberados."
                  />
                </Card>
              )}
            </Col>
          </Row>
        )}
      </Estado>
    </Pagina>
  );
}
