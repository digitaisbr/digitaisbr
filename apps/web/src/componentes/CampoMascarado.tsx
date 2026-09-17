import { Input, type InputProps } from 'antd';

/**
 * Formata enquanto se digita, aceitando só dígitos.
 *
 * Deixar o formato por conta de quem preenche produz a mesma informação
 * escrita de cinco jeitos — e a API, que valida formato, recusa quatro deles
 * sem explicar qual é o certo.
 */
type Formato = 'cnpj' | 'cpfCnpj' | 'telefone' | 'cep';

/** Aplica o molde sobre os dígitos, parando onde a digitação parou. */
function aplicar(molde: string, digitos: string): string {
  let saida = '';
  let i = 0;
  for (const c of molde) {
    if (i >= digitos.length) break;
    if (c === '#') {
      saida += digitos[i];
      i += 1;
    } else {
      saida += c;
    }
  }
  return saida;
}

const MOLDES: Record<Formato, (d: string) => string> = {
  cnpj: (d) => aplicar('##.###.###/####-##', d.slice(0, 14)),
  cep: (d) => aplicar('#####-###', d.slice(0, 8)),
  // CPF e CNPJ dividem o mesmo campo; o molde segue o tamanho digitado
  cpfCnpj: (d) =>
    d.length <= 11 ? aplicar('###.###.###-##', d) : aplicar('##.###.###/####-##', d.slice(0, 14)),
  // celular tem nove dígitos, fixo tem oito — o parêntese vale para os dois
  telefone: (d) =>
    d.length <= 10 ? aplicar('(##) ####-####', d) : aplicar('(##) #####-####', d.slice(0, 11)),
};

interface Props extends Omit<InputProps, 'onChange' | 'value'> {
  formato: Formato;
  value?: string;
  onChange?: (valor: string) => void;
}

export function CampoMascarado({ formato, value, onChange, ...resto }: Props) {
  return (
    <Input
      {...resto}
      value={value ?? ''}
      onChange={(e) => onChange?.(MOLDES[formato](e.target.value.replace(/\D/g, '')))}
    />
  );
}
