# Relatório de testes de carga — API DigitaisBR

**Data:** 28 de agosto de 2026 · **Versão da API:** 1.0 (170 rotas)

---

## Resumo

A API sustenta **~1.200 requisições por segundo** numa única instância Node, com p99 abaixo
de 100 ms até 100 conexões simultâneas. Traduzido para navegação real, isso comporta
**cerca de 2.500 usuários ativos com folga** e ~4.000 no limite.

Um gargalo sério foi encontrado e corrigido durante os testes: a biblioteca de hash de senha
bloqueava o event loop, limitando o login a 20 por segundo *e* degradando todas as outras
requisições. Depois da correção, o login faz 88/s e não interfere mais nas leituras.

---

## 1. Metodologia

| Item | Valor |
|---|---|
| Ferramenta | `autocannon` 8.x |
| Duração por medição | 12 s (8–10 s nas séries de concorrência) |
| Concorrência padrão | 50 conexões |
| Aquecimento | uma chamada a cada endpoint antes de medir |
| Intervalo entre medições | 3–4 s *(ver seção 5 — isto importa)* |
| Modo da API | `NODE_ENV=production`, build compilado |
| Rate limiter | elevado durante a medição, para medir capacidade e não o limitador |
| Banco | populado com o seed (374 registros) |

### Ambiente

```
CPU:       AMD Ryzen AI 9 HX 370 — 24 núcleos
RAM:       93 GB
Node:      v20.17.0        Postgres: 16.14 (Docker)
Topologia: API e banco no mesmo host, sem latência de rede
Instância: 1 processo Node (usa 1 núcleo dos 24)
```

> **Leitura correta destes números.** Foram obtidos numa máquina de desenvolvimento, sem rede
> entre API e banco. Servem para **comparar endpoints entre si** e **revelar gargalos** — que
> é para o que foram feitos. Não são promessa de desempenho em produção, onde entram latência
> de rede, disco compartilhado e máquinas menores. Um teste no ambiente real de destino
> continua necessário antes de abrir ao público.

---

## 2. Capacidade por endpoint

50 conexões simultâneas, 12 segundos, após aquecimento, com intervalo entre medições.

| Endpoint | req/s | p50 | p90 | p99 | Perfil da consulta |
|---|---:|---:|---:|---:|---|
| `GET /planos` | **1.906** | 25 ms | 29 ms | 40 ms | leitura leve, 3 linhas |
| `GET /financeiro/visao-geral` | **1.244** | 33 ms | 56 ms | 81 ms | 6 agregações |
| `GET /vendas?limit=10` | **1.174** | 38 ms | 44 ms | 59 ms | lista paginada + joins |
| `GET /catalogo/produtos?limit=10` | **1.068** | 42 ms | 62 ms | 86 ms | lista + categoria + plano |
| `GET /comunidade/posts?limit=10` | **1.042** | 44 ms | 65 ms | 81 ms | lista + contagens |
| `GET /associados?limit=10` | **868** | 55 ms | 80 ms | 104 ms | joins + subconsulta de comissões |
| `GET /relatorios` | **754** | 62 ms | 89 ms | 140 ms | 6 `groupBy` + 3 consultas |
| `GET /lojas/publica/:slug` | **667** | 65 ms | 117 ms | 197 ms | público + escrita do contador |
| `GET /dashboard/admin` | **658** | 74 ms | — | 115 ms | 18 agregações em paralelo |
| `POST /auth/login` | **88** | 560 ms | — | 622 ms | bcrypt — caro por natureza |

**Observações.**

- A diferença entre 1.900 e 660 req/s acompanha o número de consultas por requisição, não o
  volume de dados. `/dashboard/admin` dispara 18 agregações; `/planos` faz uma.
- `/lojas/publica/:slug` é o único endpoint público que **escreve** (incrementa o contador de
  visualizações), o que explica ficar abaixo das leituras puras.
