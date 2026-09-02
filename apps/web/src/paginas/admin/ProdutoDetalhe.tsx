import { useParams } from 'react-router-dom';
import { Card, Col, Descriptions, Row, Statistic, Table, Tag, Typography } from 'antd';
import { useApi } from '@/api/hooks';
import { corDeStatus, data, moeda, numero, percentual, rotulo } from '@/api/formato';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { Produto } from '@/api/tipos';
import { marca } from '@/marca';

interface Detalhe extends Produto {
  criadoEm: string;
  atualizadoEm: string;
  lojas: { id: string; nome: string; slug: string; ativa: boolean; associado: string; destaque: boolean }[];
  desempenho: { unidadesVendidas: number; receita: number; totalVendas: number };
}

export function ProdutoDetalhe() {
  const { id = '' } = useParams();
  const consulta = useApi<Detalhe>(['catalogo', 'produto', id], `/catalogo/produtos/${id}`);
  const p = consulta.data;

  return (
    <Pagina
      titulo={p?.nome ?? 'Produto'}
      trilha={[{ rotulo: 'Catálogo', para: '/catalogo' }, { rotulo: p?.sku ?? '…' }]}
      descricao={p ? `SKU ${p.sku} · ${p.categoria.nome}` : undefined}
    >
      <Estado carregando={consulta.isLoading} erro={consulta.error} esqueleto>
        {p && (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              {[
                { t: 'Preço', v: moeda(p.preco) },
                { t: 'Comissão', v: percentual(p.comissaoPct, 0), d: `${moeda(p.ganhoEstimado)} por venda` },
                { t: 'Estoque', v: p.estoqueIlimitado ? 'Ilimitado' : numero(p.estoque) },
                { t: 'Em lojas', v: p.emLojas },
              ].map((m) => (
                <Col key={m.t} xs={12} lg={6}>
                  <Card size="small">
                    <Statistic title={m.t} value={m.v as string} valueStyle={{ fontSize: 21 }} />
                    {m.d && (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {m.d}
                      </Typography.Text>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="Detalhes do produto">
                  <Typography.Paragraph>{p.descricao ?? 'Sem descrição.'}</Typography.Paragraph>
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="SKU">{p.sku}</Descriptions.Item>
                    <Descriptions.Item label="Categoria">
                      <Tag color={p.categoria.cor ?? 'default'}>{p.categoria.nome}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={corDeStatus(p.status)}>{rotulo(p.status)}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Exclusividade">
                      {p.planoMinimo ? (
                        <Tag color={corDeStatus(p.planoMinimo.nivel)}>{p.planoMinimo.nome} ou superior</Tag>
                      ) : (
                        <Tag>Todos os planos</Tag>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Criado em">{data(p.criadoEm)}</Descriptions.Item>
                    <Descriptions.Item label="Atualizado em">{data(p.atualizadoEm)}</Descriptions.Item>
                    {p.checkoutUrl && (
                      <Descriptions.Item label="Checkout">
                        <Typography.Text copyable style={{ fontSize: 12 }}>
                          {p.checkoutUrl}
                        </Typography.Text>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card title="Desempenho" style={{ marginBottom: 16 }}>
                  <Row gutter={12} style={{ textAlign: 'center' }}>
                    <Col span={8}>
                      <Statistic title="Unidades" value={p.desempenho.unidadesVendidas} valueStyle={{ fontSize: 20 }} />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Receita"
                        value={moeda(p.desempenho.receita)}
                        valueStyle={{ fontSize: 20, color: marca.mintLeaf }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic title="Vendas" value={p.desempenho.totalVendas} valueStyle={{ fontSize: 20 }} />
                    </Col>
                  </Row>
                </Card>

                <Card title={`Lojas com este produto (${p.lojas.length})`}>
                  <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    dataSource={p.lojas}
                    columns={[
                      { title: 'Loja', dataIndex: 'nome' },
                      { title: 'Associado', dataIndex: 'associado' },
                      {
                        title: 'Destaque',
                        dataIndex: 'destaque',
                        align: 'center',
                        render: (v: boolean) => (v ? <Tag color="gold">Sim</Tag> : '—'),
                      },
                      {
                        title: 'Situação',
                        dataIndex: 'ativa',
                        render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Ativa' : 'Inativa'}</Tag>,
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
