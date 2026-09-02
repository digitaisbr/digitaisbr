import { useNavigate } from 'react-router-dom';
import { App, Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Typography } from 'antd';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao } from '@/api/hooks';
import { Pagina } from '@/componentes/Pagina';
import type { NivelPlano, StatusAssociado } from '@/api/tipos';

interface Formulario {
  nome: string;
  email: string;
  handle: string;
  plano: NivelPlano;
  cpfCnpj?: string;
  telefone?: string;
  nicho?: string;
  seguidores?: number;
  engajamento?: number;
  endereco?: string;
  cidade?: string;
  uf?: string;
  status?: StatusAssociado;
}

export function AssociadoNovo() {
  const navegar = useNavigate();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<Formulario>();

  const criar = useAcao<Formulario, { id: string; senhaInicial?: string }>(
    'post',
    '/associados',
    [['associados'], ['dashboard']],
  );

  async function salvar(valores: Formulario) {
    try {
      const r = await criar.mutateAsync(valores);
      if (r.senhaInicial) {
        modal.success({
          title: 'Associado criado',
          content: (
            <div>
              <Typography.Paragraph>
                A senha inicial é exibida uma única vez. Repasse-a ao associado:
              </Typography.Paragraph>
              <Typography.Text code copyable style={{ fontSize: 16 }}>
                {r.senhaInicial}
              </Typography.Text>
            </div>
          ),
          onOk: () => navegar(`/associados/${r.id}`),
        });
      } else {
        message.success('Associado criado.');
        navegar(`/associados/${r.id}`);
      }
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  /** sugere o handle a partir do nome, sem sobrescrever edição manual */
  function sugerirHandle(nome: string) {
    if (form.isFieldTouched('handle')) return;
    const handle = nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    form.setFieldValue('handle', handle);
  }

  return (
    <Pagina
      titulo="Novo associado"
      trilha={[{ rotulo: 'Associados', para: '/associados' }, { rotulo: 'Novo' }]}
      descricao="A criação gera o usuário de acesso, a assinatura do plano e a loja virtual."
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={salvar}
        initialValues={{ plano: 'BASICO', status: 'ATIVO' }}
        requiredMark="optional"
      >
        <Row gutter={16}>
          <Col xs={24} lg={14}>
            <Card title="Dados pessoais" style={{ marginBottom: 16 }}>
              <Row gutter={12}>
                <Col xs={24} md={14}>
                  <Form.Item
                    name="nome"
                    label="Nome completo"
                    rules={[{ required: true, min: 3, message: 'Informe ao menos 3 caracteres.' }]}
                  >
                    <Input placeholder="Nome completo" onChange={(e) => sugerirHandle(e.target.value)} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={10}>
                  <Form.Item
                    name="handle"
                    label="Handle"
                    tooltip="Usado na URL da loja e do perfil público"
                    rules={[
                      { required: true, message: 'Informe o handle.' },
                      { pattern: /^[a-z0-9-]{3,40}$/, message: 'Use minúsculas, números e hífens.' },
                    ]}
                  >
                    <Input prefix="@" placeholder="nome-sobrenome" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Informe o email.' },
                      { type: 'email', message: 'Email inválido.' },
                    ]}
                  >
                    <Input placeholder="email@exemplo.com" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="telefone" label="Telefone">
                    <Input placeholder="(00) 90000-0000" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="cpfCnpj" label="CPF/CNPJ">
                    <Input placeholder="000.000.000-00" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="nicho" label="Nicho">
                    <Input placeholder="Lifestyle, Games, Moda…" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Endereço">
              <Row gutter={12}>
                <Col xs={24}>
                  <Form.Item name="endereco" label="Endereço">
                    <Input placeholder="Rua, número, complemento" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                  <Form.Item name="cidade" label="Cidade">
                    <Input placeholder="Cidade" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="uf" label="UF" rules={[{ len: 2, message: 'Use 2 letras.' }]}>
                    <Input placeholder="SP" maxLength={2} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title="Plano e alcance" style={{ marginBottom: 16 }}>
              <Form.Item name="plano" label="Plano" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'BASICO', label: 'Básico — R$ 49,90/mês' },
                    { value: 'INTERMEDIARIO', label: 'Intermediário — R$ 99,90/mês' },
                    { value: 'AVANCADO', label: 'Avançado — R$ 199,90/mês' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="status" label="Status">
                <Select
                  options={[
                    { value: 'ATIVO', label: 'Ativo' },
                    { value: 'INATIVO', label: 'Inativo' },
                    { value: 'SUSPENSO', label: 'Suspenso' },
                  ]}
                />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="seguidores" label="Seguidores">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="engajamento" label="Engajamento (%)">
                    <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} placeholder="0.0" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card>
              <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
                Se nenhuma senha for definida, o sistema gera uma e a exibe uma única vez após a
                criação.
              </Typography.Paragraph>
              <Space>
                <Button type="primary" htmlType="submit" loading={criar.isPending}>
                  Criar associado
                </Button>
                <Button onClick={() => navegar('/associados')}>Cancelar</Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Form>
    </Pagina>
  );
}
