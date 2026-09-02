import { Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useApi } from '@/api/hooks';
import { corDeStatus, data, moeda, percentual, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { DashboardPortal, Venda } from '@/api/tipos';
import { marca } from '@/marca';

export function MinhasVendas() {
  const painel = useApi<DashboardPortal>(['portal', 'painel'], '/dashboard/portal');
  const d = painel.data;

  const colunas: ColumnsType<Venda> = [
    { title: 'Ref', dataIndex: 'ref', render: (v: string) => <Typography.Text code>{v}</Typography.Text> },
    { title: 'Produto', dataIndex: ['produto', 'nome'] },
    { title: 'Cliente', dataIndex: 'clienteNome' },
    { title: 'Qtd', dataIndex: 'quantidade', align: 'center' },
    { title: 'Total', dataIndex: 'total', sorter: true, align: 'right', render: (v: number) => moeda(v) },
    {
      title: 'Minha comissão',
      dataIndex: 'comissao',
      align: 'right',
      render: (c: Venda['comissao']) =>
        c ? (
          <div>
            <Typography.Text strong style={{ display: 'block', color: marca.mintLeaf }}>
              {moeda(c.valor)}
            </Typography.Text>
            <Tag color={corDeStatus(c.status)} style={{ fontSize: 10, marginTop: 2 }}>
              {rotulo(c.status)}
            </Tag>
          </div>
        ) : (
          '—'
        ),
    },
    { title: 'Data', dataIndex: 'dataVenda', sorter: true, render: (v: string) => data(v) },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={corDeStatus(v)}>{rotulo(v)}</Tag>,
    },
  ];

  return (
    <Pagina titulo="Minhas Vendas" descricao="Todas as vendas originadas por você">
      <Cartoes
        carregando={painel.isLoading}
        colunas={4}
        metricas={[
          { titulo: 'Total de vendas', valor: d?.vendas.total ?? 0 },
          { titulo: 'Aprovadas', valor: d?.vendas.aprovadas ?? 0, cor: marca.mintLeaf },
          { titulo: 'Receita gerada', valor: moeda(d?.vendas.receita) },
          {
            titulo: 'Conversão',
            valor: percentual(d?.vendas.total ? (d.vendas.aprovadas / d.vendas.total) * 100 : 0),
          },
        ]}
      />

      <TabelaRecurso<Venda>
        titulo="Vendas"
        chave={['portal', 'vendas']}
        url="/portal/vendas"
        colunas={colunas}
        placeholderBusca="Buscar por referência, cliente ou produto…"
        filtros={[
          {
            campo: 'status',
            rotulo: 'Status',
            largura: 180,
            opcoes: [
              { valor: 'AGUARDANDO_PGTO', rotulo: 'Aguardando pgto' },
              { valor: 'PAGA', rotulo: 'Paga' },
              { valor: 'CANCELADA', rotulo: 'Cancelada' },
              { valor: 'REEMBOLSADA', rotulo: 'Reembolsada' },
            ],
          },
        ]}
      />
    </Pagina>
  );
}
