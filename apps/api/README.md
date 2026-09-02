# DigitaisBR — API

Backend da plataforma DigitaisBR (associação de criadores digitais), construído a partir do
domínio real extraído das 113 telas capturadas da plataforma original.

**NestJS 11 · Prisma 6 · PostgreSQL 16 · JWT + RBAC**

---

## Subir o projeto

```bash
# 1. banco (Postgres na porta 5434 + Adminer em :8082)
cd ../..            # raiz do repositório
docker compose up -d

# 2. dependências e variáveis
cd apps/api
npm install
cp .env.example .env

# 3. schema e dados
npx prisma migrate deploy
npm run seed

# 4. API
npm run start:dev
```

- API: <http://localhost:3000/api>
- Swagger: <http://localhost:3000/api/docs>
- Adminer: <http://localhost:8082> (sistema PostgreSQL, servidor `db`, usuário/senha `digitaisbr`)

### Credenciais do seed

| Perfil | Email | Senha |
|---|---|---|
| Admin | `administrador@digitaisbr.com` | `Admin@2026` |
| Associado | `ana-silva@email.com` | `Assoc@2026` |

Os 40 associados usam a mesma senha (`Assoc@2026`), com email no padrão `handle@email.com`.

---

## Arquitetura

```
src/
  main.ts                    bootstrap, Swagger, CORS, helmet, filtros globais
  app.module.ts              composição dos 17 módulos e cadeia de guards
  common/
    prisma/                  PrismaService (global)
    decorators/              @Public, @Roles, @PlanoMinimo, @CurrentUser
    guards/                  JwtAuthGuard, RolesGuard, PlanoGuard
    filters/                 tradução de erros do Prisma e handler global
    dto/                     PaginationDto e PaginatedResult
    utils/                   busca textual, ordenação segura, intervalo de datas
  modules/
    auth/          planos/         associados/    catalogo/
    lojas/         vendas/         comissoes/     financeiro/
    parceiros/     conteudos/      comunidade/    suporte/
    servicos/      notificacoes/   gamificacao/   dashboard/    portal/
```

### Cadeia de autorização

Quatro guards globais, aplicados nesta ordem:

1. **ThrottlerGuard** — 300 requisições por minuto.
2. **JwtAuthGuard** — exige Bearer token, exceto em rotas `@Public()`.
3. **RolesGuard** — `@Roles(Role.ADMIN)` restringe a área administrativa.
4. **PlanoGuard** — `@PlanoMinimo(NivelPlano.INTERMEDIARIO)` gateia recursos por plano.

Além dos guards, as regras de plano que dependem de dados (limite de produtos na loja,
exclusividade de produto, personalização visual) são validadas no serviço, onde há acesso
ao estado real.

### Autenticação

- `POST /auth/login` devolve **access token** (15 min) e **refresh token** (7 dias).
- O refresh token é guardado **hasheado** (SHA-256) e sofre **rotação** a cada renovação.
- Trocar a senha revoga todas as sessões abertas.
- `POST /auth/codigo-acesso` reproduz o gate de acesso da plataforma original.

---

## Banco de dados

**37 tabelas**, mapeadas do domínio real. Decisões que valem nota:

| Decisão | Motivo |
|---|---|
| `Decimal(10,2)` / `(12,2)` para dinheiro | evita erro de ponto flutuante em valores monetários |
| `estoque = -1` significa ilimitado | espelha a semântica da plataforma original |
| `Comissao` 1:1 com `Venda` | a comissão nasce e morre com a venda; o link fica explícito |
| `Notificacao.associadoId` anulável | `null` representa broadcast para todos |
| `LancamentoFinanceiro` separado | DRE e fluxo de caixa não dependem de recalcular vendas |
| `MetricaDiaria` única por (associado, dia) | agregação pronta para os gráficos, sem varrer cliques |
| `planoMinimoId` em produto/benefício/conteúdo | a regra de acesso por plano vive no dado, não no código |

Enums cobrem status e tipos (`StatusVenda`, `StatusComissao`, `TipoBeneficio`, …), o que
transfere a consistência para o banco.

### Migrations

```bash
npx prisma migrate dev --name descricao   # cria e aplica em desenvolvimento
npx prisma migrate deploy                 # aplica em produção
npx prisma studio                         # inspeção visual
```

---

## Dados do seed

O seed **não usa dados inventados**: ele carrega o dataset extraído das capturas da
plataforma original (`tools/extract.py` → `prisma/seed-data/*.json`).

