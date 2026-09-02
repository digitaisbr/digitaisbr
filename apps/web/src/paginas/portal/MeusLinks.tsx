import { useState } from 'react';
import { App, Button, Card, Modal, Select, Table, Typography } from 'antd';
import { LinkOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi, useLista } from '@/api/hooks';
import { moeda, numero, percentual } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { LinkAfiliado, Produto } from '@/api/tipos';
import { marca } from '@/marca';

interface Resposta {
  links: LinkAfiliado[];
  resumo: {
    ativos: number;
    cliques: number;
    conversoes: number;
    taxaMedia: number;
    receita: number;
    comissao: number;
  };
}

export function MeusLinks() {
  const { message } = App.useApp();
  const [aberto, setAberto] = useState(false);
  const [produtoId, setProdutoId] = useState<string>();

  const consulta = useApi<Resposta>(['portal', 'links'], '/portal/links');
  const produtos = useLista<Produto>(['catalogo', 'produtos', 'links'], '/catalogo/produtos', {
    limit: 100,
    status: 'ATIVO',
    apenasDisponiveis: true,
  });

  const gerar = useAcao<{ produtoId: string }, unknown>('post', '/portal/links', [['portal', 'links']]);

  async function criar() {
    if (!produtoId) return;
    try {
      await gerar.mutateAsync({ produtoId });
      message.success('Link gerado.');
      setAberto(false);
      setProdutoId(undefined);
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  const colunas: ColumnsType<LinkAfiliado> = [
    { title: 'Produto', dataIndex: ['produto', 'nome'] },
    {
      title: 'Link',
      dataIndex: 'codigo',
      render: (v: string) => (
        <Typography.Text copyable={{ text: `${location.origin}/api/portal/r/${v}` }} code>
          {v}
        </Typography.Text>
      ),
    },
    { title: 'Cliques', dataIndex: 'cliques', sorter: true, align: 'right', render: (v: number) => numero(v) },
    { title: 'Conversões', dataIndex: 'conversoes', align: 'right' },
    {
      title: 'Taxa',
      dataIndex: 'taxaConversao',
      align: 'right',
      render: (v: number) => percentual(v),
    },
    { title: 'Receita', dataIndex: 'receita', align: 'right', render: (v: number) => moeda(v) },
    {
      title: 'Comissão',
      dataIndex: 'comissao',
      align: 'right',
      render: (v: number) => (
        <Typography.Text strong style={{ color: marca.mintLeaf }}>
          {moeda(v)}
        </Typography.Text>
      ),
    },
  ];

  const r = consulta.data;
  const jaTem = new Set((r?.links ?? []).map((l) => l.produto.id));

  return (
    <Pagina
      titulo="Links de Afiliado"
      descricao="Links rastreáveis para divulgar produtos"
      acoes={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAberto(true)}>
          Gerar link
        </Button>
      }
    >
      <Cartoes
        carregando={consulta.isLoading}
        colunas={6}
        metricas={[
          { titulo: 'Links ativos', valor: r?.resumo.ativos ?? 0 },
          { titulo: 'Cliques', valor: numero(r?.resumo.cliques) },
          { titulo: 'Conversões', valor: r?.resumo.conversoes ?? 0 },
          { titulo: 'Taxa média', valor: percentual(r?.resumo.taxaMedia) },
          { titulo: 'Receita', valor: moeda(r?.resumo.receita) },
          { titulo: 'Comissão', valor: moeda(r?.resumo.comissao), cor: marca.mintLeaf },
        ]}
      />

      <Card title="Meus links">
        <Estado carregando={consulta.isLoading} erro={consulta.error} esqueleto>
          <Table<LinkAfiliado>
            rowKey="id"
            size="middle"
            columns={colunas}
            dataSource={r?.links ?? []}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'Nenhum link gerado ainda' }}
          />
        </Estado>
      </Card>

      <Modal
        open={aberto}
        title="Gerar link de afiliado"
        onCancel={() => setAberto(false)}
        onOk={criar}
        okText="Gerar"
        cancelText="Cancelar"
        okButtonProps={{ disabled: !produtoId }}
        confirmLoading={gerar.isPending}
      >
        <Typography.Paragraph type="secondary">
          Escolha o produto. O link registra cada clique e alimenta seu relatório de performance.
        </Typography.Paragraph>
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="Selecione o produto"
          value={produtoId}
          onChange={setProdutoId}
          loading={produtos.isLoading}
          optionFilterProp="label"
          options={(produtos.data?.data ?? [])
            .filter((p) => !p.bloqueado && !jaTem.has(p.id))
            .map((p) => ({
              value: p.id,
              label: `${p.nome} — ${moeda(p.preco)} (${percentual(p.comissaoPct, 0)})`,
            }))}
          notFoundContent={<Typography.Text type="secondary">Nada disponível</Typography.Text>}
          suffixIcon={<LinkOutlined />}
        />
      </Modal>
    </Pagina>
  );
}
