import { useEffect, type ReactNode } from 'react';
import { App, Form, Modal, type FormInstance } from 'antd';
import { mensagemDeErro } from '@/api/cliente';
import { useAcao } from '@/api/hooks';

interface Props<T extends { id: string }> {
  aberto: boolean;
  /** Ausente = cadastro; presente = edição daquele registro. */
  registro?: T | null;
  aoFechar: () => void;

  /** Rótulo no título e nas mensagens: "parceiro", "benefício"… */
  recurso: string;
  /** Caminho da coleção. A edição usa `${base}/${id}`. */
  base: string;
  /** Chaves de cache a invalidar após salvar. */
  invalidar: unknown[][];

  /** Valores do formulário em branco. */
  iniciais?: Record<string, unknown>;
  /** Converte o registro em valores do formulário, quando não é campo a campo. */
  paraFormulario?: (registro: T) => Record<string, unknown>;
  /** Última chance de ajustar o que vai para a API. */
  aoEnviar?: (valores: Record<string, unknown>) => Record<string, unknown>;

  children: ReactNode | ((form: FormInstance) => ReactNode);
}

/**
 * Cadastro e edição em janela, para as telas de administração.
 *
 * Cadastrar e editar são a mesma coisa com um id a mais — separar em dois
 * componentes duplicaria campos e validações, que já precisam bater com o DTO
 * da API. Cada tela declara só os seus campos como filhos.
 */
export function ModalRecurso<T extends { id: string }>({
  aberto, registro, aoFechar, recurso, base, invalidar,
  iniciais, paraFormulario, aoEnviar, children,
}: Props<T>) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const editando = Boolean(registro);

  const criar = useAcao<Record<string, unknown>>('post', base, invalidar);
  const atualizar = useAcao<Record<string, unknown>>(
    'patch',
    () => `${base}/${registro?.id}`,
    invalidar,
  );

  // o Modal preserva o formulário entre aberturas; sem isto, editar um registro
  // depois de outro mostraria os dados do anterior
  useEffect(() => {
    if (!aberto) return;
    if (registro) {
      form.setFieldsValue(paraFormulario ? paraFormulario(registro) : registro);
    } else {
      form.resetFields();
    }
  }, [aberto, registro, form, paraFormulario]);

  async function salvar(valores: Record<string, unknown>) {
    try {
      // string vazia reprovaria em @IsEmail e @IsUrl; undefined é simplesmente omitido
      const limpo = Object.fromEntries(
        Object.entries(valores).map(([k, v]) => [k, v === '' ? undefined : v]),
      );
      await (editando ? atualizar : criar).mutateAsync(aoEnviar ? aoEnviar(limpo) : limpo);
      message.success(editando ? `${recurso} atualizado.` : `${recurso} cadastrado.`);
      aoFechar();
    } catch (e) {
      message.error(mensagemDeErro(e));
    }
  }

  return (
    <Modal
      open={aberto}
      title={editando ? `Editar ${recurso}` : `Novo ${recurso}`}
      okText={editando ? 'Salvar' : 'Cadastrar'}
      cancelText="Cancelar"
      confirmLoading={criar.isPending || atualizar.isPending}
      onOk={() => form.submit()}
      onCancel={aoFechar}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout="vertical" onFinish={salvar} initialValues={iniciais} requiredMark="optional">
        {typeof children === 'function' ? children(form) : children}
      </Form>
    </Modal>
  );
}
