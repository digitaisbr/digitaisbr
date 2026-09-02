# CONTEXT — DigitaisBR

> **Documento de handoff.** Registra tudo que foi construído, decidido e descoberto, para que
> outra sessão (ou outra pessoa) retome sem reconstruir o raciocínio.
>
> Última atualização: **28/08/2026** · Diretório: `~/digitaisbr-clone/`
>
> O histórico cronológico da engenharia reversa original está em [`context.md`](context.md).
> Este arquivo é a visão consolidada e atual do projeto.

---

## 1. O que é o projeto

Plataforma da **DigitaisBR — Associação dos Criadores de Conteúdo e Influenciadores Digitais
do Brasil**. Conecta três partes:

- **Associados** — influenciadores que montam uma loja virtual, divulgam produtos e ganham comissão
- **Parceiros** — empresas que fornecem produtos e benefícios
- **Administração** — cura o catálogo, liquida comissões, sustenta a operação

**Receita em duas pernas:** assinatura mensal do plano (MRR) + comissão sobre vendas por indicação.

### Como o projeto nasceu

1. **Fase 1 (ago/2026, sessões anteriores)** — scraping da plataforma original
   (`https://digitaisbr-plataforma.web.app`), uma SPA React + Firebase. 113 telas capturadas.
   Resultado: `index.html`, um clone estático interativo sem backend.
2. **Fase 2 (esta sessão)** — backend próprio + banco de dados, modelados por engenharia reversa
   das capturas.
3. **Fase 3 (esta sessão)** — front React consumindo a API, com a identidade visual oficial.

**Ponto essencial:** o domínio foi *inferido das telas*, não de uma especificação. O bundle
original era minificado e o código-fonte não era recuperável.

---

## 2. Estrutura atual

```
digitaisbr-clone/
├── apps/
│   ├── api/                    Backend  — NestJS 11 + Prisma 6 + PostgreSQL 16
│   │   ├── prisma/
│   │   │   ├── schema.prisma   37 modelos, 23 enums
│   │   │   ├── migrations/     1 migration (init)
│   │   │   ├── seed.ts         carrega o dataset real
│   │   │   └── seed-data/      24 JSONs, 374 registros extraídos das capturas
│   │   ├── src/
│   │   │   ├── common/         PrismaService, guards, decorators, filtros, DTOs, utils
│   │   │   └── modules/        17 módulos de domínio
│   │   └── test/               suíte e2e (77 asserções, auto-reseed)
│   └── web/                    Front — React 19 + Vite 8 + Ant Design 5
│       └── src/
│           ├── marca.ts        cores e tipografia do brand book
│           ├── api/            cliente axios, hooks, tipos, formatadores
│           ├── auth/           contexto e guardas de rota
│           ├── layouts/        casca do admin e do portal
│           ├── componentes/    TabelaRecurso, Cartoes, Pagina, Estado, Logo
│           └── paginas/        auth (2), admin (22), portal (18), publico (2)
├── docs/
│   ├── DigitaisBR-Manual-de-Uso.pdf       14 pág — COMO USAR (para operadores)
│   ├── DigitaisBR-Documentacao.pdf        51 pág — técnica (15 capítulos)
│   ├── RELATORIO-TESTES-CARGA.md          testes de carga
│   ├── DIGITAISBR_visual.pdf              brand book oficial (fornecido pelo usuário)
│   └── LOGO-*.zip                         kit de logos oficial (fornecido)
├── tools/
│   ├── extract.py              capturas → seed-data/*.json  (REEXECUTÁVEL)
│   ├── gerar_docs.py           gera os DOIS PDFs
│   └── docs/                   fontes HTML+CSS da documentação
├── capturas/                   113 HTMLs, screenshots, datasets originais
├── index.html                  clone estático da fase 1 (preservado)
├── docker-compose.yml          PostgreSQL + Adminer
├── iniciar.sh                  sobe banco + API + front
└── context.md                  histórico cronológico
```

