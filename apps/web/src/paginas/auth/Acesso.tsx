import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { api, mensagemDeErro } from '@/api/cliente';
import { gate } from '@/auth/GateAcesso';
import { Logo } from '@/componentes/Logo';
import { Fundo } from './Fundo';

/** Gate de código que a plataforma original exigia antes de exibir o login. */
export function Acesso() {
  const navegar = useNavigate();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function validar({ codigo }: { codigo: string }) {
    setEnviando(true);
    setErro(null);
    try {
      const { data } = await api.post<{ valido: boolean }>('/auth/codigo-acesso', { codigo });
      if (!data.valido) {
        setErro('Código de acesso inválido.');
        return;
      }
      gate.liberar();
      navegar('/login', { replace: true });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Fundo>
      <Card style={{ width: 400 }} styles={{ body: { padding: 32 } }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Logo variante="vertical" altura={96} />
          </div>
          <Typography.Text type="secondary">
            Informe o código de acesso da plataforma
          </Typography.Text>
        </div>

        {erro && <Alert type="error" showIcon message={erro} style={{ marginBottom: 18 }} />}

        <Form layout="vertical" onFinish={validar} requiredMark={false}>
          <Form.Item
            name="codigo"
            label="Código de acesso"
            rules={[{ required: true, message: 'Informe o código.' }]}
          >
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="••••••••••••" autoFocus />
          </Form.Item>
          <Button type="primary" size="large" htmlType="submit" block loading={enviando}>
            Continuar
          </Button>
        </Form>
      </Card>
    </Fundo>
  );
}
