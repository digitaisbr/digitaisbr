import { useState } from 'react';
import { App, Alert, Button, Input, Modal, Space, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao } from '@/api/hooks';
import type { Parceiro } from '@/api/tipos';

interface Resposta {
  nome: string;
  webhookSecret: string;
  url: string;
}

interface Props {
  aberto: boolean;
  parceiro: Parceiro | null;
  aoFechar: () => void;
}

/**
 * Gera o segredo de webhook do parceiro e mostra os dados da integração.
 *
 * O segredo é exibido uma vez só — depois disso vive apenas no banco. Por isso
 * a janela não fecha sozinha após gerar: quem operou precisa copiar antes.
 */
export function SegredoParceiro({ aberto, parceiro, aoFechar }: Props) {
  const { message } = App.useApp();
  const [resposta, setResposta] = useState<Resposta | null>(null);

  const gerar = useAcao<Record<string, never>, Resposta>(
    'post',
    () => `/integracoes/parceiros/${parceiro?.id}/segredo`,
    [['parceiros']],
  );

  const enderecoCompleto = resposta ? `${window.location.origin}${resposta.url}` : '';

  async function gerarSegredo() {
    try {
      setResposta(await gerar.mutateAsync({}));
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  async function copiar(texto: string, oque: string) {
    try {
      await navigator.clipboard.writeText(texto);
      message.success(`${oque} copiado.`);
    } catch {
      // navegador sem permissão de área de transferência: o campo é selecionável
      message.warning('Não foi possível copiar. Selecione o texto e copie à mão.');
    }
  }

  function fechar() {
    setResposta(null);
    aoFechar();
  }

  return (
    <Modal
      open={aberto}
      title={`Integração · ${parceiro?.nome ?? ''}`}
      onCancel={fechar}
      footer={
        resposta ? (
          <Button type="primary" onClick={fechar}>
            Já copiei, fechar
          </Button>
        ) : (
          <Space>
            <Button onClick={fechar}>Cancelar</Button>
            <Button type="primary" danger loading={gerar.isPending} onClick={gerarSegredo}>
              Gerar segredo
            </Button>
          </Space>
        )
      }
      width={620}
    >
      {!resposta ? (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            O segredo permite que <strong>{parceiro?.nome}</strong> avise a plataforma quando uma
            venda for aprovada, reembolsada ou cancelada. A venda e a comissão passam a aparecer
            sozinhas, sem lançamento manual.
          </Typography.Paragraph>

          <Alert
            type="warning"
            showIcon
            message="Gerar um segredo novo invalida o anterior na hora"
            description={
              'Se este parceiro já está integrado, as vendas param de chegar até que a equipe ' +
              'técnica dele atualize o segredo. Avise antes de gerar.'
            }
          />
        </Space>
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="error"
            showIcon
            message="Copie o segredo agora"
            description="Ele não será exibido de novo. Se perder, terá de gerar outro."
          />

          <div>
            <Typography.Text strong>Endereço para onde o parceiro envia</Typography.Text>
            <Input
              readOnly
              value={enderecoCompleto}
              addonAfter={
                <CopyOutlined onClick={() => copiar(enderecoCompleto, 'Endereço')} />
              }
            />
          </div>

          <div>
            <Typography.Text strong>Segredo</Typography.Text>
            <Input.TextArea
              readOnly
              value={resposta.webhookSecret}
              autoSize
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <Button
              size="small"
              icon={<CopyOutlined />}
              style={{ marginTop: 6 }}
              onClick={() => copiar(resposta.webhookSecret, 'Segredo')}
            >
              Copiar segredo
            </Button>
          </div>

          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
            Repasse os dois à equipe técnica do parceiro. Cada aviso deve trazer o cabeçalho
            <Typography.Text code>x-digitaisbr-assinatura</Typography.Text> com
            <Typography.Text code>sha256=</Typography.Text> seguido do HMAC-SHA256 do corpo da
            requisição, assinado com este segredo.
          </Typography.Paragraph>
        </Space>
      )}
    </Modal>
  );
}