**Tamanho:** API 89 arquivos / 10.363 linhas · Web 62 arquivos / 8.920 linhas.

---

## 3. Como rodar

```bash
./iniciar.sh          # sobe tudo
```

Na primeira vez, popular o banco: `cd apps/api && npm run seed`.

| Serviço | Endereço | Observação |
|---|---|---|
| Interface | http://localhost:5173 | |
| API | http://localhost:3000/api | Swagger em `/api/docs` |
| PostgreSQL | localhost:**5434** | 5432 e 5433 já ocupadas por outro stack (`rag-*`) |
| Adminer | localhost:**8082** | 8081 ocupada · servidor `db`, user/senha `digitaisbr` |

### Credenciais

| | |
|---|---|
| Código de acesso | `X9k#Lm$2vQ8!pTzR` |
| Admin | `administrador@digitaisbr.com` / `Admin@2026` |
| Associada | `ana-silva@email.com` / `Assoc@2026` |

Os 40 associados usam a mesma senha, email no padrão `handle@email.com`.

---

## 4. Decisões tomadas pelo usuário

Perguntadas explicitamente no início da fase 2:

| Pergunta | Escolha |
|---|---|
| Stack do backend | **NestJS + Prisma + PostgreSQL** |
| Autenticação | **JWT próprio + RBAC** (não Firebase, não Supabase) |
| Escopo | **Tudo** — schema + API completa + seed |
| Front | **React novo** consumindo a API |

Depois, ao longo da sessão, o usuário pediu: documentação em PDF rica, identidade visual do
brand book, análise de segurança, guia de deploy, relatório de testes de carga e manual de uso.

---

## 5. Backend

### Números
- **37 tabelas**, 23 enums, 1 migration
- **170 rotas** em 17 módulos — 94 admin, 7 públicas, 69 autenticadas
- **77 testes e2e**

### Módulos
`auth · planos · associados · catalogo · lojas · vendas · comissoes · financeiro · parceiros ·
conteudos · comunidade · suporte · servicos · notificacoes · gamificacao · dashboard · portal`

### Cadeia de guards (globais, nesta ordem)
1. **ThrottlerGuard** — 300 req/min por IP (configurável por `THROTTLE_LIMIT`)
2. **JwtAuthGuard** — exige Bearer, exceto `@Public()`
3. **RolesGuard** — `@Roles(Role.ADMIN)`
4. **PlanoGuard** — `@PlanoMinimo(...)`

> **Regra que vale lembrar:** guards decidem por metadado estático da rota. Regras que dependem
> do *dado sendo manipulado* (este produto é exclusivo? esta loja atingiu o limite? este ticket
> é de outro associado?) ficam **no service**, onde há acesso ao estado. Ignorar essa distinção
> é como se abrem brechas de autorização horizontal.

### Decisões de modelagem que importam

| Decisão | Por quê |
|---|---|
| `Decimal(10,2)`/`(12,2)` para dinheiro | float acumula erro em soma de moeda |
| `estoque = -1` = ilimitado | semântica do original; evita coluna booleana redundante |
| `Comissao` 1:1 com `Venda` | nasce e morre com a venda, mas tem status e data próprios |
| `precoUnitario` gravado na venda | preço do produto muda; histórico não pode mudar junto |
| `Notificacao.associadoId` anulável | `null` = broadcast, evita 40 mil linhas por comunicado |
| `LancamentoFinanceiro` separado | DRE e fluxo de caixa sem reagregar vendas a cada tela |
| `MetricaDiaria` única por (associado, dia) | gráficos leem 1 linha/dia em vez de varrer cliques |
| `planoMinimoId` em produto/benefício/conteúdo | regra de acesso vive no dado, não no código |
| Índices únicos compostos (curtidas, cupons) | unicidade garantida pelo banco, imune a corrida |

### Máquina de estados da venda

