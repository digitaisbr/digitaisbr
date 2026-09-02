import { Progress, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useApi } from '@/api/hooks';
import { corDeStatus, numero, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { Beneficio } from '@/api/tipos';

interface Estatisticas {
  beneficios: { total: number; ativos: number };
  porTipo: Record<string, number>;
  maisUtilizados: { id: string; nome: string; utilizacoes: number }[];
}

export function Beneficios() {
  const stats = useApi<Estatisticas>(['parceiros', 'estatisticas'], '/parceiros/estatisticas');
  const maximo = Math.max(...(stats.data?.maisUtilizados ?? []).map((b) => b.utilizacoes), 1);

  const colunas: ColumnsType<Beneficio> = [
    {
      title: 'Benefício',
      dataIndex: 'nome',
      sorter: true,
      render: (v: string, b) => (
        <div style={{ maxWidth: 360 }}>
          <Typography.Text strong style={{ display: 'block' }}>{v}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {b.descricao ?? '—'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Valor',
      dataIndex: 'valorLabel',
      render: (v: string | null) => (v ? <Tag color="green">{v}</Tag> : '—'),
    },
    { title: 'Parceiro', dataIndex: ['parceiro', 'nome'], render: (v) => v ?? '—' },
    { title: 'Tipo', dataIndex: 'tipo', render: (v: string) => <Tag>{rotulo(v)}</Tag> },
    {
      title: 'Plano mínimo',
      dataIndex: ['planoMinimo', 'nome'],
      render: (v: string, b) => <Tag color={corDeStatus(b.planoMinimo.nivel)}>{v}</Tag>,
    },
    {
      title: 'Utilizações',
      dataIndex: 'utilizacoes',
      sorter: true,
      align: 'right',
      render: (v: number) => (
        <div style={{ minWidth: 110 }}>
          <Typography.Text>{numero(v)}</Typography.Text>
          <Progress percent={Math.round((v / maximo) * 100)} showInfo={false} size="small" />
        </div>
      ),
    },
  ];

  const s = stats.data;

  return (
    <Pagina titulo="Benefícios" descricao="Vantagens oferecidas pelos parceiros">
      <Cartoes
        carregando={stats.isLoading}
        metricas={[
          { titulo: 'Total', valor: s?.beneficios.total ?? 0 },
          { titulo: 'Descontos', valor: s?.porTipo.DESCONTO ?? 0 },
          { titulo: 'Acessos', valor: s?.porTipo.ACESSO ?? 0 },
          { titulo: 'Cashback / serviços', valor: (s?.porTipo.CASHBACK ?? 0) + (s?.porTipo.SERVICO ?? 0) },
        ]}
      />

      <TabelaRecurso<Beneficio>
        titulo="Benefícios"
        chave={['beneficios']}
        url="/beneficios"
        colunas={colunas}
        placeholderBusca="Buscar por nome ou descrição…"
        filtros={[
          {
            campo: 'tipo',
            rotulo: 'Tipo',
            opcoes: [
              { valor: 'DESCONTO', rotulo: 'Desconto' },
              { valor: 'ACESSO', rotulo: 'Acesso' },
              { valor: 'CASHBACK', rotulo: 'Cashback' },
              { valor: 'SERVICO', rotulo: 'Serviço' },
            ],
          },
          {
            campo: 'planoMinimo',
            rotulo: 'Plano mínimo',
            largura: 170,
            opcoes: [
              { valor: 'BASICO', rotulo: 'Básico' },
              { valor: 'INTERMEDIARIO', rotulo: 'Intermediário' },
              { valor: 'AVANCADO', rotulo: 'Avançado' },
            ],
          },
        ]}
      />
    </Pagina>
  );
}
