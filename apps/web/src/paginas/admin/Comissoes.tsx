import { useState } from 'react';
import { App, Button, Space, Tag, Typography } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { corDeStatus, data, moeda, percentual, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { Comissao } from '@/api/tipos';
import { marca } from '@/marca';

interface Estatisticas {
  total: number;
  valorTotal: number;
  pagas: number;
  processando: number;
  aguardando: number;
  pendentes: number;
  percentualMedio: number;
}

export function Comissoes() {
  const { message, modal } = App.useApp();
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const stats = useApi<Estatisticas>(['comissoes', 'estatisticas'], '/comissoes/estatisticas');

  const pagar = useAcao<{ ids: string[] }, { quantidade: number; totalPago: number }>(
    'post',
    '/comissoes/pagar',
    [['comissoes'], ['dashboard'], ['financeiro']],
  );

  function liquidar(ids: string[]) {
    modal.confirm({
      title: `Liquidar ${ids.length} comissão(ões)?`,
      content:
        'As comissões passam a PAGA e cada associado recebe uma notificação com o total. ' +
        'Comissões já pagas fazem o lote inteiro ser recusado.',
      okText: 'Liquidar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const r = await pagar.mutateAsync({ ids });
          message.success(`${r.quantidade} comissão(ões) liquidadas — ${moeda(r.totalPago)}.`);
          setSelecionadas([]);
        } catch (e) {
          message.error(mensagemDeErro(e));
        }
      },
    });
  }

  const colunas: ColumnsType<Comissao> = [
    {
      title: 'Associado',
      dataIndex: ['associado', 'nome'],
      render: (v: string, c) => (
        <div>
          <Typography.Text style={{ display: 'block' }}>{v}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {c.associado.email}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Produto',
      dataIndex: ['venda', 'produto', 'nome'],
      render: (v: string, c) => (
        <div>
          <Typography.Text style={{ display: 'block' }}>{v}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {c.venda.ref}
          </Typography.Text>
        </div>
      ),
    },
    { title: 'Venda', dataIndex: ['venda', 'total'], align: 'right', render: (v: number) => moeda(v) },
    { title: '%', dataIndex: 'percentual', align: 'right', sorter: true, render: (v: number) => percentual(v, 0) },
    {
      title: 'Comissão',
      dataIndex: 'valor',
      align: 'right',
      sorter: true,
      render: (v: number) => <Typography.Text strong>{moeda(v)}</Typography.Text>,
    },
    { title: 'Data venda', dataIndex: ['venda', 'dataVenda'], render: (v: string) => data(v) },
    { title: 'Pago em', dataIndex: 'pagoEm', sorter: true, render: (v: string | null) => data(v) },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={corDeStatus(v)}>{rotulo(v)}</Tag>,
    },
    {
      title: 'Ações',
      key: 'acoes',
      fixed: 'right',
      render: (_, c) =>
        c.status === 'PAGA' || c.status === 'CANCELADA' ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            —
          </Typography.Text>
        ) : (
          <Button size="small" type="link" onClick={() => liquidar([c.id])}>
            Pagar
          </Button>
        ),
    },
  ];

  const s = stats.data;

  return (
    <Pagina titulo="Comissões" descricao="Direitos dos associados sobre as vendas">
      <Cartoes
        carregando={stats.isLoading}
        colunas={4}
        metricas={[
          { titulo: 'Total gerado', valor: moeda(s?.valorTotal) },
          { titulo: 'Pagas', valor: moeda(s?.pagas), cor: marca.mintLeaf },
          { titulo: 'Pendentes', valor: moeda(s?.pendentes), cor: '#d48806' },
          { titulo: 'Percentual médio', valor: percentual(s?.percentualMedio, 2) },
        ]}
      />

      <TabelaRecurso<Comissao>
        titulo="Comissões"
        chave={['comissoes']}
        url="/comissoes"
        colunas={colunas}
        placeholderBusca="Buscar por associado, produto ou referência…"
        acoes={
          <Space>
            {selecionadas.length > 0 && (
              <Button type="primary" icon={<DollarOutlined />} onClick={() => liquidar(selecionadas)}>
                Liquidar {selecionadas.length} selecionada(s)
              </Button>
            )}
          </Space>
        }
        cabecalho={
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
            Selecione linhas aguardando pagamento para liquidar em lote.
          </Typography.Paragraph>
        }
        filtros={[
          {
            campo: 'status',
            rotulo: 'Status',
            largura: 180,
            opcoes: [
              { valor: 'AGUARDANDO_PGTO', rotulo: 'Aguardando pgto' },
              { valor: 'PROCESSANDO', rotulo: 'Processando' },
              { valor: 'PAGA', rotulo: 'Paga' },
              { valor: 'CANCELADA', rotulo: 'Cancelada' },
            ],
          },
        ]}
        selecao={{
          selecionadas,
          aoSelecionar: setSelecionadas,
          bloqueada: (c) => c.status === 'PAGA' || c.status === 'CANCELADA',
        }}
      />
    </Pagina>
  );
}
