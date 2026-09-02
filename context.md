# CONTEXT — Clone DigitaisBR (histórico cronológico)

> 📌 **Para o estado atual do projeto, leia [`context_digitaisbr.md`](context_digitaisbr.md).**
> Este arquivo é o registro cronológico, sessão por sessão — útil para entender *como* se
> chegou até aqui, não *onde* as coisas estão hoje.

> Objetivo deste arquivo: registrar TUDO que foi feito para que em outra sessão dê pra
> retomar do zero sem reconstruir o raciocínio. Última atualização: 2026-08-18.

---

## 1. O pedido

O usuário pediu: entrar na plataforma `https://digitaisbr-plataforma.web.app`, fazer web
scraping das páginas e **recriar todo o HTML com JavaScript** (um clone que rode sem o
back-end original). Depois pediu dois adicionais:

- **(a)** capturar as telas de **detalhe por ID** — FEITO.
- **(b)** reativar **fluxos com mock JS** (busca/filtro/paginação) — FEITO.
- **(c)** empacotar como site multi-arquivo pra deploy — **NÃO FEITO** (o usuário não escolheu; é o próximo passo natural se quiser).

---

## 2. Acesso à plataforma original

- URL: `https://digitaisbr-plataforma.web.app`
- Login admin: `administrador@digitaisbr.com` / senha `Admin@2026` — plano **Avançado**.
- **Access gate** antes do login: a home redireciona pra `/acesso` e pede um "Código de acesso".
  O código está **hardcoded no bundle**: `X9k#Lm$2vQ8!pTzR`. No scraping é mais fácil apenas setar
  `sessionStorage.setItem('digitaisbr_access','granted')` via `addInitScript` e ir direto pra `/login`.

## 3. Stack do site original (descoberto)

- SPA **React** (Vite/Rolldown) + **Ant Design** (antd, CSS-in-JS) + **Firebase** (Auth + Firestore)
  + **Recharts** (gráficos em SVG). Bundle minificado — **código-fonte não é recuperável**.
- Duas áreas: **admin** (rotas filhas de `/`) e **portal do associado** (rotas filhas de `/portal`).
- Rotas extraídas do bundle (`path:` no entry chunk). Ver lista completa no `scripts/build2.js` (BASE_MANIFEST).

## 4. Gotchas técnicos IMPORTANTES (custaram tempo)

1. **Auth do Firebase fica no IndexedDB**, não em cookies/localStorage → `storageState` do Playwright
   NÃO preserva a sessão. Solução: logar e navegar **na mesma sessão do browser**.
2. **`page.goto()` para rota protegida faz reload total** → o route guard roda antes do Firebase
   reidratar o usuário → redireciona pra `/login` (race). Solução: logar UMA vez e navegar DENTRO
   da SPA sem reload, via History API:
   ```js
   page.evaluate(r => { history.pushState({}, '', r); dispatchEvent(new PopStateEvent('popstate')); }, route)
   ```
   (React Router v6 escuta `popstate`.)
3. **Chromium do Playwright**: usar o binário já instalado em
   `~/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome` via `executablePath`
   (o `npx playwright install` não roda sem rede/YES). Playwright instalado com
   `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright@1.55.0`.
4. **HTML capturado já é quase self-contained**: cada página tem ~81 `<style>` inline (antd,
   ~429 KB) + SVGs de ícones/Recharts inline. Sem `@font-face`, sem `url()` externo → fontes de
   sistema. Único asset externo: `/logo.png` → embutido como data-URI (armazenado UMA vez e
   injetado em runtime com placeholder `%DBR_LOGO%`, senão duplicava 520 KB × 36 = 18 MB).
5. **IDs dos detalhes** (`assoc-N`, `prod-N`, `store-N`) viviam no `onClick` do React (removido no
   sanitize). Para religar linha→detalhe, casei por **nome** (h4/h1 da página de detalhe vs texto da linha).
6. **Select do antd (versão nova)**: o label fica em `.ant-select-content` (attr `title`), NÃO em
   `.ant-select-selection-placeholder`. O dropdown depende de JS do React → no clone eu substituo
   cada select por um `<select>` nativo estilizado, com opções extraídas dos dados da coluna.

## 5. O que foi capturado

- **36 telas base** (admin + portal), rendered HTML + screenshot full-page.
- **77 páginas de detalhe**: `/associados/assoc-1..30`, `/catalogo/prod-1..25`,
  `/lojas/store-1..20/preview`, + 2 `/editar`.
