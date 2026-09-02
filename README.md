# DigitaisBR

Plataforma de associação de criadores digitais: área administrativa e portal do associado.

O projeto nasceu como um **clone em HTML/JS** da plataforma original (obtido por scraping) e
hoje tem também um **backend próprio com banco de dados**, modelado a partir do domínio real
extraído daquelas capturas.

```
digitaisbr-clone/
├── apps/api/              Backend NestJS + Prisma + PostgreSQL  → ver apps/api/README.md
├── apps/web/              Interface React + Ant Design          → ver apps/web/README.md
├── iniciar.sh             Sobe banco, API e interface de uma vez
├── docs/                  Brand book, logos e documentação em PDF
├── tools/extract.py       Extrai o dataset das capturas → seed do banco
├── tools/gerar_docs.py    Gera a documentação a partir do código e do Swagger
├── capturas/              HTML renderizado, screenshots e datasets das 113 telas
├── index.html             Clone estático interativo (snapshot, sem backend)
├── docker-compose.yml     PostgreSQL + Adminer (desenvolvimento)
├── docker-compose.prod.yml  Pilha de produção: proxy + front + API + banco
├── Caddyfile              Proxy de borda com TLS automático
├── DEPLOY.md              ★ Guia de deploy na DigitalOcean
├── context_digitaisbr.md  ★ Handoff completo — leia este primeiro
└── context.md             Histórico cronológico da engenharia reversa
```

## Começar

```bash
./iniciar.sh
```

Sobe o Postgres, a API e a interface. Depois é só abrir **<http://localhost:5173>**.

Na primeira vez, popule o banco: `cd apps/api && npm run seed`.

| | |
|---|---|
| Interface | <http://localhost:5173> |
| API · Swagger | <http://localhost:3000/api> · `/api/docs` |
| Adminer | <http://localhost:8082> |

Código de acesso `X9k#Lm$2vQ8!pTzR`, depois
`administrador@digitaisbr.com` / `Admin@2026` (admin) ou
`ana-silva@email.com` / `Assoc@2026` (associada).

> **Quer publicar na internet?** [`DEPLOY.md`](DEPLOY.md) tem o passo a passo na DigitalOcean.
>
> **Retomando o projeto?** Comece por
> **[`context_digitaisbr.md`](context_digitaisbr.md)** — decisões, armadilhas, bugs corrigidos,
> pendências e onde olhar para cada assunto.

## Em números

- **37 tabelas**, 170 rotas, 17 módulos no backend
- **~1.200 req/s** medidos numa instância; ~2.500 usuários ativos com folga
- **40 telas** na interface — 22 administrativas, 18 do portal, 2 públicas
- **JWT com refresh rotativo** + RBAC (admin/associado) + gate por plano
- **374 registros reais** no seed, extraídos das telas originais
- **77 testes end-to-end** na API (`npm run test:e2e`)
- Identidade visual do brand book oficial (`docs/DIGITAISBR_visual.pdf`)

Os indicadores calculados pela API reproduzem os das telas originais — receita R$ 4.395,00,
ticket médio R$ 146,50, MRR R$ 1.998,00, comissões pagas R$ 373,02.

## Documentação

**[`docs/DigitaisBR-Manual-de-Uso.pdf`](docs/DigitaisBR-Manual-de-Uso.pdf)** — **como usar a
plataforma.** Guia do administrador e do associado, 24 tarefas passo a passo e as perguntas
frequentes. É o documento para quem vai operar o sistema.

**[`docs/DigitaisBR-Documentacao.pdf`](docs/DigitaisBR-Documentacao.pdf)** — 51 páginas, 15 capítulos:
visão de produto, arquitetura, autenticação, modelo de dados, regras de negócio, módulos
funcionais, referência das 170 rotas, a interface, como foi desenvolvido, **capacidade medida**,
**análise de segurança**, fidelidade dos dados, testes, operação e **guia de publicação**.

