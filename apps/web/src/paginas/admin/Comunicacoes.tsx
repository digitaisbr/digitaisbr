import { App, Button, Space, Tag, Typography } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { corDeStatus, data, percentual, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { Campanha } from '@/api/tipos';
import { marca } from '@/marca';

interface Estatisticas {
  enviadas: number;
  agendadas: number;
  rascunhos: number;
  totalEnvios: number;
  taxaAbertura: number;
}

export function Comunicacoes() {
  const { message, modal } = App.useApp();
  const stats = useApi<Estatisticas>(['campanhas', 'estatisticas'], '/campanhas/estatisticas');

  const enviar = useAcao<{ id: string }, { enviados: number }>(
    'post',
    (e) => `/campanhas/${e.id}/enviar`,
    [['campanhas'], ['notificacoes']],
  );

  const colunas: ColumnsType<Campanha> = [
    {
      title: 'Campanha',
      dataIndex: 'titulo',
      render: (v: string, c) => (
        <div style={{ maxWidth: 360 }}>
          <Typography.Text strong style={{ display: 'block', color: marca.digitalBlue }}>{v}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
            {c.corpo}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Canal',
      dataIndex: 'canal',
      render: (v: string | null) => <Tag color="purple">{v ? rotulo(v) : 'Todos'}</Tag>,
    },
    {
      title: 'Público',
      dataIndex: 'publicoAlvo',
      render: (v: string[]) =>
        v.length === 0 || v.length === 3 ? (
          <Tag>Todos os planos</Tag>
        ) : (
          <Space size={4}>
            {v.map((p) => (
              <Tag key={p} color={corDeStatus(p)}>
                {rotulo(p)}
              </Tag>
            ))}
          </Space>
        ),
    },
    { title: 'Enviados', dataIndex: 'enviados', align: 'center', render: (v: number) => v || '—' },
    {
      title: 'Abertura',
      dataIndex: 'taxaAbertura',
      align: 'right',
      render: (v: number, c) => (c.enviados ? percentual(v) : '—'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={corDeStatus(v)}>{rotulo(v)}</Tag>,
    },
    {
      title: 'Data',
      dataIndex: 'enviadaEm',
      render: (v: string | null, c) => data(v ?? c.agendadaPara),
    },
    {
      title: 'Ações',
      key: 'acoes',
      fixed: 'right',
      render: (_, c) =>
        c.status === 'ENVIADA' || c.status === 'CANCELADA' ? (
          '—'
        ) : (
          <Button
            size="small"
            type="link"
            icon={<SendOutlined />}
            onClick={() =>
              modal.confirm({
                title: `Disparar "${c.titulo}"?`,
                content: 'Uma notificação será criada para cada associado do público-alvo.',
                okText: 'Disparar',
                cancelText: 'Cancelar',
                onOk: async () => {
                  try {
                    const r = await enviar.mutateAsync({ id: c.id });
                    message.success(`Campanha enviada para ${r.enviados} associado(s).`);
                  } catch (e) {
                    message.error(mensagemDeErro(e));
                  }
                },
              })
            }
          >
            Enviar
          </Button>
        ),
    },
  ];

  const s = stats.data;

  return (
    <Pagina titulo="Comunicações" descricao="Campanhas enviadas aos associados">
      <Cartoes
        carregando={stats.isLoading}
        metricas={[
          { titulo: 'Enviadas', valor: s?.enviadas ?? 0, cor: marca.mintLeaf },
          { titulo: 'Total de envios', valor: s?.totalEnvios ?? 0 },
          { titulo: 'Taxa de abertura', valor: percentual(s?.taxaAbertura) },
          { titulo: 'Rascunhos', valor: s?.rascunhos ?? 0 },
        ]}
      />

      <TabelaRecurso<Campanha>
        titulo="Campanhas"
        chave={['campanhas']}
        url="/campanhas"
        colunas={colunas}
        placeholderBusca="Buscar campanha…"
        filtros={[
          {
            campo: 'status',
            rotulo: 'Status',
            opcoes: [
              { valor: 'RASCUNHO', rotulo: 'Rascunho' },
              { valor: 'AGENDADA', rotulo: 'Agendada' },
              { valor: 'ENVIADA', rotulo: 'Enviada' },
              { valor: 'CANCELADA', rotulo: 'Cancelada' },
            ],
          },
        ]}
      />
    </Pagina>
  );
}
