import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Space, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useApi } from '@/api/hooks';
import { compacto, corDeStatus, moeda, percentual, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { Associado } from '@/api/tipos';
import { marca } from '@/marca';

interface Estatisticas {
  total: number;
  porStatus: Record<string, number>;
  porPlano: { plano: string; total: number; percentual: number }[];
  porNicho: { nicho: string; total: number }[];
}

export function Associados() {
  const navegar = useNavigate();
  const stats = useApi<Estatisticas>(['associados', 'estatisticas'], '/associados/estatisticas');

  const colunas: ColumnsType<Associado> = [
    {
      title: 'Influencer',
      dataIndex: 'nome',
      sorter: true,
      render: (_, a) => (
        <Space>
          <Avatar style={{ background: marca.digitalBlue }}>{a.nome[0]}</Avatar>
          <div>
            <Typography.Text strong style={{ display: 'block' }}>
              {a.nome}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              @{a.handle}
            </Typography.Text>
          </div>
        </Space>
      ),
    },
    { title: 'Nicho', dataIndex: 'nicho', render: (v) => v ?? '—' },
    {
      title: 'Seguidores',
      dataIndex: 'seguidores',
      sorter: true,
      align: 'right',
      render: (v: number) => compacto(v),
    },
    {
      title: 'Eng.',
      dataIndex: 'engajamento',
      sorter: true,
      align: 'right',
      render: (v: number) => percentual(v),
    },
    {
      title: 'Redes',
      dataIndex: 'redesSociais',
      render: (redes: Associado['redesSociais']) =>
        redes.length ? (
          <Space size={4}>
            {redes.map((r) => (
              <Tag key={r.rede} style={{ margin: 0, fontSize: 10 }}>
                {r.rede.slice(0, 2)}
              </Tag>
            ))}
          </Space>
        ) : (
          '—'
        ),
    },
    {
      title: 'Plano',
      dataIndex: ['plano', 'nome'],
      render: (v: string, a) => <Tag color={corDeStatus(a.plano.nivel)}>{v}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={corDeStatus(v)}>{rotulo(v)}</Tag>,
    },
    { title: 'Vendas', dataIndex: 'totalVendas', align: 'right' },
    {
      title: 'Comissão',
      dataIndex: 'comissaoAcumulada',
      align: 'right',
      render: (v: number) => moeda(v),
    },
  ];

  const s = stats.data;

  return (
    <Pagina
      titulo="Associados"
      descricao="Criadores cadastrados na plataforma"
      acoes={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navegar('/associados/novo')}>
          Novo associado
        </Button>
      }
    >
      <Cartoes
        carregando={stats.isLoading}
        metricas={[
          { titulo: 'Total', valor: s?.total ?? 0 },
          { titulo: 'Ativos', valor: s?.porStatus.ATIVO ?? 0, cor: marca.mintLeaf },
          { titulo: 'Suspensos', valor: s?.porStatus.SUSPENSO ?? 0, cor: '#d48806' },
          { titulo: 'Inativos', valor: s?.porStatus.INATIVO ?? 0, cor: '#8c94a3' },
        ]}
      />

      <TabelaRecurso<Associado>
        titulo="Lista de associados"
        chave={['associados']}
        url="/associados"
        colunas={colunas}
        placeholderBusca="Buscar por nome, handle, email ou nicho…"
        aoClicarLinha={(a) => navegar(`/associados/${a.id}`)}
        filtros={[
          {
            campo: 'status',
            rotulo: 'Status',
            opcoes: [
              { valor: 'ATIVO', rotulo: 'Ativo' },
              { valor: 'INATIVO', rotulo: 'Inativo' },
              { valor: 'SUSPENSO', rotulo: 'Suspenso' },
            ],
          },
          {
            campo: 'plano',
            rotulo: 'Plano',
            opcoes: [
              { valor: 'BASICO', rotulo: 'Básico' },
              { valor: 'INTERMEDIARIO', rotulo: 'Intermediário' },
              { valor: 'AVANCADO', rotulo: 'Avançado' },
            ],
          },
          {
            campo: 'nicho',
            rotulo: 'Nicho',
            largura: 180,
            opcoes: (s?.porNicho ?? []).map((n) => ({ valor: n.nicho, rotulo: n.nicho })),
          },
        ]}
      />
    </Pagina>
  );
}
