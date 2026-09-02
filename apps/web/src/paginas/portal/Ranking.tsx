import { Card, Col, List, Progress, Row, Space, Tag, Typography } from 'antd';
import { CrownOutlined, TrophyOutlined } from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { numero } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import { marca } from '@/marca';

interface RankingResp {
  top: { posicao: number; id: string; nome: string; handle: string; plano: string; vendas: number; pontos: number; voce: boolean }[];
  minhaPosicao: number | null;
  totalParticipantes: number;
  percentilTopo: number | null;
}

interface ConquistasResp {
  conquistas: {
    id: string; nome: string; descricao: string | null; meta: number; pontos: number;
    progresso: number; percentual: number; desbloqueada: boolean;
  }[];
  desbloqueadas: number;
  total: number;
  pontosGanhos: number;
}

const MEDALHA = ['#FFD700', '#C0C0C0', '#CD7F32'];

export function Ranking() {
  const ranking = useApi<RankingResp>(['gamificacao', 'ranking'], '/gamificacao/ranking', { limite: 10 });
  const conquistas = useApi<ConquistasResp>(['gamificacao', 'minhas'], '/gamificacao/minhas-conquistas');

  const r = ranking.data;
  const c = conquistas.data;

  return (
    <Pagina titulo="Ranking e Conquistas" descricao="Sua posição entre os criadores da associação">
      <Cartoes
        carregando={ranking.isLoading}
        metricas={[
          { titulo: 'Sua posição', valor: r?.minhaPosicao ? `${r.minhaPosicao}º` : '—', icone: <TrophyOutlined /> },
          { titulo: 'Pontuação', valor: numero(r?.top.find((x) => x.voce)?.pontos) },
          { titulo: 'Top', valor: r?.percentilTopo ? `${r.percentilTopo}%` : '—' },
          { titulo: 'Conquistas', valor: c ? `${c.desbloqueadas} / ${c.total}` : '—' },
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={`Top 10 associados · de ${r?.totalParticipantes ?? 0} participantes`}>
            <Estado carregando={ranking.isLoading} erro={ranking.error} esqueleto>
              <List
                dataSource={r?.top ?? []}
                renderItem={(a) => (
                  <List.Item
                    style={{
                      background: a.voce ? 'rgba(0, 142, 234, 0.07)' : undefined,
                      borderRadius: 8,
                      paddingInline: 10,
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        a.posicao <= 3 ? (
                          <CrownOutlined style={{ fontSize: 22, color: MEDALHA[a.posicao - 1] }} />
                        ) : (
                          <Typography.Text type="secondary" style={{ fontSize: 16, paddingLeft: 4 }}>
                            {a.posicao}
                          </Typography.Text>
                        )
                      }
                      title={
                        <Space wrap size={6}>
                          <Typography.Text strong>{a.nome}</Typography.Text>
                          {a.voce && <Tag color="blue">Você</Tag>}
                          <Tag>{a.plano}</Tag>
                        </Space>
                      }
                      description={
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {a.vendas} venda(s)
                        </Typography.Text>
                      }
                    />
                    <Typography.Text strong style={{ color: marca.digitalBlue }}>
                      {numero(a.pontos)} pts
                    </Typography.Text>
                  </List.Item>
                )}
              />
            </Estado>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={`Conquistas (${c?.desbloqueadas ?? 0}/${c?.total ?? 0})`}>
            <Estado carregando={conquistas.isLoading} erro={conquistas.error} esqueleto>
              <Row gutter={[12, 12]}>
                {(c?.conquistas ?? []).map((q) => (
                  <Col key={q.id} xs={12} sm={8}>
                    <Card
                      size="small"
                      style={{
                        textAlign: 'center',
                        border: q.desbloqueada ? `2px solid ${marca.mintLeaf}` : undefined,
                        opacity: q.desbloqueada ? 1 : 0.75,
                        height: '100%',
                      }}
                    >
                      <TrophyOutlined
                        style={{ fontSize: 24, color: q.desbloqueada ? marca.mintLeaf : '#bfbfbf' }}
                      />
                      <Typography.Text strong style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
                        {q.nome}
                      </Typography.Text>
                      {q.desbloqueada ? (
                        <Tag color="green" style={{ marginTop: 6, fontSize: 10 }}>
                          Desbloqueada
                        </Tag>
                      ) : (
                        <div style={{ marginTop: 6 }}>
                          <Progress percent={q.percentual} size="small" showInfo={false} />
                          <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                            {q.progresso}/{q.meta}
                          </Typography.Text>
                        </div>
                      )}
                    </Card>
                  </Col>
                ))}
              </Row>
            </Estado>
          </Card>
        </Col>
      </Row>
    </Pagina>
  );
}
