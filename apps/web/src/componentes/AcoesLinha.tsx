import { App, Button, Popconfirm, Space, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao } from '@/api/hooks';

interface Props {
  /** Caminho da coleção; a remoção usa `${base}/${id}`. */
  base: string;
  id: string;
  /** Aparece na confirmação e na mensagem de sucesso. */
  nome: string;
  invalidar: unknown[][];
  aoEditar: () => void;
  /** Complementa o aviso da confirmação — dependências que serão afetadas. */
  aviso?: string;
}

/** Editar e remover, na última coluna das tabelas de administração. */
export function AcoesLinha({ base, id, nome, invalidar, aoEditar, aviso }: Props) {
  const { message } = App.useApp();
  const remover = useAcao<Record<string, never>>('delete', () => `${base}/${id}`, invalidar);

  async function excluir() {
    try {
      await remover.mutateAsync({});
      message.success(`${nome} removido.`);
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  return (
    <Space size={4}>
      <Tooltip title="Editar">
        <Button type="text" icon={<EditOutlined />} onClick={aoEditar} />
      </Tooltip>
      <Popconfirm
        title={`Remover ${nome}?`}
        description={aviso ?? 'Esta ação não pode ser desfeita.'}
        okText="Remover"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
        onConfirm={excluir}
      >
        <Tooltip title="Remover">
          <Button type="text" danger icon={<DeleteOutlined />} loading={remover.isPending} />
        </Tooltip>
      </Popconfirm>
    </Space>
  );
}
