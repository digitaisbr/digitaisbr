import { useNavigate } from 'react-router-dom';
import { Switch, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { App } from 'antd';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { corDeStatus, numero } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { Loja } from '@/api/tipos';
import { marca } from '@/marca';

interface Estatisticas {
  total: number;
  ativas: number;
  visualizacoesTotais: number;
  produtosNaVitrine: number;
  mediaProdutosPorLoja: number;
}

export function Lojas() {
  const navegar = useNavigate();
  const { message } = App.useApp();
  const stats = useApi<Estatisticas>(['lojas', 'estatisticas'], '/lojas/estatisticas');

  const alternar = useAcao<{ id: string; ativa: boolean }, unknown>(
    'patch',
    (e) => `/lojas/${e.id}/ativa/${e.ativa}`,
    [['lojas'], ['dashboard']],
  );

  const colunas: ColumnsType<Loja> = [
    {
      title: 'Loja',
      dataIndex: 'nome',
      sorter: true,
      render: (v: string, l) => (
        <div>
          <Typography.Text strong style={{ display: 'block' }}>
            {v}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {l.associado.nome} — /{l.slug}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Plano',
      dataIndex: ['associado', 'plano', 'nome'],
      render: (v: string, l) => <Tag color={corDeStatus(l.associado.plano.nivel)}>{v}</Tag>,
    },
    { title: 'Produtos', dataIndex: 'totalProdutos', align: 'center' },
    {
      title: 'Visualizações',
      dataIndex: 'visualizacoes',
      sorter: true,
      align: 'right',
      render: (v: number) => numero(v),
    },
    { title: 'Vendas', dataIndex: 'totalVendas', align: 'center' },
    {
      title: 'Ativa',
      dataIndex: 'ativa',
      align: 'center',
      render: (v: boolean, l) => (
        <Switch
          size="small"
          checked={v}
          onClick={(_, e) => e.stopPropagation()}
          onChange={async (marcado) => {
            try {
              await alternar.mutateAsync({ id: l.id, ativa: marcado });
              message.success(`Loja ${marcado ? 'ativada' : 'desativada'}.`);
            } catch (err) {
              message.error(mensagemDeErro(err));
            }
          }}
        />
      ),
    },
  ];

  const s = stats.data;

  return (
    <Pagina titulo="Lojas" descricao="Vitrines virtuais dos associados">
      <Cartoes
        carregando={stats.isLoading}
        metricas={[
          { titulo: 'Total', valor: s?.total ?? 0 },
          { titulo: 'Ativas', valor: s?.ativas ?? 0, cor: marca.mintLeaf },
          { titulo: 'Visualizações', valor: numero(s?.visualizacoesTotais) },
          {
            titulo: 'Produtos na vitrine',
            valor: s?.produtosNaVitrine ?? 0,
            detalhe: s ? `média de ${s.mediaProdutosPorLoja} por loja` : undefined,
          },
        ]}
      />

      <TabelaRecurso<Loja>
        titulo="Lojas"
        chave={['lojas']}
        url="/lojas"
        colunas={colunas}
        placeholderBusca="Buscar por nome, slug ou descrição…"
        aoClicarLinha={(l) => navegar(`/lojas/${l.id}`)}
        filtros={[
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
            campo: 'ativa',
            rotulo: 'Situação',
            opcoes: [
              { valor: 'true', rotulo: 'Ativa' },
              { valor: 'false', rotulo: 'Inativa' },
            ],
          },
        ]}
      />
    </Pagina>
  );
}