- O login é uma ordem de grandeza mais lento — e deve ser mesmo. Ver seção 4.

---

## 3. Comportamento sob concorrência

Mesmo endpoint (`/associados?limit=10`), concorrência crescente:

| Conexões | req/s | p50 | p90 | p99 | Leitura |
|---:|---:|---:|---:|---:|---|
| 10 | 935 | 7 ms | 12 ms | 19 ms | folgado |
| 25 | 1.077 | 22 ms | 31 ms | 41 ms | confortável |
| 50 | 1.185 | 40 ms | 49 ms | 58 ms | bom |
| **100** | **1.243** | 78 ms | 87 ms | 100 ms | **joelho da curva** |
| 200 | 1.214 | 160 ms | 185 ms | 221 ms | saturado |
| 400 | 1.111 | 334 ms | 391 ms | 482 ms | saturado |

O throughput satura em torno de 100 conexões. A partir daí a latência cresce
**linearmente** e a vazão não sobe — comportamento clássico de fila: o sistema não quebra,
apenas enfileira. Zero erros e zero timeouts em todos os níveis, inclusive a 400 conexões.

---

## 4. Gargalo encontrado e corrigido

### Sintoma

A primeira rodada mediu o login em **17–20 req/s**, com p50 de 2,5 segundos a 50 conexões.
Pior: as *leituras* também degradavam durante carga de login, o que não deveria acontecer —
são consultas independentes.

### Causa

A dependência `bcryptjs` é uma implementação em **JavaScript puro**. Ela ocupa a thread
principal enquanto calcula o hash. Como o Node processa tudo num único event loop, cada
login parava o servidor inteiro por dezenas de milissegundos.

Isso também contaminou a primeira medição de `/relatorios`, que apareceu com p99 de 4
segundos — número que **não se confirmou** depois da correção.

### Correção

Troca por `@node-rs/bcrypt` — binário nativo (Rust) que roda no threadpool do libuv em vez
da thread principal. Os hashes são compatíveis com os do `bcryptjs`, então **nenhuma senha
precisou ser redefinida**; o login com as credenciais existentes continuou funcionando.

O custo de hash foi mantido em 10 rounds. Baratear o hash aumentaria o throughput, mas
enfraqueceria as senhas contra força bruta — não é o caminho.

### Resultado

| Medida | Antes (`bcryptjs`) | Depois (nativo) | Ganho |
|---|---:|---:|---:|
| Logins por segundo | 20 | **88** | 4,4× |
| p50 do login (50 conexões) | 2.577 ms | **560 ms** | 4,6× |
| p99 do login (50 conexões) | 4.138 ms | **622 ms** | 6,6× |
| `/planos` **durante** carga de login | degradado | **1.272 req/s, p50 16 ms** | sem bloqueio |

A última linha é a mais relevante: o event loop deixou de travar. Leituras mantêm desempenho
pleno enquanto logins são processados.

---

## 5. Armadilha metodológica encontrada

Numa das rodadas, `/dashboard/admin` registrou **0 req/s com 48 erros** e latência de 6 a 9
segundos. O número parecia indicar um endpoint quebrado.

**Não reproduziu.** Testado isoladamente, o mesmo endpoint fez 718 e 658 req/s em duas
tentativas seguidas, com zero erros:

| Conexões | req/s | p50 | p99 | erros |
|---:|---:|---:|---:|---:|
| 1 | 392 | 2 ms | 4 ms | 0 |
| 10 | 604 | 15 ms | 32 ms | 0 |
| 30 | 709 | 41 ms | 64 ms | 0 |
| 50 | 718 | 69 ms | 96 ms | 0 |

**Causa:** os testes rodavam em sequência sem intervalo. As conexões do teste anterior ainda
drenavam do pool quando o seguinte começava, e o `/dashboard/admin` — que consome 18 conexões
por requisição — era o mais sensível a isso.

