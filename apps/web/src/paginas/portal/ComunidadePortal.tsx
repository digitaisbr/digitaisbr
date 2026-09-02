import { useState } from 'react';
import { App, Avatar, Button, Card, Input, List, Select, Space, Tabs, Tag, Typography } from 'antd';
import { CommentOutlined, EyeOutlined, LikeFilled, LikeOutlined } from '@ant-design/icons';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao, useApi, useLista } from '@/api/hooks';
import { corDeStatus, data, numero } from '@/api/formato';
import { Estado } from '@/componentes/Estado';
import { Pagina } from '@/componentes/Pagina';
import { useAuth } from '@/auth/AuthContext';
import type { Post } from '@/api/tipos';
import { marca } from '@/marca';

interface CategoriaCom {
  id: string;
  nome: string;
  icone: string | null;
  totalPosts: number;
}

export function ComunidadePortal() {
  const { usuario } = useAuth();
  const { message } = App.useApp();
  const [aba, setAba] = useState<'recentes' | 'populares'>('recentes');
  const [categoriaId, setCategoriaId] = useState<string>();
  const [texto, setTexto] = useState('');
  const [categoriaNova, setCategoriaNova] = useState<string>();

  const categorias = useApi<CategoriaCom[]>(['comunidade', 'categorias'], '/comunidade/categorias');
  const posts = useLista<Post>(['comunidade', 'posts', { aba, categoriaId }], '/comunidade/posts', {
    aba,
    categoriaId,
    limit: 20,
  });

  const publicar = useAcao<{ conteudo: string; categoriaId?: string }, unknown>(
    'post',
    '/comunidade/posts',
    [['comunidade']],
  );
  const curtir = useAcao<{ id: string }, { curtido: boolean }>(
    'post',
    (e) => `/comunidade/posts/${e.id}/curtir`,
    [['comunidade']],
  );

  async function enviar() {
    if (!texto.trim()) return;
    try {
      await publicar.mutateAsync({ conteudo: texto, categoriaId: categoriaNova });
      setTexto('');
      setCategoriaNova(undefined);
      message.success('Publicado na comunidade.');
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  return (
    <Pagina titulo="Comunidade" descricao="Troque experiências com outros criadores">
      <Card style={{ marginBottom: 18 }}>
        <Space align="start" style={{ width: '100%' }}>
          <Avatar style={{ background: marca.violet }}>{usuario?.nome?.[0] ?? '?'}</Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Input.TextArea
              rows={3}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Compartilhar uma dica ou experiência…"
              style={{ marginBottom: 10 }}
            />
            <Space wrap>
              <Select
                allowClear
                placeholder="Categoria"
                style={{ width: 210 }}
                value={categoriaNova}
                onChange={setCategoriaNova}
                options={(categorias.data ?? []).map((c) => ({
                  value: c.id,
                  label: `${c.icone ?? ''} ${c.nome}`.trim(),
                }))}
              />
              <Button
                type="primary"
                onClick={enviar}
                loading={publicar.isPending}
                disabled={!texto.trim()}
              >
                Publicar
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Tabs
            activeKey={aba}
            onChange={(k) => setAba(k as 'recentes' | 'populares')}
            items={[
              { key: 'recentes', label: 'Recentes' },
              { key: 'populares', label: 'Populares' },
            ]}
            style={{ flex: 1 }}
          />
          <Select
            allowClear
            placeholder="Todas categorias"
            style={{ width: 210 }}
            value={categoriaId}
            onChange={setCategoriaId}
            options={(categorias.data ?? []).map((c) => ({
              value: c.id,
              label: `${c.icone ?? ''} ${c.nome} (${c.totalPosts})`.trim(),
            }))}
          />
        </div>

        <Estado carregando={posts.isLoading} erro={posts.error} esqueleto>
          <List
            itemLayout="vertical"
            dataSource={posts.data?.data ?? []}
            pagination={{ pageSize: 6 }}
            renderItem={(p) => (
              <List.Item
                key={p.id}
                style={{
                  background: p.fixado ? '#fffbe6' : '#fff',
                  padding: 16,
                  borderRadius: 10,
                  marginBottom: 10,
                  border: '1px solid #f0f0f0',
                }}
                actions={[
                  <Space
                    key="l"
                    size={5}
                    style={{ cursor: 'pointer', color: p.curtidoPorMim ? marca.digitalBlue : undefined }}
                    onClick={async () => {
                      try {
                        await curtir.mutateAsync({ id: p.id });
                      } catch (e) {
                        message.error(mensagemDeErro(e));
                      }
                    }}
                  >
                    {p.curtidoPorMim ? <LikeFilled /> : <LikeOutlined />} {p.curtidas}
                  </Space>,
                  <Space key="c" size={5}>
                    <CommentOutlined /> {p.comentarios}
                  </Space>,
                  <Space key="v" size={5}>
                    <EyeOutlined /> {numero(p.visualizacoes)}
                  </Space>,
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
              </List.Item>
            )}
          />
        </Estado>
      </Card>
    </Pagina>
  );
}