- **Datasets completos** de tabelas (todas as páginas de paginação):
  associados 30, vendas 60, comissões 40, lojas 20, catálogo 25, suporte 21, parceiros 10, cupons 5.

## 6. O que foi entregue (nesta pasta `~/digitaisbr-clone/`)

```
index.html                      # CLONE INTERATIVO (principal, ~9,2 MB, 113 telas)
index-snapshot-simples.html     # versão leve (36 telas, sem interações)
README.md                       # descrição limpa do entregável
context.md                      # este arquivo
capturas/
  html/                         # 113 HTMLs renderizados brutos
  screenshots/                  # screenshots full-page (44 PNGs)
  tabelas-dados.json            # dataset completo de cada tabela (com header + rows)
  paginas-detalhe.json          # índice das 77 páginas de detalhe
  logo.png                      # logo original
  rotas.json                    # summary do crawl inicial
scripts/                        # todos os scripts Node usados (ver seção 7)
```

### Fluxos que funcionam no `index.html`
- Navegação por hash entre as 113 telas + seletor "ir para" (canto inferior direito).
- Menu lateral clicável (recabeado em JS).
- Tabelas admin: **busca**, **filtro por select**, **paginação** (10/pág) sobre o dataset completo.
- Linhas de Associados/Catálogo/Lojas abrem o **detalhe real** (clique na linha ou no 👁).

### Limites conhecidos
- Snapshot: ações de escrita (salvar/reembolsar/exportar/aprovar) eram Firebase → inertes aqui.
- Não há filtro por **data** nem **ordenação por coluna**.
- Detalhe só p/ Associados/Catálogo/Lojas (as únicas com rota de detalhe no original).

## 7. Scripts (em `scripts/`) — pipeline de reconstrução

Ordem de execução e o que cada um faz. **ATENÇÃO**: os scripts foram escritos assumindo um
diretório de trabalho com subpasta `capture/` (dados) e geram `dist/`/`dist2/`. Eles rodavam no
scratchpad efêmero `…/84395f19-…/scratchpad`. Para reexecutar numa nova sessão, recrie essa
estrutura (ou ajuste os caminhos `__dirname + '/capture'` para apontar pra `../capturas`).

| Script | Papel |
|---|---|
| `crawl3.js`   | Loga e captura as 36 telas base (HTML+PNG) via SPA-nav. Gera `capture/pages/*`. |
| `harvest.js`  | Harvest do dataset completo das tabelas (pagina tudo) → `capture/tables.json`; e detalhes por clique. |
| `details_all.js` | Captura TODAS as páginas de detalhe por ID (`assoc-1..30`, `prod-1..25`, `store-1..20/preview`). |
| `build.js`    | Monta o clone **simples** (`dist/index.html`) — só snapshots + router. |
| `build2.js`   | Monta o clone **interativo** (`dist2/index.html`) — router + link linha→detalhe + camada busca/filtro/paginação. **Este é o principal.** |
| `verify.js` / `verify2.js` | Testes headless (render, navegação, busca, filtro, paginação, clique→detalhe). |

Setup de ambiente para rodar os scripts:
```bash
mkdir -p /tmp/dbr && cd /tmp/dbr
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright@1.55.0
# chromium usado: ~/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome (hardcoded nos scripts como EXEC)
```

## 8. Próximos passos possíveis (se o usuário voltar)

- **(c)** Empacotar multi-arquivo pra deploy (um HTML por rota + assets) → Firebase Hosting / Netlify.
- Ordenação por coluna e filtro por data nas tabelas.
- Detalhe clicável também em Vendas/Comissões (exigiria inventar rota, o original não tem).
- Reduzir tamanho do `index.html` com lazy-load das telas (hoje tudo embutido).
- Reativar mais formulários (novo associado / novo produto) com validação mock.
```
```


---

## 9. Sessão 2026-08-27 — BACKEND + BANCO DE DADOS (novo)

O usuário pediu o backend completo + banco. Entregue em `apps/api/`.
Decisões escolhidas por ele: **NestJS + Prisma + PostgreSQL**, **JWT próprio + RBAC**,
escopo **completo** (schema + API + seed). Front React novo ficou para a próxima fase.

