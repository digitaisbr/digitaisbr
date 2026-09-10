import { useState } from 'react';
import { Button, Form, Input, Progress, Select, Switch, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useApi } from '@/api/hooks';
import { corDeStatus, numero, rotulo } from '@/api/formato';
import { AcoesLinha } from '@/componentes/AcoesLinha';
import { Cartoes } from '@/componentes/Cartoes';
import { ModalRecurso } from '@/componentes/ModalRecurso';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { Beneficio, Paginado, Parceiro } from '@/api/tipos';

interface Estatisticas {
  beneficios: { total: number; ativos: number };
  porTipo: Record<string, number>;
  maisUtilizados: { id: string; nome: string; utilizacoes: number }[];
}

const TIPOS = [
  { value: 'DESCONTO', label: 'Desconto' },
  { value: 'ACESSO', label: 'Acesso' },
  { value: 'CASHBACK', label: 'Cashback' },
  { value: 'SERVICO', label: 'Serviço' },
];

const PLANOS = [
  { value: 'BASICO', label: 'Básico' },
  { value: 'INTERMEDIARIO', label: 'Intermediário' },
  { value: 'AVANCADO', label: 'Avançado' },
];

// o benefício aparece nas duas telas e nos cartões de parceiros
const CHAVES = [['beneficios'], ['parceiros']];

export function Beneficios() {
  const stats = useApi<Estatisticas>(['parceiros', 'estatisticas'], '/parceiros/estatisticas');
  const maximo = Math.max(...(stats.data?.maisUtilizados ?? []).map((b) => b.utilizacoes), 1);

  const [aberto, setAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Beneficio | null>(null);

  // a lista alimenta o seletor de parceiro; só é buscada quando a janela abre
  const parceiros = useApi<Paginado<Parceiro>>(
    ['parceiros', 'seletor'],
    '/parceiros',
    { limit: 200, ativa: true },
    { enabled: aberto },
  );

  function abrir(b: Beneficio | null) {
    setEmEdicao(b);
    setAberto(true);
  }

  const colunas: ColumnsType<Beneficio> = [
    {
      title: 'Benefício',
      dataIndex: 'nome',
      sorter: true,
      render: (v: string, b) => (
        <div style={{ maxWidth: 360 }}>
          <Typography.Text strong style={{ display: 'block' }}>{v}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {b.descricao ?? '—'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Valor',
      dataIndex: 'valorLabel',
      render: (v: string | null) => (v ? <Tag color="green">{v}</Tag> : '—'),
    },
    { title: 'Parceiro', dataIndex: ['parceiro', 'nome'], render: (v) => v ?? '—' },
    { title: 'Tipo', dataIndex: 'tipo', render: (v: string) => <Tag>{rotulo(v)}</Tag> },
    {
      title: 'Plano mínimo',
      dataIndex: ['planoMinimo', 'nome'],
      render: (v: string, b) => <Tag color={corDeStatus(b.planoMinimo.nivel)}>{v}</Tag>,
    },
    {
      title: 'Utilizações',
      dataIndex: 'utilizacoes',
      sorter: true,
      align: 'right',
      render: (v: number) => (
        <div style={{ minWidth: 110 }}>
          <Typography.Text>{numero(v)}</Typography.Text>
          <Progress percent={Math.round((v / maximo) * 100)} showInfo={false} size="small" />
        </div>
      ),
    },
    {
      title: '',
      key: 'acoes',
      align: 'right',
      width: 90,
      render: (_, b) => (
        <AcoesLinha
          base="/beneficios"
          id={b.id}
          nome={b.nome}
          invalidar={CHAVES}
          aoEditar={() => abrir(b)}
          aviso={b.utilizacoes ? `Já foi resgatado ${b.utilizacoes} vez(es).` : undefined}
        />
      ),
    },
  ];

  const s = stats.data;

  return (
    <Pagina titulo="Benefícios" descricao="Vantagens oferecidas pelos parceiros">
      <Cartoes
        carregando={stats.isLoading}
        metricas={[
          { titulo: 'Total', valor: s?.beneficios.total ?? 0 },
          { titulo: 'Descontos', valor: s?.porTipo.DESCONTO ?? 0 },
          { titulo: 'Acessos', valor: s?.porTipo.ACESSO ?? 0 },
          { titulo: 'Cashback / serviços', valor: (s?.porTipo.CASHBACK ?? 0) + (s?.porTipo.SERVICO ?? 0) },
        ]}
      />

      <TabelaRecurso<Beneficio>
        titulo="Benefícios"
        chave={['beneficios']}
        url="/beneficios"
        colunas={colunas}
        placeholderBusca="Buscar por nome ou descrição…"
        acoes={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => abrir(null)}>
            Novo benefício
          </Button>
        }
        filtros={[
          {
            campo: 'tipo',
            rotulo: 'Tipo',
            opcoes: TIPOS.map((t) => ({ valor: t.value, rotulo: t.label })),
          },
          {
            campo: 'planoMinimo',
            rotulo: 'Plano mínimo',
            largura: 170,
            opcoes: PLANOS.map((p) => ({ valor: p.value, rotulo: p.label })),
          },
        ]}
      />

      <ModalRecurso<Beneficio>
        aberto={aberto}
        registro={emEdicao}
        aoFechar={() => setAberto(false)}
        recurso="benefício"
        base="/beneficios"
        invalidar={CHAVES}
        iniciais={{ ativo: true, tipo: 'DESCONTO', planoMinimo: 'BASICO' }}
        // a listagem devolve objetos aninhados; o DTO espera os identificadores
        paraFormulario={(b) => ({
          ...b,
          parceiroId: b.parceiro?.id,
          planoMinimo: b.planoMinimo.nivel,
        })}
      >
        <Form.Item name="nome" label="Nome" rules={[{ required: true, min: 3, message: 'Informe o nome.' }]}>
          <Input placeholder="50% off Canva Pro Anual" autoFocus />
        </Form.Item>

        <Form.Item name="parceiroId" label="Parceiro">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            loading={parceiros.isLoading}
            placeholder="Selecione o parceiro"
            options={(parceiros.data?.data ?? []).map((p) => ({ value: p.id, label: p.nome }))}
          />
        </Form.Item>

        <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
          <Select options={TIPOS} />
        </Form.Item>

        <Form.Item
          name="planoMinimo"
          label="Plano mínimo"
          rules={[{ required: true }]}
          extra="Associados em planos abaixo deste não enxergam o benefício."
        >
          <Select options={PLANOS} />
        </Form.Item>

        <Form.Item name="valorLabel" label="Valor exibido" extra="Aparece como etiqueta no card.">
          <Input placeholder="50%" />
        </Form.Item>

        <Form.Item name="descricao" label="Descrição">
          <Input.TextArea rows={2} placeholder="O que o associado ganha." />
        </Form.Item>

        <Form.Item name="instrucoes" label="Como resgatar">
          <Input.TextArea rows={2} placeholder="Passo a passo para usar o benefício." />
        </Form.Item>

        <Form.Item name="ativo" label="Ativo" valuePropName="checked">
          <Switch />
        </Form.Item>
      </ModalRecurso>
    </Pagina>
  );
}
