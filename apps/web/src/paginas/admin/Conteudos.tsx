import { Tag, Typography } from 'antd';
import { EyeOutlined, HeartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useApi } from '@/api/hooks';
import { corDeStatus, data, numero, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { Conteudo } from '@/api/tipos';
import { marca } from '@/marca';

interface Estatisticas {
  total: number;
  publicados: number;
  rascunhos: number;
  totalVisualizacoes: number;
  totalCurtidas: number;
  porTipo: Record<string, number>;
}

export function Conteudos() {
  const stats = useApi<Estatisticas>(['conteudos', 'estatisticas'], '/conteudos/estatisticas');

  const colunas: ColumnsType<Conteudo> = [
    {
      title: 'Título',
      dataIndex: 'titulo',
      sorter: true,
      render: (v: string, c) => (
        <div style={{ maxWidth: 380 }}>
          <Typography.Text strong style={{ display: 'block' }}>{v}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {c.descricao ?? '—'}
          </Typography.Text>
        </div>
      ),
    },
    { title: 'Tipo', dataIndex: 'tipo', render: (v: string) => <Tag color="blue">{rotulo(v)}</Tag> },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={corDeStatus(v)}>{rotulo(v)}</Tag>,
    },
    {
      title: 'Plano mínimo',
      dataIndex: ['planoMinimo', 'nome'],
      render: (v: string, c) => <Tag color={corDeStatus(c.planoMinimo.nivel)}>{v}</Tag>,
    },
    { title: 'Autor', dataIndex: 'autor', render: (v) => v ?? '—' },
    {
      title: 'Views',
      dataIndex: 'visualizacoes',
      sorter: true,
      align: 'right',
      render: (v: number) => (
        <Typography.Text>
          <EyeOutlined style={{ marginRight: 4, color: '#8c94a3' }} />
          {numero(v)}
        </Typography.Text>
      ),
    },
    {
      title: 'Curtidas',
      dataIndex: 'curtidas',
      sorter: true,
      align: 'right',
      render: (v: number) => (
        <Typography.Text>
          <HeartOutlined style={{ marginRight: 4, color: '#eb2f96' }} />
          {numero(v)}
        </Typography.Text>
      ),
    },
    { title: 'Publicado', dataIndex: 'publicadoEm', render: (v: string | null) => data(v) },
  ];

  const s = stats.data;

  return (
    <Pagina titulo="Conteúdos" descricao="Material educativo para os associados">
      <Cartoes
        carregando={stats.isLoading}
        metricas={[
          { titulo: 'Publicados', valor: s?.publicados ?? 0, cor: marca.mintLeaf },
          { titulo: 'Rascunhos', valor: s?.rascunhos ?? 0 },
          { titulo: 'Visualizações', valor: numero(s?.totalVisualizacoes) },
          { titulo: 'Curtidas', valor: numero(s?.totalCurtidas), cor: '#eb2f96' },
        ]}
      />

      <TabelaRecurso<Conteudo>
        titulo="Conteúdos"
        chave={['conteudos']}
        url="/conteudos"
        colunas={colunas}
        placeholderBusca="Buscar por título, descrição ou autor…"
        filtros={[
          {
            campo: 'tipo',
            rotulo: 'Tipo',
            opcoes: [
              { valor: 'ARTIGO', rotulo: 'Artigo' },
              { valor: 'VIDEO', rotulo: 'Vídeo' },
              { valor: 'PODCAST', rotulo: 'Podcast' },
              { valor: 'CURSO', rotulo: 'Curso' },
              { valor: 'EBOOK', rotulo: 'E-book' },
            ],
          },
          {
            campo: 'status',
            rotulo: 'Status',
            opcoes: [
              { valor: 'PUBLICADO', rotulo: 'Publicado' },
              { valor: 'RASCUNHO', rotulo: 'Rascunho' },
              { valor: 'ARQUIVADO', rotulo: 'Arquivado' },
            ],
          },
        ]}
      />
    </Pagina>
  );
}
