import { registerDecorator, type ValidationOptions } from 'class-validator';

/**
 * Confere os dois dígitos verificadores do CNPJ.
 *
 * Só o formato não basta: `11.111.111/1111-11` passa em qualquer expressão
 * regular e não corresponde a empresa nenhuma. Erro de digitação em documento
 * costuma aparecer meses depois, na hora de emitir nota ou pagar.
 */
export function cnpjValido(valor: string): boolean {
  const n = valor.replace(/\D/g, '');
  if (n.length !== 14) return false;
  // sequências repetidas passam no cálculo, mas não são CNPJ de ninguém
  if (/^(\d)\1{13}$/.test(n)) return false;

  const digito = (ateh: number): number => {
    // os pesos descem de 9 até 2 e recomeçam, a partir da direita do trecho
    let soma = 0;
    let peso = 2;
    for (let i = ateh - 1; i >= 0; i--) {
      soma += Number(n[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return digito(12) === Number(n[12]) && digito(13) === Number(n[13]);
}

export function EhCnpj(opcoes?: ValidationOptions) {
  return function (alvo: object, propriedade: string): void {
    registerDecorator({
      name: 'ehCnpj',
      target: alvo.constructor,
      propertyName: propriedade,
      options: opcoes,
      validator: {
        validate: (valor: unknown) => typeof valor === 'string' && cnpjValido(valor),
        defaultMessage: () => 'CNPJ inválido — confira os números.',
      },
    });
  };
}
