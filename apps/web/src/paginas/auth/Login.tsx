import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Divider, Form, Input, Space, Tag, Typography } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { mensagemDeErro } from '@/api/cliente';
import { useAuth } from '@/auth/AuthContext';
import { Logo } from '@/componentes/Logo';
import { Fundo } from './Fundo';

const DEMO = [
  { rotulo: 'Administrador', email: 'administrador@digitaisbr.com', senha: 'Admin@2026', cor: 'purple' },
  { rotulo: 'Associada', email: 'ana-silva@email.com', senha: 'Assoc@2026', cor: 'blue' },
];

export function Login() {
  const { entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation() as { state?: { de?: string } };
  const [form] = Form.useForm();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function autenticar({ email, senha }: { email: string; senha: string }) {
    setEnviando(true);
    setErro(null);
    try {
      const usuario = await entrar(email, senha);
      const destino = local.state?.de ?? (usuario.role === 'ADMIN' ? '/' : '/portal');
      navegar(destino, { replace: true });
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível entrar.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Fundo>
      <Card style={{ width: 420 }} styles={{ body: { padding: 32 } }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Logo variante="vertical" altura={96} />
          </div>
          <Typography.Title level={4} style={{ margin: '0 0 4px' }}>
            Entrar
          </Typography.Title>
          <Typography.Text type="secondary">Área administrativa e portal do associado</Typography.Text>
        </div>

        {erro && <Alert type="error" showIcon message={erro} style={{ marginBottom: 18 }} />}

        <Form form={form} layout="vertical" onFinish={autenticar} requiredMark={false}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Informe o email.' },
              { type: 'email', message: 'Email inválido.' },
            ]}
          >
            <Input size="large" prefix={<MailOutlined />} placeholder="voce@email.com" autoFocus />
          </Form.Item>

          <Form.Item name="senha" label="Senha" rules={[{ required: true, message: 'Informe a senha.' }]}>
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>

          <Button type="primary" size="large" htmlType="submit" block loading={enviando}>
            Entrar
          </Button>
        </Form>

        <Divider plain style={{ fontSize: 12, color: '#8c8c8c' }}>
          contas de demonstração
        </Divider>

        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {DEMO.map((c) => (
            <Button
              key={c.email}
              block
              onClick={() => form.setFieldsValue({ email: c.email, senha: c.senha })}
              style={{ textAlign: 'left', height: 'auto', padding: '8px 12px' }}
            >
              <Space>
                <Tag color={c.cor} style={{ margin: 0 }}>
                  {c.rotulo}
                </Tag>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {c.email}
                </Typography.Text>
              </Space>
            </Button>
          ))}
        </Space>
      </Card>
    </Fundo>
  );
}
