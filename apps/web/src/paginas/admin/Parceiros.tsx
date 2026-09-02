import { Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useApi } from '@/api/hooks';
import { Cartoes } from '@/componentes/Cartoes';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { Parceiro } from '@/api/tipos';

interface Estatisticas {
  parceiros: { total: number; ativos: number };
  beneficios: { total: number; ativos: number };
  maisUtilizados: { id: string; nome: string; valorLabel: string | null; utilizacoes: number }[];
}

export function Parceiros() {
  const stats = useApi<Estatisticas>(['parceiros', 'estatisticas'], '/parceiros/estatisticas');

  const colunas: ColumnsType<Parceiro> = [
    {
      title: 'Parceiro',
      dataIndex: 'nome',
      sorter: true,
      render: (v: string, p) => (
        <div>
          <Typography.Text strong style={{ display: 'block' }}>{v}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.segmento ?? '—'}</Typography.Text>
        </div>
      ),
    },
    { title: 'CNPJ', dataIndex: 'cnpj', render: (v) => v ?? '—' },
    { title: 'Email', dataIndex: 'email', render: (v) => v ?? '—' },
    {
      title: 'Benefícios',
      dataIndex: 'totalBeneficios',
      align: 'center',
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'ativo',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Ativo' : 'Inativo'}</Tag>,
    },
  ];

  const s = stats.data;

  return (
    <Pagina titulo="Parceiros" descricao="Empresas conveniadas que oferecem benefícios">
      <Cartoes
        carregando={stats.isLoading}
        colunas={3}
        metricas={[
          { titulo: 'Parceiros ativos', valor: s?.parceiros.ativos ?? 0, detalhe: `de ${s?.parceiros.total ?? 0}` },
          { titulo: 'Benefícios ativos', valor: s?.beneficios.ativos ?? 0, detalhe: `de ${s?.beneficios.total ?? 0}` },
          {
            titulo: 'Mais utilizado',
            valor: s?.maisUtilizados[0]?.utilizacoes ?? 0,
            detalhe: s?.maisUtilizados[0]?.nome,
          },
        ]}
      />

      <TabelaRecurso<Parceiro>
        titulo="Parceiros"
        chave={['parceiros']}
        url="/parceiros"
        colunas={colunas}
        placeholderBusca="Buscar por nome, segmento, email ou CNPJ…"
      />
    </Pagina>
  );
}
