import { App, Button, Card, Col, Empty, Input, Row, Space, Statistic, Tabs, Tag, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi, useLista } from '@/api/hooks';
import { moeda, numero, percentual } from '@/api/formato';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { Produto } from '@/api/tipos';
import { marca } from '@/marca';

interface Loja {
  id: string;
  nome: string;
  slug: string;
  ativa: boolean;
  produtos: (Produto & { destaque: boolean })[];
  desempenho: { vendasAprovadas: number; receita: number; visualizacoes: number; conversao: number };
  associado: { plano: { nome: string; limiteProdutos: number } };
}

export function MinhaLoja() {
  const { message } = App.useApp();
  const [busca, setBusca] = useState('');
  const loja = useApi<Loja>(['portal', 'loja'], '/portal/loja');
  const marketplace = useLista<Produto>(['catalogo', 'produtos', 'portal'], '/catalogo/produtos', {
    limit: 50,
    status: 'ATIVO',
    search: busca || undefined,
  });

  const adicionar = useAcao<{ produtoId: string }, unknown>(
    'post',
    (e) => `/portal/loja/produtos/${e.produtoId}`,
    [['portal', 'loja'], ['portal', 'painel']],
  );
  const remover = useAcao<{ produtoId: string }, unknown>(
    'delete',
    (e) => `/portal/loja/produtos/${e.produtoId}`,
    [['portal', 'loja'], ['portal', 'painel']],
  );

  const l = loja.data;
  const naLoja = new Set((l?.produtos ?? []).map((p) => p.id));

  async function alternar(p: Produto) {
    try {
      if (naLoja.has(p.id)) {
        await remover.mutateAsync({ produtoId: p.id });
        message.success(`"${p.nome}" removido da sua loja.`);
      } else {
        await adicionar.mutateAsync({ produtoId: p.id });
        message.success(`"${p.nome}" adicionado à sua loja.`);
      }
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  function cartaoProduto(p: Produto, naVitrine: boolean) {
    return (
      <Col key={p.id} xs={24} sm={12} lg={8} xl={6}>
        <Card
          size="small"
          style={{ height: '100%', opacity: p.bloqueado ? 0.62 : 1 }}
          actions={[
            p.bloqueado ? (
              <Typography.Text key="b" type="secondary" style={{ fontSize: 12 }}>
                Requer {p.planoMinimo?.nome}
              </Typography.Text>
            ) : (
              <Button
                key="a"
                type="link"
                danger={naVitrine}
                icon={naVitrine ? <DeleteOutlined /> : <PlusOutlined />}
                onClick={() => alternar(p)}
              >
                {naVitrine ? 'Remover' : 'Adicionar'}
              </Button>
            ),
          ]}
        >
          <Space wrap size={4} style={{ marginBottom: 8 }}>
            <Tag color={p.categoria.cor ?? 'blue'} style={{ fontSize: 11 }}>
              {p.categoria.nome}
            </Tag>
            {naVitrine && <Tag color="green">Na sua loja</Tag>}
          </Space>
          <Typography.Text strong style={{ display: 'block', minHeight: 40 }}>
            {p.nome}
          </Typography.Text>
          <Typography.Paragraph
            type="secondary"
            style={{ fontSize: 12, minHeight: 36, marginBottom: 8 }}
            ellipsis={{ rows: 2 }}
          >
            {p.descricao}
          </Typography.Paragraph>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography.Text strong style={{ fontSize: 17, color: marca.digitalBlue }}>
              {moeda(p.preco)}
            </Typography.Text>
            <Tag color="green" style={{ margin: 0 }}>
              {percentual(p.comissaoPct, 0)}
            </Tag>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            Ganho estimado: {moeda(p.ganhoEstimado)}
          </Typography.Text>
        </Card>
      </Col>
    );
  }

  return (
    <Pagina
      titulo="Minha Loja"
      descricao={l ? `${l.nome} · /${l.slug}` : undefined}
      acoes={
        l && (
          <Space>
            <Tag color={l.ativa ? 'green' : 'default'}>{l.ativa ? 'Ativa' : 'Inativa'}</Tag>
            <Button href={`/loja/${l.slug}`} target="_blank">
              Ver como cliente
            </Button>
          </Space>
        )
      }
    >
      <Estado carregando={loja.isLoading} erro={loja.error} esqueleto>
        {l && (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              {[
                {
                  t: 'Na minha loja',
                  v: `${l.produtos.length}${
                    l.associado.plano.limiteProdutos === -1 ? '' : ` / ${l.associado.plano.limiteProdutos}`
                  }`,
                },
                { t: 'Vendas', v: l.desempenho.vendasAprovadas },
                { t: 'Receita', v: moeda(l.desempenho.receita), c: marca.mintLeaf },
                { t: 'Visitas', v: numero(l.desempenho.visualizacoes) },
              ].map((m) => (
                <Col key={m.t} xs={12} lg={6}>
                  <Card size="small">
                    <Statistic title={m.t} value={m.v as string} valueStyle={{ fontSize: 21, color: m.c }} />
                  </Card>
                </Col>
              ))}
            </Row>

            <Tabs
              items={[
                {
                  key: 'minha',
                  label: `Minha Loja (${l.produtos.length})`,
                  children:
                    l.produtos.length === 0 ? (
                      <Empty description="Sua vitrine está vazia — escolha produtos no marketplace." />
                    ) : (
                      <Row gutter={[14, 14]}>{l.produtos.map((p) => cartaoProduto(p, true))}</Row>
                    ),
                },
                {
                  key: 'marketplace',
                  label: `Marketplace (${marketplace.data?.meta.total ?? 0})`,
                  children: (
                    <>
                      <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="Buscar produtos…"
                        style={{ width: 300, marginBottom: 16 }}
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                      />
                      <Estado carregando={marketplace.isLoading} erro={marketplace.error} esqueleto>
                        <Row gutter={[14, 14]}>
                          {(marketplace.data?.data ?? []).map((p) => cartaoProduto(p, naLoja.has(p.id)))}
                        </Row>
                      </Estado>
                    </>
                  ),
                },
              ]}
            />
          </>
        )}
      </Estado>
    </Pagina>
  );
}
