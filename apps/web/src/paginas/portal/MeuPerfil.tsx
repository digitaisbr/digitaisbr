import { App, Button, Card, Col, Form, Input, Row, Space, Switch, Tag, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { compacto, corDeStatus, percentual, rotulo } from '@/api/formato';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { NivelPlano } from '@/api/tipos';

interface Perfil {
  id: string;
  nome: string;
  handle: string;
  email: string;
  telefone: string | null;
  nicho: string | null;
  bio: string | null;
  cidade: string | null;
  seguidores: number;
  engajamento: number;
  mostrarEmail: boolean;
  mostrarTelefone: boolean;
  linkPublico: string;
  plano: { nivel: NivelPlano; nome: string };
  redesSociais: { rede: string; handle: string | null; seguidores: number }[];
}

interface Formulario {
  nome: string;
  bio?: string;
  nicho?: string;
  telefone?: string;
  cidade?: string;
  mostrarEmail: boolean;
  mostrarTelefone: boolean;
}

export function MeuPerfil() {
  const { message } = App.useApp();
  const [form] = Form.useForm<Formulario>();
  const consulta = useApi<Perfil>(['portal', 'perfil'], '/portal/perfil');

  const salvar = useAcao<Formulario, unknown>('patch', '/portal/perfil', [
    ['portal', 'perfil'],
    ['portal', 'painel'],
  ]);

  const p = consulta.data;

  useEffect(() => {
    if (!p) return;
    // a API devolve null nos opcionais; o Form espera undefined
    form.setFieldsValue({
      nome: p.nome,
      bio: p.bio ?? undefined,
      nicho: p.nicho ?? undefined,
      telefone: p.telefone ?? undefined,
      cidade: p.cidade ?? undefined,
      mostrarEmail: p.mostrarEmail,
      mostrarTelefone: p.mostrarTelefone,
    });
  }, [p, form]);

  async function enviar(v: Formulario) {
    try {
      await salvar.mutateAsync(v);
      message.success('Perfil atualizado.');
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  return (
    <Pagina titulo="Meu Perfil" descricao="Como você aparece para os seus seguidores">
      <Estado carregando={consulta.isLoading} erro={consulta.error} esqueleto>
        {p && (
          <Form form={form} layout="vertical" onFinish={enviar}>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={14}>
                <Card title="Dados públicos" style={{ marginBottom: 16 }}>
                  <Row gutter={12}>
                    <Col xs={24} md={14}>
                      <Form.Item name="nome" label="Nome" rules={[{ required: true, min: 3 }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={10}>
                      <Form.Item name="nicho" label="Nicho">
                        <Input placeholder="Lifestyle, Games, Moda…" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name="bio" label="Bio">
                        <Input.TextArea rows={3} placeholder="Conte quem você é em poucas linhas" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="telefone" label="Telefone">
                        <Input placeholder="(00) 90000-0000" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="cidade" label="Cidade">
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>

                <Card title="Privacidade" style={{ marginBottom: 16 }}>
                  <Form.Item name="mostrarEmail" label="Mostrar email no perfil público" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name="mostrarTelefone"
                    label="Mostrar telefone no perfil público"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Quando desligado, o dado não é devolvido pela API nem aparece na página pública.
                  </Typography.Text>
                </Card>

                <Button type="primary" htmlType="submit" loading={salvar.isPending}>
                  Salvar alterações
                </Button>
              </Col>

              <Col xs={24} lg={10}>
                <Card title="Preview do perfil público" style={{ marginBottom: 16 }}>
                  <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    {p.nome}
                  </Typography.Title>
                  <Space wrap size={6} style={{ marginBottom: 10 }}>
                    <Tag color={corDeStatus(p.plano.nivel)}>{p.plano.nome}</Tag>
                    {p.nicho && <Tag>{p.nicho}</Tag>}
                  </Space>
                  <Typography.Paragraph type="secondary">{p.bio ?? 'Sem bio.'}</Typography.Paragraph>
                  <Space size={18}>
                    <div>
                      <Typography.Text strong>{compacto(p.seguidores)}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {' '}
                        seguidores
                      </Typography.Text>
                    </div>
                    <div>
                      <Typography.Text strong>{percentual(p.engajamento)}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {' '}
                        engajamento
                      </Typography.Text>
                    </div>
                  </Space>
                </Card>

                <Card title="Link do perfil">
                  <Space.Compact style={{ width: '100%' }}>
                    <Input readOnly value={`${location.origin}${p.linkPublico}`} />
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => {
                        void navigator.clipboard.writeText(`${location.origin}${p.linkPublico}`);
                        message.success('Link copiado.');
                      }}
                    />
                  </Space.Compact>
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                    Compartilhe nas suas redes e na bio do Instagram.
                  </Typography.Text>
                </Card>

                {p.redesSociais.length > 0 && (
                  <Card title="Redes conectadas" style={{ marginTop: 16 }}>
                    {p.redesSociais.map((r) => (
                      <div
                        key={r.rede}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}
                      >
                        <Tag color="blue">{rotulo(r.rede)}</Tag>
                        <Typography.Text type="secondary">{r.handle ?? '—'}</Typography.Text>
                        <Typography.Text strong>{compacto(r.seguidores)}</Typography.Text>
                      </div>
                    ))}
                  </Card>
                )}
              </Col>
            </Row>
          </Form>
        )}
      </Estado>
    </Pagina>
  );
}
