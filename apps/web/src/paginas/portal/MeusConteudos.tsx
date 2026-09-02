import { useState } from 'react';
import { App, Card, Col, Input, Row, Select, Space, Tag, Typography } from 'antd';
import { EyeOutlined, HeartFilled, HeartOutlined, LockOutlined, SearchOutlined } from '@ant-design/icons';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useLista } from '@/api/hooks';
import { corDeStatus, numero, rotulo } from '@/api/formato';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { Conteudo, TipoConteudo } from '@/api/tipos';

const COR_TIPO: Record<string, string> = {
  ARTIGO: 'blue', VIDEO: 'red', PODCAST: 'purple', CURSO: 'green', EBOOK: 'orange',
};

export function MeusConteudos() {
  const { message } = App.useApp();
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState<TipoConteudo>();

  const consulta = useLista<Conteudo>(['conteudos', 'portal', { busca, tipo }], '/conteudos', {
    limit: 60,
    search: busca || undefined,
    tipo,
  });

  const curtir = useAcao<{ id: string }, { curtido: boolean }>(
    'post',
    (e) => `/conteudos/${e.id}/curtir`,
    [['conteudos']],
  );

  return (
    <Pagina
      titulo="Conteúdos"
      descricao="Material educativo liberado pelo seu plano"
      acoes={
        <Space>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Buscar…"
            style={{ width: 220 }}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Todos os tipos"
            style={{ width: 160 }}
            value={tipo}
            onChange={setTipo}
            options={[
              { value: 'ARTIGO', label: 'Artigo' },
              { value: 'VIDEO', label: 'Vídeo' },
              { value: 'PODCAST', label: 'Podcast' },
              { value: 'CURSO', label: 'Curso' },
              { value: 'EBOOK', label: 'E-book' },
            ]}
          />
        </Space>
      }
    >
      <Estado
        carregando={consulta.isLoading}
        erro={consulta.error}
        esqueleto
        vazio={consulta.data?.data.length === 0}
        mensagemVazio="Nenhum conteúdo encontrado"
      >
        <Row gutter={[14, 14]}>
          {(consulta.data?.data ?? []).map((c) => (
            <Col key={c.id} xs={24} sm={12} lg={8} xl={6}>
              <Card
                size="small"
                style={{ height: '100%', opacity: c.bloqueado ? 0.6 : 1 }}
                actions={
                  c.bloqueado
                    ? [
                        <Typography.Text key="b" type="secondary" style={{ fontSize: 12 }}>
                          <LockOutlined /> Requer {c.planoMinimo.nome}
                        </Typography.Text>,
                      ]
                    : [
                        <Space key="v" size={4}>
                          <EyeOutlined /> {numero(c.visualizacoes)}
                        </Space>,
                        <Space
                          key="c"
                          size={4}
                          style={{ cursor: 'pointer' }}
                          onClick={async () => {
                            try {
                              const r = await curtir.mutateAsync({ id: c.id });
                              message.success(r.curtido ? 'Curtido!' : 'Curtida removida.');
                            } catch (e) {
                              message.error(mensagemDeErro(e));
                            }
                          }}
                        >
                          {c.curtidas > 0 ? <HeartFilled style={{ color: '#eb2f96' }} /> : <HeartOutlined />}{' '}
                          {numero(c.curtidas)}
                        </Space>,
                      ]
                }
              >
                <Space wrap size={4} style={{ marginBottom: 8 }}>
                  <Tag color={COR_TIPO[c.tipo]}>{rotulo(c.tipo)}</Tag>
                  {c.planoMinimo.nivel !== 'BASICO' && (
                    <Tag color={corDeStatus(c.planoMinimo.nivel)}>{c.planoMinimo.nome}</Tag>
                  )}
                </Space>
                <Typography.Text strong style={{ display: 'block', minHeight: 42 }}>
                  {c.titulo}
                </Typography.Text>
                <Typography.Paragraph
                  type="secondary"
                  style={{ fontSize: 12, minHeight: 36, marginBottom: 4 }}
                  ellipsis={{ rows: 2 }}
                >
                  {c.descricao}
                </Typography.Paragraph>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {c.autor ?? '—'}
                </Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Estado>
    </Pagina>
  );
}