```
AGUARDANDO_PGTO ──► PAGA ──► REEMBOLSADA
       └──────────► CANCELADA
```
Transições fora disso → `409`. Cada mudança propaga: comissão acompanha, estoque volta em
cancelamento/reembolso, contador do produto ajusta.

### Fórmula da comissão
```
percentual = produto.comissaoPct + associado.plano.comissaoExtraPct
valor      = total × percentual / 100
```
Bônus por plano: Básico 0%, Intermediário +2%, Avançado +5%.

### Saldo sacável
```
disponível = comissões(PAGA) − saques(CONCLUIDO) − saques(PENDENTE + PROCESSANDO)
```
Subtrair os saques em andamento é o que impede o saque duplo.

---

## 6. Front

### Números
40 telas: **22 admin**, **18 portal**, **2 públicas**, mais acesso e login.

### Duas decisões estruturais

1. **Filtro no servidor.** `TabelaRecurso` envia busca/filtro/ordenação/paginação como query
   params. Filtrar no cliente só alcançaria a página carregada.
2. **Renovação de token com corrida única.** Chamadas que tomem 401 no mesmo instante aguardam
   a *mesma* renovação — o refresh é rotativo e só vale uma vez.

### Componentes reutilizáveis (é o que deixa as páginas magras)
`TabelaRecurso` · `Cartoes` · `Pagina` · `Estado` (carregando/erro/vazio) · `Logo`

---

## 7. Identidade visual

Do brand book oficial (`docs/DIGITAISBR_visual.pdf`, CorelDRAW, 22 páginas).

**As cores foram amostradas dos pixels** das cartelas Pantone do PDF, não convertidas de
memória. O *Indigo Sloth* amostrado deu exatamente `#230647`, valor que o documento declara —
isso validou a extração das outras três.

| Cor | Hex | Pantone | Uso |
|---|---|---|---|
| Digital Blue | `#008EEA` | 2727 C | primária |
| Mint Leaf | `#00AD9A` | 3275 C | positivos (receita, comissões) |
| Violet C | `#440099` | Violet C | acentos |
| Indigo Sloth | `#230647` | — | fundos institucionais |

**Tipografia:** o brand book pede *Bebas Kai* (títulos) e *Lufga* (texto) — **ambas comerciais**.
A pilha em `src/marca.ts` declara as originais primeiro e recai para *Bebas Neue* e *Poppins*
(Google Fonts). Se as reais forem licenciadas e instaladas, passam a valer sem tocar no código.

**Logos:** recortados do kit oficial para `apps/web/src/assets/` (horizontal, vertical, símbolo),
fundo transparente. Favicon gerado do símbolo da digital.

---

## 8. Dados e fidelidade

`tools/extract.py` lê `capturas/` e gera `apps/api/prisma/seed-data/*.json` — **24 arquivos,
374 registros reais**. Reexecutável:

```bash
python3 tools/extract.py && cd apps/api && npm run seed
```

### Conferência com as telas originais (é a prova de que o modelo está certo)

| Indicador | Tela original | API |
|---|---|---|
| Receita total | R$ 4.395,00 | ✅ igual |
| Ticket médio | R$ 146,50 | ✅ igual |
| Vendas aprovadas | 30 | ✅ igual |
| Taxa de cancelamento | 33,3% | ✅ igual |
| Comissões pagas | R$ 373,02 | ✅ igual |
| Comissões processando | R$ 561,45 | ✅ igual |
| MRR | R$ 1.998,00 | ✅ igual |
| Saldo financeiro | R$ 3.378,46 | R$ 3.378,50¹ |
| Composição de saídas | 36,7/23,7/19,8/11,9/7,9% | ✅ idêntica |
| Comentários na comunidade | 349 | ✅ igual |

¹ diferença de R$ 0,04 do arredondamento ao ratear custos por mês.

### Particularidades do seed

- **São 40 associados, não 30.** Comunidade e suporte referenciam 10 pessoas que não estão na
  tabela de associados (Maria Silva, João Santos, Ana Oliveira…). Criadas como associados para
  preservar integridade referencial daquele conteúdo.
