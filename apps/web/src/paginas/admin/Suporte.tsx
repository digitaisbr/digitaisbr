import { useNavigate } from 'react-router-dom';
import { Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useApi } from '@/api/hooks';
import { corDeStatus, data, rotulo } from '@/api/formato';
import { Cartoes } from '@/componentes/Cartoes';
import { Pagina } from '@/componentes/Pagina';
import { TabelaRecurso } from '@/componentes/TabelaRecurso';
import type { Ticket } from '@/api/tipos';
import { marca } from '@/marca';

interface Estatisticas {
  abertos: number;
  emAndamento: number;
  resolvidos: number;
  total: number;
  tempoMedioResolucaoHoras: number;
  porCategoria: { categoria: string; total: number }[];
}

export function Suporte() {
  const navegar = useNavigate();
  const stats = useApi<Estatisticas>(['suporte', 'estatisticas'], '/suporte/estatisticas');

  const colunas: ColumnsType<Ticket> = [
    { title: 'Ticket', dataIndex: 'numero', sorter: true, render: (v: string) => <Tag>{v}</Tag> },
    {
      title: 'Assunto',
      dataIndex: 'assunto',
      render: (v: string, t) => (
        <div style={{ maxWidth: 340 }}>
          <Typography.Text strong style={{ display: 'block', color: marca.digitalBlue }}>{v}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t.associado ? `${t.associado.nome} · ${t.associado.plano.nome}` : 'Sem associado'}
          </Typography.Text>
        </div>
      ),
    },
    { title: 'Categoria', dataIndex: 'categoria' },
    {
      title: 'Prioridade',
      dataIndex: 'prioridade',
      render: (v: string) => <Tag color={corDeStatus(v)}>{rotulo(v)}</Tag>,
    },
    { title: 'Msgs', dataIndex: 'totalMensagens', align: 'center' },
    { title: 'Atribuído', dataIndex: ['atribuidoA', 'nome'], render: (v) => v ?? '—' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: string) => <Tag color={corDeStatus(v)}>{rotulo(v)}</Tag>,
    },
    { title: 'Data', dataIndex: 'criadoEm', sorter: true, render: (v: string) => data(v) },
  ];

  const s = stats.data;

  return (
    <Pagina titulo="Suporte" descricao="Chamados abertos pelos associados">
      <Cartoes
        carregando={stats.isLoading}
        metricas={[
          { titulo: 'Em aberto', valor: s?.abertos ?? 0, cor: '#cf1322' },
          { titulo: 'Em andamento', valor: s?.emAndamento ?? 0, cor: marca.digitalBlue },
          { titulo: 'Resolvidos', valor: s?.resolvidos ?? 0, cor: marca.mintLeaf },
          {
            titulo: 'Tempo médio',
            valor: s?.tempoMedioResolucaoHoras ?? 0,
            sufixo: 'h',
            detalhe: 'até a resolução',
          },
        ]}
      />

      <TabelaRecurso<Ticket>
        titulo="Chamados"
        chave={['suporte']}
        url="/suporte"
        colunas={colunas}
        placeholderBusca="Buscar por número, assunto ou associado…"
        aoClicarLinha={(t) => navegar(`/suporte/${t.id}`)}
        filtros={[
          {
            campo: 'status',
            rotulo: 'Status',
            opcoes: [
              { valor: 'ABERTO', rotulo: 'Aberto' },
              { valor: 'EM_ANDAMENTO', rotulo: 'Em andamento' },
              { valor: 'RESOLVIDO', rotulo: 'Resolvido' },
              { valor: 'FECHADO', rotulo: 'Fechado' },
            ],
          },
          {
            campo: 'prioridade',
            rotulo: 'Prioridade',
            opcoes: [
              { valor: 'BAIXA', rotulo: 'Baixa' },
              { valor: 'MEDIA', rotulo: 'Média' },
              { valor: 'ALTA', rotulo: 'Alta' },
              { valor: 'URGENTE', rotulo: 'Urgente' },
            ],
          },
          {
            campo: 'categoria',
            rotulo: 'Categoria',
            largura: 180,
            opcoes: (s?.porCategoria ?? []).map((c) => ({ valor: c.categoria, rotulo: c.categoria })),
          },
        ]}
      />
    </Pagina>
  );
}
