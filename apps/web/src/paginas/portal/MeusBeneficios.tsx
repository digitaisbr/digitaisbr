import { App, Button, Card, Col, Row, Space, Tag, Typography } from 'antd';
import { GiftOutlined, LockOutlined } from '@ant-design/icons';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useLista } from '@/api/hooks';
import { corDeStatus, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { Beneficio } from '@/api/tipos';
import { marca } from '@/marca';

export function MeusBeneficios() {
  const { message, modal } = App.useApp();
  const consulta = useLista<Beneficio>(['beneficios', 'portal'], '/beneficios', { limit: 100 });

  const resgatar = useAcao<{ id: string }, { instrucoes: string | null; beneficio: string }>(
    'post',
    (e) => `/beneficios/${e.id}/resgatar`,
    [['beneficios'], ['portal', 'painel']],
  );

  const todos = consulta.data?.data ?? [];
  const liberados = todos.filter((b) => !b.bloqueado);
  const bloqueados = todos.filter((b) => b.bloqueado);

  async function usar(b: Beneficio) {
    try {
      const r = await resgatar.mutateAsync({ id: b.id });
      modal.success({
        title: `${r.beneficio} resgatado`,
        content: r.instrucoes ?? 'Procure o parceiro informando que é associado DigitaisBR.',
      });
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  return (
    <Pagina
      titulo="Meus Benefícios"
      descricao={`Seu plano dá acesso a ${liberados.length} benefício(s).${
        bloqueados.length ? ` Faça upgrade para desbloquear mais ${bloqueados.length}.` : ''
      }`}
    >
      <Cartoes
        carregando={consulta.isLoading}
        colunas={3}
        metricas={[
          { titulo: 'Disponíveis', valor: liberados.length, cor: marca.mintLeaf },
          { titulo: 'Bloqueados', valor: bloqueados.length, cor: '#d48806' },
          { titulo: 'Total no catálogo', valor: todos.length },
        ]}
      />

      <Estado carregando={consulta.isLoading} erro={consulta.error} esqueleto>
        <Typography.Title level={5}>Disponíveis ({liberados.length})</Typography.Title>
        <Row gutter={[14, 14]} style={{ marginBottom: 28 }}>
          {liberados.map((b) => (
            <Col key={b.id} xs={24} sm={12} lg={8}>
              <Card
                size="small"
                style={{ height: '100%' }}
                actions={[
                  <Button key="u" type="link" icon={<GiftOutlined />} onClick={() => usar(b)}>
                    Resgatar
                  </Button>,
                ]}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <Typography.Text strong>{b.nome}</Typography.Text>
                  {b.valorLabel && <Tag color="green">{b.valorLabel}</Tag>}
                </div>
                <Typography.Paragraph
                  type="secondary"
                  style={{ fontSize: 12, margin: '8px 0' }}
                  ellipsis={{ rows: 2 }}
                >
                  {b.descricao}
                </Typography.Paragraph>
                <Space size={6} wrap>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {b.parceiro?.nome ?? '—'}
                  </Typography.Text>
                  <Tag style={{ fontSize: 10 }}>{rotulo(b.tipo)}</Tag>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        {bloqueados.length > 0 && (
          <>
            <Typography.Title level={5}>
              <LockOutlined /> Bloqueados ({bloqueados.length})
            </Typography.Title>
            <Row gutter={[14, 14]}>
              {bloqueados.map((b) => (
                <Col key={b.id} xs={24} sm={12} lg={8}>
                  <Card size="small" style={{ height: '100%', opacity: 0.6 }}>
                    <Typography.Text strong>{b.nome}</Typography.Text>
                    <div style={{ marginTop: 8 }}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Requer{' '}
                      </Typography.Text>
                      <Tag color={corDeStatus(b.planoMinimo.nivel)}>{b.planoMinimo.nome}</Tag>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Estado>
    </Pagina>
  );
}
