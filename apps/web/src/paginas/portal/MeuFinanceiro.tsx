import { useState } from 'react';
import { App, Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Table, Tag, Typography } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi } from '@/api/hooks';
import { corDeStatus, data, moeda, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import { useAuth } from '@/auth/AuthContext';
import type { MetodoSaque, Saque } from '@/api/tipos';
import { marca } from '@/marca';

interface Saldo {
  totalGanho: number;
  comissoesPendentes: number;
  saquesRealizados: number;
  emProcessamento: number;
  disponivelParaSaque: number;
}

export function MeuFinanceiro() {
  const { usuario } = useAuth();
  const { message } = App.useApp();
  const [aberto, setAberto] = useState(false);
  const [form] = Form.useForm<{ valor: number; metodo: MetodoSaque; destino: string }>();

  // rotas do portal: o associado só enxerga o próprio saldo e os próprios saques
  const saldo = useApi<Saldo>(['portal', 'saldo'], '/portal/saldo');
  const saques = useApi<Saque[]>(['portal', 'saques'], '/portal/saques');

  const solicitar = useAcao<{ valor: number; metodo: MetodoSaque; destino: string }, unknown>(
    'post',
    '/financeiro/saques',
    [['portal', 'saldo'], ['portal', 'saques']],
  );

  async function pedirSaque(valores: { valor: number; metodo: MetodoSaque; destino: string }) {
    try {
      await solicitar.mutateAsync(valores);
      message.success('Saque solicitado. Você será avisado quando for processado.');
      setAberto(false);
      form.resetFields();
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  const colunas: ColumnsType<Saque> = [
    { title: 'Data', dataIndex: 'solicitadoEm', render: (v: string) => data(v) },
    {
      title: 'Valor',
      dataIndex: 'valor',
      align: 'right',
      render: (v: number) => <Typography.Text strong>{moeda(v)}</Typography.Text>,
    },
    { title: 'Método', dataIndex: 'metodo', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Destino', dataIndex: 'destino', ellipsis: true },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string, s) => (
        <div>
          <Tag color={corDeStatus(v)}>{rotulo(v)}</Tag>
          {s.motivoRejeicao && (
            <Typography.Text type="danger" style={{ fontSize: 11, display: 'block' }}>
              {s.motivoRejeicao}
            </Typography.Text>
          )}
        </div>
      ),
    },
    { title: 'Conclusão', dataIndex: 'concluidoEm', render: (v: string | null) => data(v) },
  ];

  const s = saldo.data;

  return (
    <Pagina
      titulo="Meu Financeiro"
      descricao="Saldo de comissões e histórico de saques"
      acoes={
        <Button
          type="primary"
          icon={<WalletOutlined />}
          onClick={() => setAberto(true)}
          disabled={!s || s.disponivelParaSaque <= 0}
        >
          Solicitar saque
        </Button>
      }
    >
      <Cartoes
        carregando={saldo.isLoading}
        metricas={[
          { titulo: 'Total ganho', valor: moeda(s?.totalGanho) },
          { titulo: 'Disponível para saque', valor: moeda(s?.disponivelParaSaque), cor: marca.mintLeaf },
          { titulo: 'Saques realizados', valor: moeda(s?.saquesRealizados) },
          { titulo: 'Em processamento', valor: moeda(s?.emProcessamento), cor: '#d48806' },
        ]}
      />

      {s && s.disponivelParaSaque > 0 && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 18 }}
          message={`Você tem ${moeda(s.disponivelParaSaque)} disponível para saque.`}
          description="O valor considera as comissões pagas, menos saques já concluídos e os que estão em andamento."
          action={
            <Button size="small" type="primary" onClick={() => setAberto(true)}>
              Sacar
            </Button>
          }
        />
      )}

      <Card title="Histórico de saques">
        <Estado carregando={saques.isLoading} erro={saques.error} esqueleto>
          <Table<Saque>
            rowKey="id"
            size="middle"
            columns={colunas}
            dataSource={saques.data ?? []}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'Nenhum saque solicitado ainda' }}
          />
        </Estado>
      </Card>

      <Modal
        open={aberto}
        title="Solicitar saque"
        onCancel={() => setAberto(false)}
        onOk={() => form.submit()}
        okText="Solicitar"
        cancelText="Cancelar"
        confirmLoading={solicitar.isPending}
      >
        <Form form={form} layout="vertical" onFinish={pedirSaque} initialValues={{ metodo: 'PIX' }}>
          <Form.Item
            name="valor"
            label="Valor"
            rules={[
              { required: true, message: 'Informe o valor.' },
              {
                type: 'number',
                min: 10,
                max: s?.disponivelParaSaque ?? 0,
                message: `Entre R$ 10,00 e ${moeda(s?.disponivelParaSaque)}.`,
              },
            ]}
          >
            <InputNumber
              min={10}
              max={s?.disponivelParaSaque}
              step={10}
              precision={2}
              style={{ width: '100%' }}
              prefix="R$"
            />
          </Form.Item>
          <Form.Item name="metodo" label="Método" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'PIX', label: 'PIX' },
                { value: 'TED', label: 'TED' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="destino"
            label="Destino"
            rules={[{ required: true, min: 5, message: 'Informe a chave PIX ou os dados bancários.' }]}
          >
            <Input placeholder={usuario?.email ?? 'Chave PIX ou banco · agência · conta'} />
          </Form.Item>
        </Form>
      </Modal>
    </Pagina>
  );
}
