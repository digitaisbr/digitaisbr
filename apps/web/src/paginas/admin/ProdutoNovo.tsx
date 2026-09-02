import { useNavigate } from 'react-router-dom';
import { App, Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Typography } from 'antd';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { moeda } from '@/api/formato';
import { Pagina } from '@/componentes/Pagina';
import type { Categoria, NivelPlano, StatusProduto } from '@/api/tipos';

interface Formulario {
  nome: string;
  sku: string;
  categoriaId: string;
  preco: number;
  comissaoPct: number;
  estoque?: number;
  descricao?: string;
  planoMinimo?: NivelPlano;
  status?: StatusProduto;
  checkoutUrl?: string;
}

export function ProdutoNovo() {
  const navegar = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<Formulario>();
  const categorias = useApi<Categoria[]>(['catalogo', 'categorias'], '/catalogo/categorias');

  const criar = useAcao<Formulario, { id: string }>('post', '/catalogo/produtos', [
    ['catalogo'],
    ['dashboard'],
  ]);

  // ganho estimado acompanha preço e comissão enquanto se digita
  const preco = Form.useWatch('preco', form) ?? 0;
  const comissao = Form.useWatch('comissaoPct', form) ?? 0;
  const ganho = (preco * comissao) / 100;

  async function salvar(valores: Formulario) {
    try {
      const r = await criar.mutateAsync(valores);
      message.success('Produto cadastrado.');
      navegar(`/catalogo/${r.id}`);
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  return (
    <Pagina
      titulo="Novo produto"
      trilha={[{ rotulo: 'Catálogo', para: '/catalogo' }, { rotulo: 'Novo' }]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={salvar}
        initialValues={{ status: 'ATIVO', estoque: -1, preco: 0, comissaoPct: 0 }}
        requiredMark="optional"
      >
        <Row gutter={16}>
          <Col xs={24} lg={14}>
            <Card title="Informações do produto" style={{ marginBottom: 16 }}>
              <Row gutter={12}>
                <Col xs={24} md={16}>
                  <Form.Item
                    name="nome"
                    label="Nome do produto"
                    rules={[{ required: true, min: 3, message: 'Informe ao menos 3 caracteres.' }]}
                  >
                    <Input placeholder="Nome do produto" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="sku"
                    label="SKU"
                    rules={[{ required: true, min: 3, message: 'Informe o SKU.' }]}
                  >
                    <Input placeholder="CAT-001" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="descricao" label="Descrição">
                    <Input.TextArea rows={3} placeholder="O que o produto entrega ao cliente" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Preço e comissão">
              <Row gutter={12}>
                <Col xs={24} md={8}>
                  <Form.Item name="preco" label="Preço (R$)" rules={[{ required: true }]}>
                    <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="comissaoPct" label="Comissão (%)" rules={[{ required: true }]}>
                    <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="estoque" label="Estoque" tooltip="-1 significa estoque ilimitado">
                    <InputNumber min={-1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Typography.Text type="secondary">
                Ganho estimado do associado por venda: <strong>{moeda(ganho)}</strong>
                {' '}(sem o bônus do plano)
              </Typography.Text>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title="Classificação" style={{ marginBottom: 16 }}>
              <Form.Item
                name="categoriaId"
                label="Categoria"
                rules={[{ required: true, message: 'Selecione a categoria.' }]}
              >
                <Select
                  placeholder="Selecione…"
                  loading={categorias.isLoading}
                  options={(categorias.data ?? []).map((c) => ({ value: c.id, label: c.nome }))}
                />
              </Form.Item>
              <Form.Item name="status" label="Status">
                <Select
                  options={[
                    { value: 'ATIVO', label: 'Ativo' },
                    { value: 'INATIVO', label: 'Inativo' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="planoMinimo"
                label="Exclusividade por plano"
                tooltip="Deixe vazio para liberar a todos os planos"
              >
                <Select
                  allowClear
                  placeholder="Todos os planos"
                  options={[
                    { value: 'INTERMEDIARIO', label: 'Intermediário ou superior' },
                    { value: 'AVANCADO', label: 'Somente Avançado' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="checkoutUrl"
                label="URL de checkout"
                rules={[{ type: 'url', message: 'URL inválida.' }]}
              >
                <Input placeholder="https://checkout.exemplo.com/produto" />
              </Form.Item>
            </Card>

            <Card>
              <Space>
                <Button type="primary" htmlType="submit" loading={criar.isPending}>
                  Criar produto
                </Button>
                <Button onClick={() => navegar('/catalogo')}>Cancelar</Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Form>
    </Pagina>
  );
}
