import { useState } from 'react';
import { App, Button, Card, Col, Form, Input, InputNumber, Modal, Row, Statistic, Tag, Typography } from 'antd';
import {
  FacebookOutlined, InstagramOutlined, LinkedinOutlined, TwitterOutlined, YoutubeOutlined,
} from '@ant-design/icons';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { compacto, percentual, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { RedeSocial } from '@/api/tipos';

interface Conta {
  id: string;
  rede: RedeSocial;
  handle: string | null;
  url: string | null;
  seguidores: number;
  engajamento: number;
  posts: number;
  conectada: boolean;
}

interface Resposta {
  contas: Conta[];
  resumo: {
    conectadas: number;
    disponiveis: number;
    totalSeguidores: number;
    engajamentoMedio: number;
    totalPosts: number;
  };
}

const REDES: { valor: RedeSocial; icone: React.ReactNode; cor: string }[] = [
  { valor: 'INSTAGRAM', icone: <InstagramOutlined />, cor: '#E4405F' },
  { valor: 'YOUTUBE', icone: <YoutubeOutlined />, cor: '#FF0000' },
  { valor: 'TIKTOK', icone: <span style={{ fontWeight: 700 }}>TT</span>, cor: '#000000' },
  { valor: 'TWITTER', icone: <TwitterOutlined />, cor: '#1DA1F2' },
  { valor: 'FACEBOOK', icone: <FacebookOutlined />, cor: '#1877F2' },
  { valor: 'LINKEDIN', icone: <LinkedinOutlined />, cor: '#0A66C2' },
];

export function RedesSociais() {
  const { message } = App.useApp();
  const [rede, setRede] = useState<RedeSocial>();
  const [form] = Form.useForm();
  const consulta = useApi<Resposta>(['portal', 'redes'], '/portal/redes-sociais');

  const conectar = useAcao<Record<string, unknown>, unknown>('post', '/portal/redes-sociais', [
    ['portal', 'redes'],
  ]);
  const desconectar = useAcao<{ rede: RedeSocial }, unknown>(
    'delete',
    (e) => `/portal/redes-sociais/${e.rede}`,
    [['portal', 'redes']],
  );

  const r = consulta.data;
  const porRede = new Map((r?.contas ?? []).map((c) => [c.rede, c]));

  async function salvar(v: Record<string, unknown>) {
    try {
      await conectar.mutateAsync({ ...v, rede });
      message.success('Rede conectada.');
      setRede(undefined);
      form.resetFields();
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  return (
    <Pagina titulo="Redes Sociais" descricao="Conecte seus perfis e acompanhe o alcance">
      <Cartoes
        carregando={consulta.isLoading}
        metricas={[
          {
            titulo: 'Contas conectadas',
            valor: `${r?.resumo.conectadas ?? 0} / ${r?.resumo.disponiveis ?? 6}`,
          },
          { titulo: 'Total de seguidores', valor: compacto(r?.resumo.totalSeguidores) },
          { titulo: 'Engajamento médio', valor: percentual(r?.resumo.engajamentoMedio) },
          { titulo: 'Total de posts', valor: r?.resumo.totalPosts ?? 0 },
        ]}
      />

      <Estado carregando={consulta.isLoading} erro={consulta.error} esqueleto>
        <Row gutter={[16, 16]}>
          {REDES.map((def) => {
            const c = porRede.get(def.valor);
            const conectada = c?.conectada ?? false;
            return (
              <Col key={def.valor} xs={24} sm={12} lg={8}>
                <Card
                  size="small"
                  style={{ height: '100%', borderTop: `3px solid ${conectada ? def.cor : '#e8e5ef'}` }}
                  actions={[
                    conectada ? (
                      <Button
                        key="d"
                        type="link"
                        danger
                        onClick={async () => {
                          try {
                            await desconectar.mutateAsync({ rede: def.valor });
                            message.success('Rede desconectada.');
                          } catch (e) {
                            message.error(mensagemDeErro(e));
                          }
                        }}
                      >
                        Desconectar
                      </Button>
                    ) : (
                      <Button key="c" type="link" onClick={() => setRede(def.valor)}>
                        Conectar
                      </Button>
                    ),
                  ]}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 22, color: conectada ? def.cor : '#bfbfbf' }}>{def.icone}</span>
                    <div style={{ flex: 1 }}>
                      <Typography.Text strong style={{ display: 'block' }}>
                        {rotulo(def.valor)}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {c?.handle ?? 'Não conectado'}
                      </Typography.Text>
                    </div>
                    <Tag color={conectada ? 'green' : 'default'}>
                      {conectada ? 'Conectado' : '—'}
                    </Tag>
                  </div>

                  {conectada && c && (
                    <Row gutter={8} style={{ textAlign: 'center' }}>
                      <Col span={8}>
                        <Statistic
                          title="Seguidores"
                          value={compacto(c.seguidores)}
                          valueStyle={{ fontSize: 16 }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Engaj."
                          value={percentual(c.engajamento)}
                          valueStyle={{ fontSize: 16 }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic title="Posts" value={c.posts} valueStyle={{ fontSize: 16 }} />
                      </Col>
                    </Row>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      </Estado>

      <Modal
        open={Boolean(rede)}
        title={`Conectar ${rede ? rotulo(rede) : ''}`}
        onCancel={() => setRede(undefined)}
        onOk={() => form.submit()}
        okText="Conectar"
        cancelText="Cancelar"
        confirmLoading={conectar.isPending}
      >
        <Form form={form} layout="vertical" onFinish={salvar}>
          <Form.Item name="handle" label="Handle" rules={[{ required: true, message: 'Informe o handle.' }]}>
            <Input placeholder="@seu.perfil" />
          </Form.Item>
          <Form.Item name="url" label="URL do perfil" rules={[{ type: 'url', message: 'URL inválida.' }]}>
            <Input placeholder="https://…" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="seguidores" label="Seguidores">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="engajamento" label="Engajamento (%)">
                <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="posts" label="Posts">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Pagina>
  );
}
