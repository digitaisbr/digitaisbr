/**
 * Identidade visual DigitaisBR.
 *
 * Cores e tipografia definidas no brand book (`docs/DIGITAISBR_visual.pdf`).
 * Os valores hexadecimais foram amostrados diretamente das cartelas Pantone
 * do documento — o Indigo Sloth confere com o #230647 ali declarado.
 */

export const marca = {
  /** PANTONE 2727 C — dinamismo, tecnologia, inovação. Cor primária. */
  digitalBlue: '#008EEA',
  /** PANTONE 3275 C — vitalidade e frescor. Usada no "BR" da logo e em positivos. */
  mintLeaf: '#00AD9A',
  /** PANTONE Violet C — sofisticação e originalidade. Destaques e acentos. */
  violet: '#440099',
  /** #230647 — roxo profundo de apoio. Fundos escuros e superfícies de marca. */
  indigoSloth: '#230647',

  // variações derivadas, para estados e superfícies
  azulClaro: '#33A5EF',
  azulEscuro: '#0070C0',
  mintClaro: '#2BC4B2',
  violetClaro: '#5E1BC4',
  indigoClaro: '#3A0F6B',

  // neutros da interface
  texto: '#1F1B2E',
  textoSuave: '#5B5670',
  linha: '#E8E5EF',
  fundo: '#F7F6FA',
} as const;

/** Gradiente da marca — do azul ao violeta, como no símbolo da digital. */
export const gradienteMarca = `linear-gradient(135deg, ${marca.digitalBlue} 0%, ${marca.violet} 100%)`;

/** Fundo escuro institucional, usado nas telas de acesso. */
export const gradienteEscuro =
  `linear-gradient(158deg, ${marca.indigoSloth} 0%, ${marca.indigoClaro} 52%, ${marca.violet} 100%)`;

/**
 * Tipografia do brand book:
 *   principal  — Bebas Kai (títulos e logo)
 *   secundária — Lufga (comunicação e papelaria)
 *
 * Nenhuma das duas é livre. Bebas Neue é a irmã aberta da Bebas Kai e entra
 * como substituta fiel; para a Lufga, uma geométrica próxima (Poppins) cobre
 * o papel. Ambas ficam depois das originais na pilha, então uma instalação
 * licenciada da fonte real prevalece automaticamente.
 */
export const fontes = {
  titulo: '"Bebas Kai", "Bebas Neue", "Oswald", Impact, sans-serif',
  corpo: '"Lufga", "Poppins", "Segoe UI", -apple-system, "Helvetica Neue", Arial, sans-serif',
} as const;

/** Cor de marca associada a cada nível de plano. */
export const corDoPlano: Record<string, string> = {
  BASICO: marca.digitalBlue,
  INTERMEDIARIO: marca.violet,
  AVANCADO: marca.mintLeaf,
};