### Pipeline novo
`tools/extract.py` lê `capturas/` e gera `apps/api/prisma/seed-data/*.json` (24 arquivos,
374 registros). É o elo entre a engenharia reversa e o banco — reexecutável a qualquer momento:

```bash
cd ~/digitaisbr-clone && python3 tools/extract.py
```

Extrai das tabelas (`tabelas-dados.json`) e também dos HTMLs em card
(planos, benefícios, conteúdos, notificações, serviços, materiais, conquistas, comunidade).

### O que existe agora
- 30 tabelas Prisma, migration `init` aplicada, 166 rotas em 17 módulos.
- Seed reproduz os números das telas originais (receita 4.395,00 / MRR 1.998,00 /
  comissões pagas 373,02 / composição de saídas 36,7-23,7-19,8-11,9-7,9%).
- 77 testes e2e em `apps/api/test/` (`npm run test:e2e`, exige API no ar).

### Gotchas desta sessão
1. Portas 5432/5433/8081 já estavam ocupadas por outro stack Docker (`rag-*`).
   Este projeto usa **5434** (Postgres) e **8082** (Adminer).
2. Duas inconsistências corrigidas no seed depois de conferir com as telas:
   - `Assinatura.ativa` deve seguir o status do associado, senão o MRR sai errado (dava 3.497
     em vez de 1.998);
   - o financeiro tinha que ser modelado como *entradas = vendas pagas* e
     *saídas = comissões pagas + custos*, e não como 6 meses de MRR acumulado.
3. Comunidade e suporte referenciam 10 pessoas que **não** estão na tabela de associados
   (Maria Silva, João Santos, Ana Oliveira…). Foram criadas como associados para preservar a
   integridade referencial — por isso o total é 40, não 30.
4. Curtidas: o dataset tinha 576, mas só há 40 associados e a curtida é única por (post, pessoa).
   Ficaram 498. Comentários (349) bateram exatos.

### Próximo passo natural
Front React (Vite + Ant Design) consumindo esta API — foi o que o usuário escolheu na pergunta
de escopo, e é o único item pendente.


---

## 10. Sessão 2026-08-27 (cont.) — FRONT REACT + IDENTIDADE VISUAL

### Entregue em `apps/web/`
React 19 + Vite + TypeScript + Ant Design 5 + TanStack Query + Recharts.
40 telas: 22 admin, 18 portal, 2 públicas. Typecheck limpo, build passa, 36/36 telas
carregam sem erro de console (verificado com Chromium headless).

### Identidade visual
O usuário forneceu `docs/DIGITAISBR_visual.pdf` (brand book) e `docs/LOGO*.zip`.
Cores **amostradas dos pixels das cartelas Pantone** do PDF, não convertidas de memória —
o Indigo Sloth amostrado bateu com o #230647 declarado no documento, o que valida o método:

| Cor | Hex | Pantone |
|---|---|---|
| Digital Blue | `#008EEA` | 2727 C |
| Mint Leaf | `#00AD9A` | 3275 C |
| Violet C | `#440099` | Violet C |
| Indigo Sloth | `#230647` | — |

Tipografia do brand book (Bebas Kai / Lufga) é comercial; a pilha em `src/marca.ts` usa as
originais primeiro e cai para Bebas Neue / Poppins do Google Fonts.
Logos recortados do kit oficial para `src/assets/` + favicon do símbolo da digital.

### Lacunas da API que o front revelou
O portal precisava de rotas próprias — `/vendas`, `/comissoes` e `/financeiro/saques` são
ADMIN-only, então o associado tomava 403. Foram acrescentadas 4 rotas (166 -> 170):
`GET /portal/vendas`, `/portal/comissoes`, `/portal/saldo`, `/portal/saques`.
Em todas o filtro por associado é imposto pelo servidor, não pelo cliente.

