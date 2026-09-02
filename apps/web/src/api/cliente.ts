import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { RespostaLogin, UsuarioSessao } from './tipos';

const CHAVE_ACCESS = 'dbr:access';
const CHAVE_REFRESH = 'dbr:refresh';
const CHAVE_USUARIO = 'dbr:usuario';

export const sessao = {
  get access(): string | null {
    return localStorage.getItem(CHAVE_ACCESS);
  },
  get refresh(): string | null {
    return localStorage.getItem(CHAVE_REFRESH);
  },
  get usuario(): UsuarioSessao | null {
    const bruto = localStorage.getItem(CHAVE_USUARIO);
    try {
      return bruto ? (JSON.parse(bruto) as UsuarioSessao) : null;
    } catch {
      return null;
    }
  },
  salvar(dados: RespostaLogin): void {
    localStorage.setItem(CHAVE_ACCESS, dados.accessToken);
    localStorage.setItem(CHAVE_REFRESH, dados.refreshToken);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(dados.usuario));
  },
  limpar(): void {
    [CHAVE_ACCESS, CHAVE_REFRESH, CHAVE_USUARIO].forEach((c) => localStorage.removeItem(c));
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessao.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Renovação de token: o access dura 15 minutos. Ao receber 401, tentamos
 * renovar uma única vez e refazer a requisição original. Requisições
 * simultâneas que falhem no mesmo intervalo aguardam a mesma renovação,
 * em vez de dispararem várias — o refresh é rotativo e só serve uma vez.
 */
let renovacaoEmCurso: Promise<string> | null = null;

async function renovar(): Promise<string> {
  const refreshToken = sessao.refresh;
  if (!refreshToken) throw new Error('sem refresh token');

  const { data } = await axios.post<RespostaLogin>(
    `${import.meta.env.VITE_API_URL ?? '/api'}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  sessao.salvar(data);
  return data.accessToken;
}

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro: AxiosError) => {
    const original = erro.config as InternalAxiosRequestConfig & { _repetida?: boolean };
    const ehLogin = original?.url?.includes('/auth/login');

    if (erro.response?.status !== 401 || original?._repetida || ehLogin) {
      return Promise.reject(erro);
    }

    original._repetida = true;
    try {
      renovacaoEmCurso ??= renovar().finally(() => {
        renovacaoEmCurso = null;
      });
      const novoToken = await renovacaoEmCurso;
      original.headers.Authorization = `Bearer ${novoToken}`;
      return api(original);
    } catch {
      sessao.limpar();
      if (!location.pathname.startsWith('/login')) location.assign('/login');
      return Promise.reject(erro);
    }
  },
);

/** Extrai a mensagem legível de um erro da API. */
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível concluir a operação.'): string {
  if (axios.isAxiosError(erro)) {
    const dados = erro.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(dados?.message)) return dados.message.join(' · ');
    if (dados?.message) return dados.message;
    if (erro.code === 'ERR_NETWORK') return 'API indisponível. Verifique se o backend está no ar.';
  }
  return padrao;
}
