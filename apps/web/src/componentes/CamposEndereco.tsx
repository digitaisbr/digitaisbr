import { useState } from 'react';
import { App, Col, Form, Input, Row, Spin, type FormInstance } from 'antd';
import { CampoMascarado } from './CampoMascarado';

interface RespostaCep {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

/**
 * Endereço completo, com preenchimento automático pelo CEP.
 *
 * A consulta usa o ViaCEP, que é público e não exige cadastro. Se ele estiver
 * fora do ar, o cadastro continua: os campos ficam abertos para digitação e
 * nada trava — por isso a falha é avisada, não bloqueia.
 */
export function CamposEndereco({ form }: { form: FormInstance }) {
  const { message } = App.useApp();
  const [buscando, setBuscando] = useState(false);

  async function buscarCep(cep: string) {
    const numeros = cep.replace(/\D/g, '');
    if (numeros.length !== 8) return;

    setBuscando(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${numeros}/json/`);
      const dados = (await resposta.json()) as RespostaCep;

      if (dados.erro) {
        message.warning('CEP não encontrado. Preencha o endereço manualmente.');
        return;
      }

      form.setFieldsValue({
        logradouro: dados.logradouro || undefined,
        bairro: dados.bairro || undefined,
        cidade: dados.localidade || undefined,
        uf: dados.uf || undefined,
      });
      // o número é o único que a consulta nunca traz
      form.getFieldInstance?.('numero')?.focus?.();
    } catch {
      message.warning('Não foi possível consultar o CEP agora. Preencha manualmente.');
    } finally {
      setBuscando(false);
    }
  }

  return (
    <Row gutter={12}>
      <Col xs={24} md={8}>
        <Form.Item
          name="cep"
          label="CEP"
          extra="Preenche o endereço automaticamente."
          rules={[{ pattern: /^\d{5}-\d{3}$/, message: 'Informe os 8 dígitos do CEP.' }]}
        >
          <CampoMascarado
            formato="cep"
            placeholder="00000-000"
            suffix={buscando ? <Spin size="small" /> : null}
            onBlur={(e) => void buscarCep(e.target.value)}
          />
        </Form.Item>
      </Col>

      <Col xs={24} md={12}>
        <Form.Item name="logradouro" label="Logradouro">
          <Input placeholder="Rua, avenida, quadra" />
        </Form.Item>
      </Col>

      <Col xs={24} md={4}>
        <Form.Item name="numero" label="Número">
          <Input placeholder="113" />
        </Form.Item>
      </Col>

      <Col xs={24} md={8}>
        <Form.Item name="complemento" label="Complemento">
          <Input placeholder="Apto, bloco, sala" />
        </Form.Item>
      </Col>

      <Col xs={24} md={8}>
        <Form.Item name="bairro" label="Bairro">
          <Input placeholder="Bairro" />
        </Form.Item>
      </Col>

      <Col xs={24} md={6}>
        <Form.Item name="cidade" label="Cidade">
          <Input placeholder="Cidade" />
        </Form.Item>
      </Col>

      <Col xs={24} md={2}>
        <Form.Item
          name="uf"
          label="UF"
          normalize={(v?: string) => v?.toUpperCase().slice(0, 2)}
        >
          <Input placeholder="SP" maxLength={2} />
        </Form.Item>
      </Col>
    </Row>
  );
}
