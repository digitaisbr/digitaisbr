import { Link } from 'react-router-dom';
import { Card, Col, List, Progress, Row, Tag, Typography } from 'antd';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  DollarOutlined, RiseOutlined, ShopOutlined, ShoppingCartOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { moeda, numero, percentual } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { DashboardAdmin, SerieMensal } from '@/api/tipos';
import { marca } from '@/marca';

const CORES = [marca.digitalBlue, marca.violet, marca.mintLeaf, '#FAAD14', '#EB2F96', '#13C2C2'];

interface Relatorio {
  associadosPorPlano: { plano: string; total: number; percentual: number }[];
  vendasPorStatus: { status: string; quantidade: number; valor: number }[];
  topProdutos: { nome: string; unidades: number; receita: number }[];
}

interface ResumoSuporte {
  abertos: number;
  emAndamento: number;
  resolvidos: number;
  porPrioridade: Record<string, number>;
}

export function Dashboard() {
  const painel = useApi<DashboardAdmin>(['dashboard', 'admin'], '/dashboard/admin');
  const serie = useApi<{ periodo: { de: string; ate: string } | null; serie: SerieMensal[] }>(
    ['dashboard', 'serie'],
    '/dashboard/receita-comissoes',
    { meses: 6 },
  );
  const relatorio = useApi<Relatorio>(['relatorios'], '/relatorios');
  const suporte = useApi<ResumoSuporte>(['dashboard', 'suporte'], '/dashboard/suporte');
  const topicos = useApi<{ id: string; titulo: string; autor: string; respostas: number; visualizacoes: number; fixado: boolean }[]>(
    ['comunidade', 'topicos'],
    '/comunidade/topicos-recentes',
    { limite: 5 },
  );

  const d = painel.data;

  return (
    <Pagina
      titulo="Dashboard"
      descricao="Visão consolidada da operação"
    >
      <Cartoes
        carregando={painel.isLoading}
        metricas={[
          {
            titulo: 'Associados ativos',
            valor: d ? `${d.associados.ativos}` : 0,
            detalhe: d ? `de ${d.associados.total} cadastrados` : undefined,
            icone: <TeamOutlined />,
          },
          {
            titulo: 'Vendas aprovadas',
            valor: d?.vendas.aprovadas ?? 0,
            detalhe: d ? `de ${d.vendas.total} registradas` : undefined,
            icone: <ShoppingCartOutlined />,
          },
          {
            titulo: 'Receita total',
            valor: moeda(d?.vendas.receita),
            cor: marca.mintLeaf,
            icone: <DollarOutlined />,
          },
          {
            titulo: 'Lojas ativas',
            valor: d?.lojas.ativas ?? 0,
            detalhe: d ? `de ${d.lojas.total}` : undefined,
            icone: <ShopOutlined />,
          },
        ]}
      />

      <Cartoes
        carregando={painel.isLoading}
        metricas={[
          { titulo: 'Comissões pagas', valor: moeda(d?.comissoes.pagas), cor: marca.mintLeaf },
          { titulo: 'Comissões pendentes', valor: moeda(d?.comissoes.pendentes), cor: '#d48806' },
          { titulo: 'Saldo financeiro', valor: moeda(d?.saldoFinanceiro), icone: <RiseOutlined /> },
          {
            titulo: 'Produtos ativos',
            valor: d?.produtos.ativos ?? 0,
            detalhe: d ? `de ${d.produtos.total}` : undefined,
          },
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title="Receita e comissões"
            extra={
              serie.data?.periodo && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {serie.data.periodo.de} a {serie.data.periodo.ate}
                </Typography.Text>
              )
            }
          >
            <Estado
              carregando={serie.isLoading}
              erro={serie.error}
              esqueleto
              vazio={serie.data?.serie.length === 0}
              mensagemVazio="Nenhuma venda aprovada no período"
            >
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={serie.data?.serie ?? []}>
                  <defs>
                    <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={marca.digitalBlue} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={marca.digitalBlue} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gComissao" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={marca.mintLeaf} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={marca.mintLeaf} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#8c94a3" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#8c94a3" tickFormatter={(v) => `R$${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => moeda(v)} />
                  <Legend iconType="circle" />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke={marca.digitalBlue} fill="url(#gReceita)" strokeWidth={2} />
                  <Area type="monotone" dataKey="comissao" name="Comissões" stroke={marca.mintLeaf} fill="url(#gComissao)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Estado>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Associados por plano">
            <Estado carregando={relatorio.isLoading} erro={relatorio.error} esqueleto>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={relatorio.data?.associadosPorPlano ?? []}
                    dataKey="total"
                    nameKey="plano"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {(relatorio.data?.associadosPorPlano ?? []).map((_, i) => (
                      <Cell key={i} fill={CORES[i % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, n) => [`${v} associados`, n]} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </Estado>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Vendas por status">
            <Estado carregando={relatorio.isLoading} erro={relatorio.error} esqueleto>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={relatorio.data?.vendasPorStatus ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="#8c94a3" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#8c94a3" />
                  <Tooltip formatter={(v: number, n) => (n === 'valor' ? moeda(v) : v)} />
                  <Bar dataKey="quantidade" name="Vendas" fill={marca.digitalBlue} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Estado>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Top produtos por receita">
            <Estado carregando={relatorio.isLoading} erro={relatorio.error} esqueleto>
              <List
                size="small"
                dataSource={relatorio.data?.topProdutos ?? []}
                renderItem={(p, i) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Tag color={CORES[i % CORES.length]} style={{ marginInlineEnd: 0 }}>
                          {i + 1}
                        </Tag>
                      }
                      title={<Typography.Text style={{ fontSize: 13 }}>{p.nome}</Typography.Text>}
                      description={
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {p.unidades} unidade(s)
                        </Typography.Text>
                      }
                    />
                    <Typography.Text strong>{moeda(p.receita)}</Typography.Text>
                  </List.Item>
                )}
              />
            </Estado>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Tópicos recentes" extra={<Link to="/comunidade">Ver comunidade</Link>}>
            <Estado carregando={topicos.isLoading} erro={topicos.error} esqueleto>
              <List
                size="small"
                dataSource={topicos.data ?? []}
                renderItem={(t) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Typography.Text style={{ fontSize: 13 }}>
                          {t.fixado && <Tag color="gold">Fixado</Tag>}
                          {t.titulo}
                        </Typography.Text>
                      }
                      description={
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {t.autor} · {t.respostas} respostas · {numero(t.visualizacoes)} views
                        </Typography.Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </Estado>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Resumo do suporte" extra={<Link to="/suporte">Ver chamados</Link>}>
            <Estado carregando={suporte.isLoading} erro={suporte.error} esqueleto>
              <Row gutter={16} style={{ marginBottom: 18, textAlign: 'center' }}>
                <Col span={8}>
                  <Typography.Title level={3} style={{ margin: 0, color: '#cf1322' }}>
                    {suporte.data?.abertos ?? 0}
                  </Typography.Title>
                  <Typography.Text type="secondary">Abertos</Typography.Text>
                </Col>
                <Col span={8}>
                  <Typography.Title level={3} style={{ margin: 0, color: marca.digitalBlue }}>
                    {suporte.data?.emAndamento ?? 0}
                  </Typography.Title>
                  <Typography.Text type="secondary">Em andamento</Typography.Text>
                </Col>
                <Col span={8}>
                  <Typography.Title level={3} style={{ margin: 0, color: marca.mintLeaf }}>
                    {suporte.data?.resolvidos ?? 0}
                  </Typography.Title>
                  <Typography.Text type="secondary">Resolvidos</Typography.Text>
                </Col>
              </Row>

              {Object.entries(suporte.data?.porPrioridade ?? {}).map(([p, n]) => {
                const total = Object.values(suporte.data?.porPrioridade ?? {}).reduce((s, x) => s + x, 0);
                return (
                  <div key={p} style={{ marginBottom: 8 }}>
                    <Typography.Text style={{ fontSize: 12 }}>{p}</Typography.Text>
                    <Progress
                      percent={total ? Math.round((n / total) * 100) : 0}
                      format={() => `${n}`}
                      size="small"
                      strokeColor={
                        p === 'URGENTE' ? '#cf1322' : p === 'ALTA' ? '#fa8c16' : p === 'MEDIA' ? marca.digitalBlue : '#8c94a3'
                      }
                    />
                  </div>
                );
              })}
            </Estado>
          </Card>
        </Col>
      </Row>

      {d && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {[
            { rotulo: 'Benefícios', valor: d.resumo.beneficios, para: '/beneficios' },
            { rotulo: 'Parceiros', valor: d.resumo.parceiros, para: '/parceiros' },
            { rotulo: 'Conteúdos', valor: d.resumo.conteudos, para: '/conteudos' },
            { rotulo: 'Tópicos', valor: d.resumo.topicos, para: '/comunidade' },
            { rotulo: 'Não lidas', valor: d.resumo.naoLidas, para: '/comunicacoes' },
            { rotulo: 'Tickets', valor: d.resumo.tickets, para: '/suporte' },
          ].map((r) => (
            <Col key={r.rotulo} xs={12} sm={8} lg={4}>
              <Link to={r.para}>
                <Card size="small" hoverable style={{ textAlign: 'center' }}>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {r.valor}
                  </Typography.Title>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {r.rotulo}
                  </Typography.Text>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      )}

      {d && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 18, fontSize: 12 }}>
          Margem sobre a receita registrada:{' '}
          {percentual(d.vendas.receita ? (d.saldoFinanceiro / d.vendas.receita) * 100 : 0)}
        </Typography.Paragraph>
      )}
    </Pagina>
  );
}