- **498 curtidas, não 576.** O dataset registrava 576, mas curtida é única por (post, pessoa) e
  há 40 associados — 498 é o máximo possível. Comentários (349) bateram exato.

---

## 9. Bugs encontrados e corrigidos

### 9.1 `bcryptjs` travava o event loop *(crítico)*
**Sintoma:** login a 17–20 req/s, p50 de 2,5s, e as *leituras também* degradavam.
**Causa:** `bcryptjs` é JS puro e ocupa a thread principal — cada login parava o servidor inteiro.
**Correção:** trocado por `@node-rs/bcrypt` (binário Rust, roda no threadpool do libuv).
**Hashes compatíveis** — nenhuma senha precisou ser redefinida.

| | antes | depois |
|---|---|---|
| logins/s | 20 | **88** (4,4×) |
| p50 login (c=50) | 2.577 ms | **560 ms** |
| `/planos` durante login | degradado | **1.272 req/s, p50 16 ms** |

> Este bug também **contaminou a primeira medição** de `/relatorios` (p99 de 4s), número que
> não se confirmou depois.

### 9.2 Enumeração de usuários por temporização *(segurança)*
**Sintoma:** email inexistente respondia em 6,7 ms; email real com senha errada, em 51,1 ms.
A mensagem era idêntica, mas o **tempo** entregava quais contas existem.
**Correção:** comparação roda sempre, contra um `HASH_ISCA` gerado a cada boot quando o email
não existe. Diferença caiu para **3,4 ms**.

### 9.3 Admin caía em beco sem saída no portal *(UX)*
**Sintoma:** o cabeçalho do admin oferecia atalho para `/portal`, mas o admin não tem associado
vinculado — todas as telas de lá davam 403.
**Correção:** `RotaProtegida` ganhou `exigeAssociado`; o portal mostra explicação com caminho de
volta. O atalho só aparece se `usuario.associadoId` existir. A guarda checa **associado
vinculado, não papel** — um admin que também seja associado continua entrando.

### 9.4 Gráfico do dashboard vinha vazio
**Causa:** a janela era "últimos 6 meses a partir de hoje" (ago/2026), mas as vendas do seed são
de 2025.
**Correção:** `dashboard/receita-comissoes` ancora a janela na **venda mais recente** e devolve
o `periodo` usado, que a UI rotula ("2025-01 a 2025-06").

### 9.5 Lacunas de API que o front revelou
`/vendas`, `/comissoes` e `/financeiro/saques` são ADMIN-only — o associado tomava 403 nas
*próprias* vendas e no *próprio* saldo. Foram adicionadas 4 rotas (166 → 170):
`GET /portal/vendas`, `/portal/comissoes`, `/portal/saldo`, `/portal/saques`.
Em todas o filtro por associado é **imposto pelo servidor**.

### 9.6 Avisos de console (revelados pela navegação real do usuário)
Quatro, todos corrigidos: `Modal` estático (perdia o tema) → `modal` do `App.useApp()`;
`addonBefore`/`addonAfter` depreciados → `Space.Compact`/`prefix`; antd 5 × React 19 →
`@ant-design/v5-patch-for-react-19`. **Console 100% limpo nas 36 telas.**

### 9.7 Dois erros de modelagem que a conferência de números expôs
- MRR dava R$ 3.497: assinatura de associado suspenso/inativo contava como vigente.
  → `Assinatura.ativa` passou a acompanhar o status do associado.
- Saldo não fechava: o caixa fora modelado como meses acumulados de MRR.
  → Entradas = receita das vendas pagas; saídas = comissões pagas + custos operacionais.

---

## 10. Desempenho (medido, não estimado)

**Ambiente:** AMD Ryzen AI 9 HX 370 (24 núcleos), 93 GB RAM, API e banco no mesmo host, sem rede.
**Ferramenta:** autocannon, 50 conexões, 12s, com aquecimento.

