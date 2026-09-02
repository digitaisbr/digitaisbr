import { useState } from 'react';
import { App, Button, Card, Col, Form, Input, List, Modal, Rate, Row, Space, Tag, Typography } from 'antd';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { corDeStatus, data, moeda, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { Profissional, StatusSolicitacao } from '@/api/tipos';
import { marca } from '@/marca';

interface Solicitacoes {
  solicitacoes: {
    id: string;
    assunto: string;
    descricao: string | null;
    status: StatusSolicitacao;
    criadoEm: string;
    profissional: { nome: string; especialidade: string | null } | null;
  }[];
  resumo: Record<string, number>;
}

export function ServicosPortal() {
  const { message } = App.useApp();
  const [alvo, setAlvo] = useState<Profissional>();
  const [form] = Form.useForm();

  const profissionais = useApi<Profissional[]>(
    ['servicos', 'profissionais'],
    '/servicos/profissionais',
  );
  const minhas = useApi<Solicitacoes>(['portal', 'solicitacoes'], '/servicos/minhas-solicitacoes');

  const solicitar = useAcao<Record<string, unknown>, unknown>('post', '/servicos/solicitacoes', [
    ['portal', 'solicitacoes'],
  ]);

  async function enviar(v: Record<string, unknown>) {
    try {
      await solicitar.mutateAsync({ ...v, profissionalId: alvo?.id });
      message.success('Solicitação enviada.');
      setAlvo(undefined);
      form.resetFields();
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  const disponiveis = (profissionais.data ?? []).filter((p) => p.disponivel);
  const m = minhas.data;

  return (
    <Pagina titulo="Assessoria Jurídica e Contábil" descricao="Profissionais conveniados à associação">
      <Cartoes
        carregando={profissionais.isLoading}
        colunas={3}
        metricas={[
          { titulo: 'Profissionais disponíveis', valor: disponiveis.length },
          { titulo: 'Minhas solicitações', valor: m?.solicitacoes.length ?? 0 },
          { titulo: 'Concluídas', valor: m?.resumo.CONCLUIDA ?? 0, cor: marca.mintLeaf },
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card title="Escolha um profissional">
            <Estado carregando={profissionais.isLoading} erro={profissionais.error} esqueleto>
              <Row gutter={[12, 12]}>
                {(profissionais.data ?? []).map((p) => (
                  <Col key={p.id} xs={24} md={12}>
                    <Card
                      size="small"
                      style={{ height: '100%', opacity: p.disponivel ? 1 : 0.6 }}
                      actions={[
                        p.disponivel ? (
                          <Button key="s" type="link" onClick={() => setAlvo(p)}>
                            Solicitar atendimento
                          </Button>
                        ) : (
                          <Typography.Text key="i" type="secondary" style={{ fontSize: 12 }}>
                            Indisponível
                          </Typography.Text>
                        ),
                      ]}
                    >
                      <Space wrap size={6} style={{ marginBottom: 6 }}>
                        <Typography.Text strong>{p.nome}</Typography.Text>
                        <Tag color={p.disponivel ? 'green' : 'default'}>
                          {p.disponivel ? 'Disponível' : 'Indisponível'}
                        </Tag>
                      </Space>
                      {p.especialidade && (
                        <Tag color="blue" style={{ fontSize: 11 }}>
                          {p.especialidade}
                        </Tag>
                      )}
                      <Typography.Paragraph
                        type="secondary"
                        style={{ fontSize: 12, margin: '8px 0 6px' }}
                        ellipsis={{ rows: 2 }}
                      >
                        {p.bio}
                      </Typography.Paragraph>
                      <Space size={10}>
                        <Rate disabled allowHalf value={p.nota ?? 0} style={{ fontSize: 12 }} />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          ({p.avaliacoes})
                        </Typography.Text>
                        {p.valorHora && (
                          <Typography.Text strong style={{ fontSize: 12 }}>
                            {moeda(p.valorHora)}/h
                          </Typography.Text>
                        )}
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Estado>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card title="Minhas solicitações">
            <Estado
              carregando={minhas.isLoading}
              erro={minhas.error}
              esqueleto
              vazio={m?.solicitacoes.length === 0}
              mensagemVazio="Nenhuma solicitação ainda"
            >
              <List
                dataSource={m?.solicitacoes ?? []}
                renderItem={(s) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Typography.Text style={{ fontSize: 13 }}>{s.assunto}</Typography.Text>}
                      description={
                        <Space wrap size={6}>
                          <Tag color={corDeStatus(s.status)}>{rotulo(s.status)}</Tag>
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            {s.profissional?.nome ?? 'Sem profissional'} · {data(s.criadoEm)}
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
      </Row>

      <Modal
        open={Boolean(alvo)}
        title={`Solicitar atendimento — ${alvo?.nome ?? ''}`}
        onCancel={() => setAlvo(undefined)}
        onOk={() => form.submit()}
        okText="Solicitar"
        cancelText="Cancelar"
        confirmLoading={solicitar.isPending}
      >
        <Form form={form} layout="vertical" onFinish={enviar}>
          <Form.Item
            name="assunto"
            label="Assunto"
            rules={[{ required: true, min: 5, message: 'Descreva o assunto.' }]}
          >
            <Input placeholder="Ex.: revisão de contrato de publi" />
          </Form.Item>
          <Form.Item name="descricao" label="Detalhes">
            <Input.TextArea rows={4} placeholder="Explique o que você precisa" />
          </Form.Item>
        </Form>
      </Modal>
    </Pagina>
  );
}
