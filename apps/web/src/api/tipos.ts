/** Contratos da API DigitaisBR. Espelham os DTOs e enums do backend. */

export type Role = 'ADMIN' | 'ASSOCIADO';
export type NivelPlano = 'BASICO' | 'INTERMEDIARIO' | 'AVANCADO';
export type StatusAssociado = 'ATIVO' | 'INATIVO' | 'SUSPENSO';
export type StatusProduto = 'ATIVO' | 'INATIVO' | 'ESGOTADO';
export type StatusVenda = 'AGUARDANDO_PGTO' | 'PAGA' | 'CANCELADA' | 'REEMBOLSADA';
export type StatusComissao = 'AGUARDANDO_PGTO' | 'PROCESSANDO' | 'PAGA' | 'CANCELADA';
export type StatusTicket = 'ABERTO' | 'EM_ANDAMENTO' | 'RESOLVIDO' | 'FECHADO';
export type PrioridadeTicket = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type TipoBeneficio = 'DESCONTO' | 'ACESSO' | 'CASHBACK' | 'SERVICO';
export type TipoConteudo = 'ARTIGO' | 'VIDEO' | 'PODCAST' | 'CURSO' | 'EBOOK';
export type StatusConteudo = 'PUBLICADO' | 'RASCUNHO' | 'ARQUIVADO';
export type TipoNotificacao = 'SISTEMA' | 'VENDA' | 'COMISSAO' | 'BENEFICIO' | 'SUPORTE' | 'CONTEUDO';
export type CanalNotificacao = 'IN_APP' | 'EMAIL' | 'PUSH';
export type StatusCampanha = 'RASCUNHO' | 'AGENDADA' | 'ENVIADA' | 'CANCELADA';
export type MetodoSaque = 'PIX' | 'TED';
export type StatusSaque = 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'REJEITADO';
export type TipoMaterial = 'BANNER' | 'STORY' | 'POST' | 'VIDEO' | 'COPY';
export type RedeSocial = 'INSTAGRAM' | 'YOUTUBE' | 'TIKTOK' | 'TWITTER' | 'FACEBOOK' | 'LINKEDIN';
export type TipoEscritorio = 'JURIDICO' | 'CONTABIL' | 'JURIDICO_CONTABIL';
export type StatusSolicitacao = 'ABERTA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

// ---------------------------------------------------------------- envelope

export interface Paginado<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FiltrosBase {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  [chave: string]: unknown;
}

// ---------------------------------------------------------------- auth

export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
  role: Role;
  associadoId: string | null;
  plano: NivelPlano | null;
}

export interface RespostaLogin {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  usuario: UsuarioSessao;
}

// ---------------------------------------------------------------- domínio

export interface Plano {
  id: string;
  nivel: NivelPlano;
  nome: string;
  preco: number;
  descricao: string;
  recursos: string[];
  limiteProdutos: number;
  comissaoExtraPct: number;
  suporte: string;
  ordem: number;
  ativo: boolean;
  associadosAtivos?: number;
}

export interface Associado {
  id: string;
  nome: string;
  handle: string;
  email: string;
  nicho: string | null;
  seguidores: number;
  engajamento: number;
  status: StatusAssociado;
  pontuacao: number;
  membroDesde: string;
  plano: { nivel: NivelPlano; nome: string; preco: number };
  loja: { id: string; nome: string; slug: string; ativa: boolean } | null;
  redesSociais: { rede: RedeSocial; handle: string | null; seguidores: number; conectada: boolean }[];
  totalVendas?: number;
  comissaoAcumulada?: number;
}

export interface Produto {
  id: string;
  sku: string;
  nome: string;
  descricao: string | null;
  preco: number;
  comissaoPct: number;
  estoque: number;
  estoqueIlimitado: boolean;
  ganhoEstimado: number;
  status: StatusProduto;
  bloqueado: boolean;
  emLojas: number;
  checkoutUrl: string | null;
  categoria: { id: string; nome: string; slug: string; cor: string | null };
  planoMinimo: { nivel: NivelPlano; nome: string } | null;
}

export interface Categoria {
  id: string;
  nome: string;
  slug: string;
  cor: string | null;
  ordem: number;
  totalProdutos?: number;
}

export interface Loja {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  corPrimaria: string | null;
  ativa: boolean;
  visualizacoes: number;
  totalProdutos?: number;
  totalVendas?: number;
  associado: { id: string; nome: string; handle: string; plano: { nome: string; nivel: NivelPlano } };
}

export interface Venda {
  id: string;
  ref: string;
  clienteNome: string;
  clienteEmail: string | null;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  total: number;
  status: StatusVenda;
  dataVenda: string;
  produto: { id: string; nome: string; sku: string; categoria: { nome: string } };
  associado: { id: string; nome: string; handle: string };
  loja: { id: string; nome: string; slug: string } | null;
  comissao: { id: string; valor: number; percentual: number; status: StatusComissao } | null;
}

export interface Comissao {
  id: string;
  percentual: number;
  valor: number;
  status: StatusComissao;
  pagoEm: string | null;
  associado: { id: string; nome: string; handle: string; email: string };
  venda: {
    id: string;
    ref: string;
    total: number;
    dataVenda: string;
    status: StatusVenda;
    produto: { nome: string; categoria: { nome: string } };
  };
}

export interface Parceiro {
  id: string;
  nome: string;
  segmento: string | null;
  cnpj: string | null;
  email: string | null;
  ativo: boolean;
  totalBeneficios?: number;
}

