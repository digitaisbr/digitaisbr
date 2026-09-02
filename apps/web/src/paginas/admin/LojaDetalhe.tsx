import { Link, useParams } from 'react-router-dom';
import { Button, Card, Col, Descriptions, Row, Statistic, Table, Tag, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { moeda, numero, percentual } from '@/api/formato';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import { marca } from '@/marca';

interface Detalhe {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  ativa: boolean;
  visualizacoes: number;
  associado: { id: string; nome: string; handle: string; plano: { nome: string; limiteProdutos: number } };
  produtos: { id: string; nome: string; preco: number; comissaoPct: number; destaque: boolean; categoria: { nome: string } }[];
  desempenho: { vendasAprovadas: number; receita: number; visualizacoes: number; conversao: number };
}

export function LojaDetalhe() {
  const { id = '' } = useParams();
  const consulta = useApi<Detalhe>(['lojas', id], `/lojas/${id}`);
  const l = consulta.data;

  return (
    <Pagina
      titulo={l?.nome ?? 'Loja'}
      trilha={[{ rotulo: 'Lojas', para: '/lojas' }, { rotulo: l?.slug ?? '…' }]}
      descricao={l ? `${l.associado.nome} · /${l.slug}` : undefined}
      acoes={
        l && (
          <Link to={`/loja/${l.slug}`} target="_blank">
            <Button icon={<EyeOutlined />}>Ver vitrine pública</Button>
          </Link>
        )
      }
    >
      <Estado carregando={consulta.isLoading} erro={consulta.error} esqueleto>
        {l && (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              {[
                { t: 'Visualizações', v: numero(l.desempenho.visualizacoes) },
                { t: 'Vendas aprovadas', v: l.desempenho.vendasAprovadas },
                { t: 'Receita', v: moeda(l.desempenho.receita), c: marca.mintLeaf },
                { t: 'Conversão', v: percentual(l.desempenho.conversao, 2) },
              ].map((m) => (
                <Col key={m.t} xs={12} lg={6}>
                  <Card size="small">
                    <Statistic title={m.t} value={m.v as string} valueStyle={{ fontSize: 21, color: m.c }} />
                  </Card>
                </Col>
              ))}
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={8}>
                <Card title="Dados da loja">
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Nome">{l.nome}</Descriptions.Item>
                    <Descriptions.Item label="Slug">/{l.slug}</Descriptions.Item>
                    <Descriptions.Item label="Situação">
                      <Tag color={l.ativa ? 'green' : 'default'}>{l.ativa ? 'Ativa' : 'Inativa'}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Associado">
                      <Link to={`/associados/${l.associado.id}`}>{l.associado.nome}</Link>
                    </Descriptions.Item>
                    <Descriptions.Item label="Plano">{l.associado.plano.nome}</Descriptions.Item>
                    <Descriptions.Item label="Limite de produtos">
                      {l.associado.plano.limiteProdutos === -1
                        ? 'Ilimitado'
                        : `${l.produtos.length} de ${l.associado.plano.limiteProdutos}`}
                    </Descriptions.Item>
                  </Descriptions>
                  {l.descricao && (
                    <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
                      {l.descricao}
                    </Typography.Paragraph>
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={16}>
                <Card title={`Vitrine · ${l.produtos.length} produto(s)`}>
                  <Table
                    rowKey="id"
                    size="small"
                    dataSource={l.produtos}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Produto',
                        dataIndex: 'nome',
                        render: (v: string, p) => (
                          <div>
                            <Link to={`/catalogo/${p.id}`}>{v}</Link>
                            {p.destaque && (
                              <Tag color="gold" style={{ marginLeft: 6 }}>
                                Destaque
                              </Tag>
                            )}
                          </div>
                        ),
                      },
                      { title: 'Categoria', dataIndex: ['categoria', 'nome'] },
                      { title: 'Preço', dataIndex: 'preco', align: 'right', render: (v: number) => moeda(v) },
                      {
                        title: 'Comissão',
                        dataIndex: 'comissaoPct',
                        align: 'right',
                        render: (v: number) => percentual(v, 0),
                      },
                    ]}
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