**Lição:** dar 3–4 segundos entre medições. Sem isso, um teste contamina o próximo e produz
falsos gargalos. Todos os números da seção 2 foram remedidos com intervalo.

---

## 6. Quantos usuários simultâneos

"Conexões simultâneas" ≠ "usuários simultâneos". Uma pessoa navegando não mantém uma
requisição contínua: carrega uma tela, lê, clica de novo.

**Premissas do cálculo:**

- tempo de leitura entre ações: 8 a 12 segundos
- requisições por tela: ~3 em média (o dashboard faz 5; uma listagem, 2)
- logo, **~0,3 requisição por segundo por usuário ativo**

| Cenário | Usuários | Justificativa |
|---|---:|---|
| Com folga | **~2.500** | p99 abaixo de 100 ms, margem para picos |
| No limite | **~4.000** | 1.200 ÷ 0,3 — latência ainda aceitável |
| Pico de login | **88/s** | 5.000 pessoas entrando ao mesmo tempo levam ~57 s para escoar |

O login é o teto real em eventos de pico. É intrínseco ao bcrypt, e a solução correta é
distribuir a carga entre processos — não baratear o hash.

---

## 7. Caminhos de crescimento

A arquitetura não guarda estado em memória — a sessão vive no token e no banco. Isso é o que
torna a escala horizontal possível sem reescrever nada.

| # | Passo | Ganho esperado | Custo |
|---|---|---|---|
| 1 | **Clusterizar o Node** (PM2, 4–8 workers) | 4–8× throughput e logins | Baixo — melhor retorno |
| 2 | Cache nos analíticos (30–60 s) | tira as consultas caras do caminho quente | Baixo |
| 3 | Ajustar `connection_limit` do Prisma aos workers | evita esgotar as 100 conexões do Postgres | Baixo |
| 4 | Réplica de leitura para relatórios | isola analítico de transacional | Médio |
| 5 | Múltiplas instâncias atrás de balanceador | escala quase linear | Médio |
| 6 | CDN para o front | tira o estático da API | Baixo |

Só com o passo 1, a projeção sobe para **15.000 a 20.000 usuários ativos** na mesma máquina,
com o login indo de 88 para algo em torno de 500 por segundo.

---

## 8. Conclusões

1. **A API está saudável.** Zero erros e zero timeouts em todos os cenários, até 400 conexões.
   Sob saturação ela enfileira; não quebra.
2. **O gargalo era o hash de senha**, e foi corrigido — com ganho de 4,4× no login e, mais
   importante, sem travar mais o event loop.
3. **A capacidade atual atende a operação prevista.** ~2.500 usuários ativos numa instância
   cobrem confortavelmente uma associação de milhares de associados.
4. **O crescimento é barato.** Clusterizar é uma linha de configuração e multiplica por 4–8.
5. **O que ainda não foi testado:** carga com escritas concorrentes (registro de vendas em
   volume), comportamento com o banco 100× maior, e o ambiente real de produção com rede.

---

## 9. Como reproduzir

```bash
# 1. subir a API em modo de produção, com o limitador elevado
cd apps/api
npm run build
NODE_ENV=production THROTTLE_LIMIT=1000000 node dist/main.js &

# 2. obter um token
T=$(curl -s -X POST localhost:3000/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"administrador@digitaisbr.com","senha":"Admin@2026"}' \
     | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")

# 3. medir um endpoint (lembrar do intervalo entre medições!)
npx autocannon -c 50 -d 12 -H "Authorization=Bearer $T" \
  http://localhost:3000/api/associados?limit=10
```

A variável `THROTTLE_LIMIT` foi adicionada ao `app.module.ts` justamente para permitir esta
medição sem o rate limiter no caminho. **Em produção ela deve ficar ausente** — o padrão é
300 requisições por minuto por IP.

---

*Medições e análise executadas em 28/08/2026. Os mesmos dados constam do capítulo 10 da
[documentação da plataforma](DigitaisBR-Documentacao.pdf).*
