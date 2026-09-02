import { useState } from 'react';
import { App, Badge, Button, Card, List, Select, Space, Tag, Typography } from 'antd';
import { CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi, useLista } from '@/api/hooks';
import { dataHora, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { CanalNotificacao, Notificacao as Notif, TipoNotificacao } from '@/api/tipos';

interface Resumo {
  total: number;
  naoLidas: number;
  lidas: number;
  porTipo: Record<string, number>;
  porCanal: Record<string, number>;
}

const COR_TIPO: Record<string, string> = {
  SISTEMA: 'default', VENDA: 'green', COMISSAO: 'gold',
  BENEFICIO: 'purple', SUPORTE: 'blue', CONTEUDO: 'cyan',
};

export function Notificacoes() {
  const { message } = App.useApp();
  const [tipo, setTipo] = useState<TipoNotificacao>();
  const [canal, setCanal] = useState<CanalNotificacao>();
  const [lida, setLida] = useState<string>();

  const resumo = useApi<Resumo>(['notificacoes', 'resumo'], '/notificacoes/resumo');
  const lista = useLista<Notif>(['notificacoes', { tipo, canal, lida }], '/notificacoes', {
    limit: 50,
    tipo,
    canal,
    lida: lida === undefined ? undefined : lida === 'true',
  });

  const marcar = useAcao<{ id: string }, unknown>(
    'patch',
    (e) => `/notificacoes/${e.id}/ler`,
    [['notificacoes']],
  );
  const marcarTodas = useAcao<Record<string, never>, { marcadas: number }>(
    'patch',
    '/notificacoes/ler-todas',
    [['notificacoes']],
  );
  const remover = useAcao<{ id: string }, unknown>(
    'delete',
    (e) => `/notificacoes/${e.id}`,
    [['notificacoes']],
  );

  const r = resumo.data;

  return (
    <Pagina
      titulo="Notificações"
      descricao={r ? `${r.naoLidas} não lida(s) de ${r.total}` : undefined}
      acoes={
        <Button
          icon={<CheckOutlined />}
          disabled={!r?.naoLidas}
          onClick={async () => {
            try {
              const x = await marcarTodas.mutateAsync({});
              message.success(`${x.marcadas} notificação(ões) marcadas como lidas.`);
            } catch (e) {
              message.error(mensagemDeErro(e));
            }
          }}
        >
          Marcar todas como lidas
        </Button>
      }
    >
      <Cartoes
        carregando={resumo.isLoading}
        colunas={3}
        metricas={[
          { titulo: 'Não lidas', valor: r?.naoLidas ?? 0, cor: '#d4380d' },
          { titulo: 'Lidas', valor: r?.lidas ?? 0 },
          { titulo: 'Total', valor: r?.total ?? 0 },
        ]}
      />

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="Todos os tipos"
            style={{ width: 170 }}
            value={tipo}
            onChange={setTipo}
            options={Object.keys(COR_TIPO).map((t) => ({
              value: t,
              label: `${rotulo(t)} (${r?.porTipo[t] ?? 0})`,
            }))}
          />
          <Select
            allowClear
            placeholder="Todos os canais"
            style={{ width: 160 }}
            value={canal}
            onChange={setCanal}
            options={[
              { value: 'IN_APP', label: `In-App (${r?.porCanal.IN_APP ?? 0})` },
              { value: 'EMAIL', label: `Email (${r?.porCanal.EMAIL ?? 0})` },
              { value: 'PUSH', label: `Push (${r?.porCanal.PUSH ?? 0})` },
            ]}
          />
          <Select
            allowClear
            placeholder="Todas"
            style={{ width: 140 }}
            value={lida}
            onChange={setLida}
            options={[
              { value: 'false', label: 'Não lidas' },
              { value: 'true', label: 'Lidas' },
            ]}
          />
        </Space>

        <Estado
          carregando={lista.isLoading}
          erro={lista.error}
          esqueleto
          vazio={lista.data?.data.length === 0}
          mensagemVazio="Nenhuma notificação"
        >
          <List
            dataSource={lista.data?.data ?? []}
            pagination={{ pageSize: 12 }}
            renderItem={(n) => (
              <List.Item
                style={{
                  background: n.lida ? undefined : 'rgba(0,142,234,0.05)',
                  borderRadius: 8,
                  paddingInline: 12,
                }}
                actions={[
                  !n.lida && (
                    <Button
                      key="l"
                      size="small"
                      type="link"
                      icon={<CheckOutlined />}
                      onClick={async () => {
                        try {
                          await marcar.mutateAsync({ id: n.id });
                        } catch (e) {
                          message.error(mensagemDeErro(e));
                        }
                      }}
                    >
                      Marcar lida
                    </Button>
                  ),
                  <Button
                    key="d"
                    size="small"
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={async () => {
                      try {
                        await remover.mutateAsync({ id: n.id });
                        message.success('Notificação removida.');
                      } catch (e) {
                        message.error(mensagemDeErro(e));
                      }
                    }}
                  />,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={<Badge dot={!n.lida} offset={[-2, 4]} />}
                  title={
                    <Space wrap size={6}>
                      <Typography.Text strong={!n.lida}>{n.titulo}</Typography.Text>
                      <Tag color={COR_TIPO[n.tipo]}>{rotulo(n.tipo)}</Tag>
                      <Tag>{rotulo(n.canal)}</Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Typography.Text type="secondary">{n.mensagem}</Typography.Text>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 11, display: 'block', marginTop: 3 }}
                      >
                        {dataHora(n.criadoEm)}
                      </Typography.Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Estado>
      </Card>
    </Pagina>
  );
}
