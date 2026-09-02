import { Card, Col, Row, Table, Tabs, Tag, Typography } from 'antd';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import { useApi } from '@/api/hooks';
import { corDeStatus, data, moeda, percentual, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { Saque, VisaoFinanceira } from '@/api/tipos';
import { marca } from '@/marca';

interface Fluxo { mes: string; entradas: number; saidas: number; resultado: number }
interface Dre {
  receitas: { total: number; composicao: { categoria: string; valor: number; percentual: number }[] };
  custos: { total: number; composicao: { categoria: string; valor: number; percentual: number }[] };
  resultadoLiquido: number;
  margem: number;
}
interface Projecao { mes: string; assinantesProjetados: number; mrrProjetado: number }

const CORES = [marca.digitalBlue, marca.violet, marca.mintLeaf, '#FAAD14', '#EB2F96', '#13C2C2'];

export function Financeiro() {
  const visao = useApi<VisaoFinanceira>(['financeiro', 'visao'], '/financeiro/visao-geral');
  const fluxo = useApi<Fluxo[]>(['financeiro', 'fluxo'], '/financeiro/fluxo-caixa');
  const dre = useApi<Dre>(['financeiro', 'dre'], '/financeiro/dre');
  const projecao = useApi<Projecao[]>(['financeiro', 'projecao'], '/financeiro/projecao-mrr', { meses: 6 });
  const saques = useApi<{ data: Saque[] }>(['financeiro', 'saques'], '/financeiro/saques', { limit: 20 });

  const v = visao.data;

  const colunasSaques: ColumnsType<Saque> = [
    { title: 'Associado', dataIndex: ['associado', 'nome'], render: (x) => x ?? '—' },
    { title: 'Data', dataIndex: 'solicitadoEm', render: (x: string) => data(x) },
    { title: 'Valor', dataIndex: 'valor', align: 'right', render: (x: number) => moeda(x) },
    { title: 'Método', dataIndex: 'metodo', render: (x: string) => <Tag>{x}</Tag> },
    { title: 'Destino', dataIndex: 'destino', ellipsis: true },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (x: string) => <Tag color={corDeStatus(x)}>{rotulo(x)}</Tag>,
    },
    { title: 'Concluído', dataIndex: 'concluidoEm', render: (x: string | null) => data(x) },
  ];

  return (
    <Pagina titulo="Financeiro" descricao="Caixa, DRE e receita recorrente">
      <Cartoes
        carregando={visao.isLoading}
        colunas={3}
        metricas={[
          { titulo: 'Saldo atual', valor: moeda(v?.saldoAtual), cor: marca.mintLeaf },
          { titulo: 'MRR', valor: moeda(v?.mrr), detalhe: `ARR ${moeda(v?.arr)}` },
          { titulo: 'Margem líquida', valor: percentual(v?.margemLiquida) },
        ]}
      />
      <Cartoes
        carregando={visao.isLoading}
        colunas={3}
        metricas={[
          { titulo: 'Comissões a pagar', valor: moeda(v?.comissoesAPagar), cor: '#d48806' },
          { titulo: 'Receita de vendas', valor: moeda(v?.receitaVendas) },
          { titulo: 'Total de saídas', valor: moeda(v?.totalSaidas), cor: '#d4380d' },
        ]}
      />

      <Tabs
        items={[
          {
            key: 'fluxo',
            label: 'Fluxo de caixa',
            children: (
              <Card>
                <Estado carregando={fluxo.isLoading} erro={fluxo.error} esqueleto vazio={fluxo.data?.length === 0}>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={fluxo.data ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#8c94a3" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#8c94a3" tickFormatter={(x) => `R$${x / 1000}k`} />
                      <Tooltip formatter={(x: number) => moeda(x)} />
                      <Legend iconType="circle" />
                      <Bar dataKey="entradas" name="Entradas" fill={marca.mintLeaf} radius={[5, 5, 0, 0]} />
                      <Bar dataKey="saidas" name="Saídas" fill="#d4380d" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Estado>
              </Card>
            ),
          },
          {
            key: 'dre',
            label: 'DRE',
            children: (
              <Estado carregando={dre.isLoading} erro={dre.error} esqueleto>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <Card title="Composição de saídas">
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={dre.data?.custos.composicao ?? []}
                            dataKey="valor"
                            nameKey="categoria"
                            innerRadius={58}
                            outerRadius={92}
                            paddingAngle={3}
                          >
                            {(dre.data?.custos.composicao ?? []).map((_, i) => (
                              <Cell key={i} fill={CORES[i % CORES.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(x: number) => moeda(x)} />
                          <Legend iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card title="Demonstrativo">
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="categoria"
                        dataSource={[
                          ...(dre.data?.receitas.composicao ?? []).map((c) => ({ ...c, tipo: 'Entrada' })),
                          ...(dre.data?.custos.composicao ?? []).map((c) => ({ ...c, tipo: 'Saída' })),
                        ]}
                        columns={[
                          {
                            title: 'Tipo',
                            dataIndex: 'tipo',
                            render: (x: string) => (
                              <Tag color={x === 'Entrada' ? 'green' : 'red'}>{x}</Tag>
                            ),
                          },
                          { title: 'Categoria', dataIndex: 'categoria', render: (x: string) => rotulo(x) },
                          { title: 'Valor', dataIndex: 'valor', align: 'right', render: (x: number) => moeda(x) },
                          {
                            title: '%',
                            dataIndex: 'percentual',
                            align: 'right',
                            render: (x: number) => percentual(x),
                          },
                        ]}
                        summary={() => (
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={2}>
                              <Typography.Text strong>Resultado líquido</Typography.Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right">
                              <Typography.Text strong style={{ color: marca.mintLeaf }}>
                                {moeda(dre.data?.resultadoLiquido)}
                              </Typography.Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <Typography.Text strong>{percentual(dre.data?.margem)}</Typography.Text>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>
              </Estado>
            ),
          },
          {
            key: 'projecao',
            label: 'Projeção MRR',
            children: (
              <Card>
                <Estado carregando={projecao.isLoading} erro={projecao.error} esqueleto>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={projecao.data ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#8c94a3" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#8c94a3" tickFormatter={(x) => `R$${x / 1000}k`} />
                      <Tooltip formatter={(x: number) => moeda(x)} />
                      <Legend iconType="circle" />
                      <Line
                        type="monotone"
                        dataKey="mrrProjetado"
                        name="MRR projetado"
                        stroke={marca.digitalBlue}
                        strokeWidth={2.4}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12 }}>
                    Projeção linear a partir da base ativa e do crescimento observado nos últimos 30 dias,
                    limitado a 20% ao mês.
                  </Typography.Paragraph>
                </Estado>
              </Card>
            ),
          },
          {
            key: 'saques',
            label: 'Saques',
            children: (
              <Card>
                <Estado carregando={saques.isLoading} erro={saques.error} esqueleto>
                  <Table<Saque>
                    rowKey="id"
                    size="middle"
                    columns={colunasSaques}
                    dataSource={saques.data?.data ?? []}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 'max-content' }}
                  />
                </Estado>
              </Card>
            ),
          },
        ]}
      />
    </Pagina>
  );
}
