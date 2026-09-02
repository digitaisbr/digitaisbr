/** Formatadores compartilhados por toda a interface. */

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUMERO = new Intl.NumberFormat('pt-BR');

export const moeda = (v: number | null | undefined): string => MOEDA.format(v ?? 0);

export const numero = (v: number | null | undefined): string => NUMERO.format(v ?? 0);

export const percentual = (v: number | null | undefined, casas = 1): string =>
  `${(v ?? 0).toFixed(casas).replace('.', ',')}%`;

/** 791300 -> "791,3K" */
export function compacto(v: number | null | undefined): string {
  const n = v ?? 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.', ',')}K`;
  return String(n);
}

export const data = (v: string | null | undefined): string =>
  v ? new Date(v).toLocaleDateString('pt-BR') : '—';

export const dataHora = (v: string | null | undefined): string =>
  v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

/** "AGUARDANDO_PGTO" -> "Aguardando pgto" */
export function rotulo(v: string | null | undefined): string {
  if (!v) return '—';
  const t = v.replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Cor do Ant Design para cada status conhecido. */
export function corDeStatus(status: string): string {
  const mapa: Record<string, string> = {
    ATIVO: 'green', PAGA: 'green', PUBLICADO: 'green', CONCLUIDO: 'green',
    RESOLVIDO: 'green', ENVIADA: 'green', ABERTA: 'blue',
    INATIVO: 'default', RASCUNHO: 'default', FECHADO: 'default', CANCELADA: 'red',
    SUSPENSO: 'orange', ESGOTADO: 'orange', REEMBOLSADA: 'volcano', REJEITADO: 'red',
    AGUARDANDO_PGTO: 'gold', PROCESSANDO: 'processing', PENDENTE: 'gold',
    ABERTO: 'red', EM_ANDAMENTO: 'blue', AGENDADA: 'cyan',
    BAIXA: 'default', MEDIA: 'blue', ALTA: 'orange', URGENTE: 'red',
    BASICO: 'blue', INTERMEDIARIO: 'purple', AVANCADO: 'gold',
  };
  return mapa[status] ?? 'default';
}