| Endpoint | req/s | p50 | p99 |
|---|---:|---:|---:|
| `/planos` | 1.906 | 25 ms | 40 ms |
| `/financeiro/visao-geral` | 1.244 | 33 ms | 81 ms |
| `/vendas` | 1.174 | 38 ms | 59 ms |
| `/associados` | 868 | 55 ms | 104 ms |
| `/relatorios` | 754 | 62 ms | 140 ms |
| `/dashboard/admin` | 658 | 74 ms | 115 ms |
| `POST /auth/login` | **88** | 560 ms | 622 ms |

**Escala:** throughput satura em ~1.200 req/s a partir de **100 conexões** (joelho da curva).
Além disso a latência cresce linear e a vazão não sobe. Zero erros até 400 conexões.

**Usuários simultâneos:** com ~0,3 req/s por usuário (8–12s de leitura entre ações, ~3 req/tela):
**~2.500 com folga**, ~4.000 no limite. *Uma instância Node = 1 dos 24 núcleos.*
Clusterizar (4–8 workers) levaria a **15–20 mil**.

> ⚠ **Armadilha metodológica descoberta:** rodar testes de carga em sequência **sem intervalo**
> contamina o resultado. `/dashboard/admin` "falhou" com 0 req/s e 48 erros numa rodada; isolado,
> fez 718 req/s com zero erros. As conexões do teste anterior ainda drenavam do pool.
> **Sempre dar 3–4s entre medições.**

Relatório completo: `docs/RELATORIO-TESTES-CARGA.md`.

---

## 11. Segurança

### Testes ofensivos executados contra a API no ar — **11/11 bloqueados**
IDOR (cupom, ticket e `associadoId` forçado de outro associado), escalada vertical (listar
associados, criar produto, pagar comissões, ver financeiro), token adulterado, sem token,
refresh usado como access, reuso de refresh já consumido.

### Controles implementados
bcrypt 10 rounds (nativo) · refresh hasheado em SHA-256 **com rotação** · access de 15 min ·
usuário revalidado a cada requisição · Prisma parametriza tudo · `forbidNonWhitelisted` contra
mass assignment · autorização horizontal no service · notas internas filtradas para não-admin ·
throttler · Helmet · mensagem **e tempo** iguais no login.

### ⚠ Pendências antes de expor à internet

| Risco | Item |
|---|---|
| **Alto** | `JWT_SECRET` e `JWT_REFRESH_SECRET` ainda são os do `.env.example` (público no repo) |
| **Alto** | Senhas do seed publicadas (`Admin@2026`) |
| **Alto** | Sem HTTPS — o Bearer viaja no cabeçalho |
| **Médio** | `CORS_ORIGINS` tem `*` como padrão |
| **Médio** | Rate limit único (300/min) — o login merece limite próprio e mais estrito |
| **Médio** | Sem bloqueio após tentativas falhas de login |
| **Baixo** | CSP desativada no Helmet (foi para o Swagger funcionar) |
| **Baixo** | Sem rotação/expurgo de `logs_auditoria` e `notificacoes` |

**Dependências:** `npm audit` aponta 3 vulns altas, **todas de dev** (CLI do Prisma, autocannon).
Nenhuma no runtime de produção.

> **Nota:** o gate de código de acesso **não é segurança** — é um código compartilhado,
> barreira de conveniência herdada do original.

---

## 12. Documentação produzida

| Documento | Páginas | Para quem |
|---|---|---|
| `docs/DigitaisBR-Manual-de-Uso.pdf` | 14 | **Operadores** — como usar a plataforma |
| `docs/DigitaisBR-Documentacao.pdf` | 51 | Técnica — 15 capítulos |
| `docs/RELATORIO-TESTES-CARGA.md` | — | Metodologia e resultados de carga |

**Ambos os PDFs são gerados**, não escritos à mão:

