import { Link, useParams } from 'react-router-dom';
import { Avatar, Button, Card, Layout, Result, Space, Statistic, Tag, Typography } from 'antd';
import { MailOutlined, PhoneOutlined, ShopOutlined } from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { compacto, percentual } from '@/api/formato';
import { Estado } from '@/componentes/Estado';
import { Logo } from '@/componentes/Logo';
import { corDoPlano, gradienteEscuro } from '@/marca';
import type { NivelPlano } from '@/api/tipos';

interface Perfil {
  id: string;
  nome: string;
  handle: string;
  email: string | null;
  telefone: string | null;
  bio: string | null;
  nicho: string | null;
  seguidores: number;
  engajamento: number;
  plano: { nivel: NivelPlano; nome: string };
  loja: { nome: string; slug: string; ativa: boolean } | null;
  redesSociais: { rede: string; handle: string | null; seguidores: number }[];
}

/** Perfil público do criador — respeita as preferências de privacidade. */
export function PerfilPublico() {
  const { handle = '' } = useParams();
  const consulta = useApi<Perfil>(['perfil', handle], `/associados/perfil/${handle}`, undefined, {
    retry: false,
  });

  const p = consulta.data;

  if (consulta.isError) {
    return (
      <Result status="404" title="Perfil não encontrado" subTitle="Este criador não existe." style={{ paddingTop: 80 }} />
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: gradienteEscuro }}>
      <Layout.Content
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <Estado carregando={consulta.isLoading} esqueleto>
          {p && (
            <Card style={{ width: 460, textAlign: 'center' }} styles={{ body: { padding: 32 } }}>
              <Avatar size={88} style={{ background: corDoPlano[p.plano.nivel], fontSize: 34 }}>
                {p.nome[0]}
              </Avatar>
              <Typography.Title level={3} style={{ margin: '14px 0 2px' }}>
                {p.nome}
              </Typography.Title>
              <Typography.Text type="secondary">@{p.handle}</Typography.Text>

              <Space wrap size={6} style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                <Tag color={corDoPlano[p.plano.nivel]}>{p.plano.nome}</Tag>
                {p.nicho && <Tag>{p.nicho}</Tag>}
              </Space>

              {p.bio && <Typography.Paragraph type="secondary">{p.bio}</Typography.Paragraph>}

              <Space size={36} style={{ margin: '10px 0 20px' }}>
                <Statistic
                  title="Seguidores"
                  value={compacto(p.seguidores)}
                  valueStyle={{ fontSize: 20 }}
                />
                <Statistic
                  title="Engajamento"
                  value={percentual(p.engajamento)}
                  valueStyle={{ fontSize: 20 }}
                />
              </Space>

              {p.redesSociais.length > 0 && (
                <Space wrap size={6} style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                  {p.redesSociais.map((r) => (
                    <Tag key={r.rede} color="blue">
                      {r.handle ?? r.rede}
                    </Tag>
                  ))}
                </Space>
              )}

              {p.loja?.ativa && (
                <Link to={`/loja/${p.loja.slug}`}>
                  <Button type="primary" size="large" icon={<ShopOutlined />} block>
                    Visitar minha loja
                  </Button>
                </Link>
              )}

              {(p.email || p.telefone) && (
                <Space direction="vertical" size={4} style={{ marginTop: 16 }}>
                  {p.email && (
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      <MailOutlined /> {p.email}
                    </Typography.Text>
                  )}
                  {p.telefone && (
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      <PhoneOutlined /> {p.telefone}
                    </Typography.Text>
                  )}
                </Space>
              )}

              <div style={{ marginTop: 26, display: 'flex', justifyContent: 'center' }}>
                <Logo altura={22} />
              </div>
            </Card>
          )}
        </Estado>
      </Layout.Content>
    </Layout>
  );
}
