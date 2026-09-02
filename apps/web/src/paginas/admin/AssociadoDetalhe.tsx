import { useParams } from 'react-router-dom';
import { App, Avatar, Card, Col, Descriptions, Row, Select, Space, Statistic, Tag, Typography } from 'antd';
import { useApi, useAcao } from '@/api/hooks';
import { mensagemDeErro } from '@/api/cliente';
import { compacto, corDeStatus, data, moeda, percentual, rotulo } from '@/api/formato';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import { corDoPlano, marca } from '@/marca';
import type { NivelPlano, StatusAssociado } from '@/api/tipos';

interface Detalhe {
  id: string;
  nome: string;
  handle: string;
  email: string;
  cpfCnpj: string | null;
  telefone: string | null;
  nicho: string | null;
  bio: string | null;
  seguidores: number;
  engajamento: number;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  status: StatusAssociado;
  pontuacao: number;
  membroDesde: string;
  atualizadoEm: string;
  plano: { nivel: NivelPlano; nome: string; preco: number; descricao: string; recursos: string[] };
  loja: { id: string; nome: string; slug: string; ativa: boolean } | null;
  redesSociais: { rede: string; handle: string | null; seguidores: number }[];
  usuario: { email: string; ativo: boolean; ultimoLogin: string | null };
  metricas: {
    vendasAprovadas: number;
    receitaGerada: number;
    comissaoPaga: number;
    comissaoPendente: number;
    totalVendas: number;
    produtosNaLoja: number;
  };
}