```bash
cd apps/api && npm run start:prod &    # a API precisa estar no ar
python3 tools/gerar_docs.py            # gera os DOIS PDFs
```

A referência de rotas vem do **Swagger da API em execução**; os rótulos de acesso
(ADMIN/PÚBLICO/autenticado) são lidos dos **decoradores `@Roles`/`@Public` no código-fonte**.
Assim a documentação não descreve endpoint inexistente nem inventa permissão.

### Fontes em `tools/docs/` — a ordem importa
Os nomes dos arquivos **não** seguem a ordem dos capítulos. A montagem está declarada
explicitamente em `gerar_docs.py`:

| Arquivo | Capítulos |
|---|---|
| `conteudo-1.html` | capa, sumário, 1–3 |
| `conteudo-2.html` | 4–5 |
| `conteudo-3a.html` | 6–7 |
| `conteudo-2b.html` | 8–11 |
| `conteudo-3c.html` | 12–14 |
| `conteudo-3b.html` | 15 |
| `manual.html` | manual de uso (documento à parte) |

---

## 13. Testes

```bash
cd apps/api
npm run start:prod &
npm run test:e2e        # reseeda antes e depois, automaticamente
```

**77 asserções** (36 leitura + 41 escrita). Cobrem autenticação, RBAC, integridade do seed,
paginação/busca/filtros, validação, ciclo da venda, cupons, comissões, limites de plano,
comunidade, suporte (isolamento e notas internas) e rotas públicas.

> **Importante:** a suíte de escrita **cria dados reais** e não é idempotente. Isso quebrou os
> testes três vezes durante a sessão até eu corrigir a causa: agora o próprio script reseeda
> antes e depois. Use `PULAR_SEED=1` para rodar sobre o estado atual.

---

## 14. Armadilhas técnicas registradas

1. **Portas ocupadas.** 5432, 5433 e 8081 já estavam em uso por outro stack Docker (`rag-*`).
   Este projeto usa **5434** (Postgres) e **8082** (Adminer).
