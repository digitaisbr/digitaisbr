import { Card, Col, List, Rate, Row, Space, Tag, Typography } from 'antd';
import { EnvironmentOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { moeda, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { Escritorio, Profissional } from '@/api/tipos';
import { marca } from '@/marca';

interface Estatisticas {
  escritorios: { total: number; ativos: number };
  profissionais: { total: number; disponiveis: number };
  solicitacoes: { abertas: number; emAndamento: number; concluidas: number; total: number };
}

export function Servicos() {
  const stats = useApi<Estatisticas>(['servicos', 'estatisticas'], '/servicos/estatisticas');
  const escritorios = useApi<Escritorio[]>(['servicos', 'escritorios'], '/servicos/escritorios');
  const profissionais = useApi<Profissional[]>(['servicos', 'profissionais'], '/servicos/profissionais');

  const s = stats.data;

  return (
    <Pagina titulo="Serviços" descricao="Assessoria jurídica e contábil conveniada">
      <Cartoes
        carregando={stats.isLoading}
        metricas={[
          { titulo: 'Escritórios ativos', valor: s?.escritorios.ativos ?? 0, detalhe: `de ${s?.escritorios.total ?? 0}` },
          { titulo: 'Profissionais', valor: s?.profissionais.disponiveis ?? 0, detalhe: `de ${s?.profissionais.total ?? 0} disponíveis` },
          { titulo: 'Solicitações abertas', valor: s?.solicitacoes.abertas ?? 0 },
          { titulo: 'Concluídas', valor: s?.solicitacoes.concluidas ?? 0, cor: marca.mintLeaf },
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Escritórios parceiros">
            <Estado carregando={escritorios.isLoading} erro={escritorios.error} esqueleto>
              <List
                dataSource={escritorios.data ?? []}
                renderItem={(e) => (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <Space wrap size={8} style={{ marginBottom: 6 }}>
                        <Typography.Text strong>{e.nome}</Typography.Text>
                        <Tag color={e.tipo === 'CONTABIL' ? 'green' : 'blue'}>{rotulo(e.tipo)}</Tag>
                        {!e.ativo && <Tag>Inativo</Tag>}
                      </Space>
                      <div style={{ marginBottom: 6 }}>
                        {e.especialidades.map((esp) => (
                          <Tag key={esp} style={{ fontSize: 11 }}>
                            {esp}
                          </Tag>
                        ))}
                      </div>
                      <Space wrap size={16} style={{ fontSize: 12, color: '#666' }}>
                        {e.responsavel && (
                          <span>
                            <UserOutlined /> {e.responsavel}
                          </span>
                        )}
                        {e.email && (
                          <span>
                            <MailOutlined /> {e.email}
                          </span>
                        )}
                        {e.telefone && (
                          <span>
                            <PhoneOutlined /> {e.telefone}
                          </span>
                        )}
                        {e.localizacao && (
                          <span>
                            <EnvironmentOutlined /> {e.localizacao}
                          </span>
                        )}
                      </Space>
                      <div style={{ marginTop: 6 }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {e.atendimentos} atendimento(s)
                        </Typography.Text>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Estado>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Profissionais">
            <Estado carregando={profissionais.isLoading} erro={profissionais.error} esqueleto>
              <List
                dataSource={profissionais.data ?? []}
                renderItem={(p) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space wrap size={6}>
                          <Typography.Text strong>{p.nome}</Typography.Text>
                          <Tag color={p.disponivel ? 'green' : 'default'}>
                            {p.disponivel ? 'Disponível' : 'Indisponível'}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          {p.especialidade && (
                            <Tag color="blue" style={{ fontSize: 11 }}>
                              {p.especialidade}
                            </Tag>
                          )}
                          <Typography.Paragraph
                            type="secondary"
                            style={{ fontSize: 12, margin: '6px 0 4px' }}
                          >
                            {p.bio}
                          </Typography.Paragraph>
                          <Space size={10}>
                            <Rate disabled allowHalf value={p.nota ?? 0} style={{ fontSize: 12 }} />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              ({p.avaliacoes})
                            </Typography.Text>
                            {p.valorHora && (
                              <Typography.Text strong style={{ fontSize: 12 }}>
                                {moeda(p.valorHora)}/h
                              </Typography.Text>
                            )}
                          </Space>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Estado>
          </Card>
        </Col>
      </Row>
    </Pagina>
  );
}
