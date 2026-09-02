import { useState } from 'react';
import { App, Button, Card, Col, Row, Space, Tabs, Tag, Typography } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { mensagemDeErro } from '@/api/cliente';
import { api } from '@/api/cliente';
import { useApi } from '@/api/hooks';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { Material, TipoMaterial } from '@/api/tipos';

interface Resposta {
  materiais: Material[];
  total: number;
  porTipo: Record<string, number>;
}

const COR: Record<string, string> = {
  BANNER: 'blue', STORY: 'purple', POST: 'cyan', VIDEO: 'red', COPY: 'green',
};

export function Materiais() {
  const { message } = App.useApp();
  const [tipo, setTipo] = useState<TipoMaterial | 'TODOS'>('TODOS');
  const consulta = useApi<Resposta>(
    ['portal', 'materiais', tipo],
    '/materiais',
    tipo === 'TODOS' ? undefined : { tipo },
  );

  async function baixar(m: Material) {
    try {
      const { data } = await api.get<{ arquivoUrl: string | null; textoCopy: string | null }>(
        `/materiais/${m.id}/baixar`,
      );
      if (data.textoCopy) {
        await navigator.clipboard.writeText(data.textoCopy);
        message.success('Texto copiado para a área de transferência.');
      } else if (data.arquivoUrl) {
        window.open(data.arquivoUrl, '_blank');
      } else {
        message.info('Este material ainda não tem arquivo publicado.');
      }
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  const r = consulta.data;
  const contagem = r?.porTipo ?? {};

  return (
    <Pagina titulo="Materiais de Divulgação" descricao="Peças prontas para você publicar">
      <Tabs
        activeKey={tipo}
        onChange={(k) => setTipo(k as TipoMaterial | 'TODOS')}
        items={[
          { key: 'TODOS', label: `Todos (${Object.values(contagem).reduce((s, n) => s + n, 0)})` },
          { key: 'BANNER', label: `Banners (${contagem.BANNER ?? 0})` },
          { key: 'STORY', label: `Stories (${contagem.STORY ?? 0})` },
          { key: 'POST', label: `Posts (${contagem.POST ?? 0})` },
          { key: 'VIDEO', label: `Vídeos (${contagem.VIDEO ?? 0})` },
          { key: 'COPY', label: `Copies (${contagem.COPY ?? 0})` },
        ]}
      />

      <Estado
        carregando={consulta.isLoading}
        erro={consulta.error}
        esqueleto
        vazio={r?.materiais.length === 0}
        mensagemVazio="Nenhum material nesta categoria"
      >
        <Row gutter={[14, 14]}>
          {(r?.materiais ?? []).map((m) => (
            <Col key={m.id} xs={24} sm={12} lg={8} xl={6}>
              <Card
                size="small"
                style={{ height: '100%' }}
                cover={
                  <div
                    style={{
                      aspectRatio: '16 / 9',
                      background:
                        m.tipo === 'COPY'
                          ? 'linear-gradient(135deg, #00AD9A, #008EEA)'
                          : 'linear-gradient(135deg, #008EEA, #440099)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '10px 10px 0 0',
                    }}
                  >
                    <Tag style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', border: 'none' }}>
                      {m.dimensao ?? m.tipo}
                    </Tag>
                  </div>
                }
                actions={[
                  <Button
                    key="d"
                    type="link"
                    icon={m.tipo === 'COPY' ? <CopyOutlined /> : <DownloadOutlined />}
                    onClick={() => baixar(m)}
                  >
                    {m.tipo === 'COPY' ? 'Copiar texto' : 'Baixar'}
                  </Button>,
                ]}
              >
                <Space wrap size={4} style={{ marginBottom: 6 }}>
                  <Tag color={COR[m.tipo]} style={{ fontSize: 10 }}>
                    {m.tipo}
                  </Tag>
                  {m.categoria && <Tag style={{ fontSize: 10 }}>{m.categoria}</Tag>}
                </Space>
                <Typography.Text strong style={{ display: 'block' }}>
                  {m.nome}
                </Typography.Text>
                <Typography.Paragraph
                  type="secondary"
                  style={{ fontSize: 12, marginBottom: 0, minHeight: 34 }}
                  ellipsis={{ rows: 2 }}
                >
                  {m.textoCopy ?? m.descricao}
                </Typography.Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </Estado>
    </Pagina>
  );
}