2. **Vite 8 usa rolldown**, e o binário nativo não vem pelo
   [bug de optionalDependencies do npm](https://github.com/npm/cli/issues/4828).
   Resolve com `npm i -D @rolldown/binding-linux-x64-gnu`.
3. **`@page :first { margin: 0 }` funciona no Chromium**, mas um filho absoluto que transborda
   faz o Chromium **reduzir a escala da página inteira**. Foi o que quebrou a capa do PDF
   (ocupava 77% do A4). `overflow: hidden` no container resolve.
4. **Node 20.17 gera aviso do Vite** (pede 20.19+). Funciona mesmo assim.
5. **`npm i` remove pacotes instalados com `--no-save`.** O playwright sumiu assim; foi fixado
   como devDependency.
6. **Testes de carga em sequência sem intervalo** produzem falsos gargalos (ver §10).
7. **Playwright:** usar o binário já em cache via `executablePath`
   (`~/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome`).

---

## 15. O que ainda falta

### Funcionalidades não implementadas
| Recurso | Situação | O que falta |
|---|---|---|
| **Email e push** | Notificações e campanhas gravam no banco e a API as serve; **nada sai para fora** | Integrar provedor (Resend, SendGrid, SES) + serviço de push. O modelo já prevê o canal. |
| **Upload de arquivos** | Imagens de produto/banner/logo são recebidas como **URL** | Conectar bucket S3 ou R2, trocar campos de URL por upload com validação |

### Para publicar na internet
Checklist completo no **capítulo 15** da documentação técnica. O essencial: gerar segredos
novos, trocar as senhas do seed, TLS, restringir CORS, nunca rodar o seed em produção, usar
`migrate deploy` (nunca `migrate dev`), configurar backup.

**Arquitetura sugerida:** Caddy/Nginx (TLS) → front estático + API em cluster (4–8 workers) →
PostgreSQL gerenciado com backup.

### Melhorias sugeridas (por retorno)
1. **Clusterizar o Node** — uma linha de config, multiplica capacidade por 4–8
2. Cache nos analíticos (dashboard, relatórios) — 30–60s
3. Ajustar `connection_limit` do Prisma ao número de workers
4. Rate limit específico no login
5. Réplica de leitura para relatórios
6. CDN para o front

---

## 16. Ideias descartadas e por quê

- **Manter Firebase Auth** — o usuário escolheu JWT próprio, sem dependência de terceiros.
- **Reduzir rounds do bcrypt** para ganhar throughput — enfraqueceria as senhas contra força
  bruta. A saída correta é clusterizar.
- **Filtrar tabelas no cliente** — só alcançaria a página carregada.
- **Guardar o saldo do associado como campo** — seria fonte constante de divergência; é
  calculado na consulta.
- **Excluir associados/produtos com histórico** — bloqueado de propósito; usa-se inativação.

---

## 17. Onde olhar primeiro em cada assunto

| Assunto | Arquivo |
|---|---|
| Modelo de dados | `apps/api/prisma/schema.prisma` |
| Regras de venda/comissão | `apps/api/src/modules/vendas/vendas.service.ts` |
| Autenticação | `apps/api/src/modules/auth/auth.service.ts` |
| Autorização | `apps/api/src/common/guards/` |
| Cores e fontes | `apps/web/src/marca.ts` |
| Tabela reutilizável | `apps/web/src/componentes/TabelaRecurso.tsx` |
| Cliente HTTP e refresh | `apps/web/src/api/cliente.ts` |
| Extração dos dados | `tools/extract.py` |
| Geração dos PDFs | `tools/gerar_docs.py` |
| Testes | `apps/api/test/` |


---

## 18. Deploy (28/08)

Artefatos criados e **testados localmente** (imagens construídas, pilha completa subida,
roteamento verificado):

| Arquivo | Papel |
|---|---|
| `apps/api/Dockerfile` | multi-stage, Debian slim, roda como usuário `node`, healthcheck |
| `apps/api/docker-entrypoint.sh` | aplica `migrate deploy` na subida, com 10 tentativas |
| `apps/web/Dockerfile` | build do Vite → Caddy servindo estático |
| `apps/web/Caddyfile` | fallback do SPA + cache imutável em `/assets` |
| `docker-compose.prod.yml` | proxy + web + api + db |
| `Caddyfile` (raiz) | TLS automático, roteia `/api/*` → api, resto → web, HSTS |
| `.env.production.example` | template dos segredos (`.env.production` está no .gitignore) |
| `DEPLOY.md` | guia DigitalOcean: Droplet e App Platform |

### Mudanças que o deploy exigiu
1. **`binaryTargets` no schema Prisma** — `["native", "debian-openssl-3.0.x"]`. Sem o alvo
   Debian, o engine não existiria na imagem de produção.
2. **`prisma` movido de devDependencies para dependencies** — o entrypoint roda
   `npx prisma migrate deploy` no runtime, onde devDependencies não são instaladas.

### Verificado
- Ambas as imagens constroem (api 694 MB, web 65 MB)
- Migrations aplicadas automaticamente na subida do contêiner
- Roteamento: `/` → SPA (200), `/api/planos` → 401 (guard ativo), `/portal/loja` → index
- Caddyfiles de produção validados com `caddy validate`
- Só o proxy expõe portas; db/api/web ficam na rede interna
- Banco de produção sobe **vazio** — login falha corretamente, pois o seed não roda lá

### Armadilhas
- `caddy validate` recusa blocos em uma linha (`handle /api/* { ... }`) — precisa ser multi-linha
- `docker cp` falha em arquivo montado read-only ("device or resource busy")
- Caddy não emite certificado para `localhost` ("does not qualify for a public certificate") —
  para testar TLS localmente é preciso `tls internal` ou um domínio real
- Compose com caminhos relativos exige `--project-directory` quando o arquivo está fora da raiz