| Entidade | Registros | Entidade | Registros |
|---|---|---|---|
| Planos | 3 | Benefícios | 19 |
| Associados | 40¹ | Conteúdos | 16 |
| Produtos / categorias | 25 / 7 | Materiais | 12 |
| Lojas / itens de vitrine | 20 / 150 | Posts / comentários / curtidas | 20 / 349 / 498 |
| Vendas | 60 | Tickets / mensagens | 21 / 82 |
| Comissões | 40 | Escritórios / profissionais | 5 / 6 |
| Parceiros | 10 | Notificações / campanhas | 25 / 5 |

¹ 30 associados da tabela original + 10 personas que apareciam apenas na comunidade e no
suporte, criadas para preservar a integridade referencial daquele conteúdo.

### Fidelidade aos números originais

Os indicadores calculados pela API batem com os das telas capturadas:

| Indicador | Tela original | API |
|---|---|---|
| Receita total | R$ 4.395,00 | R$ 4.395,00 |
| Ticket médio | R$ 146,50 | R$ 146,50 |
| Vendas aprovadas | 30 | 30 |
| Taxa de cancelamento | 33,3% | 33,3% |
| Comissões pagas | R$ 373,02 | R$ 373,02 |
| MRR | R$ 1.998,00 | R$ 1.998,00 |
| Saldo financeiro | R$ 3.378,46 | R$ 3.378,50² |
| Composição de saídas | 36,7 / 23,7 / 19,8 / 11,9 / 7,9 % | idêntica |

² diferença de R$ 0,04, do arredondamento ao ratear custos por mês.

---

## Regras de negócio implementadas

**Venda** (`POST /vendas`) roda em transação única: valida o produto, aplica cupom
(validade, limite de usos, compra mínima), calcula o total, gera a comissão
(percentual do produto **+** bônus do plano), baixa o estoque e notifica o associado.

**Máquina de estados da venda** — transições fora dessas retornam `409`:

```
AGUARDANDO_PGTO ──► PAGA ──► REEMBOLSADA
       └────────► CANCELADA
```

Mudar o status propaga o efeito: a comissão acompanha, o estoque é devolvido em
cancelamento/reembolso e o contador de vendas do produto é ajustado.

**Saque** valida o saldo real (comissões pagas − saques concluídos − saques em
processamento) e, ao concluir, gera o lançamento de saída no caixa.

**Limites por plano** são verificados onde o dado está: quantidade de produtos na loja,
exclusividade de produto/benefício/conteúdo, e personalização visual da loja
(Intermediário ou superior).

---

## Testes

```bash
npm run start:prod &      # a API precisa estar no ar
npm run test:e2e          # reseeda antes e depois, automaticamente
```

A suíte de escrita cria vendas, cupons, posts e chamados reais — ela não é idempotente. Por
isso o próprio script reseeda o banco antes de começar e ao terminar, e pode ser executado
quantas vezes quiser. Use `PULAR_SEED=1` para rodar sobre o estado atual.

77 asserções cobrindo autenticação, RBAC, paginação/busca/filtros, validação de entrada,
ciclo de vida da venda, cupons, comissões, limites de plano, comunidade, suporte
(incluindo isolamento entre associados e notas internas) e rotas públicas.

---

## Endpoints

166 rotas em 17 módulos. Alguns pontos de entrada:

| Área | Rota |
|---|---|
| Autenticação | `POST /auth/login`, `/auth/refresh`, `GET /auth/perfil` |
| Dashboard | `GET /dashboard/admin`, `/dashboard/portal`, `/relatorios` |
| Cadastros | `GET /associados`, `/planos`, `POST /associados` |
| Comercial | `GET /catalogo/produtos`, `/lojas`, `POST /vendas` |
| Financeiro | `GET /financeiro/visao-geral`, `/financeiro/dre`, `POST /financeiro/saques` |
| Portal | `GET /portal/loja`, `/portal/cupons`, `/portal/links`, `/portal/performance` |
| Público | `GET /lojas/publica/:slug`, `/associados/perfil/:handle`, `/portal/r/:codigo` |

A referência completa, com schemas e exemplos, está no Swagger em `/api/docs`.

---

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | conexão PostgreSQL |
| `PORT`, `API_PREFIX`, `CORS_ORIGINS` | exposição HTTP |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | access token |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` | refresh token |
| `ACCESS_CODE` | gate de acesso da plataforma |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ASSOCIADO_PASSWORD` | credenciais do seed |

**Antes de ir a produção**: troque `JWT_SECRET` e `JWT_REFRESH_SECRET` por valores
aleatórios e altere as senhas do seed.
