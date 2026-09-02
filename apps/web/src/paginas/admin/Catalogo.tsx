import { useNavigate } from 'react-router-dom';
import { Button, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useApi } from '@/api/hooks';
import { corDeStatus, moeda, percentual, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { Categoria, Produto } from '@/api/tipos';
import { marca } from '@/marca';

interface Estatisticas {
  total: number;
  porStatus: Record<string, number>;
  precoMedio: number;
  comissaoMedia: number;
}

export function Catalogo() {
  const navegar = useNavigate();
  const stats = useApi<Estatisticas>(['catalogo', 'estatisticas'], '/catalogo/produtos/estatisticas');
  const categorias = useApi<Categoria[]>(['catalogo', 'categorias'], '/catalogo/categorias');

  const colunas: ColumnsType<Produto> = [
    {
      title: 'Produto',
      dataIndex: 'nome',
      sorter: true,
      render: (v: string, p) => (
        <div>
          <Typography.Text strong style={{ display: 'block' }}>
            {v}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            SKU: {p.sku}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Categoria',
      dataIndex: ['categoria', 'nome'],
      render: (v: string, p) => <Tag color={p.categoria.cor ?? 'default'}>{v}</Tag>,
    },
    { title: 'Preço', dataIndex: 'preco', sorter: true, align: 'right', render: (v: number) => moeda(v) },
    {
      title: 'Comissão',
      dataIndex: 'comissaoPct',
      sorter: true,
      align: 'right',
      render: (v: number, p) => (
        <div>
          <Tag color="green" style={{ margin: 0 }}>
            {percentual(v, 0)}
          </Tag>
          <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
            {moeda(p.ganhoEstimado)}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Estoque',
      dataIndex: 'estoque',
      align: 'center',
      render: (v: number, p) => (p.estoqueIlimitado ? <Tag>Ilimitado</Tag> : v),
    },
    {
      title: 'Exclusividade',
      dataIndex: 'planoMinimo',
      render: (pm: Produto['planoMinimo']) =>
        pm ? <Tag color={corDeStatus(pm.nivel)}>{pm.nome}+</Tag> : <Tag>Todos</Tag>,
    },
    { title: 'Em lojas', dataIndex: 'emLojas', align: 'center' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={corDeStatus(v)}>{rotulo(v)}</Tag>,
    },
  ];

  const s = stats.data;

  return (
    <Pagina
      titulo="Catálogo"
      descricao="Produtos disponíveis para as lojas dos associados"
      acoes={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navegar('/catalogo/novo')}>
          Novo produto
        </Button>
      }
    >
      <Cartoes
        carregando={stats.isLoading}
        metricas={[
          { titulo: 'Total de produtos', valor: s?.total ?? 0 },
          { titulo: 'Ativos', valor: s?.porStatus.ATIVO ?? 0, cor: marca.mintLeaf },
          { titulo: 'Preço médio', valor: moeda(s?.precoMedio) },
          { titulo: 'Comissão média', valor: percentual(s?.comissaoMedia, 1) },
        ]}
      />

      <TabelaRecurso<Produto>
        titulo="Produtos"
        chave={['catalogo', 'produtos']}
        url="/catalogo/produtos"
        colunas={colunas}
        placeholderBusca="Buscar por nome, SKU ou descrição…"
        aoClicarLinha={(p) => navegar(`/catalogo/${p.id}`)}
        filtros={[
          {
            campo: 'status',
            rotulo: 'Status',
            opcoes: [
              { valor: 'ATIVO', rotulo: 'Ativo' },
              { valor: 'INATIVO', rotulo: 'Inativo' },
              { valor: 'ESGOTADO', rotulo: 'Esgotado' },
            ],
          },
          {
            campo: 'categoria',
            rotulo: 'Categoria',
            largura: 200,
            opcoes: (categorias.data ?? []).map((c) => ({ valor: c.slug, rotulo: c.nome })),
          },
          {
            campo: 'planoMinimo',
            rotulo: 'Exclusividade',
            largura: 170,
            opcoes: [
              { valor: 'INTERMEDIARIO', rotulo: 'Intermediário+' },
              { valor: 'AVANCADO', rotulo: 'Avançado' },
            ],
          },
        ]}
      />
    </Pagina>
  );
}
