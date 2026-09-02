import { useState } from 'react';
import {
  App, Avatar, Button, Card, Col, Form, Input, List, Modal, Row, Select, Space, Tag, Timeline, Typography,
} from 'antd';
import { PlusOutlined, SendOutlined } from '@ant-design/icons';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { corDeStatus, data, dataHora, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { PrioridadeTicket, Ticket } from '@/api/tipos';
import { marca } from '@/marca';

interface Meus {
  tickets: Ticket[];
  abertos: number;
  resolvidos: number;
}

const CATEGORIAS = [
  'Acesso', 'Financeiro', 'Loja Virtual', 'Catálogo', 'Benefícios',
  'Planos', 'Vendas', 'Serviços', 'Sistema', 'Outros',
];

export function SuportePortal() {
  const { message } = App.useApp();
  const [novo, setNovo] = useState(false);
  const [abertoId, setAbertoId] = useState<string>();
  const [texto, setTexto] = useState('');
  const [form] = Form.useForm();

  const meus = useApi<Meus>(['portal', 'suporte'], '/suporte/meus-chamados');
  const detalhe = useApi<Ticket>(
    ['suporte', abertoId ?? ''],
    `/suporte/${abertoId}`,
    undefined,
    { enabled: Boolean(abertoId) },
  );

  const abrir = useAcao<Record<string, unknown>, Ticket>('post', '/suporte', [['portal', 'suporte']]);
  const responder = useAcao<{ conteudo: string }, unknown>(
    'post',
    () => `/suporte/${abertoId}/mensagens`,
    [['suporte', abertoId ?? ''], ['portal', 'suporte']],
  );

  async function criar(v: Record<string, unknown>) {
    try {
      const t = await abrir.mutateAsync(v);
      message.success(`Chamado ${t.numero} aberto.`);
      setNovo(false);
      form.resetFields();
      setAbertoId(t.id);
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  async function enviar() {
    if (!texto.trim()) return;
    try {
      await responder.mutateAsync({ conteudo: texto });
      setTexto('');
      message.success('Mensagem enviada.');
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  const m = meus.data;
  const t = detalhe.data;

  return (
    <Pagina
      titulo="Meus Chamados"
      descricao="Fale com o atendimento da associação"
      acoes={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setNovo(true)}>
          Novo chamado
        </Button>
      }
    >
      <Cartoes
        carregando={meus.isLoading}
        colunas={3}
        metricas={[
          { titulo: 'Em aberto', valor: m?.abertos ?? 0, cor: '#d4380d' },
          { titulo: 'Resolvidos', valor: m?.resolvidos ?? 0, cor: marca.mintLeaf },
          { titulo: 'Total', valor: m?.tickets.length ?? 0 },
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={9}>
          <Card title="Chamados">
            <Estado
              carregando={meus.isLoading}
              erro={meus.error}
              esqueleto
              vazio={m?.tickets.length === 0}
              mensagemVazio="Nenhum chamado — abra um se precisar de ajuda"
            >
              <List
                dataSource={m?.tickets ?? []}
                renderItem={(x) => (
                  <List.Item
                    onClick={() => setAbertoId(x.id)}
                    style={{
                      cursor: 'pointer',
                      background: abertoId === x.id ? 'rgba(0,142,234,0.07)' : undefined,
                      borderRadius: 8,
                      paddingInline: 10,
                    }}
                  >
                    <List.Item.Meta
                      title={
                        <Space wrap size={6}>
                          <Tag>{x.numero}</Tag>
                          <Typography.Text style={{ fontSize: 13 }}>{x.assunto}</Typography.Text>
                        </Space>
                      }
                      description={
                        <Space wrap size={6}>
                          <Tag color={corDeStatus(x.status)}>{rotulo(x.status)}</Tag>
                          <Tag color={corDeStatus(x.prioridade)}>{rotulo(x.prioridade)}</Tag>
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            {data(x.criadoEm)}
                          </Typography.Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Estado>
          </Card>
        </Col>

        <Col xs={24} lg={15}>
          <Card title={t ? `${t.numero} — ${t.assunto}` : 'Selecione um chamado'}>
            {!abertoId ? (
              <Typography.Text type="secondary">
                Escolha um chamado à esquerda ou abra um novo.
              </Typography.Text>
            ) : (
              <Estado carregando={detalhe.isLoading} erro={detalhe.error} esqueleto>
                {t && (
                  <>
                    <Space wrap size={6} style={{ marginBottom: 16 }}>
                      <Tag color={corDeStatus(t.status)}>{rotulo(t.status)}</Tag>
                      <Tag color={corDeStatus(t.prioridade)}>{rotulo(t.prioridade)}</Tag>
                      <Tag>{t.categoria}</Tag>
                      {t.atribuidoA && (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          Atendente: {t.atribuidoA.nome}
                        </Typography.Text>
                      )}
                    </Space>

                    <Timeline
                      items={(t.mensagens ?? []).map((msg) => ({
                        color: msg.autor?.role === 'ADMIN' ? 'blue' : 'green',
                        children: (
                          <div>
                            <Space size={8} style={{ marginBottom: 4 }}>
                              <Avatar
                                size={22}
                                style={{ background: msg.autor?.role === 'ADMIN' ? marca.digitalBlue : marca.mintLeaf }}
                              >
                                {msg.autor?.nome?.[0] ?? '?'}
                              </Avatar>
                              <Typography.Text strong style={{ fontSize: 13 }}>
                                {msg.autor?.nome ?? 'Sistema'}
                              </Typography.Text>
                              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                {dataHora(msg.criadoEm)}
                              </Typography.Text>
                            </Space>
                            <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                              {msg.conteudo}
                            </Typography.Paragraph>
                          </div>
                        ),
                      }))}
                    />

                    {t.status !== 'FECHADO' && (
                      <div style={{ marginTop: 16 }}>
                        <Input.TextArea
                          rows={3}
                          value={texto}
                          onChange={(e) => setTexto(e.target.value)}
                          placeholder="Escreva sua mensagem…"
                        />
                        <Button
                          type="primary"
                          icon={<SendOutlined />}
                          style={{ marginTop: 10 }}
                          loading={responder.isPending}
                          onClick={enviar}
                          disabled={!texto.trim()}
                        >
                          Enviar
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </Estado>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        open={novo}
        title="Abrir chamado"
        onCancel={() => setNovo(false)}
        onOk={() => form.submit()}
        okText="Abrir"
        cancelText="Cancelar"
        confirmLoading={abrir.isPending}
      >
        <Form form={form} layout="vertical" onFinish={criar} initialValues={{ prioridade: 'MEDIA' }}>
          <Form.Item
            name="assunto"
            label="Assunto"
            rules={[{ required: true, min: 5, message: 'Descreva o assunto em ao menos 5 caracteres.' }]}
          >
            <Input placeholder="Resumo do problema" />
          </Form.Item>
          <Form.Item name="categoria" label="Categoria" rules={[{ required: true }]}>
            <Select options={CATEGORIAS.map((c) => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item name="prioridade" label="Prioridade">
            <Select
              options={(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'] as PrioridadeTicket[]).map((p) => ({
                value: p,
                label: rotulo(p),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="mensagem"
            label="Descrição"
            rules={[{ required: true, min: 10, message: 'Detalhe em ao menos 10 caracteres.' }]}
          >
            <Input.TextArea rows={4} placeholder="Descreva o que aconteceu" />
          </Form.Item>
        </Form>
      </Modal>
    </Pagina>
  );
}
