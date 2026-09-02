import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  App, Avatar, Button, Card, Checkbox, Col, Descriptions, Input, Row, Select, Space, Tag, Timeline, Typography,
} from 'antd';
import { LockOutlined, SendOutlined } from '@ant-design/icons';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { corDeStatus, dataHora, rotulo } from '@/api/formato';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { PrioridadeTicket, StatusTicket, Ticket } from '@/api/tipos';
import { marca } from '@/marca';

export function TicketDetalhe() {
  const { id = '' } = useParams();
  const { message } = App.useApp();
  const [texto, setTexto] = useState('');
  const [interna, setInterna] = useState(false);

  const ticket = useApi<Ticket>(['suporte', id], `/suporte/${id}`);

  const responder = useAcao<{ conteudo: string; interna: boolean }, unknown>(
    'post',
    `/suporte/${id}/mensagens`,
    [['suporte', id], ['suporte']],
  );
  const atualizar = useAcao<{ status?: StatusTicket; prioridade?: PrioridadeTicket }, unknown>(
    'patch',
    `/suporte/${id}`,
    [['suporte', id], ['suporte'], ['dashboard']],
  );
  const atender = useAcao<Record<string, never>, unknown>(
    'patch',
    `/suporte/${id}/atender`,
    [['suporte', id], ['suporte']],
  );

  const t = ticket.data;

  async function enviar() {
    if (!texto.trim()) return;
    try {
      await responder.mutateAsync({ conteudo: texto, interna });
      setTexto('');
      setInterna(false);
      message.success(interna ? 'Nota interna registrada.' : 'Resposta enviada.');
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  return (
    <Pagina
      titulo={t ? `${t.numero} — ${t.assunto}` : 'Chamado'}
      trilha={[{ rotulo: 'Suporte', para: '/suporte' }, { rotulo: t?.numero ?? '…' }]}
      acoes={
        t && (
          <Space>
            {!t.atribuidoA && (
              <Button
                onClick={async () => {
                  try {
                    await atender.mutateAsync({});
                    message.success('Chamado atribuído a você.');
                  } catch (e) {
                    message.error(mensagemDeErro(e));
                  }
                }}
              >
                Atender
              </Button>
            )}
            <Select
              value={t.status}
              style={{ width: 175 }}
              onChange={async (status) => {
                try {
                  await atualizar.mutateAsync({ status });
                  message.success('Status atualizado.');
                } catch (e) {
                  message.error(mensagemDeErro(e));
                }
              }}
              options={[
                { value: 'ABERTO', label: 'Aberto' },
                { value: 'EM_ANDAMENTO', label: 'Em andamento' },
                { value: 'RESOLVIDO', label: 'Resolvido' },
                { value: 'FECHADO', label: 'Fechado' },
              ]}
            />
          </Space>
        )
      }
    >
      <Estado carregando={ticket.isLoading} erro={ticket.error} esqueleto>
        {t && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card title={`Conversa · ${t.mensagens?.length ?? 0} mensagem(ns)`}>
                <Timeline
                  items={(t.mensagens ?? []).map((m) => ({
                    color: m.interna ? 'orange' : m.autor?.role === 'ADMIN' ? 'blue' : 'green',
                    dot: m.interna ? <LockOutlined /> : undefined,
                    children: (
                      <div>
                        <Space size={8} style={{ marginBottom: 4 }}>
                          <Avatar size={22} style={{ background: m.autor?.role === 'ADMIN' ? marca.digitalBlue : marca.mintLeaf }}>
                            {m.autor?.nome?.[0] ?? '?'}
                          </Avatar>
                          <Typography.Text strong style={{ fontSize: 13 }}>
                            {m.autor?.nome ?? 'Sistema'}
                          </Typography.Text>
                          {m.interna && <Tag color="orange">Nota interna</Tag>}
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            {dataHora(m.criadoEm)}
                          </Typography.Text>
                        </Space>
                        <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                          {m.conteudo}
                        </Typography.Paragraph>
                      </div>
                    ),
                  }))}
                />

                {t.status !== 'FECHADO' && (
                  <div style={{ marginTop: 20 }}>
                    <Input.TextArea
                      rows={3}
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      placeholder="Escreva a resposta…"
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                      <Checkbox checked={interna} onChange={(e) => setInterna(e.target.checked)}>
                        Nota interna (não visível ao associado)
                      </Checkbox>
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        loading={responder.isPending}
                        onClick={enviar}
                        disabled={!texto.trim()}
                      >
                        Enviar
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card title="Dados do chamado">
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Número">{t.numero}</Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={corDeStatus(t.status)}>{rotulo(t.status)}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Prioridade">
                    <Select
                      size="small"
                      value={t.prioridade}
                      style={{ width: 130 }}
                      onChange={async (prioridade) => {
                        try {
                          await atualizar.mutateAsync({ prioridade });
                          message.success('Prioridade atualizada.');
                        } catch (e) {
                          message.error(mensagemDeErro(e));
                        }
                      }}
                      options={[
                        { value: 'BAIXA', label: 'Baixa' },
                        { value: 'MEDIA', label: 'Média' },
                        { value: 'ALTA', label: 'Alta' },
                        { value: 'URGENTE', label: 'Urgente' },
                      ]}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="Categoria">{t.categoria}</Descriptions.Item>
                  <Descriptions.Item label="Associado">
                    {t.associado ? `${t.associado.nome} (${t.associado.plano.nome})` : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Atribuído">{t.atribuidoA?.nome ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Aberto em">{dataHora(t.criadoEm)}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        )}
      </Estado>
    </Pagina>
  );
}
