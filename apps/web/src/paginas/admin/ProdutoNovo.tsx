import { useNavigate } from 'react-router-dom';
import {
  App, Button, Card, Checkbox, Col, Form, Input, InputNumber, Row, Select, Space, Typography,
} from 'antd';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { moeda } from '@/api/formato';
import { Pagina } from '@/componentes/Pagina';
import type { Categoria, NivelPlano, Paginado, Parceiro, StatusProduto } from '@/api/tipos';

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
  imagemUrl?: string;
  parceiroId?: string;
  estoqueIlimitado?: boolean;
}

export function ProdutoNovo() {
  const navegar = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<Formulario>();
  const categorias = useApi<Categoria[]>(['catalogo', 'categorias'], '/catalogo/categorias');
  const parceiros = useApi<Paginado<Parceiro>>(['parceiros', 'seletor'], '/parceiros', {
    limit: 200,
    ativa: true,
  });

  // o campo de estoque guardava -1 para ilimitado, o que não se lê numa tela
  const ilimitado = Form.useWatch('estoqueIlimitado', form);

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
      const { estoqueIlimitado, ...resto } = valores;
      // a API continua usando -1 para ilimitado; a conversão fica aqui, para a
      // tela não precisar expor esse detalhe a quem preenche
      const r = await criar.mutateAsync({
        ...resto,
        estoque: estoqueIlimitado ? -1 : (resto.estoque ?? 0),
      });
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
        initialValues={{ status: 'ATIVO', estoqueIlimitado: true, preco: 0, comissaoPct: 0 }}
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
                  <Form.Item label="Estoque">
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item name="estoque" noStyle>
                        <InputNumber
                          min={0}
                          disabled={ilimitado}
                          placeholder={ilimitado ? 'Ilimitado' : '0'}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Space.Compact>
                  </Form.Item>
                  <Form.Item name="estoqueIlimitado" valuePropName="checked" style={{ marginTop: -18 }}>
                    <Checkbox>Estoque ilimitado</Checkbox>
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
                label="Disponível a partir do plano"
                extra="Quem estiver em um plano abaixo deste não consegue adicionar o produto."
              >
                <Select
                  allowClear
                  placeholder="Todos os planos"
                  // a regra é nível mínimo, não exclusividade: rotular um deles
                  // como "somente" descreveria errado a mesma regra
                  options={[
                    { value: 'INTERMEDIARIO', label: 'Intermediário' },
                    { value: 'AVANCADO', label: 'Avançado' },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="parceiroId"
                label="Parceiro fornecedor"
                extra="Empresa responsável pela oferta. Usado na conciliação de vendas e comissões."
              >
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  loading={parceiros.isLoading}
                  placeholder="Selecione o parceiro"
                  options={(parceiros.data?.data ?? []).map((p) => ({ value: p.id, label: p.nome }))}
                />
              </Form.Item>
              <Form.Item
                name="imagemUrl"
                label="URL da imagem"
                extra="Aparece na vitrine do associado. Ainda não é possível enviar arquivo."
                rules={[{ type: 'url', message: 'Informe um endereço completo, começando com https://' }]}
              >
                <Input placeholder="https://…/produto.png" />
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
