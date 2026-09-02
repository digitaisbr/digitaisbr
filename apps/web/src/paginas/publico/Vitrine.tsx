import { useParams } from 'react-router-dom';
import { Avatar, Button, Card, Col, Divider, Layout, Result, Row, Space, Tag, Typography } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { moeda } from '@/api/formato';
import { Estado } from '@/componentes/Estado';
import { Logo } from '@/componentes/Logo';
import { gradienteMarca, marca } from '@/marca';

interface VitrinePublica {
  nome: string;
  slug: string;
  descricao: string | null;
  corPrimaria: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  associado: { nome: string; handle: string; bio: string | null };
  produtos: {
    id: string;
    nome: string;
    descricao: string | null;
    preco: number;
    imagemUrl: string | null;
    checkoutUrl: string | null;
    categoria: string;
    destaque: boolean;
    /** código de origem; passa pelo redirecionador para atribuir a venda */
    codigoAfiliado: string | null;
  }[];
}

const API = import.meta.env.VITE_API_URL ?? '/api';

/**
 * Destino do botão Comprar.
 *
 * Com código de origem, passa pelo redirecionador da API — é o que registra o
 * clique e anexa o `ref` ao checkout do fornecedor, permitindo atribuir a venda.
 * Sem código (dado legado), cai no checkout direto: a compra funciona, mas fica
 * sem atribuição.
 */
function destinoDaCompra(p: { codigoAfiliado: string | null; checkoutUrl: string | null }): string | undefined {
  if (p.codigoAfiliado) return `${API}/portal/r/${p.codigoAfiliado}`;
  return p.checkoutUrl ?? undefined;
}

/** Página pública da loja do associado — não exige autenticação. */
export function Vitrine() {
  const { slug = '' } = useParams();
  const consulta = useApi<VitrinePublica>(['vitrine', slug], `/lojas/publica/${slug}`, undefined, {
    retry: false,
  });

  const l = consulta.data;
  const cor = l?.corPrimaria ?? marca.digitalBlue;

  // agrupa por categoria, preservando a ordem de destaque vinda da API
  const porCategoria = (l?.produtos ?? []).reduce<Record<string, VitrinePublica['produtos']>>(
    (acc, p) => {
      (acc[p.categoria] ??= []).push(p);
      return acc;
    },
    {},
  );

  if (consulta.isError) {
    return (
      <Result
        status="404"
        title="Loja indisponível"
        subTitle="Esta loja não existe ou está temporariamente fora do ar."
        style={{ paddingTop: 80 }}
      />
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <Estado carregando={consulta.isLoading} esqueleto>
        {l && (
          <>
            <div
              style={{
                background: l.bannerUrl ? `url(${l.bannerUrl}) center/cover` : gradienteMarca,
                padding: '56px 24px',
                textAlign: 'center',
                color: '#fff',
              }}
            >
              <Avatar
                size={76}
                src={l.logoUrl ?? undefined}
                style={{ background: 'rgba(255,255,255,0.2)', fontSize: 30, marginBottom: 14 }}
              >
                {l.nome[0]}
              </Avatar>
              <Typography.Title level={2} style={{ color: '#fff', margin: '0 0 6px' }}>
                {l.nome}
              </Typography.Title>
              <Typography.Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                {l.associado.nome}
              </Typography.Text>
              {l.descricao && (
                <Typography.Paragraph
                  style={{ color: 'rgba(255,255,255,0.8)', maxWidth: 620, margin: '14px auto 0' }}
                >
                  {l.descricao}
                </Typography.Paragraph>
              )}
            </div>

            <Layout.Content style={{ padding: '32px 24px', maxWidth: 1180, margin: '0 auto', width: '100%' }}>
              {Object.entries(porCategoria).map(([categoria, produtos]) => (
                <div key={categoria} style={{ marginBottom: 36 }}>
                  <Typography.Title level={4} style={{ marginBottom: 16 }}>
                    {categoria}
                  </Typography.Title>
                  <Row gutter={[16, 16]}>
                    {produtos.map((p) => (
                      <Col key={p.id} xs={24} sm={12} lg={8} xl={6}>
                        <Card
                          hoverable
                          style={{ height: '100%' }}
                          cover={
                            <div
                              style={{
                                height: 140,
                                background: p.imagemUrl
                                  ? `url(${p.imagemUrl}) center/cover`
                                  : `linear-gradient(135deg, ${cor}22, ${cor}44)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '10px 10px 0 0',
                              }}
                            >
                              {!p.imagemUrl && (
                                <ShoppingCartOutlined style={{ fontSize: 38, color: cor }} />
                              )}
                            </div>
                          }
                          actions={[
                            <Button
                              key="c"
                              type="link"
                              icon={<ShoppingCartOutlined />}
                              /* passa pelo redirecionador: ele registra o clique e leva o
                                 código de origem ao checkout, atribuindo a venda ao associado */
                              href={destinoDaCompra(p)}
                              target="_blank"
                              rel="noopener"
                              disabled={!p.codigoAfiliado && !p.checkoutUrl}
                              style={{ color: cor }}
                            >
                              Comprar
                            </Button>,
                          ]}
                        >
                          {p.destaque && (
                            <Tag color="gold" style={{ marginBottom: 6 }}>
                              Destaque
                            </Tag>
                          )}
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
                          <Typography.Text strong style={{ fontSize: 18, color: cor }}>
                            {moeda(p.preco)}
                          </Typography.Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              ))}

              {l.produtos.length === 0 && (
                <Result title="Vitrine em montagem" subTitle="Esta loja ainda não publicou produtos." />
              )}
            </Layout.Content>

            <Layout.Footer style={{ textAlign: 'center', background: '#fafafa' }}>
              <Divider style={{ margin: '0 0 20px' }} />
              <Space direction="vertical" size={8}>
                <Logo altura={26} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Loja virtual por DigitaisBR — todos os direitos reservados
                </Typography.Text>
              </Space>
            </Layout.Footer>
          </>
        )}
      </Estado>
    </Layout>
  );
}
