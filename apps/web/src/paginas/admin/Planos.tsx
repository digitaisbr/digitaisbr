import { useState } from 'react';
import {
  Button, Card, Col, Form, Input, InputNumber, List, Row, Select, Space, Statistic, Switch, Tag,
  Typography,
} from 'antd';
import { CheckCircleOutlined, EditOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { ModalRecurso } from '@/componentes/ModalRecurso';
import { moeda, percentual } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { Plano } from '@/api/tipos';
import { marca } from '@/marca';

interface Metricas {
  mrr: number;
  arr: number;
  totalAssociadosAtivos: number;
  distribuicao: { nivel: string; nome: string; associados: number; percentual: number; receita: number }[];
}

const COR: Record<string, string> = { BASICO: marca.digitalBlue, INTERMEDIARIO: marca.violet, AVANCADO: '#faad14' };

export function Planos() {
  const planos = useApi<Plano[]>(['planos'], '/planos');
  const metricas = useApi<Metricas>(['planos', 'metricas'], '/planos/metricas');
  const [aberto, setAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Plano | null>(null);

  function abrir(p: Plano | null) {
    setEmEdicao(p);
    setAberto(true);
  }

  const m = metricas.data;

  return (
    <Pagina
      titulo="Planos"
      descricao="Níveis de assinatura e o que cada um libera"
      acoes={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => abrir(null)}>
          Novo plano
        </Button>
      }
    >
      <Cartoes
        carregando={metricas.isLoading}
        colunas={3}
        metricas={[
          { titulo: 'MRR', valor: moeda(m?.mrr), detalhe: 'receita recorrente mensal', cor: marca.mintLeaf },
          { titulo: 'ARR', valor: moeda(m?.arr), detalhe: 'projeção anual' },
          { titulo: 'Assinantes ativos', valor: m?.totalAssociadosAtivos ?? 0, icone: <TeamOutlined /> },
        ]}
      />

      <Estado carregando={planos.isLoading} erro={planos.error} esqueleto>
        <Row gutter={[16, 16]}>
          {(planos.data ?? []).map((p) => {
            const dist = m?.distribuicao.find((d) => d.nivel === p.nivel);
            return (
              <Col key={p.id} xs={24} md={8}>
                <Card
                  style={{ borderTop: `3px solid ${COR[p.nivel]}`, height: '100%' }}
                  title={
                    <div style={{ textAlign: 'center' }}>
                      <Typography.Title level={4} style={{ margin: 0 }}>
                        {p.nome}
                      </Typography.Title>
                      <Typography.Text style={{ fontSize: 26, fontWeight: 700, color: COR[p.nivel] }}>
                        {moeda(p.preco)}
                      </Typography.Text>
                      <Typography.Text type="secondary">/mês</Typography.Text>
                    </div>
                  }
                >
                  <Typography.Paragraph type="secondary" style={{ textAlign: 'center', minHeight: 44 }}>
                    {p.descricao}
                  </Typography.Paragraph>

                  <Row gutter={8} style={{ textAlign: 'center', marginBottom: 16 }}>
                    <Col span={12}>
                      <Statistic
                        title="Associados"
                        value={p.associadosAtivos ?? 0}
                        valueStyle={{ fontSize: 20 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Receita"
                        value={dist ? moeda(dist.receita) : '—'}
                        valueStyle={{ fontSize: 20 }}
                      />
                    </Col>
                  </Row>

                  <List
                    size="small"
                    dataSource={p.recursos}
                    renderItem={(r) => (
                      <List.Item style={{ padding: '5px 0', border: 'none' }}>
                        <CheckCircleOutlined style={{ color: COR[p.nivel], marginRight: 8 }} />
                        <Typography.Text style={{ fontSize: 13 }}>{r}</Typography.Text>
                      </List.Item>
                    )}
                  />

                  <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Tag>
                      {p.limiteProdutos === -1 ? 'Produtos ilimitados' : `Até ${p.limiteProdutos} produtos`}
                    </Tag>
                    {p.comissaoExtraPct > 0 && (
                      <Tag color="green">+{percentual(p.comissaoExtraPct, 0)} de comissão</Tag>
                    )}
                    <Tag>Suporte {p.suporte}</Tag>
                  </div>

                  <Button block icon={<EditOutlined />} style={{ marginTop: 14 }} onClick={() => abrir(p)}>
                    Editar plano
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Estado>

      <ModalRecurso<Plano>
        aberto={aberto}
        registro={emEdicao}
        aoFechar={() => setAberto(false)}
        recurso="plano"
        base="/planos"
        invalidar={[['planos'], ['associados']]}
        iniciais={{ ativo: true, limiteProdutos: 20, comissaoExtraPct: 0, suporte: 'Email', ordem: 1 }}
      >
        <Form.Item name="nome" label="Nome" rules={[{ required: true, message: 'Informe o nome.' }]}>
          <Input placeholder="Básico" autoFocus />
        </Form.Item>

        <Form.Item
          name="nivel"
          label="Nível"
          rules={[{ required: true }]}
          extra="Define a precedência nos bloqueios por plano. Não muda depois de criado."
        >
          <Select
            disabled={Boolean(emEdicao)}
            options={[
              { value: 'BASICO', label: 'Básico' },
              { value: 'INTERMEDIARIO', label: 'Intermediário' },
              { value: 'AVANCADO', label: 'Avançado' },
            ]}
          />
        </Form.Item>

        <Form.Item name="preco" label="Mensalidade" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: '100%' }} prefix="R$" decimalSeparator="," />
        </Form.Item>

        <Form.Item name="descricao" label="Descrição" rules={[{ required: true }]}>
          <Input.TextArea rows={2} placeholder="Para quem é este plano." />
        </Form.Item>

        <Form.Item
          name="recursos"
          label="Recursos listados"
          extra="Aparecem como lista no cartão. São texto — os limites de verdade estão nos campos abaixo."
        >
          <Select mode="tags" open={false} placeholder="Digite e pressione Enter para cada item" />
        </Form.Item>

        <Space size={12} style={{ display: 'flex' }}>
          <Form.Item name="limiteProdutos" label="Limite de produtos" extra="-1 para ilimitado" style={{ flex: 1 }}>
            <InputNumber min={-1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="comissaoExtraPct" label="Bônus de comissão" style={{ flex: 1 }}>
            <InputNumber min={0} max={100} step={0.5} suffix="%" style={{ width: '100%' }} />
          </Form.Item>
        </Space>

        <Form.Item name="suporte" label="Suporte">
          <Select
            options={[
              { value: 'Email', label: 'Email' },
              { value: 'Chat', label: 'Chat' },
              { value: 'Prioritário', label: 'Prioritário' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="ativo"
          label="Disponível para novos associados"
          valuePropName="checked"
          extra="Desligado, o plano some da escolha — quem já está nele continua."
        >
          <Switch />
        </Form.Item>
      </ModalRecurso>
    </Pagina>
  );
}
