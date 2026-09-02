/* eslint-disable no-console */
/**
 * Seed do banco DigitaisBR.
 *
 * Popula o banco com o dataset REAL extraído das 113 telas capturadas da
 * plataforma original (`tools/extract.py` -> `prisma/seed-data/*.json`).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// bcrypt nativo (Rust): roda no threadpool do libuv em vez de bloquear o event loop
import { hash as hashSenha } from '@node-rs/bcrypt';
import {
  PrismaClient,
  Role,
  NivelPlano,
  StatusAssociado,
  StatusProduto,
  StatusVenda,
  StatusComissao,
  TipoBeneficio,
  TipoConteudo,
  StatusConteudo,
  StatusTicket,
  PrioridadeTicket,
  TipoNotificacao,
  CanalNotificacao,
  StatusCampanha,
  TipoDesconto,
  MetodoSaque,
  StatusSaque,
  TipoLancamento,
  CategoriaLancamento,
  TipoEscritorio,
  RedeSocial,
  TipoMaterial,
} from '@prisma/client';

const prisma = new PrismaClient();
const DATA = join(__dirname, 'seed-data');

const load = <T>(nome: string): T[] =>
  JSON.parse(readFileSync(join(DATA, `${nome}.json`), 'utf-8')) as T[];

const slugify = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const dec = (v: number | null | undefined): number => v ?? 0;
const date = (v: string | null | undefined): Date | null => (v ? new Date(`${v}T12:00:00Z`) : null);

// ------------------------------------------------------------------ mapas de enum

const NIVEL: Record<string, NivelPlano> = {
  'Básico': NivelPlano.BASICO,
  'Intermediário': NivelPlano.INTERMEDIARIO,
  'Intermediário+': NivelPlano.INTERMEDIARIO,
  'Avançado': NivelPlano.AVANCADO,
  'Todos': NivelPlano.BASICO,
  'Todos os planos': NivelPlano.BASICO,
};

const STATUS_ASSOCIADO: Record<string, StatusAssociado> = {
  Ativo: StatusAssociado.ATIVO,
  Inativo: StatusAssociado.INATIVO,
  Suspenso: StatusAssociado.SUSPENSO,
};

const STATUS_VENDA: Record<string, StatusVenda> = {
  'Aguardando Pgto': StatusVenda.AGUARDANDO_PGTO,
  Paga: StatusVenda.PAGA,
  Cancelada: StatusVenda.CANCELADA,
  Reembolsada: StatusVenda.REEMBOLSADA,
};

const STATUS_COMISSAO: Record<string, StatusComissao> = {
  'Aguardando Pgto': StatusComissao.AGUARDANDO_PGTO,
  Processando: StatusComissao.PROCESSANDO,
  Paga: StatusComissao.PAGA,
  Cancelada: StatusComissao.CANCELADA,
};

const TIPO_CONTEUDO: Record<string, TipoConteudo> = {
  Artigo: TipoConteudo.ARTIGO,
  'Vídeo': TipoConteudo.VIDEO,
  Podcast: TipoConteudo.PODCAST,
  Curso: TipoConteudo.CURSO,
  'E-book': TipoConteudo.EBOOK,
};

const STATUS_CONTEUDO: Record<string, StatusConteudo> = {
  Publicado: StatusConteudo.PUBLICADO,
  Rascunho: StatusConteudo.RASCUNHO,
  Arquivado: StatusConteudo.ARQUIVADO,
};

const STATUS_TICKET: Record<string, StatusTicket> = {
  Aberto: StatusTicket.ABERTO,
  'Em Andamento': StatusTicket.EM_ANDAMENTO,
  Resolvido: StatusTicket.RESOLVIDO,
  Fechado: StatusTicket.FECHADO,
};

const PRIORIDADE: Record<string, PrioridadeTicket> = {
  Baixa: PrioridadeTicket.BAIXA,
  'Média': PrioridadeTicket.MEDIA,
  Alta: PrioridadeTicket.ALTA,
  Urgente: PrioridadeTicket.URGENTE,
};

const TIPO_NOTIF: Record<string, TipoNotificacao> = {
  Sistema: TipoNotificacao.SISTEMA,
  Venda: TipoNotificacao.VENDA,
  'Comissão': TipoNotificacao.COMISSAO,
  'Benefício': TipoNotificacao.BENEFICIO,
  Suporte: TipoNotificacao.SUPORTE,
  'Conteúdo': TipoNotificacao.CONTEUDO,
};

const CANAL: Record<string, CanalNotificacao> = {
  'In-App': CanalNotificacao.IN_APP,
  Email: CanalNotificacao.EMAIL,
  Push: CanalNotificacao.PUSH,
};

const STATUS_CAMPANHA: Record<string, StatusCampanha> = {
  Rascunho: StatusCampanha.RASCUNHO,
  Agendada: StatusCampanha.AGENDADA,
  Enviada: StatusCampanha.ENVIADA,
  Cancelada: StatusCampanha.CANCELADA,
};

const TIPO_ESCRITORIO: Record<string, TipoEscritorio> = {
  'Jurídico': TipoEscritorio.JURIDICO,
  'Contábil': TipoEscritorio.CONTABIL,
  'Jurídico + Contábil': TipoEscritorio.JURIDICO_CONTABIL,
};

const TIPO_MATERIAL: Record<string, TipoMaterial> = {
  Banner: TipoMaterial.BANNER,
  Story: TipoMaterial.STORY,
  Post: TipoMaterial.POST,
  'Vídeo': TipoMaterial.VIDEO,
  Copy: TipoMaterial.COPY,
};

const REDE: Record<string, RedeSocial> = {
  instagram: RedeSocial.INSTAGRAM,
  youtube: RedeSocial.YOUTUBE,
  tiktok: RedeSocial.TIKTOK,
  twitter: RedeSocial.TWITTER,
  facebook: RedeSocial.FACEBOOK,
  linkedin: RedeSocial.LINKEDIN,
};

const METODO_SAQUE: Record<string, MetodoSaque> = {
  PIX: MetodoSaque.PIX,
  TED: MetodoSaque.TED,
};

const STATUS_SAQUE: Record<string, StatusSaque> = {
  Pendente: StatusSaque.PENDENTE,
  Processando: StatusSaque.PROCESSANDO,
  'Concluído': StatusSaque.CONCLUIDO,
  Rejeitado: StatusSaque.REJEITADO,
};

// ------------------------------------------------------------------ tipos do dataset

type SeedPlano = { nome: string; preco: number; descricao: string; recursos: string[] };
type SeedAssociado = {
  id: string; nome: string; handle: string; nicho: string | null; seguidores: number | null;
  engajamento: number | null; redes: string[]; plano: string; status: string;
  email: string | null; cpfCnpj: string | null; telefone: string | null; endereco: string | null;
  cidade: string | null; uf: string | null; slugLoja: string | null; membroDesde: string | null;
  nomeLoja: string | null;
};
type SeedProduto = {
  id: string; nome: string; sku: string; categoria: string; preco: number; comissaoPct: number;
  estoque: number; exclusividade: string; status: string; descricao: string | null;
  checkoutUrl: string | null; criadoEm: string | null; atualizadoEm: string | null;
};
type SeedLoja = {
  id: string; nome: string; dono: string; slug: string; qtdProdutos: number | null;
  visualizacoes: number | null; ativa: boolean; descricao: string | null; produtosPreview: string[];
};
type SeedVenda = {
  id: string; ref: string; produto: string; associado: string; cliente: string;
  quantidade: number; total: number; comissao: number; data: string; status: string;
};
type SeedComissao = {
  id: string; associado: string; produto: string; percentual: number; valor: number;
  dataVenda: string; pagoEm: string | null; status: string;
};
type SeedParceiro = { nome: string; segmento: string | null; cnpj: string | null; email: string | null; status: string };
type SeedBeneficio = {
  nome: string; valor: string | null; descricao: string | null; parceiro: string | null;
  tipo: string | null; planoMinimo: string; utilizacoes: number | null;
};
type SeedConteudo = {
  titulo: string; tipo: string | null; status: string | null; planoMinimo: string;
  descricao: string | null; visualizacoes: number; curtidas: number; autor: string | null;
};
type SeedTicket = {
  id: string; assunto: string; solicitante: string | null; planoSolicitante: string | null;
  categoria: string; prioridade: string; qtdMensagens: number | null; atribuido: string | null;
  status: string; data: string | null;
};
type SeedCupom = {
  codigo: string; tipoDesconto: string; desconto: number; compraMinima: number | null;
  usos: number; limiteUsos: number | null; validade: string | null; status: string;
};
type SeedNotificacao = { titulo: string; tipo: string; canal: string; mensagem: string; data: string | null };
type SeedCampanha = {
  id: string; titulo: string; previa: string; canal: string | null; publico: string;
  enviados: number | null; taxaAbertura: number | null; status: string; data: string | null;
};
type SeedEscritorio = {
  nome: string; tipo: string; especialidades: string[]; responsavel: string | null;
  email: string | null; telefone: string | null; localizacao: string | null;
  atendimentos: number; ativo: boolean;
};
type SeedProfissional = {
  nome: string; especialidade: string | null; bio: string | null; nota: number | null;
  avaliacoes: number; valorHora: number | null; disponivel: boolean;
};
type SeedMaterial = {
  nome: string; dimensao: string | null; tipo: string | null; categoria: string | null;
  descricao: string | null; textoCopy: string | null;
};
type SeedConquista = {
  nome: string; desbloqueada: boolean; progressoAtual: number | null; progressoMeta: number | null;
};
type SeedSaque = {
  data: string | null; valor: number; metodo: string; destino: string;
  status: string; concluidoEm: string | null;
};
type SeedLink = {
  produto: string; codigo: string; cliques: number; conversoes: number;
  receita: number; comissao: number;
};
type SeedMetrica = { data: string | null; cliques: number; conversoes: number; receita: number; comissao: number };
type SeedPost = {
  autor: string; planoAutor: string | null; papelAutor: string | null; categoria: string | null;
  conteudo: string | null; legendaImagem: string | null; data: string | null; fixado: boolean;
  curtidas: number; comentarios: number; visualizacoes: number;
};

// ------------------------------------------------------------------ seed

async function limpar(): Promise<void> {
  // ordem inversa das dependências
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "conquistas_associados", "conquistas", "lancamentos_financeiros", "saques",
      "campanhas", "notificacoes", "solicitacoes_servico", "profissionais",
      "escritorios_parceiros", "tickets_mensagens", "tickets", "curtidas_post",
      "comentarios_post", "posts_comunidade", "categorias_comunidade",
      "materiais_divulgacao", "conteudos_interacoes", "conteudos", "beneficios_usos",
      "beneficios", "parceiros", "metricas_diarias", "links_afiliado", "comissoes",
      "vendas", "cupons", "loja_produtos", "lojas", "produtos", "categorias_produto",
      "assinaturas", "redes_sociais_contas", "associados", "planos",
      "logs_auditoria", "refresh_tokens", "usuarios"
    RESTART IDENTITY CASCADE
  `);
}

async function main(): Promise<void> {
  const t0 = Date.now();
  console.log('\n🌱 Seed DigitaisBR\n');

  await limpar();
  console.log('   banco limpo');

  const senhaAdmin = await hashSenha(process.env.SEED_ADMIN_PASSWORD ?? 'Admin@2026', 10);
  const senhaAssoc = await hashSenha(process.env.SEED_ASSOCIADO_PASSWORD ?? 'Assoc@2026', 10);

  // ---------------------------------------------------------------- planos
  const planosData = load<SeedPlano>('planos');
  const limites: Record<string, number> = { 'Básico': 20, 'Intermediário': 100, 'Avançado': -1 };
  const extras: Record<string, number> = { 'Básico': 0, 'Intermediário': 2, 'Avançado': 5 };
  const suportes: Record<string, string> = {
    'Básico': 'Email',
    'Intermediário': 'Chat',
    'Avançado': 'Prioritário',
  };

  const planos = new Map<NivelPlano, string>();
  for (const [i, p] of planosData.entries()) {
    const nivel = NIVEL[p.nome];
    const criado = await prisma.plano.create({
      data: {
        nivel,
        nome: p.nome,
        preco: p.preco,
        descricao: p.descricao,
        recursos: p.recursos,
        limiteProdutos: limites[p.nome] ?? 20,
        comissaoExtraPct: extras[p.nome] ?? 0,
        suporte: suportes[p.nome] ?? 'Email',
        ordem: i + 1,
      },
    });
    planos.set(nivel, criado.id);
  }
  const planoId = (nome: string | null | undefined): string =>
    planos.get(NIVEL[nome ?? 'Básico'] ?? NivelPlano.BASICO)!;
  console.log(`   planos                 ${planosData.length}`);

  // ---------------------------------------------------------------- admins
  await prisma.usuario.create({
    data: {
      email: process.env.SEED_ADMIN_EMAIL ?? 'administrador@digitaisbr.com',
      senhaHash: senhaAdmin,
      nome: 'Administrador',
      role: Role.ADMIN,
    },
  });

  const agentes = ['Admin DigitaisBR', 'Carlos Atendimento', 'Equipe Técnica', 'Ana Suporte', 'Suporte DigitaisBR'];
  const agenteId = new Map<string, string>();
  for (const nome of agentes) {
    const u = await prisma.usuario.create({
      data: {
        email: `${slugify(nome)}@digitaisbr.com`,
        senhaHash: senhaAdmin,
        nome,
        role: Role.ADMIN,
      },
    });
    agenteId.set(nome, u.id);
  }
  console.log(`   usuários admin         ${agentes.length + 1}`);

  // ---------------------------------------------------------------- associados
  const associadosData = load<SeedAssociado>('associados');
  const assocId = new Map<string, string>(); // nome -> id

  for (const a of associadosData) {
    const email = a.email ?? `${a.handle}@email.com`;
    const usuario = await prisma.usuario.create({
      data: { email, senhaHash: senhaAssoc, nome: a.nome, role: Role.ASSOCIADO },
    });
    const membroDesde = date(a.membroDesde) ?? new Date('2025-05-01T12:00:00Z');
    const criado = await prisma.associado.create({
      data: {
        usuarioId: usuario.id,
        planoId: planoId(a.plano),
        nome: a.nome,
        handle: a.handle,
        email,
        cpfCnpj: a.cpfCnpj,
        telefone: a.telefone,
        nicho: a.nicho,
        seguidores: a.seguidores ?? 0,
        engajamento: dec(a.engajamento),
        endereco: a.endereco,
        cidade: a.cidade,
        uf: a.uf,
        status: STATUS_ASSOCIADO[a.status] ?? StatusAssociado.ATIVO,
        membroDesde,
        assinaturas: {
          create: {
            planoId: planoId(a.plano),
            valor: planosData.find((p) => p.nome === a.plano)?.preco ?? 49.9,
            inicioEm: membroDesde,
            // só associado ativo mantém assinatura vigente — é o que sustenta o MRR
            ativa: (STATUS_ASSOCIADO[a.status] ?? StatusAssociado.ATIVO) === StatusAssociado.ATIVO,
          },
        },
        redesSociais: {
          create: a.redes.map((r) => ({
            rede: REDE[r],
            handle: `@${a.handle}`,
            seguidores: Math.round((a.seguidores ?? 0) / Math.max(a.redes.length, 1)),
            engajamento: dec(a.engajamento),
            conectada: true,
          })),
        },
      },
    });
    assocId.set(a.nome, criado.id);
  }
  console.log(`   associados             ${associadosData.length}`);

  // personas exclusivas da comunidade/suporte (não aparecem na tabela de associados)
  const personas = new Map<string, string>(); // nome -> plano
  for (const p of load<SeedPost>('posts-comunidade')) {
    if (!assocId.has(p.autor)) personas.set(p.autor, p.planoAutor ?? 'Básico');
  }
  for (const t of load<SeedTicket>('tickets')) {
    if (t.solicitante && !assocId.has(t.solicitante) && !agenteId.has(t.solicitante)) {
      personas.set(t.solicitante, t.planoSolicitante ?? 'Básico');
    }
  }
  for (const [nome, plano] of personas) {
    const handle = slugify(nome);
    const email = `${handle}@email.com`;
    const usuario = await prisma.usuario.create({
      data: { email, senhaHash: senhaAssoc, nome, role: Role.ASSOCIADO },
    });
    const criado = await prisma.associado.create({
      data: {
        usuarioId: usuario.id,
        planoId: planoId(plano),
        nome,
        handle,
        email,
        status: StatusAssociado.ATIVO,
        membroDesde: new Date('2025-05-01T12:00:00Z'),
      },
    });
    assocId.set(nome, criado.id);
  }
  console.log(`   personas comunidade    ${personas.size}`);

  // ---------------------------------------------------------------- catálogo
  const categorias = load<string>('categorias-produto');
  const catId = new Map<string, string>();
  for (const [i, nome] of categorias.entries()) {
    const c = await prisma.categoriaProduto.create({
      data: { nome, slug: slugify(nome), ordem: i + 1 },
    });
    catId.set(nome, c.id);
  }

  const produtosData = load<SeedProduto>('produtos');
  const prodId = new Map<string, string>(); // nome -> id
  for (const p of produtosData) {
    const criado = await prisma.produto.create({
      data: {
        sku: p.sku,
        nome: p.nome,
        descricao: p.descricao,
        categoriaId: catId.get(p.categoria)!,
        preco: p.preco,
        comissaoPct: p.comissaoPct,
        estoque: p.estoque,
        planoMinimoId: p.exclusividade === 'Todos' ? null : planoId(p.exclusividade),
        status: p.status === 'Ativo' ? StatusProduto.ATIVO : StatusProduto.INATIVO,
        checkoutUrl: p.checkoutUrl,
        criadoEm: date(p.criadoEm) ?? new Date(),
      },
    });
    prodId.set(p.nome, criado.id);
  }
  console.log(`   categorias/produtos    ${categorias.length}/${produtosData.length}`);

  // ---------------------------------------------------------------- lojas
  const lojasData = load<SeedLoja>('lojas');
  const lojaPorAssociado = new Map<string, string>(); // nome associado -> loja id
  for (const l of lojasData) {
    const associadoId = assocId.get(l.dono);
    if (!associadoId) continue;
    const criada = await prisma.loja.create({
      data: {
        associadoId,
        nome: l.nome,
        slug: l.slug,
        descricao: l.descricao,
        ativa: l.ativa,
        visualizacoes: l.visualizacoes ?? 0,
        produtos: {
          create: l.produtosPreview
            .filter((n) => prodId.has(n))
            .map((n, i) => ({ produtoId: prodId.get(n)!, ordem: i + 1, destaque: i === 0 })),
        },
      },
    });
    lojaPorAssociado.set(l.dono, criada.id);
  }
  const totalLojaProdutos = await prisma.lojaProduto.count();
  console.log(`   lojas / vitrine        ${lojasData.length} / ${totalLojaProdutos}`);

  // ---------------------------------------------------------------- vendas + comissões
  const vendasData = load<SeedVenda>('vendas');
  const comissoesData = load<SeedComissao>('comissoes');
  const comissaoPorVenda = new Map<string, SeedComissao>();
  for (const c of comissoesData) {
    comissaoPorVenda.set(`${c.associado}|${c.produto}|${c.dataVenda}`, c);
  }

  const vendaIdPorRef = new Map<string, string>();
  for (const v of vendasData) {
    const associadoId = assocId.get(v.associado);
    const produtoId = prodId.get(v.produto);
    if (!associadoId || !produtoId) continue;

    const status = STATUS_VENDA[v.status] ?? StatusVenda.AGUARDANDO_PGTO;
    const dataVenda = date(v.data)!;
    const comissao = comissaoPorVenda.get(`${v.associado}|${v.produto}|${v.data}`);

    const criada = await prisma.venda.create({
      data: {
        ref: v.ref,
        produtoId,
        associadoId,
        lojaId: lojaPorAssociado.get(v.associado) ?? null,
        clienteNome: v.cliente,
        clienteEmail: `${slugify(v.cliente)}@cliente.com`,
        quantidade: v.quantidade,
        precoUnitario: v.quantidade > 0 ? Number((v.total / v.quantidade).toFixed(2)) : v.total,
        total: v.total,
        status,
        dataVenda,
        reembolsadaEm: status === StatusVenda.REEMBOLSADA ? dataVenda : null,
        comissao: comissao
          ? {
              create: {
                associadoId,
                percentual: comissao.percentual,
                valor: comissao.valor,
                status: STATUS_COMISSAO[comissao.status] ?? StatusComissao.AGUARDANDO_PGTO,
                pagoEm: date(comissao.pagoEm),
              },
            }
          : undefined,
      },
    });
    vendaIdPorRef.set(v.ref, criada.id);
  }

  // contador desnormalizado de vendas por produto
  const porProduto = await prisma.venda.groupBy({
    by: ['produtoId'],
    where: { status: StatusVenda.PAGA },
    _sum: { quantidade: true },
  });
  for (const g of porProduto) {
    await prisma.produto.update({
      where: { id: g.produtoId },
      data: { totalVendas: g._sum.quantidade ?? 0 },
    });
  }
  console.log(`   vendas / comissões     ${await prisma.venda.count()} / ${await prisma.comissao.count()}`);

  // ---------------------------------------------------------------- parceiros e benefícios
  const parceirosData = load<SeedParceiro>('parceiros');
  const parcId = new Map<string, string>();
  for (const p of parceirosData) {
    const criado = await prisma.parceiro.create({
      data: {
        nome: p.nome,
        segmento: p.segmento,
        cnpj: p.cnpj,
        email: p.email,
        ativo: p.status === 'Ativo',
      },
    });
    parcId.set(p.nome, criado.id);
  }

  const beneficiosData = load<SeedBeneficio>('beneficios');
  for (const b of beneficiosData) {
    // parceiros citados nos benefícios que não estão na tabela de parceiros
    let parceiroId: string | null = null;
    if (b.parceiro) {
      if (!parcId.has(b.parceiro)) {
        const novo = await prisma.parceiro.create({ data: { nome: b.parceiro, ativo: true } });
        parcId.set(b.parceiro, novo.id);
      }
      parceiroId = parcId.get(b.parceiro)!;
    }
    await prisma.beneficio.create({
      data: {
        parceiroId,
        planoMinimoId: planoId(b.planoMinimo),
        nome: b.nome,
        descricao: b.descricao,
        tipo: (b.tipo as TipoBeneficio) ?? TipoBeneficio.DESCONTO,
        valorLabel: b.valor,
        utilizacoes: b.utilizacoes ?? 0,
      },
    });
  }
  console.log(`   parceiros / benefícios ${await prisma.parceiro.count()} / ${beneficiosData.length}`);

  // ---------------------------------------------------------------- conteúdos e materiais
  const conteudosData = load<SeedConteudo>('conteudos');
  for (const c of conteudosData) {
    const status = STATUS_CONTEUDO[c.status ?? 'Rascunho'] ?? StatusConteudo.RASCUNHO;
    await prisma.conteudo.create({
      data: {
        titulo: c.titulo,
        slug: slugify(c.titulo),
        descricao: c.descricao,
        tipo: TIPO_CONTEUDO[c.tipo ?? 'Artigo'] ?? TipoConteudo.ARTIGO,
        status,
        planoMinimoId: planoId(c.planoMinimo),
        autor: c.autor,
        visualizacoes: c.visualizacoes,
        curtidas: c.curtidas,
        publicadoEm: status === StatusConteudo.PUBLICADO ? new Date('2025-06-01T12:00:00Z') : null,
      },
    });
  }

  const materiaisData = load<SeedMaterial>('materiais');
  for (const m of materiaisData) {
    await prisma.materialDivulgacao.create({
      data: {
        nome: m.nome,
        descricao: m.descricao,
        tipo: TIPO_MATERIAL[m.tipo ?? 'Banner'] ?? TipoMaterial.BANNER,
        categoria: m.categoria,
        dimensao: m.dimensao,
        textoCopy: m.textoCopy,
      },
    });
  }
  console.log(`   conteúdos / materiais  ${conteudosData.length} / ${materiaisData.length}`);

  // ---------------------------------------------------------------- comunidade
  const catsComunidade = load<string>('categorias-comunidade');
  const catComId = new Map<string, string>();
  for (const [i, nome] of catsComunidade.entries()) {
    const icone = /\p{Extended_Pictographic}/u.exec(nome)?.[0] ?? null;
    const limpo = nome.replace(/\p{Extended_Pictographic}/gu, '').trim();
    const c = await prisma.categoriaComunidade.create({
      data: { nome: limpo, slug: slugify(limpo), icone, ordem: i + 1 },
    });
    catComId.set(nome, c.id);
  }

  const postsData = load<SeedPost>('posts-comunidade');
  const associadosIds = [...assocId.values()];
  let comentariosCriados = 0;
  let curtidasCriadas = 0;

  for (const p of postsData) {
    const autorId = assocId.get(p.autor);
    if (!autorId) continue;
    const post = await prisma.postComunidade.create({
      data: {
        autorId,
        categoriaId: p.categoria ? (catComId.get(p.categoria) ?? null) : null,
        conteudo: p.conteudo ?? '',
        legendaImagem: p.legendaImagem,
        fixado: p.fixado,
        visualizacoes: p.visualizacoes,
        criadoEm: date(p.data) ?? new Date(),
      },
    });

    // comentários e curtidas: os contadores capturados viram registros reais,
    // distribuídos entre os associados existentes (autores fictícios).
    const outros = associadosIds.filter((id) => id !== autorId);
    const nCurtidas = Math.min(p.curtidas, outros.length);
    if (nCurtidas > 0) {
      await prisma.curtidaPost.createMany({
        data: outros.slice(0, nCurtidas).map((associadoId) => ({ postId: post.id, associadoId })),
        skipDuplicates: true,
      });
      curtidasCriadas += nCurtidas;
    }
    const nComentarios = Math.min(p.comentarios, outros.length);
    if (nComentarios > 0) {
      await prisma.comentarioPost.createMany({
        data: outros.slice(0, nComentarios).map((autor, i) => ({
          postId: post.id,
          autorId: autor,
          conteudo: `Comentário ${i + 1} sobre "${(p.conteudo ?? '').slice(0, 40)}…"`,
        })),
      });
      comentariosCriados += nComentarios;
    }
  }
  console.log(
    `   comunidade             ${postsData.length} posts, ${comentariosCriados} comentários, ${curtidasCriadas} curtidas`,
  );

  // ---------------------------------------------------------------- suporte
  const ticketsData = load<SeedTicket>('tickets');
  let mensagensCriadas = 0;
  for (const t of ticketsData) {
    const status = STATUS_TICKET[t.status] ?? StatusTicket.ABERTO;
    const criadoEm = date(t.data) ?? new Date();
    const ticket = await prisma.ticket.create({
      data: {
        numero: t.id,
        associadoId: t.solicitante ? (assocId.get(t.solicitante) ?? null) : null,
        atribuidoAId: t.atribuido ? (agenteId.get(t.atribuido) ?? null) : null,
        assunto: t.assunto,
        categoria: t.categoria,
        prioridade: PRIORIDADE[t.prioridade] ?? PrioridadeTicket.MEDIA,
        status,
        resolvidoEm: status === StatusTicket.RESOLVIDO ? criadoEm : null,
        criadoEm,
      },
    });

    const n = t.qtdMensagens ?? 1;
    const autorAssociado = t.solicitante ? assocId.get(t.solicitante) : undefined;
    const usuarioDoAssociado = autorAssociado
      ? (await prisma.associado.findUnique({ where: { id: autorAssociado }, select: { usuarioId: true } }))?.usuarioId
      : undefined;
    const agente = t.atribuido ? agenteId.get(t.atribuido) : undefined;

    await prisma.ticketMensagem.createMany({
      data: Array.from({ length: n }, (_, i) => ({
        ticketId: ticket.id,
        autorId: i % 2 === 0 ? (usuarioDoAssociado ?? null) : (agente ?? null),
        conteudo:
          i === 0
            ? t.assunto
            : i % 2 === 0
              ? `Retorno do associado (${i + 1}/${n}).`
              : `Resposta do atendimento (${i + 1}/${n}).`,
      })),
    });
    mensagensCriadas += n;
  }
  console.log(`   tickets / mensagens    ${ticketsData.length} / ${mensagensCriadas}`);

  // ---------------------------------------------------------------- serviços
  const escritoriosData = load<SeedEscritorio>('escritorios');
  const escId = new Map<string, string>();
  for (const e of escritoriosData) {
    const criado = await prisma.escritorioParceiro.create({
      data: {
        nome: e.nome,
        tipo: TIPO_ESCRITORIO[e.tipo] ?? TipoEscritorio.JURIDICO,
        especialidades: e.especialidades,
        responsavel: e.responsavel,
        email: e.email,
        telefone: e.telefone,
        localizacao: e.localizacao,
        atendimentos: e.atendimentos,
        ativo: e.ativo,
      },
    });
    escId.set(e.nome, criado.id);
    if (e.responsavel) escId.set(e.responsavel, criado.id);
  }

  const profissionaisData = load<SeedProfissional>('profissionais');
  for (const p of profissionaisData) {
    await prisma.profissional.create({
      data: {
        escritorioId: escId.get(p.nome) ?? null,
        nome: p.nome,
        especialidade: p.especialidade,
        bio: p.bio,
        nota: p.nota,
        avaliacoes: p.avaliacoes,
        valorHora: p.valorHora,
        disponivel: p.disponivel,
      },
    });
  }
  console.log(`   escritórios / profis.  ${escritoriosData.length} / ${profissionaisData.length}`);

  // ---------------------------------------------------------------- portal da Ana Silva (assoc-1)
  const ana = assocId.get('Ana Silva')!;

  const cuponsData = load<SeedCupom>('cupons');
  for (const c of cuponsData) {
    await prisma.cupom.create({
      data: {
        associadoId: ana,
        codigo: c.codigo,
        tipoDesconto: c.tipoDesconto as TipoDesconto,
        desconto: c.desconto,
        compraMinima: c.compraMinima,
        usos: c.usos,
        limiteUsos: c.limiteUsos,
        validoAte: date(c.validade),
        ativo: c.status === 'Ativo',
      },
    });
  }

  const linksData = load<SeedLink>('links-afiliado');
  for (const l of linksData) {
    const produtoId = prodId.get(l.produto);
    if (!produtoId) continue;
    await prisma.linkAfiliado.create({
      data: {
        associadoId: ana,
        produtoId,
        codigo: l.codigo,
        cliques: l.cliques,
        conversoes: l.conversoes,
        receita: l.receita,
        comissao: l.comissao,
      },
    });
  }

  // Todo produto exposto numa vitrine precisa de link rastreável: é ele que
  // liga a compra ao associado. Sem isto, a loja venderia sem atribuição.
  const naVitrine = await prisma.lojaProduto.findMany({
    include: { loja: { select: { associadoId: true, associado: { select: { handle: true } } } } },
  });

  const jaTemLink = new Set(
    (await prisma.linkAfiliado.findMany({ select: { associadoId: true, produtoId: true } })).map(
      (l) => `${l.associadoId}|${l.produtoId}`,
    ),
  );

  // maior sufixo já emitido por prefixo — evita colidir com os códigos do seed
  const sequencial = new Map<string, number>();
  for (const { codigo } of await prisma.linkAfiliado.findMany({ select: { codigo: true } })) {
    const m = /^([A-Z]+)(\d+)$/.exec(codigo);
    if (!m) continue;
    const [, prefixo, n] = m;
    sequencial.set(prefixo, Math.max(sequencial.get(prefixo) ?? 0, Number(n)));
  }

  const novosLinks: { associadoId: string; produtoId: string; codigo: string }[] = [];

  for (const item of naVitrine) {
    const chave = `${item.loja.associadoId}|${item.produtoId}`;
    if (jaTemLink.has(chave)) continue;

    const prefixo =
      item.loja.associado.handle.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase() || 'DBR';
    const n = (sequencial.get(prefixo) ?? 0) + 1;
    sequencial.set(prefixo, n);

    novosLinks.push({ associadoId: item.loja.associadoId, produtoId: item.produtoId, codigo: `${prefixo}${n}` });
    jaTemLink.add(chave);
  }

  if (novosLinks.length) {
    await prisma.linkAfiliado.createMany({ data: novosLinks, skipDuplicates: true });
  }
  console.log(`   links de afiliado      ${await prisma.linkAfiliado.count()} (${novosLinks.length} gerados p/ vitrines)`);

  const saquesData = load<SeedSaque>('saques');
  for (const s of saquesData) {
    await prisma.saque.create({
      data: {
        associadoId: ana,
        valor: s.valor,
        metodo: METODO_SAQUE[s.metodo] ?? MetodoSaque.PIX,
        destino: s.destino,
        status: STATUS_SAQUE[s.status] ?? StatusSaque.PENDENTE,
        solicitadoEm: date(s.data) ?? new Date(),
        concluidoEm: date(s.concluidoEm),
      },
    });
  }

  const metricasData = load<SeedMetrica>('metricas-diarias');
  for (const m of metricasData) {
    if (!m.data) continue;
    await prisma.metricaDiaria.create({
      data: {
        associadoId: ana,
        data: new Date(`${m.data}T00:00:00Z`),
        cliques: m.cliques,
        conversoes: m.conversoes,
        receita: m.receita,
        comissao: m.comissao,
      },
    });
  }
  console.log(
    `   portal (Ana Silva)     ${cuponsData.length} cupons, ${linksData.length} links, ${saquesData.length} saques, ${metricasData.length} métricas`,
  );

  // ---------------------------------------------------------------- notificações e campanhas
  const notifData = load<SeedNotificacao>('notificacoes');
  for (const [i, n] of notifData.entries()) {
    await prisma.notificacao.create({
      data: {
        associadoId: ana,
        titulo: n.titulo,
        mensagem: n.mensagem,
        tipo: TIPO_NOTIF[n.tipo] ?? TipoNotificacao.SISTEMA,
        canal: CANAL[n.canal] ?? CanalNotificacao.IN_APP,
        lida: i % 2 === 1,
        lidaEm: i % 2 === 1 ? new Date() : null,
        criadoEm: date(n.data) ?? new Date(),
      },
    });
  }

  const campanhasData = load<SeedCampanha>('campanhas');
  for (const c of campanhasData) {
    const publico: NivelPlano[] =
      c.publico === 'Todos os planos'
        ? [NivelPlano.BASICO, NivelPlano.INTERMEDIARIO, NivelPlano.AVANCADO]
        : c.publico.split(' ').map((p) => NIVEL[p]).filter(Boolean);
    const status = STATUS_CAMPANHA[c.status] ?? StatusCampanha.RASCUNHO;
    const enviados = c.enviados ?? 0;
    await prisma.campanha.create({
      data: {
        codigo: c.id,
        titulo: c.titulo,
        corpo: c.previa,
        canal: c.canal && c.canal !== 'Todos' ? (CANAL[c.canal] ?? null) : null,
        publicoAlvo: publico,
        enviados,
        aberturas: Math.round((enviados * (c.taxaAbertura ?? 0)) / 100),
        status,
        agendadaPara: status === StatusCampanha.AGENDADA ? date(c.data) : null,
        enviadaEm: status === StatusCampanha.ENVIADA ? date(c.data) : null,
      },
    });
  }
  console.log(`   notificações/campanhas ${notifData.length} / ${campanhasData.length}`);

  // ---------------------------------------------------------------- gamificação
  const conquistasData = load<SeedConquista>('conquistas');
  for (const [i, c] of conquistasData.entries()) {
    const conquista = await prisma.conquista.create({
      data: {
        nome: c.nome,
        meta: c.progressoMeta ?? 1,
        pontos: (i + 1) * 50,
        ordem: i + 1,
      },
    });
    await prisma.conquistaAssociado.create({
      data: {
        conquistaId: conquista.id,
        associadoId: ana,
        progresso: c.desbloqueada ? (c.progressoMeta ?? 1) : (c.progressoAtual ?? 0),
        desbloqueada: c.desbloqueada,
        desbloqueadaEm: c.desbloqueada ? new Date('2026-01-01T12:00:00Z') : null,
      },
    });
  }
  console.log(`   conquistas             ${conquistasData.length}`);

  // ---------------------------------------------------------------- financeiro (DRE)
  // Reproduz o modelo da tela original: entradas = receita das vendas aprovadas;
  // saídas = comissões pagas + custos operacionais.
  const vendasPagas = await prisma.venda.findMany({
    where: { status: StatusVenda.PAGA },
    select: { total: true, dataVenda: true },
  });

  const receitaPorMes = new Map<string, number>();
  for (const v of vendasPagas) {
    const mes = v.dataVenda.toISOString().slice(0, 7);
    receitaPorMes.set(mes, (receitaPorMes.get(mes) ?? 0) + Number(v.total));
  }

  for (const [mes, valor] of receitaPorMes) {
    await prisma.lancamentoFinanceiro.create({
      data: {
        tipo: TipoLancamento.ENTRADA,
        categoria: CategoriaLancamento.VENDA,
        descricao: `Receita de vendas aprovadas — ${mes}`,
        valor: Number(valor.toFixed(2)),
        competencia: new Date(`${mes}-01T00:00:00Z`),
      },
    });
  }

  const mesesComReceita = [...receitaPorMes.keys()].sort();
  const ultimoMes = mesesComReceita.at(-1) ?? '2025-07';

  // custos operacionais, nas mesmas proporções da composição de saídas original
  const custos: Array<[CategoriaLancamento, number]> = [
    [CategoriaLancamento.INFRAESTRUTURA, 241.32],
    [CategoriaLancamento.MARKETING, 201.1],
    [CategoriaLancamento.SUPORTE, 120.66],
    [CategoriaLancamento.JURIDICO, 80.44],
  ];

  for (const [categoria, total] of custos) {
    const porMes = total / Math.max(mesesComReceita.length, 1);
    for (const mes of mesesComReceita) {
      await prisma.lancamentoFinanceiro.create({
        data: {
          tipo: TipoLancamento.SAIDA,
          categoria,
          descricao: `${categoria} — ${mes}`,
          valor: Number(porMes.toFixed(2)),
          competencia: new Date(`${mes}-01T00:00:00Z`),
        },
      });
    }
  }

  const comissoesPagas = await prisma.comissao.aggregate({
    where: { status: StatusComissao.PAGA },
    _sum: { valor: true },
  });
  await prisma.lancamentoFinanceiro.create({
    data: {
      tipo: TipoLancamento.SAIDA,
      categoria: CategoriaLancamento.COMISSAO,
      descricao: 'Comissões pagas a associados',
      valor: Number(comissoesPagas._sum.valor ?? 0),
      competencia: new Date(`${ultimoMes}-01T00:00:00Z`),
    },
  });

  console.log(`   lançamentos financ.    ${await prisma.lancamentoFinanceiro.count()}`);

  // ---------------------------------------------------------------- pontuação (ranking)
  const rank = await prisma.associado.findMany({
    select: {
      id: true,
      _count: { select: { vendas: true } },
      comissoes: { select: { valor: true } },
    },
  });
  for (const a of rank) {
    const totalComissao = a.comissoes.reduce((s, c) => s + Number(c.valor), 0);
    await prisma.associado.update({
      where: { id: a.id },
      data: { pontuacao: Math.round(a._count.vendas * 100 + totalComissao) },
    });
  }

  console.log(`\n✅ Seed concluído em ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
  console.log('   Admin:     administrador@digitaisbr.com / Admin@2026');
  console.log('   Associado: ana-silva@email.com / Assoc@2026\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
