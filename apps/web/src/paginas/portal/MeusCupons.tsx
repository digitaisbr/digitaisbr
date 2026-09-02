import { useState } from 'react';
import { App, Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Switch, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { data, moeda, percentual } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { Cupom } from '@/api/tipos';
import { marca } from '@/marca';

interface Resposta {
  cupons: Cupom[];
  resumo: { total: number; ativos: number; totalUsos: number; descontoMedio: number };
}

interface Formulario {
  codigo: string;
  tipoDesconto: 'PERCENTUAL' | 'VALOR';
  desconto: number;
  compraMinima?: number;
  limiteUsos?: number;
  validoAte?: Dayjs;
}

export function MeusCupons() {
  const { message } = App.useApp();
  const [aberto, setAberto] = useState(false);
  const [form] = Form.useForm<Formulario>();
  const consulta = useApi<Resposta>(['portal', 'cupons'], '/portal/cupons');

  const criar = useAcao<Record<string, unknown>, unknown>('post', '/portal/cupons', [['portal', 'cupons']]);
  const atualizar = useAcao<{ id: string; ativo: boolean }, unknown>(
    'patch',
    (e) => `/portal/cupons/${e.id}`,
    [['portal', 'cupons']],
  );

  const tipo = Form.useWatch('tipoDesconto', form);

  async function salvar(v: Formulario) {
    try {
      await criar.mutateAsync({
        ...v,
        codigo: v.codigo.toUpperCase(),
        validoAte: v.validoAte?.format('YYYY-MM-DD'),
      });
      message.success('Cupom criado.');
      setAberto(false);
      form.resetFields();
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  const colunas: ColumnsType<Cupom> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      render: (v: string) => (
        <Typography.Text copyable strong style={{ letterSpacing: 1 }}>
          {v}
        </Typography.Text>
      ),
    },
    {
      title: 'Desconto',
      dataIndex: 'desconto',
      align: 'right',
      render: (v: number, c) => (c.tipoDesconto === 'PERCENTUAL' ? percentual(v, 0) : moeda(v)),
    },
    {
      title: 'Compra mín.',
      dataIndex: 'compraMinima',
      align: 'right',
      render: (v: number | null) => (v ? moeda(v) : '—'),
    },
    {
      title: 'Usos',
      dataIndex: 'usos',
      align: 'center',
      render: (v: number, c) => `${v}${c.limiteUsos ? ` / ${c.limiteUsos}` : ''}`,
    },
    {
      title: 'Validade',
      dataIndex: 'validoAte',
      render: (v: string | null, c) =>
        c.expirado ? <Tag color="red">Expirado</Tag> : v ? data(v) : <Tag>Sem limite</Tag>,
    },
    {
      title: 'Situação',
      dataIndex: 'ativo',
      render: (v: boolean, c) =>
        c.esgotado ? (
          <Tag color="orange">Esgotado</Tag>
        ) : (
          <Tag color={v ? 'green' : 'default'}>{v ? 'Ativo' : 'Inativo'}</Tag>
        ),
    },
    {
      title: 'Ações',
      key: 'acoes',
      render: (_, c) => (
        <Switch
          size="small"
          checked={c.ativo}
          onChange={async (marcado) => {
            try {
              await atualizar.mutateAsync({ id: c.id, ativo: marcado });
              message.success(marcado ? 'Cupom ativado.' : 'Cupom desativado.');
            } catch (e) {
              message.error(mensagemDeErro(e));
            }
          }}
        />
      ),
    },
  ];

  const r = consulta.data;

  return (
    <Pagina
      titulo="Meus Cupons"
      descricao="Códigos de desconto para divulgar aos seus seguidores"
      acoes={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAberto(true)}>
          Criar cupom
        </Button>
      }
    >
      <Cartoes
        carregando={consulta.isLoading}
        metricas={[
          { titulo: 'Cupons ativos', valor: r?.resumo.ativos ?? 0, cor: marca.mintLeaf },
          { titulo: 'Total de usos', valor: r?.resumo.totalUsos ?? 0 },
          { titulo: 'Desconto médio', valor: `${r?.resumo.descontoMedio ?? 0}` },
          { titulo: 'Total de cupons', valor: r?.resumo.total ?? 0 },
        ]}
      />

      <Card title="Cupons">
        <Estado carregando={consulta.isLoading} erro={consulta.error} esqueleto>
          <Table<Cupom>
            rowKey="id"
            size="middle"
            columns={colunas}
            dataSource={r?.cupons ?? []}
            pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'Nenhum cupom criado ainda' }}
          />
        </Estado>
      </Card>

      <Modal
        open={aberto}
        title="Criar cupom"
        onCancel={() => setAberto(false)}
        onOk={() => form.submit()}
        okText="Criar"
        cancelText="Cancelar"
        confirmLoading={criar.isPending}
      >
        <Form form={form} layout="vertical" onFinish={salvar} initialValues={{ tipoDesconto: 'PERCENTUAL' }}>
          <Form.Item
            name="codigo"
            label="Código"
            rules={[
              { required: true, message: 'Informe o código.' },
              { pattern: /^[A-Za-z0-9]{3,20}$/, message: 'Use 3 a 20 letras ou números.' },
            ]}
          >
            <Input placeholder="MEUCUPOM10" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item name="tipoDesconto" label="Tipo de desconto">
            <Select
              options={[
                { value: 'PERCENTUAL', label: 'Percentual (%)' },
                { value: 'VALOR', label: 'Valor fixo (R$)' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="desconto"
            label={tipo === 'VALOR' ? 'Desconto (R$)' : 'Desconto (%)'}
            rules={[{ required: true, message: 'Informe o desconto.' }]}
          >
            <InputNumber
              min={0}
              max={tipo === 'VALOR' ? undefined : 100}
              step={tipo === 'VALOR' ? 5 : 1}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="compraMinima" label="Compra mínima (R$)">
            <InputNumber min={0} step={10} style={{ width: '100%' }} placeholder="Sem mínimo" />
          </Form.Item>
          <Form.Item name="limiteUsos" label="Limite de usos">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Ilimitado" />
          </Form.Item>
          <Form.Item name="validoAte" label="Válido até">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Sem prazo" />
          </Form.Item>
        </Form>
      </Modal>
    </Pagina>
  );
}