export function AssociadoDetalhe() {
  const { id = '' } = useParams();
  const { message } = App.useApp();
  const consulta = useApi<Detalhe>(['associados', id], `/associados/${id}`);

  const mudarStatus = useAcao<{ status: StatusAssociado }, unknown>(
    'patch',
    (e) => `/associados/${id}/status/${e.status}`,
    [['associados'], ['associados', id]],
  );
  const mudarPlano = useAcao<{ plano: NivelPlano }, unknown>(
    'patch',
    `/associados/${id}/plano`,
    [['associados'], ['associados', id], ['planos']],
  );

  const a = consulta.data;

  return (
    <Pagina
      titulo={a?.nome ?? 'Associado'}
      trilha={[{ rotulo: 'Associados', para: '/associados' }, { rotulo: a?.handle ?? '…' }]}
      descricao={a ? `@${a.handle} · membro desde ${data(a.membroDesde)}` : undefined}
      acoes={
        a && (
          <Space>
            <Select
              value={a.plano.nivel}
              style={{ width: 160 }}
              onChange={async (plano) => {
                try {
                  await mudarPlano.mutateAsync({ plano });
                  message.success('Plano alterado e assinatura reaberta.');
                } catch (e) {
                  message.error(mensagemDeErro(e));
                }
              }}
              options={[
                { value: 'BASICO', label: 'Básico' },
                { value: 'INTERMEDIARIO', label: 'Intermediário' },
                { value: 'AVANCADO', label: 'Avançado' },
              ]}
            />
            <Select
              value={a.status}
              style={{ width: 140 }}
              onChange={async (status) => {
                try {
                  await mudarStatus.mutateAsync({ status });
                  message.success('Status atualizado — acesso e loja acompanham.');
                } catch (e) {
                  message.error(mensagemDeErro(e));
                }
              }}
              options={[
                { value: 'ATIVO', label: 'Ativo' },
                { value: 'INATIVO', label: 'Inativo' },
                { value: 'SUSPENSO', label: 'Suspenso' },
              ]}
            />
          </Space>
        )
      }
    >
      <Estado carregando={consulta.isLoading} erro={consulta.error} esqueleto>
        {a && (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              <Col xs={24} lg={8}>
                <Card>
                  <Space align="start" size={16}>
                    <Avatar size={64} style={{ background: corDoPlano[a.plano.nivel] }}>
                      {a.nome[0]}
                    </Avatar>
                    <div>
                      <Typography.Title level={4} style={{ margin: 0 }}>
                        {a.nome}
                      </Typography.Title>
                      <Space wrap size={6} style={{ marginTop: 6 }}>
                        <Tag color={corDeStatus(a.status)}>{rotulo(a.status)}</Tag>
                        <Tag color={corDeStatus(a.plano.nivel)}>{a.plano.nome}</Tag>
                        {a.nicho && <Tag>{a.nicho}</Tag>}
                      </Space>
                    </div>
                  </Space>
                  <Row gutter={12} style={{ marginTop: 20, textAlign: 'center' }}>
                    <Col span={8}>
                      <Statistic title="Seguidores" value={compacto(a.seguidores)} valueStyle={{ fontSize: 18 }} />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Engajamento"
                        value={percentual(a.engajamento)}
                        valueStyle={{ fontSize: 18 }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic title="Pontos" value={a.pontuacao} valueStyle={{ fontSize: 18 }} />
                    </Col>
                  </Row>
                </Card>
              </Col>

              <Col xs={24} lg={16}>
                <Row gutter={[12, 12]}>
                  {[
                    { t: 'Vendas aprovadas', v: a.metricas.vendasAprovadas },
                    { t: 'Receita gerada', v: moeda(a.metricas.receitaGerada) },
                    { t: 'Comissão paga', v: moeda(a.metricas.comissaoPaga), c: marca.mintLeaf },
                    { t: 'Comissão pendente', v: moeda(a.metricas.comissaoPendente), c: '#d48806' },
                    { t: 'Total de vendas', v: a.metricas.totalVendas },
                    { t: 'Produtos na loja', v: a.metricas.produtosNaLoja },
                  ].map((m) => (
                    <Col key={m.t} xs={12} md={8}>
                      <Card size="small">
                        <Statistic title={m.t} value={m.v as string} valueStyle={{ fontSize: 19, color: m.c }} />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={14}>
                <Card title="Dados cadastrais">
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="Nome">{a.nome}</Descriptions.Item>
                    <Descriptions.Item label="Email">{a.email}</Descriptions.Item>
                    <Descriptions.Item label="CPF/CNPJ">{a.cpfCnpj ?? '—'}</Descriptions.Item>
                    <Descriptions.Item label="Telefone">{a.telefone ?? '—'}</Descriptions.Item>
                    <Descriptions.Item label="Endereço" span={2}>
                      {a.endereco ?? '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Cidade">{a.cidade ?? '—'}</Descriptions.Item>
                    <Descriptions.Item label="UF">{a.uf ?? '—'}</Descriptions.Item>
                    <Descriptions.Item label="Loja">{a.loja?.nome ?? '—'}</Descriptions.Item>
                    <Descriptions.Item label="Slug">{a.loja ? `/${a.loja.slug}` : '—'}</Descriptions.Item>
                    <Descriptions.Item label="Último login" span={2}>
                      {data(a.usuario.ultimoLogin)}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} lg={10}>
                <Card title={`Plano ${a.plano.nome}`} style={{ marginBottom: 16 }}>
                  <Typography.Title level={3} style={{ margin: 0, color: corDoPlano[a.plano.nivel] }}>
                    {moeda(a.plano.preco)}
                    <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                      {' '}
                      /mês
                    </Typography.Text>
                  </Typography.Title>
                  <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                    {a.plano.descricao}
                  </Typography.Paragraph>
                  <div>
                    {a.plano.recursos.map((r) => (
                      <Tag key={r} style={{ marginBottom: 4 }}>
                        {r}
                      </Tag>
                    ))}
                  </div>
                </Card>

                <Card title="Redes sociais">
                  {a.redesSociais.length === 0 ? (
                    <Typography.Text type="secondary">Nenhuma rede conectada.</Typography.Text>
                  ) : (
                    a.redesSociais.map((r) => (
                      <div
                        key={r.rede}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}
                      >
                        <Space>
                          <Tag color="blue">{rotulo(r.rede)}</Tag>
                          <Typography.Text type="secondary">{r.handle ?? '—'}</Typography.Text>
                        </Space>
                        <Typography.Text strong>{compacto(r.seguidores)}</Typography.Text>
                      </div>
                    ))
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Estado>
    </Pagina>
  );
}
