import { App, Avatar, Button, Card, List, Space, Tag, Typography } from 'antd';
import { CommentOutlined, EyeOutlined, LikeOutlined, PushpinOutlined } from '@ant-design/icons';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi, useLista } from '@/api/hooks';
import { corDeStatus, data, numero } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import type { Post } from '@/api/tipos';
import { marca } from '@/marca';

interface Estatisticas {
  posts: number;
  comentarios: number;
  curtidas: number;
  fixados: number;
  categorias: number;
  membrosAtivos: number;
}

export function Comunidade() {
  const { message } = App.useApp();
  const stats = useApi<Estatisticas>(['comunidade', 'estatisticas'], '/comunidade/estatisticas');
  const posts = useLista<Post>(['comunidade', 'posts'], '/comunidade/posts', { limit: 20 });

  const fixar = useAcao<{ id: string; fixado: boolean }, unknown>(
    'patch',
    (e) => `/comunidade/posts/${e.id}/fixar/${e.fixado}`,
    [['comunidade']],
  );

  const s = stats.data;

  return (
    <Pagina titulo="Comunidade" descricao="Feed de publicações dos associados">
      <Cartoes
        carregando={stats.isLoading}
        colunas={6}
        metricas={[
          { titulo: 'Posts', valor: s?.posts ?? 0 },
          { titulo: 'Comentários', valor: numero(s?.comentarios) },
          { titulo: 'Curtidas', valor: numero(s?.curtidas) },
          { titulo: 'Fixados', valor: s?.fixados ?? 0 },
          { titulo: 'Categorias', valor: s?.categorias ?? 0 },
          { titulo: 'Membros ativos', valor: s?.membrosAtivos ?? 0 },
        ]}
      />

      <Card title="Feed">
        <Estado carregando={posts.isLoading} erro={posts.error} esqueleto>
          <List
            itemLayout="vertical"
            dataSource={posts.data?.data ?? []}
            pagination={{ pageSize: 6 }}
            renderItem={(p) => (
              <List.Item
                key={p.id}
                style={{
                  background: p.fixado ? '#fffbe6' : undefined,
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 10,
                  border: '1px solid #f0f0f0',
                }}
                actions={[
                  <Space key="l" size={4}>
                    <LikeOutlined /> {p.curtidas}
                  </Space>,
                  <Space key="c" size={4}>
                    <CommentOutlined /> {p.comentarios}
                  </Space>,
                  <Space key="v" size={4}>
                    <EyeOutlined /> {numero(p.visualizacoes)}
                  </Space>,
                  <Button
                    key="f"
                    size="small"
                    type={p.fixado ? 'primary' : 'default'}
                    icon={<PushpinOutlined />}
                    onClick={async () => {
                      try {
                        await fixar.mutateAsync({ id: p.id, fixado: !p.fixado });
                        message.success(p.fixado ? 'Post desafixado.' : 'Post fixado no topo.');
                      } catch (e) {
                        message.error(mensagemDeErro(e));
                      }
                    }}
                  >
                    {p.fixado ? 'Desafixar' : 'Fixar'}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar style={{ background: marca.violet }}>{p.autor.nome[0]}</Avatar>}
                  title={
                    <Space wrap size={6}>
                      <Typography.Text strong>{p.autor.nome}</Typography.Text>
                      <Tag color={corDeStatus(p.autor.plano.nivel)}>{p.autor.plano.nome}</Tag>
                      {p.categoria && (
                        <Tag color="blue">
                          {p.categoria.icone} {p.categoria.nome}
                        </Tag>
                      )}
                      {p.fixado && <Tag color="gold">Fixado</Tag>}
                    </Space>
                  }
                  description={
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {data(p.criadoEm)}
                    </Typography.Text>
                  }
                />
                <Typography.Paragraph
                  style={{ whiteSpace: 'pre-line', marginBottom: 0 }}
                  ellipsis={{ rows: 4, expandable: true, symbol: 'ver mais' }}
                >
                  {p.conteudo}
                </Typography.Paragraph>
                {p.legendaImagem && (
                  <Typography.Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                    🖼 {p.legendaImagem}
                  </Typography.Text>
                )}
              </List.Item>
            )}
          />
        </Estado>
      </Card>
    </Pagina>
  );
}
