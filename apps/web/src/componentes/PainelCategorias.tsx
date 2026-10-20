import { useState } from 'react';
import { Button, ColorPicker, Drawer, Empty, Form, Input, InputNumber, List, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { AcoesLinha } from '@/componentes/AcoesLinha';
import { ModalRecurso } from '@/componentes/ModalRecurso';
import type { Categoria } from '@/api/tipos';

// a categoria alimenta o cadastro de produto, o filtro do Catálogo e o do
// Marketplace do associado — mexer nela muda as três telas de uma vez
const CHAVES = [['catalogo', 'categorias'], ['catalogo', 'produtos']];

interface Props {
  aberto: boolean;
  aoFechar: () => void;
}

/**
 * Administração das categorias de produto, em painel lateral.
 *
 * Fica junto do Catálogo em vez de virar tela própria: são poucas, mudam
 * pouco, e o lugar onde alguém percebe que falta uma categoria é justamente
 * olhando a lista de produtos.
 */
export function PainelCategorias({ aberto, aoFechar }: Props) {
  const categorias = useApi<Categoria[]>(['catalogo', 'categorias'], '/catalogo/categorias');
  const [modalAberto, setModalAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Categoria | null>(null);

  function abrir(c: Categoria | null) {
    setEmEdicao(c);
    setModalAberto(true);
  }

  const lista = categorias.data ?? [];

  return (
    <>
      <Drawer
        open={aberto}
        onClose={aoFechar}
        title="Categorias de produto"
        width={460}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => abrir(null)}>
            Nova
          </Button>
        }
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
          Aparecem no cadastro de produto e nos filtros do Catálogo e do Marketplace.
          A ordem define como são listadas.
        </Typography.Paragraph>

        <List
          loading={categorias.isLoading}
          dataSource={lista}
          locale={{ emptyText: <Empty description="Nenhuma categoria cadastrada." /> }}
          renderItem={(c) => (
            <List.Item
              actions={[
                <AcoesLinha
                  key="acoes"
                  base="/catalogo/categorias"
                  id={c.id}
                  nome={c.nome}
                  invalidar={CHAVES}
                  aoEditar={() => abrir(c)}
                  aviso={
                    c.totalProdutos
                      ? `Tem ${c.totalProdutos} produto(s) — a exclusão será recusada. `
                        + 'Mova-os para outra categoria antes.'
                      : undefined
                  }
                />,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-block', width: 12, height: 12, borderRadius: 3,
                      background: c.cor ?? '#d9d9d9', marginTop: 6,
                    }}
                  />
                }
                title={c.nome}
                description={
                  <Tag bordered={false}>
                    {c.totalProdutos} produto{c.totalProdutos === 1 ? '' : 's'}
                  </Tag>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>

      <ModalRecurso<Categoria>
        aberto={modalAberto}
        registro={emEdicao}
        aoFechar={() => setModalAberto(false)}
        recurso="categoria"
        base="/catalogo/categorias"
        invalidar={CHAVES}
        iniciais={{ ordem: lista.length }}
        // o seletor devolve um objeto de cor; a API espera a string hexadecimal
        aoEnviar={(v) => ({
          ...v,
          cor: typeof v.cor === 'object' && v.cor !== null
            ? (v.cor as { toHexString: () => string }).toHexString()
            : v.cor,
        })}
      >
        <Form.Item
          name="nome"
          label="Nome"
          rules={[{ required: true, min: 2, message: 'Informe o nome.' }]}
          extra="O endereço usado nos filtros é derivado do nome, e acompanha a renomeação."
        >
          <Input placeholder="Viagem & Lazer" autoFocus />
        </Form.Item>

        <Form.Item name="cor" label="Cor" extra="Usada na etiqueta do produto.">
          <ColorPicker format="hex" showText />
        </Form.Item>

        <Form.Item name="ordem" label="Ordem" extra="Menor aparece primeiro.">
          <InputNumber min={0} style={{ width: 120 }} />
        </Form.Item>
      </ModalRecurso>
    </>
  );
}