### Gotchas desta parte
1. **Vite 8 usa rolldown**; o binário nativo não veio pelo bug de optionalDependencies do npm
   (https://github.com/npm/cli/issues/4828). Resolvido com
   `npm i -D @rolldown/binding-linux-x64-gnu`.
2. **Gráfico do dashboard vinha vazio**: a janela era "últimos 6 meses a partir de hoje"
   (ago/2026) e as vendas do seed são de 2025. `dashboard/receita-comissoes` passou a
   ancorar a janela na venda mais recente e devolve o `periodo` usado, que a UI rotula.
3. **`@page :first { margin: 0 }` funciona no Chromium**, mas um filho absoluto que
   transborda faz o Chromium reduzir a escala da página inteira — foi o que quebrou a capa
   do PDF da documentação. `overflow: hidden` no container resolve.
4. Node 20.17 gera aviso do Vite (pede 20.19+); funciona mesmo assim.

### Como rodar tudo
`./iniciar.sh` na raiz sobe banco + API + interface. Interface em :5173, API em :3000.


---

## 11. Sessão 2026-08-28 — DESEMPENHO, SEGURANÇA E DOCUMENTAÇÃO EXPANDIDA

### Correções aplicadas a partir da navegação real do usuário
Os logs do Vite revelaram 4 avisos que o teste automatizado não pegava:
`Modal` estático (perdia o tema), `addonBefore`/`addonAfter` depreciados, e a
incompatibilidade antd 5 × React 19. Corrigidos com `@ant-design/v5-patch-for-react-19`,
`modal` do `App.useApp()` e `Space.Compact`. Console 100% limpo em todas as 36 telas.

### Desempenho — medido com autocannon, não estimado
Gargalo encontrado e corrigido: **`bcryptjs` é JS puro e travava o event loop**.
Trocado por `@node-rs/bcrypt` (nativo, roda no threadpool do libuv). Hashes compatíveis,
nenhuma senha precisou ser redefinida.

| | antes | depois |
|---|---|---|
| logins/s | 20 | **88** |
| p50 do login (c=50) | 2.577 ms | **560 ms** |
| leitura durante login | degradada | 1.272 req/s, p50 16 ms |

Linha de base: ~1.200 req/s sustentados numa instância (1 dos 24 núcleos), joelho da
curva em c=100. Projeção: ~2.500 usuários ativos com folga, ~4.000 no limite.
Clusterizar (passo 1 do cap. 10.5) levaria a 15–20 mil.

**Atenção ao medir**: rodar testes de carga em sequência sem intervalo contamina o
resultado — o `/dashboard/admin` "falhou" com 0 req/s numa rodada e fez 718 req/s
isolado. Sempre dar 3–4s entre medições.

### Segurança — testes ofensivos reais contra a API no ar
11 tentativas de IDOR, escalada de privilégio e abuso de token: todas bloqueadas.

**Vulnerabilidade encontrada e corrigida**: enumeração de usuários por temporização.
A mensagem era idêntica, mas o tempo não — 6,7 ms (email inexistente, sem bcrypt) contra
51,1 ms (email real). Corrigido com hash-isca gerado a cada boot, comparado sempre.
Diferença caiu para 3,4 ms.

Pendências de produção estão no cap. 11.4 e 15.2 do PDF. As 3 vulns do `npm audit` são
todas de dev (CLI do Prisma, autocannon) — nenhuma no runtime.

### Documentação
PDF passou de 37 para **51 páginas, 15 capítulos**. Novos: A interface (cap. 8),
Como foi desenvolvido (9), Escalabilidade e capacidade (10), Análise de segurança (11),
Publicar na internet (15).

Os fragmentos em `tools/docs/` agora são 6 e a ordem importa — está documentada no
`gerar_docs.py`. Regenerar sempre com a API no ar: `python3 tools/gerar_docs.py`.


### Correção de UX (28/08) — o admin caía num beco sem saída
O cabeçalho do admin oferecia atalho para `/portal`, mas o administrador do seed não tem
associado vinculado — todas as telas de lá respondiam 403 com "Nenhum associado vinculado".

Corrigido em duas frentes:
- `RotaProtegida` ganhou a prop `exigeAssociado`. O portal passou a usá-la e mostra uma
  explicação com caminho de volta, em vez de cada tela falhar isolada.
- O atalho "Portal" no cabeçalho do admin só aparece se `usuario.associadoId` existir.

A guarda checa **associado vinculado**, não papel: um admin que também seja associado
continua entrando normalmente.

### Manual de uso (novo)
`docs/DigitaisBR-Manual-de-Uso.pdf` — 14 páginas. A documentação existente era toda técnica;
faltava explicar *como operar*. Cobre: primeiros passos, guia da administração, guia do
associado, 24 tarefas passo a passo e FAQ (com as mensagens de erro que o usuário encontra).

O `gerar_docs.py` agora produz **dois** PDFs. O manual sai de `tools/docs/manual.html` e não
depende do Swagger.
