import horizontal from '@/assets/logo-horizontal.png';
import vertical from '@/assets/logo-vertical.png';
import simbolo from '@/assets/simbolo.png';

type Variante = 'horizontal' | 'vertical' | 'simbolo';

const ARQUIVO: Record<Variante, string> = { horizontal, vertical, simbolo };

interface Props {
  variante?: Variante;
  /** altura em pixels; a largura acompanha a proporção */
  altura?: number;
  className?: string;
}

/**
 * Logo oficial DigitaisBR. Os arquivos vêm do kit da marca e têm fundo
 * transparente, então funcionam sobre claro e sobre escuro.
 */
export function Logo({ variante = 'horizontal', altura = 34, className }: Props) {
  return (
    <img
      src={ARQUIVO[variante]}
      alt="DigitaisBR"
      className={className}
      style={{ height: altura, width: 'auto', display: 'block' }}
    />
  );
}
