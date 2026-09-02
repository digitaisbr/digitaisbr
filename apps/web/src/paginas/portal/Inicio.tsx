import { Link } from 'react-router-dom';
import { App, Button, Card, Col, List, Progress, Row, Space, Statistic, Tag, Typography } from 'antd';
import { CopyOutlined, ShopOutlined } from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { compacto, corDeStatus, data, moeda, numero, percentual, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import { corDoPlano, gradienteMarca, marca } from '@/marca';
import type { Beneficio, DashboardPortal, Paginado } from '@/api/tipos';

export function Inicio() {
  const { message } = App.useApp();
  const painel = useApi<DashboardPortal>(['portal', 'painel'], '/dashboard/portal');
  const beneficios = useApi<Paginado<Beneficio>>(
    ['beneficios', 'liberados'],
    '/beneficios',
    { apenasLiberados: true, limit: 5 },
  );

  const d = painel.data;

  function copiarLink() {
    if (!d?.loja) return;
    const url = `${location.origin}/loja/${d.loja.slug}`;
    void navigator.clipboard.writeText(url);
    message.success('Link da loja copiado.');
  }

  return (
    <Pagina titulo={d ? `Olá, ${d.associado.nome.split(' ')[0]}!` : 'Início'}>
      <Estado carregando={painel.isLoading} erro={painel.error} esqueleto>
        {d && (
          <>
            <Card
              style={{ marginBottom: 20, background: gradienteMarca, border: 'none' }}
              styles={{ body: { padding: 22 } }}
            >
              <Row align="middle" gutter={[16, 16]}>
                <Col xs={24} md={14}>
                  <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
                    {d.associado.nome}
                  </Typography.Title>
                  <Space wrap size={8} style={{ marginTop: 8 }}>
                    <Tag color="#fff" style={{ color: corDoPlano[d.associado.plano.nivel] }}>
                      Plano {d.associado.plano.nome}
                    </Tag>
                    <Typography.Text style={{ color: 'rgba(255,255,255,0.9)' }}>
                      {moeda(d.associado.plano.preco)}/mês
                    </Typography.Text>
                    {d.associado.nicho && (
                      <Typography.Text style={{ color: 'rgba(255,255,255,0.75)' }}>
                        · {d.associado.nicho}
                      </Typography.Text>
                    )}
                  </Space>
                </Col>
                <Col xs={24} md={10}>
                  <Row gutter={12} style={{ textAlign: 'center' }}>
                    <Col span={8}>
                      <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
                        {compacto(d.associado.seguidores)}
                      </Typography.Title>
                      <Typography.Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                        Seguidores
                      </Typography.Text>
                    </Col>
                    <Col span={8}>
                      <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
                        {percentual(d.associado.engajamento)}
                      </Typography.Title>
                      <Typography.Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                        Engajamento
                      </Typography.Text>
                    </Col>
                    <Col span={8}>
                      <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
                        {numero(d.loja?.visitas)}
                      </Typography.Title>
                      <Typography.Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                        Visitas
                      </Typography.Text>
                    </Col>
                  </Row>
                </Col>
              </Row>
              {d.loja && (
                <Button
                  ghost
                  icon={<CopyOutlined />}
                  onClick={copiarLink}
                  style={{ marginTop: 16, color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  Copiar meu link
                </Button>
              )}
            </Card>

            <Cartoes
              metricas={[
                { titulo: 'Vendas aprovadas', valor: d.vendas.aprovadas, detalhe: `de ${d.vendas.total}` },
                { titulo: 'Receita total', valor: moeda(d.vendas.receita) },
                { titulo: 'Comissões recebidas', valor: moeda(d.comissoes.recebidas), cor: marca.mintLeaf },
                { titulo: 'Comissões pendentes', valor: moeda(d.comissoes.pendentes), cor: '#d48806' },
              ]}
            />

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={8}>
                <Card title="Meu plano" extra={<Link to="/portal/plano">Detalhes</Link>}>
                  <Statistic
                    title={d.associado.plano.nome}
                    value={moeda(d.associado.plano.preco)}
                    suffix="/mês"
                    valueStyle={{ color: corDoPlano[d.associado.plano.nivel] }}
                  />
                  <div style={{ marginTop: 16 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Benefícios utilizados
                    </Typography.Text>
                    <Progress
                      percent={Math.round(
                        (d.uso.beneficiosUsados / Math.max(d.uso.beneficiosDisponiveis, 1)) * 100,
                      )}
                      strokeColor="#00AD9A"
                    />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Conteúdos acessados
                    </Typography.Text>
                    <Progress
                      percent={Math.round(
                        (d.uso.conteudosVistos / Math.max(d.uso.conteudosDisponiveis, 1)) * 100,
                      )}
                    />
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card
                  title="Minha loja"
                  extra={<Link to="/portal/loja">Gerenciar</Link>}
                >
                  {d.loja ? (
                    <>
                      <Space align="center" style={{ marginBottom: 14 }}>
                        <ShopOutlined style={{ fontSize: 22, color: marca.digitalBlue }} />
                        <div>
                          <Typography.Text strong style={{ display: 'block' }}>
                            {d.loja.nome}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            /{d.loja.slug}
                          </Typography.Text>
                        </div>
                        <Tag color={d.loja.ativa ? 'green' : 'default'}>
                          {d.loja.ativa ? 'Ativa' : 'Inativa'}
                        </Tag>
                      </Space>
                      <Row gutter={12} style={{ textAlign: 'center' }}>
                        <Col span={12}>
                          <Statistic title="Produtos" value={d.loja.produtos} valueStyle={{ fontSize: 20 }} />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Visitas"
                            value={numero(d.loja.visitas)}
                            valueStyle={{ fontSize: 20 }}
                          />
                        </Col>
                      </Row>
                    </>
                  ) : (
                    <Typography.Text type="secondary">Você ainda não tem loja criada.</Typography.Text>
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card title="Meus benefícios" extra={<Link to="/portal/beneficios">Ver todos</Link>}>
                  <Estado carregando={beneficios.isLoading} erro={beneficios.error} esqueleto>
                    <List
                      size="small"
                      dataSource={beneficios.data?.data ?? []}
                      renderItem={(b) => (
                        <List.Item>
                          <List.Item.Meta
                            title={
                              <Typography.Text style={{ fontSize: 13 }}>{b.nome}</Typography.Text>
                            }
                            description={
                              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                {b.parceiro?.nome ?? '—'}
                              </Typography.Text>
                            }
                          />
                          {b.valorLabel && <Tag color="green">{b.valorLabel}</Tag>}
                        </List.Item>
                      )}
                    />
                  </Estado>
                </Card>
              </Col>

              <Col xs={24}>
                <Card title="Vendas recentes" extra={<Link to="/portal/vendas">Ver todas</Link>}>
                  <List
                    dataSource={d.vendasRecentes}
                    locale={{ emptyText: 'Nenhuma venda ainda' }}
                    renderItem={(v) => (
                      <List.Item
                        actions={[
                          <Typography.Text key="v" strong>
                            {moeda(v.total)}
                          </Typography.Text>,
                          <Tag key="s" color={corDeStatus(v.status)}>
                            {rotulo(v.status)}
                          </Tag>,
                        ]}
                      >
                        <List.Item.Meta
                          title={v.produto}
                          description={
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {v.cliente} · {data(v.data)} · {v.ref}
                            </Typography.Text>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Estado>
    </Pagina>
  );
}
