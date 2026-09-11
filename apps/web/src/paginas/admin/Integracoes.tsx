import { useState } from 'react';
import {
  App, Button, Card, Empty, Segmented, Space, Table, Tag, Tooltip, Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { dataHora } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';

type StatusEvento = 'RECEBIDO' | 'PROCESSADO' | 'DUPLICADO' | 'REJEITADO' | 'ERRO';

interface Evento {
  id: string;
  parceiroId: string;
  externoId: string;
  evento: string;
  status: StatusEvento;
  erro: string | null;
  vendaId: string | null;
  tentativas: number;
  criadoEm: string;
  processadoEm: string | null;
  parceiro: { nome: string };
}

const CORES: Record<StatusEvento, string> = {
  PROCESSADO: 'green',
  DUPLICADO: 'blue',
  RECEBIDO: 'default',
  REJEITADO: 'orange',
  ERRO: 'red',
};

/** O que cada situação significa para quem opera — não o que significa no código. */
const EXPLICACAO: Record<StatusEvento, string> = {
  PROCESSADO: 'A venda foi registrada.',
  DUPLICADO: 'O parceiro reenviou um aviso que já tinha chegado. Nada foi feito de novo.',
  RECEBIDO: 'Chegou, mas ainda não foi processado.',
  REJEITADO: 'O aviso não descreve uma venda possível. Reprocessar daria o mesmo resultado.',
  ERRO: 'Falhou por um problema nosso. Pode reprocessar.',
};

const FILTROS = ['Todos', 'PROCESSADO', 'ERRO', 'REJEITADO', 'DUPLICADO'] as const;

export function Integracoes() {
  const { message } = App.useApp();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>('Todos');

  const eventos = useApi<Evento[]>(
    ['integracoes', 'eventos', filtro],
    '/integracoes/eventos',
    filtro === 'Todos' ? undefined : { status: filtro },
  );

  const reprocessar = useAcao<{ id: string }>(
    'post',
    ({ id }) => `/integracoes/eventos/${id}/reprocessar`,
    [['integracoes'], ['vendas'], ['comissoes']],
  );

  async function tentarDeNovo(e: Evento) {
    try {
      const r = (await reprocessar.mutateAsync({ id: e.id })) as { status: StatusEvento };
      if (r.status === 'PROCESSADO') message.success(`Pedido ${e.externoId} registrado.`);
      else message.warning(`Pedido ${e.externoId}: ${EXPLICACAO[r.status]}`);
    } catch (erro) {
      message.error(mensagemDeErro(erro));
    }
  }

  const colunas: ColumnsType<Evento> = [
    {
      title: 'Quando',
      dataIndex: 'criadoEm',
      width: 150,
      render: (v: string) => <Typography.Text style={{ fontSize: 12 }}>{dataHora(v)}</Typography.Text>,
    },
    { title: 'Parceiro', dataIndex: ['parceiro', 'nome'] },
    {
      title: 'Pedido',
      dataIndex: 'externoId',
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    {
      title: 'Aviso',
      dataIndex: 'evento',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Situação',
      dataIndex: 'status',
      render: (v: StatusEvento, e) => (
        <Tooltip title={e.erro ?? EXPLICACAO[v]}>
          <Tag color={CORES[v]}>{v}</Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Tentativas',
      dataIndex: 'tentativas',
      align: 'center',
      width: 90,
    },
    {
      title: '',
      key: 'acoes',
      align: 'right',
      width: 130,
      render: (_, e) =>
        // só ERRO é reprocessável: REJEITADO falhou pelo conteúdo do aviso, e
        // tentar de novo daria exatamente o mesmo resultado
        e.status === 'ERRO' ? (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={reprocessar.isPending}
            onClick={() => tentarDeNovo(e)}
          >
            Reprocessar
          </Button>
        ) : null,
    },
  ];

  const lista = eventos.data ?? [];
  const contar = (s: StatusEvento) => lista.filter((e) => e.status === s).length;

  return (
    <Pagina
      titulo="Integrações"
      descricao="Avisos de venda enviados pelos parceiros"
    >
      <Cartoes
        carregando={eventos.isLoading}
        colunas={4}
        metricas={[
          { titulo: 'Recebidos', valor: lista.length, detalhe: 'últimos 100' },
          { titulo: 'Processados', valor: contar('PROCESSADO') },
          { titulo: 'Com erro', valor: contar('ERRO'), detalhe: 'reprocessáveis' },
          { titulo: 'Rejeitados', valor: contar('REJEITADO') },
        ]}
      />

      <Card
        title="Eventos"
        extra={
          <Segmented
            size="small"
            value={filtro}
            onChange={(v) => setFiltro(v as (typeof FILTROS)[number])}
            options={FILTROS.map((f) => ({ label: f === 'Todos' ? 'Todos' : f.toLowerCase(), value: f }))}
          />
        }
      >
        <Estado carregando={eventos.isLoading} erro={eventos.error} esqueleto>
          {lista.length === 0 ? (
            <Empty
              description={
                <Space direction="vertical" size={4}>
                  <Typography.Text>Nenhum aviso recebido ainda.</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Gere o segredo de integração na ficha do parceiro e repasse à equipe
                    técnica dele para que as vendas comecem a chegar sozinhas.
                  </Typography.Text>
                </Space>
              }
            />
          ) : (
            <Table<Evento>
              rowKey="id"
              dataSource={lista}
              columns={colunas}
              size="small"
              pagination={{ pageSize: 20, showSizeChanger: false }}
              scroll={{ x: 900 }}
            />
          )}
        </Estado>
      </Card>
    </Pagina>
  );
}
