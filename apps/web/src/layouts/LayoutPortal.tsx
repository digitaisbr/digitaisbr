import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar, Badge, Dropdown, Layout, Menu, Tag, Typography, theme, type MenuProps,
} from 'antd';
import type { ItemType, MenuItemType } from 'antd/es/menu/interface';
import {
  BellOutlined, CustomerServiceOutlined, DashboardOutlined,
  GiftOutlined, LogoutOutlined,
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { Logo } from '@/componentes/Logo';
import { useAuth } from '@/auth/AuthContext';

const { Header, Sider, Content } = Layout;

const ITENS: ItemType<MenuItemType>[] = [
  { key: '/portal', icon: <DashboardOutlined />, label: <Link to="/portal">Início</Link> },
  {
    key: 'vender',
    icon: <ShopOutlined />,
    label: 'Vender',
    children: [
      { key: '/portal/loja', label: <Link to="/portal/loja">Minha Loja</Link> },
      { key: '/portal/vendas', label: <Link to="/portal/vendas">Minhas Vendas</Link> },
      { key: '/portal/links', label: <Link to="/portal/links">Links de Afiliado</Link> },
      { key: '/portal/cupons', label: <Link to="/portal/cupons">Cupons</Link> },
      { key: '/portal/performance', label: <Link to="/portal/performance">Performance</Link> },
    ],
  },
  {
    key: 'crescer',
    icon: <GiftOutlined />,
    label: 'Crescer',
    children: [
      { key: '/portal/beneficios', label: <Link to="/portal/beneficios">Benefícios</Link> },
      { key: '/portal/conteudos', label: <Link to="/portal/conteudos">Conteúdos</Link> },
      { key: '/portal/materiais', label: <Link to="/portal/materiais">Materiais</Link> },
      { key: '/portal/redes-sociais', label: <Link to="/portal/redes-sociais">Redes Sociais</Link> },
      { key: '/portal/ranking', label: <Link to="/portal/ranking">Ranking</Link> },
    ],
  },
  {
    key: 'apoio',
    icon: <CustomerServiceOutlined />,
    label: 'Apoio',
    children: [
      { key: '/portal/comunidade', label: <Link to="/portal/comunidade">Comunidade</Link> },
      { key: '/portal/servicos', label: <Link to="/portal/servicos">Assessoria</Link> },
      { key: '/portal/suporte', label: <Link to="/portal/suporte">Suporte</Link> },
    ],
  },
  {
    key: 'conta',
    icon: <UserOutlined />,
    label: 'Minha conta',
    children: [
      { key: '/portal/financeiro', label: <Link to="/portal/financeiro">Financeiro</Link> },
      { key: '/portal/plano', label: <Link to="/portal/plano">Meu Plano</Link> },
      { key: '/portal/perfil', label: <Link to="/portal/perfil">Meu Perfil</Link> },
    ],
  },
];

export function LayoutPortal() {
  const [recolhido, setRecolhido] = useState(false);
  const local = useLocation();
  const navegar = useNavigate();
  const { usuario, sair, ehAdmin } = useAuth();
  const { token } = theme.useToken();

  const GRUPOS: Record<string, string> = {
    loja: 'vender', vendas: 'vender', links: 'vender', cupons: 'vender', performance: 'vender',
    beneficios: 'crescer', conteudos: 'crescer', materiais: 'crescer',
    'redes-sociais': 'crescer', ranking: 'crescer',
    comunidade: 'apoio', servicos: 'apoio', suporte: 'apoio',
    financeiro: 'conta', plano: 'conta', perfil: 'conta',
  };
  const grupoAberto = GRUPOS[local.pathname.split('/')[2] ?? ''] ?? 'vender';

  const { data: naoLidas } = useApi<{ naoLidas: number }>(
    ['notificacoes', 'resumo'],
    '/notificacoes/resumo',
    undefined,
    { enabled: Boolean(usuario?.associadoId) },
  );

  const menuUsuario: MenuProps['items'] = [
    { key: 'nome', label: usuario?.nome ?? '—', disabled: true },
    { type: 'divider' },
    { key: 'perfil', icon: <UserOutlined />, label: <Link to="/portal/perfil">Meu perfil</Link> },
    {
      key: 'sair',
      icon: <LogoutOutlined />,
      label: 'Sair',
      danger: true,
      onClick: async () => {
        await sair();
        navegar('/login', { replace: true });
      },
    },
  ];

  const selecionado =
    ITENS.map((i) => String(i?.key))
      .filter((k) => k !== '/portal' && local.pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] ?? '/portal';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={recolhido}
        onCollapse={setRecolhido}
        theme="light"
        width={228}
        style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: recolhido ? 'center' : 'flex-start',
            padding: recolhido ? 0 : '0 18px',
          }}
        >
          <Logo variante={recolhido ? 'simbolo' : 'horizontal'} altura={recolhido ? 30 : 30} />
        </div>
        <Menu
          mode="inline"
          items={ITENS}
          selectedKeys={[selecionado]}
          // abre o grupo da tela atual: sem isto, quem chega por link direto vê
          // o menu todo fechado e não encontra onde está
          defaultOpenKeys={[grupoAberto]}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 60,
          }}
        >
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Portal do associado
          </Typography.Text>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {usuario?.plano && (
              <Tag color={usuario.plano === 'AVANCADO' ? 'gold' : usuario.plano === 'INTERMEDIARIO' ? 'purple' : 'blue'}>
                {usuario.plano === 'AVANCADO' ? 'Avançado' : usuario.plano === 'INTERMEDIARIO' ? 'Intermediário' : 'Básico'}
              </Tag>
            )}
            <Link to="/portal/notificacoes">
              <Badge count={naoLidas?.naoLidas ?? 0} size="small" offset={[2, -2]}>
                <BellOutlined style={{ fontSize: 17, color: token.colorTextSecondary }} />
              </Badge>
            </Link>
            {ehAdmin && (
              <Link to="/">
                <Tag color="purple" style={{ cursor: 'pointer', margin: 0 }}>
                  Admin
                </Tag>
              </Link>
            )}
            <Dropdown menu={{ items: menuUsuario }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                <Avatar size={30} style={{ background: token.colorPrimary }}>
                  {usuario?.nome?.[0] ?? '?'}
                </Avatar>
                <Typography.Text style={{ fontSize: 13 }}>{usuario?.nome}</Typography.Text>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ padding: 24, background: token.colorBgLayout }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