export interface Beneficio {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: TipoBeneficio;
  valorLabel: string | null;
  utilizacoes: number;
  ativo: boolean;
  bloqueado: boolean;
  parceiro: { id: string; nome: string; segmento: string | null } | null;
  planoMinimo: { nome: string; nivel: NivelPlano };
}

export interface Conteudo {
  id: string;
  titulo: string;
  slug: string;
  descricao: string | null;
  tipo: TipoConteudo;
  status: StatusConteudo;
  autor: string | null;
  visualizacoes: number;
  curtidas: number;
  publicadoEm: string | null;
  bloqueado: boolean;
  planoMinimo: { nome: string; nivel: NivelPlano };
}

export interface Ticket {
  id: string;
  numero: string;
  assunto: string;
  categoria: string;
  prioridade: PrioridadeTicket;
  status: StatusTicket;
  criadoEm: string;
  totalMensagens?: number;
  associado: { id: string; nome: string; handle: string; plano: { nome: string } } | null;
  atribuidoA: { id: string; nome: string } | null;
  mensagens?: TicketMensagem[];
}

export interface TicketMensagem {
  id: string;
  conteudo: string;
  interna: boolean;
  criadoEm: string;
  autor: { id: string; nome: string; role: Role } | null;
}

export interface Post {
  id: string;
  conteudo: string;
  legendaImagem: string | null;
  fixado: boolean;
  visualizacoes: number;
  curtidas: number;
  comentarios: number;
  curtidoPorMim: boolean;
  criadoEm: string;
  autor: { id: string; nome: string; handle: string; plano: { nome: string; nivel: NivelPlano } };
  categoria: { id: string; nome: string; icone: string | null } | null;
}

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: TipoNotificacao;
  canal: CanalNotificacao;
  lida: boolean;
  criadoEm: string;
  link: string | null;
}

export interface Campanha {
  id: string;
  codigo: string;
  titulo: string;
  corpo: string;
  canal: CanalNotificacao | null;
  publicoAlvo: NivelPlano[];
  enviados: number;
  aberturas: number;
  taxaAbertura: number;
  status: StatusCampanha;
  agendadaPara: string | null;
  enviadaEm: string | null;
}

export interface Cupom {
  id: string;
  codigo: string;
  tipoDesconto: 'PERCENTUAL' | 'VALOR';
  desconto: number;
  compraMinima: number | null;
  usos: number;
  limiteUsos: number | null;
  validoAte: string | null;
  ativo: boolean;
  esgotado: boolean;
  expirado: boolean;
}

export interface LinkAfiliado {
  id: string;
  codigo: string;
  cliques: number;
  conversoes: number;
  receita: number;
  comissao: number;
  taxaConversao: number;
  ativo: boolean;
  produto: { id: string; nome: string; preco: number };
}

export interface Saque {
  id: string;
  valor: number;
  metodo: MetodoSaque;
  destino: string;
  status: StatusSaque;
  solicitadoEm: string;
  concluidoEm: string | null;
  motivoRejeicao: string | null;
  associado?: { id: string; nome: string; handle: string };
}

export interface Escritorio {
  id: string;
  nome: string;
  tipo: TipoEscritorio;
  especialidades: string[];
  responsavel: string | null;
  email: string | null;
  telefone: string | null;
  localizacao: string | null;
  nota: number | null;
  atendimentos: number;
  ativo: boolean;
  totalProfissionais?: number;
}

export interface Profissional {
  id: string;
  nome: string;
  especialidade: string | null;
  bio: string | null;
  nota: number | null;
  avaliacoes: number;
  valorHora: number | null;
  disponivel: boolean;
  escritorio: { id: string; nome: string; tipo: TipoEscritorio } | null;
}

export interface Material {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: TipoMaterial;
  categoria: string | null;
  dimensao: string | null;
  arquivoUrl: string | null;
  textoCopy: string | null;
  downloads: number;
}

// ---------------------------------------------------------------- agregados

export interface DashboardAdmin {
  associados: { total: number; ativos: number };
  vendas: { total: number; aprovadas: number; receita: number };
  lojas: { total: number; ativas: number };
  produtos: { total: number; ativos: number };
  comissoes: { pagas: number; pendentes: number };
  saldoFinanceiro: number;
  resumo: {
    beneficios: number;
    parceiros: number;
    conteudos: number;
    topicos: number;
    naoLidas: number;
    tickets: number;
  };
}

export interface SerieMensal {
  mes: string;
  receita: number;
  comissao: number;
  vendas: number;
}

export interface VisaoFinanceira {
  saldoAtual: number;
  totalEntradas: number;
  totalSaidas: number;
  mrr: number;
  arr: number;
  margemLiquida: number;
  comissoesAPagar: number;
  comissoesPagas: number;
  receitaVendas: number;
  lucroLiquido: number;
}

export interface DashboardPortal {
  associado: {
    id: string;
    nome: string;
    handle: string;
    nicho: string | null;
    seguidores: number;
    engajamento: number;
    pontuacao: number;
    plano: Plano;
  };
  vendas: { total: number; aprovadas: number; receita: number };
  comissoes: { recebidas: number; pendentes: number };
  loja: { id: string; nome: string; slug: string; ativa: boolean; produtos: number; visitas: number } | null;
  uso: {
    beneficiosUsados: number;
    beneficiosDisponiveis: number;
    conteudosVistos: number;
    conteudosDisponiveis: number;
  };
  vendasRecentes: {
    id: string;
    ref: string;
    produto: string;
    cliente: string;
    total: number;
    status: StatusVenda;
    data: string;
  }[];
}
