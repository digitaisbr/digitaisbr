import { useState } from 'react';
import { Button, Form, Input, Select, Tag, Typography } from 'antd';
import { EyeOutlined, HeartOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useApi } from '@/api/hooks';
import { corDeStatus, data, numero, rotulo } from '@/api/formato';
import { AcoesLinha } from '@/componentes/AcoesLinha';
import { Cartoes } from '@/componentes/Cartoes';
import { ModalRecurso } from '@/componentes/ModalRecurso';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { Conteudo } from '@/api/tipos';
import { marca } from '@/marca';

const TIPOS = [
  { value: 'ARTIGO', label: 'Artigo' },
  { value: 'VIDEO', label: 'Vídeo' },
  { value: 'PODCAST', label: 'Podcast' },
  { value: 'CURSO', label: 'Curso' },
  { value: 'EBOOK', label: 'E-book' },
];

const SITUACOES = [
  { value: 'PUBLICADO', label: 'Publicado' },
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'ARQUIVADO', label: 'Arquivado' },
];

const PLANOS = [
  { value: 'BASICO', label: 'Básico' },
  { value: 'INTERMEDIARIO', label: 'Intermediário' },
  { value: 'AVANCADO', label: 'Avançado' },
];

const CHAVES = [['conteudos']];

interface Estatisticas {
  total: number;
  publicados: number;
  rascunhos: number;
  totalVisualizacoes: number;
  totalCurtidas: number;
  porTipo: Record<string, number>;
}

export function Conteudos() {
  const stats = useApi<Estatisticas>(['conteudos', 'estatisticas'], '/conteudos/estatisticas');
  const [aberto, setAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Conteudo | null>(null);

  function abrir(c: Conteudo | null) {
    setEmEdicao(c);
    setAberto(true);
  }

  const colunas: ColumnsType<Conteudo> = [
    {
      title: 'Título',
      dataIndex: 'titulo',
      sorter: true,
      render: (v: string, c) => (
        <div style={{ maxWidth: 380 }}>
          <Typography.Text strong style={{ display: 'block' }}>{v}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {c.descricao ?? '—'}
          </Typography.Text>
        </div>
      ),
    },
    { title: 'Tipo', dataIndex: 'tipo', render: (v: string) => <Tag color="blue">{rotulo(v)}</Tag> },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={corDeStatus(v)}>{rotulo(v)}</Tag>,
    },
    {
      title: 'Plano mínimo',
      dataIndex: ['planoMinimo', 'nome'],
      render: (v: string, c) => <Tag color={corDeStatus(c.planoMinimo.nivel)}>{v}</Tag>,
    },
    { title: 'Autor', dataIndex: 'autor', render: (v) => v ?? '—' },
    {
      title: 'Views',
      dataIndex: 'visualizacoes',
      sorter: true,
      align: 'right',
      render: (v: number) => (
        <Typography.Text>
          <EyeOutlined style={{ marginRight: 4, color: '#8c94a3' }} />
          {numero(v)}
        </Typography.Text>
      ),
    },
    {
      title: 'Curtidas',
      dataIndex: 'curtidas',
      sorter: true,
      align: 'right',
      render: (v: number) => (
        <Typography.Text>
          <HeartOutlined style={{ marginRight: 4, color: '#eb2f96' }} />
          {numero(v)}
        </Typography.Text>
      ),
    },
    { title: 'Publicado', dataIndex: 'publicadoEm', render: (v: string | null) => data(v) },
    {
      title: '',
      key: 'acoes',
      align: 'right',
      width: 90,
      render: (_, c) => (
        <AcoesLinha
          base="/conteudos"
          id={c.id}
          nome={c.titulo}
          invalidar={CHAVES}
          aoEditar={() => abrir(c)}
        />
      ),
    },
  ];

  const s = stats.data;

  return (
    <Pagina titulo="Conteúdos" descricao="Material educativo para os associados">
      <Cartoes
        carregando={stats.isLoading}
        metricas={[
          { titulo: 'Publicados', valor: s?.publicados ?? 0, cor: marca.mintLeaf },
          { titulo: 'Rascunhos', valor: s?.rascunhos ?? 0 },
          { titulo: 'Visualizações', valor: numero(s?.totalVisualizacoes) },
          { titulo: 'Curtidas', valor: numero(s?.totalCurtidas), cor: '#eb2f96' },
        ]}
      />

      <TabelaRecurso<Conteudo>
        titulo="Conteúdos"
        chave={['conteudos']}
        url="/conteudos"
        colunas={colunas}
        placeholderBusca="Buscar por título, descrição ou autor…"
        acoes={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => abrir(null)}>
            Novo conteúdo
          </Button>
        }
        filtros={[
          {
            campo: 'tipo',
            rotulo: 'Tipo',
            opcoes: TIPOS.map((t) => ({ valor: t.value, rotulo: t.label })),
          },
          {
            campo: 'status',
            rotulo: 'Status',
            opcoes: SITUACOES.map((o) => ({ valor: o.value, rotulo: o.label })),
          },
        ]}
      />

      <ModalRecurso<Conteudo>
        aberto={aberto}
        registro={emEdicao}
        aoFechar={() => setAberto(false)}
        recurso="conteúdo"
        base="/conteudos"
        invalidar={CHAVES}
        iniciais={{ tipo: 'ARTIGO', status: 'RASCUNHO', planoMinimo: 'BASICO' }}
        // a listagem devolve o plano como objeto; o DTO espera o nível
        paraFormulario={(c) => ({ ...c, planoMinimo: c.planoMinimo.nivel })}
      >
        <Form.Item name="titulo" label="Título" rules={[{ required: true, min: 3, message: 'Informe o título.' }]}>
          <Input placeholder="Como precificar seu infoproduto" autoFocus />
        </Form.Item>

        <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
          <Select options={TIPOS} />
        </Form.Item>

        <Form.Item
          name="planoMinimo"
          label="Plano mínimo"
          rules={[{ required: true }]}
          extra="Associados em planos abaixo deste não enxergam o conteúdo."
        >
          <Select options={PLANOS} />
        </Form.Item>

        <Form.Item name="status" label="Situação">
          <Select options={SITUACOES} />
        </Form.Item>

        <Form.Item name="autor" label="Autor">
          <Input placeholder="Nome de quem escreveu" />
        </Form.Item>

        <Form.Item name="descricao" label="Resumo">
          <Input.TextArea rows={2} placeholder="Uma linha sobre o conteúdo." />
        </Form.Item>

        <Form.Item name="corpo" label="Conteúdo">
          <Input.TextArea rows={5} placeholder="O texto, ou o endereço do vídeo/áudio." />
        </Form.Item>

        <Form.Item name="capaUrl" label="Capa" rules={[{ type: 'url', message: 'Endereço inválido.' }]}>
          <Input placeholder="https://…/capa.png" />
        </Form.Item>
      </ModalRecurso>
    </Pagina>
  );
}
