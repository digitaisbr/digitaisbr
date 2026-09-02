# DigitaisBR — Web

Interface da plataforma: área administrativa, portal do associado e páginas públicas.

**React 19 · Vite · TypeScript · Ant Design 5 · TanStack Query · Recharts**

---

## Subir

A API precisa estar no ar antes (`apps/api`, porta 3000).

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

O Vite faz proxy de `/api` para `http://localhost:3000`, então não há CORS em desenvolvimento.

### Entrar

O acesso reproduz o gate da plataforma original: primeiro o **código de acesso**
(`X9k#Lm$2vQ8!pTzR`), depois o login. A tela de login traz botões que preenchem as
contas de demonstração.

| Perfil | Email | Senha |
|---|---|---|
| Administrador | `administrador@digitaisbr.com` | `Admin@2026` |
| Associada | `ana-silva@email.com` | `Assoc@2026` |

---

## Identidade visual

Segue o brand book em `docs/DIGITAISBR_visual.pdf`. As cores foram amostradas das
cartelas Pantone do próprio documento — o *Indigo Sloth* confere com o `#230647` que
o PDF declara, o que valida a extração.

| Cor | Hex | Papel |
|---|---|---|
| Digital Blue (2727 C) | `#008EEA` | primária — ações, links, séries principais |
| Mint Leaf (3275 C) | `#00AD9A` | positivos — receita, comissões, sucesso |
| Violet C | `#440099` | acentos e segunda série dos gráficos |
| Indigo Sloth | `#230647` | fundos institucionais (login, acesso) |

**Tipografia.** O brand book pede *Bebas Kai* (principal) e *Lufga* (secundária); nenhuma
das duas é livre. A pilha usa as originais primeiro e cai para *Bebas Neue* e *Poppins*,
então uma instalação licenciada prevalece sozinha. Tudo em `src/marca.ts`.

Os logos em `src/assets/` foram recortados do kit oficial (`docs/LOGO*.zip`) e têm fundo
transparente, servindo em claro e escuro. O favicon sai do símbolo da digital.

---

## Estrutura

```
src/
  marca.ts              cores, gradientes e tipografia do brand book
  api/
    cliente.ts          axios + refresh automático com rotação
    hooks.ts            useApi / useLista / useAcao sobre TanStack Query
    tipos.ts            contratos espelhando os DTOs da API
    formato.ts          moeda, percentual, datas, cores de status
  auth/                 contexto de sessão e guardas de rota
  layouts/              casca do admin e do portal
  componentes/
    TabelaRecurso.tsx   tabela ligada à API (busca/filtro/ordenação/paginação no servidor)
    Cartoes.tsx         faixa de métricas
    Pagina.tsx          moldura de página
    Estado.tsx          carregando / erro / vazio num só lugar
    Logo.tsx            logo oficial nas três variantes
  paginas/
    auth/     acesso e login
    admin/    22 telas administrativas
    portal/   18 telas do associado
    publico/  vitrine da loja e perfil do criador
```

### Duas decisões que moldam o resto

**Filtro no servidor, não no cliente.** `TabelaRecurso` envia busca, filtros, ordenação e
paginação como query params. Filtrar no cliente só alcançaria a página carregada; assim a
busca vale sobre o conjunto inteiro.

**Renovação de token com uma única corrida.** Ao receber 401, o cliente renova e repete a
requisição. Chamadas simultâneas que falhem no mesmo instante aguardam a *mesma* renovação —
o refresh é rotativo e só serve uma vez, então disparar várias invalidaria a sessão.

---

## Rotas

| Área | Caminhos |
|---|---|
| Pública | `/acesso`, `/login`, `/loja/:slug`, `/perfil/:handle` |
| Admin | `/`, `/associados`, `/catalogo`, `/lojas`, `/vendas`, `/comissoes`, `/financeiro`, `/planos`, `/parceiros`, `/beneficios`, `/conteudos`, `/comunidade`, `/servicos`, `/suporte`, `/comunicacoes`, `/relatorios` |
| Portal | `/portal` e 17 subrotas (loja, vendas, financeiro, cupons, links, performance, benefícios, conteúdos, materiais, comunidade, ranking, assessoria, suporte, redes sociais, plano, perfil, notificações) |

---

## Build

```bash
npm run build        # tsc -b && vite build
npm run preview
```

> Se o build falhar com *"Cannot find native binding"*, é o
> [bug do npm com dependências opcionais](https://github.com/npm/cli/issues/4828).
> Resolve com `npm i -D @rolldown/binding-linux-x64-gnu` (ou o pacote da sua plataforma).
