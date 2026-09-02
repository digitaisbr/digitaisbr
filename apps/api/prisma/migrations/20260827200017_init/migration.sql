-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ASSOCIADO');

-- CreateEnum
CREATE TYPE "StatusAssociado" AS ENUM ('ATIVO', 'INATIVO', 'SUSPENSO');

-- CreateEnum
CREATE TYPE "NivelPlano" AS ENUM ('BASICO', 'INTERMEDIARIO', 'AVANCADO');

-- CreateEnum
CREATE TYPE "StatusProduto" AS ENUM ('ATIVO', 'INATIVO', 'ESGOTADO');

-- CreateEnum
CREATE TYPE "StatusVenda" AS ENUM ('AGUARDANDO_PGTO', 'PAGA', 'CANCELADA', 'REEMBOLSADA');

-- CreateEnum
CREATE TYPE "StatusComissao" AS ENUM ('AGUARDANDO_PGTO', 'PROCESSANDO', 'PAGA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoBeneficio" AS ENUM ('DESCONTO', 'ACESSO', 'CASHBACK', 'SERVICO');

-- CreateEnum
CREATE TYPE "TipoConteudo" AS ENUM ('ARTIGO', 'VIDEO', 'PODCAST', 'CURSO', 'EBOOK');

-- CreateEnum
CREATE TYPE "StatusConteudo" AS ENUM ('PUBLICADO', 'RASCUNHO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "StatusTicket" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'FECHADO');

-- CreateEnum
CREATE TYPE "PrioridadeTicket" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('SISTEMA', 'VENDA', 'COMISSAO', 'BENEFICIO', 'SUPORTE', 'CONTEUDO');

-- CreateEnum
CREATE TYPE "CanalNotificacao" AS ENUM ('IN_APP', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "StatusCampanha" AS ENUM ('RASCUNHO', 'AGENDADA', 'ENVIADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoDesconto" AS ENUM ('PERCENTUAL', 'VALOR');

-- CreateEnum
CREATE TYPE "MetodoSaque" AS ENUM ('PIX', 'TED');

-- CreateEnum
CREATE TYPE "StatusSaque" AS ENUM ('PENDENTE', 'PROCESSANDO', 'CONCLUIDO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "CategoriaLancamento" AS ENUM ('ASSINATURA', 'VENDA', 'COMISSAO', 'INFRAESTRUTURA', 'MARKETING', 'SUPORTE', 'JURIDICO', 'OUTROS');

-- CreateEnum
CREATE TYPE "TipoEscritorio" AS ENUM ('JURIDICO', 'CONTABIL', 'JURIDICO_CONTABIL');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "RedeSocial" AS ENUM ('INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'TWITTER', 'FACEBOOK', 'LINKEDIN');

-- CreateEnum
CREATE TYPE "TipoMaterial" AS ENUM ('BANNER', 'STORY', 'POST', 'VIDEO', 'COPY');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ASSOCIADO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoLogin" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "dados" JSONB,
    "ip" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos" (
    "id" TEXT NOT NULL,
    "nivel" "NivelPlano" NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT NOT NULL,
    "recursos" TEXT[],
    "limiteProdutos" INTEGER NOT NULL DEFAULT 20,
    "comissaoExtraPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "suporte" TEXT NOT NULL DEFAULT 'Email',
    "ordem" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "associados" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpfCnpj" TEXT,
    "telefone" TEXT,
    "nicho" TEXT,
    "bio" TEXT,
    "seguidores" INTEGER NOT NULL DEFAULT 0,
    "engajamento" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "endereco" TEXT,
    "cidade" TEXT,
    "uf" VARCHAR(2),
    "status" "StatusAssociado" NOT NULL DEFAULT 'ATIVO',
    "pontuacao" INTEGER NOT NULL DEFAULT 0,
    "mostrarEmail" BOOLEAN NOT NULL DEFAULT false,
    "mostrarTelefone" BOOLEAN NOT NULL DEFAULT false,
    "membroDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "associados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redes_sociais_contas" (
    "id" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "rede" "RedeSocial" NOT NULL,
    "handle" TEXT,
    "url" TEXT,
    "seguidores" INTEGER NOT NULL DEFAULT 0,
    "engajamento" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "posts" INTEGER NOT NULL DEFAULT 0,
    "conectada" BOOLEAN NOT NULL DEFAULT false,
    "sincronizadaEm" TIMESTAMP(3),

    CONSTRAINT "redes_sociais_contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "inicioEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fimEm" TIMESTAMP(3),
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_produto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cor" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categorias_produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoriaId" TEXT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "comissaoPct" DECIMAL(5,2) NOT NULL,
    "estoque" INTEGER NOT NULL DEFAULT -1,
    "planoMinimoId" TEXT,
    "status" "StatusProduto" NOT NULL DEFAULT 'ATIVO',
    "checkoutUrl" TEXT,
    "imagemUrl" TEXT,
    "totalVendas" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lojas" (
    "id" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "corPrimaria" TEXT DEFAULT '#1677ff',
    "bannerUrl" TEXT,
    "logoUrl" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "visualizacoes" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lojas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loja_produtos" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "adicionadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loja_produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendas" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "lojaId" TEXT,
    "cupomId" TEXT,
    "clienteNome" TEXT NOT NULL,
    "clienteEmail" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "precoUnitario" DECIMAL(10,2) NOT NULL,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "StatusVenda" NOT NULL DEFAULT 'AGUARDANDO_PGTO',
    "dataVenda" TIMESTAMP(3) NOT NULL,
    "reembolsadaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissoes" (
    "id" TEXT NOT NULL,
    "vendaId" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "StatusComissao" NOT NULL DEFAULT 'AGUARDANDO_PGTO',
    "pagoEm" TIMESTAMP(3),
    "saqueId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cupons" (
    "id" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipoDesconto" "TipoDesconto" NOT NULL DEFAULT 'PERCENTUAL',
    "desconto" DECIMAL(10,2) NOT NULL,
    "compraMinima" DECIMAL(10,2),
    "usos" INTEGER NOT NULL DEFAULT 0,
    "limiteUsos" INTEGER,
    "validoAte" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links_afiliado" (
    "id" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cliques" INTEGER NOT NULL DEFAULT 0,
    "conversoes" INTEGER NOT NULL DEFAULT 0,
    "receita" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "comissao" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "links_afiliado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metricas_diarias" (
    "id" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "cliques" INTEGER NOT NULL DEFAULT 0,
    "conversoes" INTEGER NOT NULL DEFAULT 0,
    "receita" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "comissao" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "metricas_diarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parceiros" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "segmento" TEXT,
    "cnpj" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "site" TEXT,
    "logoUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parceiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficios" (
    "id" TEXT NOT NULL,
    "parceiroId" TEXT,
    "planoMinimoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoBeneficio" NOT NULL DEFAULT 'DESCONTO',
    "valorLabel" TEXT,
    "instrucoes" TEXT,
    "utilizacoes" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beneficios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficios_usos" (
    "id" TEXT NOT NULL,
    "beneficioId" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "usadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficios_usos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteudos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "corpo" TEXT,
    "tipo" "TipoConteudo" NOT NULL,
    "status" "StatusConteudo" NOT NULL DEFAULT 'RASCUNHO',
    "planoMinimoId" TEXT NOT NULL,
    "autor" TEXT,
    "capaUrl" TEXT,
    "visualizacoes" INTEGER NOT NULL DEFAULT 0,
    "curtidas" INTEGER NOT NULL DEFAULT 0,
    "publicadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conteudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteudos_interacoes" (
    "id" TEXT NOT NULL,
    "conteudoId" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "visualizado" BOOLEAN NOT NULL DEFAULT true,
    "curtido" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conteudos_interacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiais_divulgacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoMaterial" NOT NULL,
    "categoria" TEXT,
    "dimensao" TEXT,
    "arquivoUrl" TEXT,
    "textoCopy" TEXT,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiais_divulgacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_comunidade" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icone" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categorias_comunidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts_comunidade" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "conteudo" TEXT NOT NULL,
    "imagemUrl" TEXT,
    "legendaImagem" TEXT,
    "fixado" BOOLEAN NOT NULL DEFAULT false,
    "visualizacoes" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_comunidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios_post" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curtidas_post" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curtidas_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "associadoId" TEXT,
    "atribuidoAId" TEXT,
    "assunto" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "prioridade" "PrioridadeTicket" NOT NULL DEFAULT 'MEDIA',
    "status" "StatusTicket" NOT NULL DEFAULT 'ABERTO',
    "resolvidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets_mensagens" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "autorId" TEXT,
    "conteudo" TEXT NOT NULL,
    "interna" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escritorios_parceiros" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoEscritorio" NOT NULL,
    "especialidades" TEXT[],
    "responsavel" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "localizacao" TEXT,
    "nota" DECIMAL(3,2),
    "atendimentos" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escritorios_parceiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profissionais" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT,
    "nome" TEXT NOT NULL,
    "especialidade" TEXT,
    "bio" TEXT,
    "nota" DECIMAL(3,2),
    "avaliacoes" INTEGER NOT NULL DEFAULT 0,
    "valorHora" DECIMAL(10,2),
    "disponivel" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profissionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_servico" (
    "id" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "profissionalId" TEXT,
    "assunto" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'ABERTA',
    "concluidaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacoes_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "associadoId" TEXT,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL DEFAULT 'SISTEMA',
    "canal" "CanalNotificacao" NOT NULL DEFAULT 'IN_APP',
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "lidaEm" TIMESTAMP(3),
    "link" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanhas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "canal" "CanalNotificacao",
    "publicoAlvo" "NivelPlano"[],
    "enviados" INTEGER NOT NULL DEFAULT 0,
    "aberturas" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusCampanha" NOT NULL DEFAULT 'RASCUNHO',
    "agendadaPara" TIMESTAMP(3),
    "enviadaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campanhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saques" (
    "id" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "metodo" "MetodoSaque" NOT NULL DEFAULT 'PIX',
    "destino" TEXT NOT NULL,
    "status" "StatusSaque" NOT NULL DEFAULT 'PENDENTE',
    "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),
    "motivoRejeicao" TEXT,

    CONSTRAINT "saques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos_financeiros" (
    "id" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "categoria" "CategoriaLancamento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "competencia" DATE NOT NULL,
    "referencia" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lancamentos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conquistas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "icone" TEXT,
    "meta" INTEGER NOT NULL DEFAULT 1,
    "pontos" INTEGER NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "conquistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conquistas_associados" (
    "id" TEXT NOT NULL,
    "conquistaId" TEXT NOT NULL,
    "associadoId" TEXT NOT NULL,
    "progresso" INTEGER NOT NULL DEFAULT 0,
    "desbloqueada" BOOLEAN NOT NULL DEFAULT false,
    "desbloqueadaEm" TIMESTAMP(3),

    CONSTRAINT "conquistas_associados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_role_ativo_idx" ON "usuarios"("role", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuarioId_revogado_idx" ON "refresh_tokens"("usuarioId", "revogado");

-- CreateIndex
CREATE INDEX "logs_auditoria_entidade_entidadeId_idx" ON "logs_auditoria"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "logs_auditoria_criadoEm_idx" ON "logs_auditoria"("criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "planos_nivel_key" ON "planos"("nivel");

-- CreateIndex
CREATE UNIQUE INDEX "planos_nome_key" ON "planos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "associados_usuarioId_key" ON "associados"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "associados_handle_key" ON "associados"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "associados_email_key" ON "associados"("email");

-- CreateIndex
CREATE UNIQUE INDEX "associados_cpfCnpj_key" ON "associados"("cpfCnpj");

-- CreateIndex
CREATE INDEX "associados_status_planoId_idx" ON "associados"("status", "planoId");

-- CreateIndex
CREATE INDEX "associados_nicho_idx" ON "associados"("nicho");

-- CreateIndex
CREATE UNIQUE INDEX "redes_sociais_contas_associadoId_rede_key" ON "redes_sociais_contas"("associadoId", "rede");

-- CreateIndex
CREATE INDEX "assinaturas_associadoId_ativa_idx" ON "assinaturas"("associadoId", "ativa");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_produto_nome_key" ON "categorias_produto"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_produto_slug_key" ON "categorias_produto"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_sku_key" ON "produtos"("sku");

-- CreateIndex
CREATE INDEX "produtos_status_categoriaId_idx" ON "produtos"("status", "categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "lojas_associadoId_key" ON "lojas"("associadoId");

-- CreateIndex
CREATE UNIQUE INDEX "lojas_slug_key" ON "lojas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "loja_produtos_lojaId_produtoId_key" ON "loja_produtos"("lojaId", "produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "vendas_ref_key" ON "vendas"("ref");

-- CreateIndex
CREATE INDEX "vendas_status_dataVenda_idx" ON "vendas"("status", "dataVenda");

-- CreateIndex
CREATE INDEX "vendas_associadoId_dataVenda_idx" ON "vendas"("associadoId", "dataVenda");

-- CreateIndex
CREATE UNIQUE INDEX "comissoes_vendaId_key" ON "comissoes"("vendaId");

-- CreateIndex
CREATE INDEX "comissoes_associadoId_status_idx" ON "comissoes"("associadoId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cupons_associadoId_codigo_key" ON "cupons"("associadoId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "links_afiliado_codigo_key" ON "links_afiliado"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "links_afiliado_associadoId_produtoId_key" ON "links_afiliado"("associadoId", "produtoId");

-- CreateIndex
CREATE INDEX "metricas_diarias_data_idx" ON "metricas_diarias"("data");

-- CreateIndex
CREATE UNIQUE INDEX "metricas_diarias_associadoId_data_key" ON "metricas_diarias"("associadoId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "parceiros_nome_key" ON "parceiros"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "parceiros_cnpj_key" ON "parceiros"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "beneficios_nome_key" ON "beneficios"("nome");

-- CreateIndex
CREATE INDEX "beneficios_ativo_planoMinimoId_idx" ON "beneficios"("ativo", "planoMinimoId");

-- CreateIndex
CREATE INDEX "beneficios_usos_associadoId_usadoEm_idx" ON "beneficios_usos"("associadoId", "usadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "conteudos_slug_key" ON "conteudos"("slug");

-- CreateIndex
CREATE INDEX "conteudos_status_tipo_idx" ON "conteudos"("status", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "conteudos_interacoes_conteudoId_associadoId_key" ON "conteudos_interacoes"("conteudoId", "associadoId");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_comunidade_nome_key" ON "categorias_comunidade"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_comunidade_slug_key" ON "categorias_comunidade"("slug");

-- CreateIndex
CREATE INDEX "posts_comunidade_fixado_criadoEm_idx" ON "posts_comunidade"("fixado", "criadoEm");

-- CreateIndex
CREATE INDEX "comentarios_post_postId_criadoEm_idx" ON "comentarios_post"("postId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "curtidas_post_postId_associadoId_key" ON "curtidas_post"("postId", "associadoId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_numero_key" ON "tickets"("numero");

-- CreateIndex
CREATE INDEX "tickets_status_prioridade_idx" ON "tickets"("status", "prioridade");

-- CreateIndex
CREATE INDEX "tickets_mensagens_ticketId_criadoEm_idx" ON "tickets_mensagens"("ticketId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "escritorios_parceiros_nome_key" ON "escritorios_parceiros"("nome");

-- CreateIndex
CREATE INDEX "solicitacoes_servico_status_idx" ON "solicitacoes_servico"("status");

-- CreateIndex
CREATE INDEX "notificacoes_associadoId_lida_idx" ON "notificacoes"("associadoId", "lida");

-- CreateIndex
CREATE INDEX "notificacoes_criadoEm_idx" ON "notificacoes"("criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "campanhas_codigo_key" ON "campanhas"("codigo");

-- CreateIndex
CREATE INDEX "campanhas_status_idx" ON "campanhas"("status");

-- CreateIndex
CREATE INDEX "saques_associadoId_status_idx" ON "saques"("associadoId", "status");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_competencia_tipo_idx" ON "lancamentos_financeiros"("competencia", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "conquistas_nome_key" ON "conquistas"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "conquistas_associados_conquistaId_associadoId_key" ON "conquistas_associados"("conquistaId", "associadoId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associados" ADD CONSTRAINT "associados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associados" ADD CONSTRAINT "associados_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redes_sociais_contas" ADD CONSTRAINT "redes_sociais_contas_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_planoMinimoId_fkey" FOREIGN KEY ("planoMinimoId") REFERENCES "planos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lojas" ADD CONSTRAINT "lojas_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loja_produtos" ADD CONSTRAINT "loja_produtos_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loja_produtos" ADD CONSTRAINT "loja_produtos_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_cupomId_fkey" FOREIGN KEY ("cupomId") REFERENCES "cupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "vendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_saqueId_fkey" FOREIGN KEY ("saqueId") REFERENCES "saques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupons" ADD CONSTRAINT "cupons_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links_afiliado" ADD CONSTRAINT "links_afiliado_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links_afiliado" ADD CONSTRAINT "links_afiliado_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metricas_diarias" ADD CONSTRAINT "metricas_diarias_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficios" ADD CONSTRAINT "beneficios_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "parceiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficios" ADD CONSTRAINT "beneficios_planoMinimoId_fkey" FOREIGN KEY ("planoMinimoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficios_usos" ADD CONSTRAINT "beneficios_usos_beneficioId_fkey" FOREIGN KEY ("beneficioId") REFERENCES "beneficios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficios_usos" ADD CONSTRAINT "beneficios_usos_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos" ADD CONSTRAINT "conteudos_planoMinimoId_fkey" FOREIGN KEY ("planoMinimoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos_interacoes" ADD CONSTRAINT "conteudos_interacoes_conteudoId_fkey" FOREIGN KEY ("conteudoId") REFERENCES "conteudos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos_interacoes" ADD CONSTRAINT "conteudos_interacoes_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts_comunidade" ADD CONSTRAINT "posts_comunidade_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts_comunidade" ADD CONSTRAINT "posts_comunidade_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_comunidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_post" ADD CONSTRAINT "comentarios_post_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts_comunidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_post" ADD CONSTRAINT "comentarios_post_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curtidas_post" ADD CONSTRAINT "curtidas_post_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts_comunidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curtidas_post" ADD CONSTRAINT "curtidas_post_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_atribuidoAId_fkey" FOREIGN KEY ("atribuidoAId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_mensagens" ADD CONSTRAINT "tickets_mensagens_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_mensagens" ADD CONSTRAINT "tickets_mensagens_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios_parceiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_servico" ADD CONSTRAINT "solicitacoes_servico_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_servico" ADD CONSTRAINT "solicitacoes_servico_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissionais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saques" ADD CONSTRAINT "saques_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conquistas_associados" ADD CONSTRAINT "conquistas_associados_conquistaId_fkey" FOREIGN KEY ("conquistaId") REFERENCES "conquistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conquistas_associados" ADD CONSTRAINT "conquistas_associados_associadoId_fkey" FOREIGN KEY ("associadoId") REFERENCES "associados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
