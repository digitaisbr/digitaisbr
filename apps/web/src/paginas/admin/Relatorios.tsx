import { useState } from 'react';
import { Card, Col, DatePicker, Row, Table, Tag, Typography } from 'antd';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Dayjs } from 'dayjs';
import { useApi } from '@/api/hooks';
import { corDeStatus, moeda, numero, percentual, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import { marca } from '@/marca';

interface Relatorio {
  periodo: { de: string | null; ate: string | null };
  indicadores: {
    receitaTotal: number;
    vendasAprovadas: number;
    ticketMedio: number;
    taxaConversao: number;
    associadosAtivos: number;
    visualizacoesLojas: number;
  };
  vendasPorStatus: { status: string; quantidade: number; valor: number }[];
  associadosPorPlano: { plano: string; total: number; percentual: number }[];
  topProdutos: { nome: string; unidades: number; receita: number }[];
  topAssociados: { nome: string; handle: string; vendas: number; receita: number }[];
}

const CORES = [marca.digitalBlue, marca.violet, marca.mintLeaf, '#FAAD14', '#EB2F96', '#13C2C2'];

export function Relatorios() {
  const [periodo, setPeriodo] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const params = {
    de: periodo?.[0]?.format('YYYY-MM-DD'),
    ate: periodo?.[1]?.format('YYYY-MM-DD'),
  };
  const consulta = useApi<Relatorio>(['relatorios', params], '/relatorios', params);
  const r = consulta.data;

  return (
    <Pagina
      titulo="Relatórios"
      descricao="Analítico consolidado da operação"
      acoes={
        <DatePicker.RangePicker
          value={periodo}
          onChange={(v) => setPeriodo(v as [Dayjs | null, Dayjs | null] | null)}
          format="DD/MM/YYYY"
        />
      }
    >
      <Cartoes
        carregando={consulta.isLoading}
        colunas={6}
        metricas={[
          { titulo: 'Receita total', valor: moeda(r?.indicadores.receitaTotal), cor: marca.mintLeaf },
          { titulo: 'Vendas aprovadas', valor: r?.indicadores.vendasAprovadas ?? 0 },
          { titulo: 'Ticket médio', valor: moeda(r?.indicadores.ticketMedio) },
          { titulo: 'Conversão', valor: percentual(r?.indicadores.taxaConversao) },
          { titulo: 'Associados ativos', valor: r?.indicadores.associadosAtivos ?? 0 },
          { titulo: 'Views nas lojas', valor: numero(r?.indicadores.visualizacoesLojas) },
        ]}
      />

      <Estado carregando={consulta.isLoading} erro={consulta.error} esqueleto>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Vendas por status">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={r?.vendasPorStatus ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="#8c94a3" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#8c94a3" />
                  <Tooltip formatter={(v: number, n) => (n === 'valor' ? moeda(v) : v)} />
                  <Legend iconType="circle" />
                  <Bar dataKey="quantidade" name="Vendas" fill={marca.digitalBlue} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Associados por plano">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={r?.associadosPorPlano ?? []}
                    dataKey="total"
                    nameKey="plano"
                    innerRadius={54}
                    outerRadius={86}
                    paddingAngle={3}
                  >
                    {(r?.associadosPorPlano ?? []).map((_, i) => (
                      <Cell key={i} fill={CORES[i % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, n) => [`${v} associados`, n]} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Top produtos por receita">
              <Table
                rowKey="nome"
                size="small"
                pagination={false}
                dataSource={r?.topProdutos ?? []}
                columns={[
                  {
                    title: '#',
                    render: (_, __, i) => <Tag color={CORES[i % CORES.length]}>{i + 1}</Tag>,
                    width: 60,
                  },
                  { title: 'Produto', dataIndex: 'nome' },
                  { title: 'Unid.', dataIndex: 'unidades', align: 'center' },
                  { title: 'Receita', dataIndex: 'receita', align: 'right', render: (v: number) => moeda(v) },
                ]}
              />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Top associados por receita">
              <Table
                rowKey="handle"
                size="small"
                pagination={false}
                dataSource={r?.topAssociados ?? []}
                columns={[
                  {
                    title: '#',
                    render: (_, __, i) => <Tag color={CORES[i % CORES.length]}>{i + 1}</Tag>,
                    width: 60,
                  },
                  {
                    title: 'Associado',
                    dataIndex: 'nome',
                    render: (v: string, a) => (
                      <div>
                        <Typography.Text>{v}</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                          @{a.handle}
                        </Typography.Text>
                      </div>
                    ),
                  },
                  { title: 'Vendas', dataIndex: 'vendas', align: 'center' },
                  { title: 'Receita', dataIndex: 'receita', align: 'right', render: (v: number) => moeda(v) },
                ]}
              />
            </Card>
          </Col>

          <Col xs={24}>
            <Card title="Vendas por status — detalhado">
              <Table
                rowKey="status"
                size="small"
                pagination={false}
                dataSource={r?.vendasPorStatus ?? []}
                columns={[
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    render: (v: string) => <Tag color={corDeStatus(v)}>{rotulo(v)}</Tag>,
                  },
                  { title: 'Quantidade', dataIndex: 'quantidade', align: 'right' },
                  { title: 'Valor', dataIndex: 'valor', align: 'right', render: (v: number) => moeda(v) },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Estado>
    </Pagina>
  );
}
