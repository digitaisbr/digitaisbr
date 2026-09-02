import { useState, type ReactNode } from 'react';
import { Alert, Card, Input, Select, Space, Table, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { mensagemDeErro } from '@/api/cliente';
import { useLista } from '@/api/hooks';
import type { FiltrosBase } from '@/api/tipos';

export interface OpcaoFiltro {
  /** nome do parâmetro enviado à API */
  campo: string;
  rotulo: string;
  largura?: number;
  opcoes: { valor: string; rotulo: string }[];
}

interface Props<T> {
  titulo: ReactNode;
  /** chave de cache do react-query */
  chave: unknown[];
  url: string;
  colunas: ColumnsType<T>;
  filtros?: OpcaoFiltro[];
  /** filtros fixos, não editáveis pelo usuário */
  fixos?: FiltrosBase;
  placeholderBusca?: string;
  acoes?: ReactNode;
  /** faixa de cartões ou conteúdo exibido acima da tabela */
  cabecalho?: ReactNode;
  aoClicarLinha?: (registro: T) => void;
  tamanhoPadrao?: number;
  /** habilita seleção múltipla, para ações em lote */
  selecao?: {
    selecionadas: string[];
    aoSelecionar: (ids: string[]) => void;
    /** linhas que não podem ser selecionadas */
    bloqueada?: (registro: T) => boolean;
  };
}

/**
 * Tabela ligada à API: busca, filtros, ordenação e paginação são enviados ao
 * backend (não filtram no cliente), de modo que funcionam sobre o conjunto
 * inteiro e não apenas sobre a página carregada.
 */
export function TabelaRecurso<T extends { id?: string }>({
  titulo,
  chave,
  url,
  colunas,
  filtros = [],
  fixos,
  placeholderBusca = 'Buscar…',
  acoes,
  cabecalho,
  aoClicarLinha,
  tamanhoPadrao = 10,
  selecao,
}: Props<T>) {
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(tamanhoPadrao);
  const [busca, setBusca] = useState('');
  const [selecoes, setSelecoes] = useState<Record<string, string | undefined>>({});
  const [ordem, setOrdem] = useState<{ sort?: string; order?: 'asc' | 'desc' }>({});

  const consulta = useLista<T>(chave, url, {
    page: pagina,
    limit: limite,
    search: busca || undefined,
    ...ordem,
    ...selecoes,
    ...fixos,
  });

  const alterarFiltro = (campo: string, valor?: string) => {
    setSelecoes((atual) => ({ ...atual, [campo]: valor }));
    setPagina(1);
  };

  return (
    <Card
      title={titulo}
      extra={acoes}
      styles={{ body: { paddingTop: cabecalho ? 16 : 12 } }}
    >
      {cabecalho}

      {(filtros.length > 0 || true) && (
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={placeholderBusca}
            style={{ width: 260 }}
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
          {filtros.map((f) => (
            <Select
              key={f.campo}
              allowClear
              placeholder={f.rotulo}
              style={{ width: f.largura ?? 170 }}
              value={selecoes[f.campo]}
              onChange={(v) => alterarFiltro(f.campo, v)}
              options={f.opcoes.map((o) => ({ value: o.valor, label: o.rotulo }))}
            />
          ))}
        </Space>
      )}

      {consulta.isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Não foi possível carregar os dados"
          description={mensagemDeErro(consulta.error)}
        />
      )}

      <Table<T>
        rowKey={(r) => r.id ?? JSON.stringify(r)}
        columns={colunas}
        dataSource={consulta.data?.data ?? []}
        loading={consulta.isLoading}
        size="middle"
        scroll={{ x: 'max-content' }}
        rowSelection={
          selecao
            ? {
                selectedRowKeys: selecao.selecionadas,
                onChange: (chaves) => selecao.aoSelecionar(chaves as string[]),
                getCheckboxProps: (registro) => ({
                  disabled: selecao.bloqueada?.(registro) ?? false,
                }),
              }
            : undefined
        }
        onRow={
          aoClicarLinha
            ? (registro) => ({
                onClick: () => aoClicarLinha(registro),
                style: { cursor: 'pointer' },
              })
            : undefined
        }
        onChange={(_, __, sorter) => {
          const s = sorter as SorterResult<T>;
          setOrdem(
            s.order
              ? { sort: String(s.field), order: s.order === 'ascend' ? 'asc' : 'desc' }
              : {},
          );
        }}
        pagination={{
          current: consulta.data?.meta.page ?? pagina,
          pageSize: limite,
          total: consulta.data?.meta.total ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          onChange: (p, t) => {
            setPagina(p);
            setLimite(t);
          },
          showTotal: (total, faixa) => (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {faixa[0]}–{faixa[1]} de {total}
            </Typography.Text>
          ),
        }}
      />
    </Card>
  );
}
