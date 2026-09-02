import { App, Button, Space, Tag, Typography } from 'antd';
import { DownloadOutlined, UndoOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api, mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { corDeStatus, data, moeda, percentual, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { StatusVenda, Venda } from '@/api/tipos';
import { marca } from '@/marca';

interface Estatisticas {
  totalVendas: number;
  vendasAprovadas: number;
  receitaTotal: number;
  ticketMedio: number;
  comissoesGeradas: number;
  taxaConversao: number;
  taxaCancelamento: number;
}

export function Vendas() {
  const { message, modal } = App.useApp();
  const stats = useApi<Estatisticas>(['vendas', 'estatisticas'], '/vendas/estatisticas');

  const alterar = useAcao<{ id: string; status: StatusVenda; motivo?: string }, unknown>(
    'patch',
    (e) => `/vendas/${e.id}/status`,
    [['vendas'], ['comissoes'], ['dashboard']],
  );

  function reembolsar(v: Venda) {
    modal.confirm({
      title: `Reembolsar a venda ${v.ref}?`,
      content:
        'A comissão vinculada será cancelada e o estoque devolvido. A operação não pode ser desfeita.',
      okText: 'Reembolsar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await alterar.mutateAsync({ id: v.id, status: 'REEMBOLSADA', motivo: 'Solicitado pelo cliente' });
          message.success(`Venda ${v.ref} reembolsada.`);
        } catch (e) {
          message.error(mensagemDeErro(e));
        }
      },
    });
  }

  async function exportar() {
    try {
      const { data: csv } = await api.get<string>('/vendas/exportar', { responseType: 'text' });
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vendas.csv';
      a.click();
      URL.revokeObjectURL(url);
      message.success('CSV exportado.');
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  const colunas: ColumnsType<Venda> = [
    {
      title: 'Ref',
      dataIndex: 'ref',
      sorter: true,
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    {
      title: 'Produto',
      dataIndex: ['produto', 'nome'],
      render: (v: string, r) => (
        <div>
          <Typography.Text style={{ display: 'block' }}>{v}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {r.produto.categoria.nome}
          </Typography.Text>
        </div>
      ),
    },
    { title: 'Associado', dataIndex: ['associado', 'nome'] },
    { title: 'Cliente', dataIndex: 'clienteNome' },
    { title: 'Qtd', dataIndex: 'quantidade', align: 'center' },
    { title: 'Total', dataIndex: 'total', sorter: true, align: 'right', render: (v: number) => moeda(v) },
    {
      title: 'Comissão',
      dataIndex: 'comissao',
      align: 'right',
      render: (c: Venda['comissao']) =>
        c ? (
          <div>
            <Typography.Text style={{ display: 'block' }}>{moeda(c.valor)}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {percentual(c.percentual, 0)}
            </Typography.Text>
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
    {
      title: 'Ações',
      key: 'acoes',
      fixed: 'right',
      render: (_, v) => (
        <Space>
          {v.status === 'AGUARDANDO_PGTO' && (
            <Button
              size="small"
              type="link"
              onClick={async () => {
                try {
                  await alterar.mutateAsync({ id: v.id, status: 'PAGA' });
                  message.success(`Venda ${v.ref} marcada como paga.`);
                } catch (e) {
                  message.error(mensagemDeErro(e));
                }
              }}
            >
              Marcar paga
            </Button>
          )}
          {v.status === 'PAGA' && (
            <Button size="small" type="link" danger icon={<UndoOutlined />} onClick={() => reembolsar(v)}>
              Reembolsar
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const s = stats.data;

  return (
    <Pagina
      titulo="Vendas"
      descricao="Transações registradas na plataforma"
      acoes={
        <Button icon={<DownloadOutlined />} onClick={exportar}>
          Exportar CSV
        </Button>
      }
    >
      <Cartoes
        carregando={stats.isLoading}
        colunas={6}
        metricas={[
          { titulo: 'Receita total', valor: moeda(s?.receitaTotal), cor: marca.mintLeaf },
          { titulo: 'Comissões geradas', valor: moeda(s?.comissoesGeradas) },
          { titulo: 'Ticket médio', valor: moeda(s?.ticketMedio) },
          { titulo: 'Aprovadas', valor: s?.vendasAprovadas ?? 0 },
          { titulo: 'Conversão', valor: percentual(s?.taxaConversao) },
          { titulo: 'Cancelamento', valor: percentual(s?.taxaCancelamento), cor: '#d4380d' },
        ]}
      />

      <TabelaRecurso<Venda>
        titulo="Todas as vendas"
        chave={['vendas']}
        url="/vendas"
        colunas={colunas}
        placeholderBusca="Buscar por referência ou cliente…"
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