Gerada a partir do Swagger da API em execução e dos decoradores do código
(`python3 tools/gerar_docs.py`), então não descreve endpoint inexistente nem inventa permissão.

**[`docs/RELATORIO-TESTES-CARGA.md`](docs/RELATORIO-TESTES-CARGA.md)** — testes de carga:
metodologia, capacidade medida por endpoint, o gargalo de hash de senha que foi encontrado e
corrigido (login 4,4× mais rápido), e como reproduzir.

Referência técnica curta: [`apps/api/README.md`](apps/api/README.md).

---

# Clone em HTML + JavaScript

Recriação autônoma da plataforma `https://digitaisbr-plataforma.web.app`, feita a partir do
web scraping das páginas renderizadas (login admin `administrador@digitaisbr.com`, plano Avançado).

O original é uma SPA React (Vite + Ant Design + Firebase + Recharts). Este clone **não depende
de React nem de Firebase**: é um único arquivo com um roteador e uma camada de interações em
JavaScript puro.

## Arquivos

- **`index.html`** — clone **interativo** (versão principal, ~9 MB). 113 telas, tudo inline.
- `index-snapshot-simples.html` — versão mais leve (~4,8 MB), só os 36 snapshots, sem interações.
- `capturas/html/` — HTML renderizado bruto de cada rota (113 arquivos).
- `capturas/screenshots/` — screenshots full-page.
- `capturas/tabelas-dados.json` — dataset completo de cada tabela (todas as páginas).
- `capturas/paginas-detalhe.json` — índice das 77 páginas de detalhe capturadas.

## Como abrir

Duplo clique em `index.html` (ou `file://…/index.html`). Nenhum servidor necessário.
Navegação por hash: `index.html#/`, `index.html#/associados`, `index.html#/portal/loja`, …
Há um seletor **"ir para"** no canto inferior direito.

## (a) Telas de detalhe por ID — COMPLETO

Todas as linhas das tabelas de **Associados (30)**, **Catálogo (25)** e **Lojas (20)** são
clicáveis e abrem a página de detalhe real correspondente (`/associados/assoc-N`,
`/catalogo/prod-N`, `/lojas/store-N/preview`). O vínculo linha→detalhe foi reconstruído por
correspondência de nome, já que o ID original vivia no `onClick` do React (removido no clone).
Também há 2 telas de formulário de edição (`/associados/assoc-1/editar`, `/catalogo/prod-1/editar`).

## (b) Fluxos reativados com mock JS — sem back-end

Nas tabelas administrativas (Associados, Vendas, Comissões, Lojas, Parceiros, Catálogo, Suporte)
os seguintes fluxos funcionam localmente, sobre o **dataset completo** harvestado (ex.: Vendas
tem as 60 vendas, não só as 10 da primeira página):

- **Busca** — o campo de texto filtra as linhas em tempo real.
- **Filtros** — os selects (Status, Plano, etc.) filtram por coluna (reconstruídos como
  `<select>` nativos estilizados, pois o dropdown do Ant Design dependia de JS do React).
- **Paginação** — 10 por página, recalculada sobre o resultado filtrado.
- **Clique na linha / ícone 👁** — abre o detalhe (ver item a).

## Limites honestos

- É um **snapshot**: os dados são os fictícios do momento da captura. Ações de escrita do
  original (salvar, reembolsar, exportar CSV, aprovar) chamavam o Firebase e aqui são inertes.
- Filtros por **data** e ordenação por coluna não foram reimplementados (só busca + select + paginação).
- Detalhes cobrem Associados/Catálogo/Lojas; outras listas (Vendas, Comissões…) têm busca/filtro/
  paginação, mas suas linhas não abrem detalhe (o original também não tinha rota de detalhe pra elas).
- Reconstrói o **resultado renderizado**, não o código-fonte React (o bundle é minificado).

> As ações de escrita listadas acima como inertes no clone estático **já existem de verdade**
> no backend (`apps/api`): registrar venda, reembolsar, pagar comissões, exportar CSV.
