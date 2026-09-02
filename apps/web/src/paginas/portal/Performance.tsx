import { useState } from 'react';
import { Card, Col, DatePicker, Row, Table, Typography } from 'antd';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart,
} from 'recharts';
import type { Dayjs } from 'dayjs';
import { useApi } from '@/api/hooks';
import { data, moeda, numero, percentual } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import { marca } from '@/marca';

interface Resposta {
  indicadores: { cliques: number; conversoes: number; taxaConversao: number; receita: number; comissao: number };
  serieDiaria: { data: string; cliques: number; conversoes: number; taxa: number; receita: number; comissao: number }[];
  topProdutos: { nome: string; receita: number }[];
}

export function Performance() {
  const [periodo, setPeriodo] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const params = {
    de: periodo?.[0]?.format('YYYY-MM-DD'),
    ate: periodo?.[1]?.format('YYYY-MM-DD'),
  };
  const consulta = useApi<Resposta>(['portal', 'performance', params], '/portal/performance', params);
  const r = consulta.data;

  // o gráfico lê da mais antiga para a mais recente
  const serie = [...(r?.serieDiaria ?? [])].reverse();

  return (
    <Pagina
      titulo="Performance"
      descricao="Cliques, conversões e receita dos seus links"
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
        colunas={4}
        metricas={[
          { titulo: 'Cliques', valor: numero(r?.indicadores.cliques) },
          { titulo: 'Conversões', valor: r?.indicadores.conversoes ?? 0 },
          { titulo: 'Taxa de conversão', valor: percentual(r?.indicadores.taxaConversao) },
          { titulo: 'Comissão', valor: moeda(r?.indicadores.comissao), cor: marca.mintLeaf },
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Cliques e conversões por dia">
            <Estado
              carregando={consulta.isLoading}
              erro={consulta.error}
              esqueleto
              vazio={serie.length === 0}
              mensagemVazio="Sem métricas registradas no período"
            >
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                  <XAxis
                    dataKey="data"
                    tick={{ fontSize: 11 }}
                    stroke="#8c94a3"
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis yAxisId="e" tick={{ fontSize: 12 }} stroke="#8c94a3" />
                  <YAxis yAxisId="d" orientation="right" tick={{ fontSize: 12 }} stroke="#8c94a3" />
                  <Tooltip labelFormatter={(v: string) => data(v)} />
                  <Legend iconType="circle" />
                  <Bar yAxisId="e" dataKey="cliques" name="Cliques" fill={marca.digitalBlue} radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="d"
                    type="monotone"
                    dataKey="conversoes"
                    name="Conversões"
                    stroke={marca.mintLeaf}
                    strokeWidth={2.4}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Estado>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Top produtos">
            <Estado carregando={consulta.isLoading} erro={consulta.error} esqueleto>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={r?.topProdutos ?? []} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#8c94a3" />
                  <YAxis type="category" dataKey="nome" width={92} tick={{ fontSize: 10 }} stroke="#8c94a3" />
                  <Tooltip formatter={(v: number) => moeda(v)} />
                  <Bar dataKey="receita" name="Receita" fill={marca.violet} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Estado>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="Métricas diárias">
            <Table
              rowKey="data"
              size="small"
              dataSource={r?.serieDiaria ?? []}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: 'Sem métricas no período' }}
              columns={[
                { title: 'Data', dataIndex: 'data', render: (v: string) => data(v) },
                { title: 'Cliques', dataIndex: 'cliques', align: 'right' },
                { title: 'Conversões', dataIndex: 'conversoes', align: 'right' },
                { title: 'Taxa', dataIndex: 'taxa', align: 'right', render: (v: number) => percentual(v) },
                { title: 'Receita', dataIndex: 'receita', align: 'right', render: (v: number) => moeda(v) },
                {
                  title: 'Comissão',
                  dataIndex: 'comissao',
                  align: 'right',
                  render: (v: number) => (
                    <Typography.Text strong style={{ color: marca.mintLeaf }}>
                      {moeda(v)}
                    </Typography.Text>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Pagina>
  );
}
