import { useState } from 'react';
import { Button, Form, Input, Switch, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useApi } from '@/api/hooks';
import { AcoesLinha } from '@/componentes/AcoesLinha';
import { Cartoes } from '@/componentes/Cartoes';
import { ModalRecurso } from '@/componentes/ModalRecurso';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { Parceiro } from '@/api/tipos';

interface Estatisticas {
  parceiros: { total: number; ativos: number };
  beneficios: { total: number; ativos: number };
  maisUtilizados: { id: string; nome: string; valorLabel: string | null; utilizacoes: number }[];
}

/** O mesmo formato que a API valida em @Matches. */
const MASCARA_CNPJ = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

const CHAVES = [['parceiros']];

export function Parceiros() {
  const stats = useApi<Estatisticas>(['parceiros', 'estatisticas'], '/parceiros/estatisticas');
  const [aberto, setAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Parceiro | null>(null);

  function abrir(p: Parceiro | null) {
    setEmEdicao(p);
    setAberto(true);
  }

  const colunas: ColumnsType<Parceiro> = [
    {
      title: 'Parceiro',
      dataIndex: 'nome',
      sorter: true,
      render: (v: string, p) => (
        <div>
          <Typography.Text strong style={{ display: 'block' }}>{v}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.segmento ?? '—'}</Typography.Text>
        </div>
      ),
    },
    { title: 'CNPJ', dataIndex: 'cnpj', render: (v) => v ?? '—' },
    { title: 'Email', dataIndex: 'email', render: (v) => v ?? '—' },
    {
      title: 'Benefícios',
      dataIndex: 'totalBeneficios',
      align: 'center',
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'ativo',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Ativo' : 'Inativo'}</Tag>,
    },
    {
      title: '',
      key: 'acoes',
      align: 'right',
      width: 90,
      render: (_, p) => (
        <AcoesLinha
          base="/parceiros"
          id={p.id}
          nome={p.nome}
          invalidar={CHAVES}
          aoEditar={() => abrir(p)}
          aviso={
            p.totalBeneficios
              ? `Este parceiro tem ${p.totalBeneficios} benefício(s) vinculado(s).`
              : undefined
          }
        />
      ),
    },
  ];

  const s = stats.data;

  return (
    <Pagina titulo="Parceiros" descricao="Empresas conveniadas que oferecem benefícios">
      <Cartoes
        carregando={stats.isLoading}
        colunas={3}
        metricas={[
          { titulo: 'Parceiros ativos', valor: s?.parceiros.ativos ?? 0, detalhe: `de ${s?.parceiros.total ?? 0}` },
          { titulo: 'Benefícios ativos', valor: s?.beneficios.ativos ?? 0, detalhe: `de ${s?.beneficios.total ?? 0}` },
          {
            titulo: 'Mais utilizado',
            valor: s?.maisUtilizados[0]?.utilizacoes ?? 0,
            detalhe: s?.maisUtilizados[0]?.nome,
          },
        ]}
      />

      <TabelaRecurso<Parceiro>
        titulo="Parceiros"
        chave={['parceiros']}
        url="/parceiros"
        colunas={colunas}
        placeholderBusca="Buscar por nome, segmento, email ou CNPJ…"
        acoes={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => abrir(null)}>
            Novo parceiro
          </Button>
        }
      />

      <ModalRecurso<Parceiro>
        aberto={aberto}
        registro={emEdicao}
        aoFechar={() => setAberto(false)}
        recurso="parceiro"
        base="/parceiros"
        invalidar={CHAVES}
        iniciais={{ ativo: true }}
      >
        <Form.Item name="nome" label="Nome" rules={[{ required: true, min: 2, message: 'Informe o nome.' }]}>
          <Input placeholder="Canva Pro" autoFocus />
        </Form.Item>

        <Form.Item name="segmento" label="Segmento">
          <Input placeholder="Design & Criação" />
        </Form.Item>

        <Form.Item
          name="cnpj"
          label="CNPJ"
          rules={[{ pattern: MASCARA_CNPJ, message: 'Use o formato 00.000.000/0000-00.' }]}
        >
          <Input placeholder="12.345.678/0001-01" />
        </Form.Item>

        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email inválido.' }]}>
          <Input placeholder="parcerias@empresa.com" />
        </Form.Item>

        <Form.Item name="telefone" label="Telefone">
          <Input placeholder="(11) 90000-0000" />
        </Form.Item>

        <Form.Item name="site" label="Site" rules={[{ type: 'url', message: 'Endereço inválido.' }]}>
          <Input placeholder="https://empresa.com" />
        </Form.Item>

        <Form.Item name="logoUrl" label="Logo" rules={[{ type: 'url', message: 'Endereço inválido.' }]}>
          <Input placeholder="https://empresa.com/logo.png" />
        </Form.Item>

        <Form.Item name="ativo" label="Ativo" valuePropName="checked">
          <Switch />
        </Form.Item>
      </ModalRecurso>
    </Pagina>
  );
}
