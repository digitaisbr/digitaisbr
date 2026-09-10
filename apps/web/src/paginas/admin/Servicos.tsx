import { useState } from 'react';
import {
  Button, Card, Col, Form, Input, InputNumber, List, Rate, Row, Select, Space, Switch, Tag, Typography,
} from 'antd';
import {
  EnvironmentOutlined, MailOutlined, PhoneOutlined, PlusOutlined, UserOutlined,
} from '@ant-design/icons';
import { useApi } from '@/api/hooks';
import { AcoesLinha } from '@/componentes/AcoesLinha';
import { ModalRecurso } from '@/componentes/ModalRecurso';
import { moeda, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { Escritorio, Profissional } from '@/api/tipos';
import { marca } from '@/marca';

const TIPOS_ESCRITORIO = [
  { value: 'JURIDICO', label: 'Jurídico' },
  { value: 'CONTABIL', label: 'Contábil' },
  { value: 'JURIDICO_CONTABIL', label: 'Jurídico e contábil' },
];

const CHAVES = [['servicos']];

interface Estatisticas {
  escritorios: { total: number; ativos: number };
  profissionais: { total: number; disponiveis: number };
  solicitacoes: { abertas: number; emAndamento: number; concluidas: number; total: number };
}

export function Servicos() {
  const stats = useApi<Estatisticas>(['servicos', 'estatisticas'], '/servicos/estatisticas');
  const escritorios = useApi<Escritorio[]>(['servicos', 'escritorios'], '/servicos/escritorios');
  const profissionais = useApi<Profissional[]>(['servicos', 'profissionais'], '/servicos/profissionais');

  const [escritorioAberto, setEscritorioAberto] = useState(false);
  const [escritorioEmEdicao, setEscritorioEmEdicao] = useState<Escritorio | null>(null);
  const [profissionalAberto, setProfissionalAberto] = useState(false);
  const [profissionalEmEdicao, setProfissionalEmEdicao] = useState<Profissional | null>(null);

  function abrirEscritorio(e: Escritorio | null) {
    setEscritorioEmEdicao(e);
    setEscritorioAberto(true);
  }

  function abrirProfissional(p: Profissional | null) {
    setProfissionalEmEdicao(p);
    setProfissionalAberto(true);
  }

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
          <Card
            title="Escritórios parceiros"
            extra={
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => abrirEscritorio(null)}>
                Novo escritório
              </Button>
            }
          >
            <Estado carregando={escritorios.isLoading} erro={escritorios.error} esqueleto>
              <List
                dataSource={escritorios.data ?? []}
                renderItem={(e) => (
                  <List.Item
                    actions={[
                      <AcoesLinha
                        key="acoes"
                        base="/servicos/escritorios"
                        id={e.id}
                        nome={e.nome}
                        invalidar={CHAVES}
                        aoEditar={() => abrirEscritorio(e)}
                        aviso={
                          e.totalProfissionais
                            ? `Tem ${e.totalProfissionais} profissional(is) vinculado(s).`
                            : undefined
                        }
                      />,
                    ]}
                  >
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
          <Card
            title="Profissionais"
            extra={
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => abrirProfissional(null)}>
                Novo profissional
              </Button>
            }
          >
            <Estado carregando={profissionais.isLoading} erro={profissionais.error} esqueleto>
              <List
                dataSource={profissionais.data ?? []}
                renderItem={(p) => (
                  <List.Item
                    actions={[
                      <AcoesLinha
                        key="acoes"
                        base="/servicos/profissionais"
                        id={p.id}
                        nome={p.nome}
                        invalidar={CHAVES}
                        aoEditar={() => abrirProfissional(p)}
                      />,
                    ]}
                  >
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

      <ModalRecurso<Escritorio>
        aberto={escritorioAberto}
        registro={escritorioEmEdicao}
        aoFechar={() => setEscritorioAberto(false)}
        recurso="escritório"
        base="/servicos/escritorios"
        invalidar={CHAVES}
        iniciais={{ ativo: true, tipo: 'JURIDICO', especialidades: [] }}
      >
        <Form.Item name="nome" label="Nome" rules={[{ required: true, min: 2, message: 'Informe o nome.' }]}>
          <Input placeholder="Silva & Associados" autoFocus />
        </Form.Item>

        <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
          <Select options={TIPOS_ESCRITORIO} />
        </Form.Item>

        <Form.Item name="especialidades" label="Especialidades" extra="Digite e pressione Enter para cada uma.">
          <Select mode="tags" open={false} placeholder="Direito digital, Tributário…" />
        </Form.Item>

        <Form.Item name="responsavel" label="Responsável">
          <Input placeholder="Nome do contato" />
        </Form.Item>

        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email inválido.' }]}>
          <Input placeholder="contato@escritorio.com" />
        </Form.Item>

        <Form.Item name="telefone" label="Telefone">
          <Input placeholder="(11) 3000-0000" />
        </Form.Item>

        <Form.Item name="localizacao" label="Localização">
          <Input placeholder="São Paulo, SP" />
        </Form.Item>

        <Form.Item name="ativo" label="Ativo" valuePropName="checked">
          <Switch />
        </Form.Item>
      </ModalRecurso>

      <ModalRecurso<Profissional>
        aberto={profissionalAberto}
        registro={profissionalEmEdicao}
        aoFechar={() => setProfissionalAberto(false)}
        recurso="profissional"
        base="/servicos/profissionais"
        invalidar={CHAVES}
        iniciais={{ disponivel: true }}
        // a listagem devolve o escritório como objeto; o DTO espera o id
        paraFormulario={(p) => ({ ...p, escritorioId: p.escritorio?.id })}
      >
        <Form.Item name="nome" label="Nome" rules={[{ required: true, min: 2, message: 'Informe o nome.' }]}>
          <Input placeholder="Dra. Marina Souza" autoFocus />
        </Form.Item>

        <Form.Item name="escritorioId" label="Escritório">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            loading={escritorios.isLoading}
            placeholder="Selecione o escritório"
            options={(escritorios.data ?? []).map((e) => ({ value: e.id, label: e.nome }))}
          />
        </Form.Item>

        <Form.Item name="especialidade" label="Especialidade">
          <Input placeholder="Direito digital" />
        </Form.Item>

        <Form.Item name="valorHora" label="Valor por hora">
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            prefix="R$"
            decimalSeparator=","
            placeholder="250,00"
          />
        </Form.Item>

        <Form.Item name="bio" label="Apresentação">
          <Input.TextArea rows={3} placeholder="Formação e experiência." />
        </Form.Item>

        <Form.Item name="disponivel" label="Disponível" valuePropName="checked">
          <Switch />
        </Form.Item>
      </ModalRecurso>
    </Pagina>
  );
}
