import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar, Badge, Dropdown, Layout, Menu, Tag, Typography, theme, type MenuProps,
} from 'antd';
import type { ItemType, MenuItemType } from 'antd/es/menu/interface';
import {
  AppstoreOutlined, BankOutlined, BellOutlined, BookOutlined, CustomerServiceOutlined,
  DashboardOutlined, DollarOutlined, FileTextOutlined, GiftOutlined, LineChartOutlined,
  LogoutOutlined, NotificationOutlined, SafetyCertificateOutlined,
  ShoppingCartOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { Logo } from '@/componentes/Logo';
import { useAuth } from '@/auth/AuthContext';

const { Header, Sider, Content } = Layout;

const ITENS: ItemType<MenuItemType>[] = [
  { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Dashboard</Link> },
  {
    key: 'cadastros',
    icon: <TeamOutlined />,
    label: 'Cadastros',
    children: [
      { key: '/associados', label: <Link to="/associados">Associados</Link> },
      { key: '/planos', label: <Link to="/planos">Planos</Link> },
      { key: '/parceiros', label: <Link to="/parceiros">Parceiros</Link> },
    ],
  },
  {
    key: 'comercial',
    icon: <ShoppingCartOutlined />,
    label: 'Comercial',
    children: [
      { key: '/catalogo', label: <Link to="/catalogo">Catálogo</Link> },
      { key: '/lojas', label: <Link to="/lojas">Lojas</Link> },
      { key: '/vendas', label: <Link to="/vendas">Vendas</Link> },
      { key: '/comissoes', label: <Link to="/comissoes">Comissões</Link> },
      { key: '/integracoes', label: <Link to="/integracoes">Integrações</Link> },
    ],
  },
  { key: '/financeiro', icon: <DollarOutlined />, label: <Link to="/financeiro">Financeiro</Link> },
  { key: '/beneficios', icon: <GiftOutlined />, label: <Link to="/beneficios">Benefícios</Link> },
  { key: '/conteudos', icon: <BookOutlined />, label: <Link to="/conteudos">Conteúdos</Link> },
  { key: '/comunidade', icon: <AppstoreOutlined />, label: <Link to="/comunidade">Comunidade</Link> },
  { key: '/servicos', icon: <SafetyCertificateOutlined />, label: <Link to="/servicos">Serviços</Link> },
  { key: '/suporte', icon: <CustomerServiceOutlined />, label: <Link to="/suporte">Suporte</Link> },
  { key: '/comunicacoes', icon: <NotificationOutlined />, label: <Link to="/comunicacoes">Comunicações</Link> },
  { key: '/relatorios', icon: <LineChartOutlined />, label: <Link to="/relatorios">Relatórios</Link> },
];

export function LayoutAdmin() {
  const [recolhido, setRecolhido] = useState(false);
  const local = useLocation();
  const navegar = useNavigate();
  const { usuario, sair } = useAuth();
  const { token } = theme.useToken();

  const { data: resumo } = useApi<{ resumo: { tickets: number } }>(['dashboard', 'admin'], '/dashboard/admin');

  const menuUsuario: MenuProps['items'] = [
    { key: 'nome', label: usuario?.nome ?? '—', disabled: true },
    { type: 'divider' },
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

  // destaca o item mais específico que casa com a rota atual
  const selecionado =
    ITENS.flatMap((i) => (i && 'children' in i && i.children ? i.children : [i]))
      .map((i) => String(i?.key))
      .filter((k) => k !== '/' && local.pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] ?? '/';

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
          defaultOpenKeys={['cadastros', 'comercial']}
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
            Área administrativa
          </Typography.Text>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Link to="/suporte">
              <Badge count={resumo?.resumo.tickets ?? 0} size="small" offset={[2, -2]}>
                <BellOutlined style={{ fontSize: 17, color: token.colorTextSecondary }} />
              </Badge>
            </Link>
            {/* só oferece o portal a quem tem associado vinculado — sem isso
                todas as telas de lá responderiam 403 */}
            {usuario?.associadoId && (
              <Link to="/portal">
                <Tag icon={<UserOutlined />} color="blue" style={{ cursor: 'pointer', margin: 0 }}>
                  Portal
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

        <Layout.Footer style={{ textAlign: 'center', color: token.colorTextTertiary, fontSize: 12 }}>
          <BankOutlined /> DigitaisBR · Associação de Criadores Digitais
          <span style={{ margin: '0 8px' }}>·</span>
          <FileTextOutlined /> API v1.0
        </Layout.Footer>
      </Layout>
    </Layout>
  );
}
