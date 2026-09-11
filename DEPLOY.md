# Deploy na DigitalOcean

Guia prático para colocar a DigitaisBR no ar. Os artefatos já existem e foram testados
localmente — o que falta é executar num servidor com domínio.

---

## Antes de tudo: o que é obrigatório

Estes quatro itens **não são opcionais**. Sem eles, a plataforma vai ao ar insegura.

| | Item | Por quê |
|---|---|---|
| 1 | **Gerar segredos novos** | `JWT_SECRET` e `JWT_REFRESH_SECRET` de desenvolvimento estão no repositório. Quem os lê **forja qualquer token** e entra como administrador. |
| 2 | **Não usar as senhas do seed** | `Admin@2026` está na documentação e no repositório. |
| 3 | **Nunca rodar o seed em produção** | Ele executa `TRUNCATE` em todas as tabelas antes de carregar. |
| 4 | **TLS** | O token viaja no cabeçalho `Authorization`. Sem HTTPS, é interceptável. |

O Caddy resolve o item 4 sozinho. Os outros três dependem de você.

---

## Escolher o caminho

A DigitalOcean oferece dois modelos. Ambos funcionam com o que já está pronto.

| | **Droplet + Docker** | **App Platform** |
|---|---|---|
| O que é | Um servidor Linux que você administra | PaaS: você entrega o código, ela cuida do resto |
| Custo inicial | ~US$ 24/mês (2 vCPU / 4 GB) | ~US$ 25–40/mês (2 serviços + banco) |
| Banco | No próprio Droplet (grátis) ou gerenciado (+US$ 15) | Gerenciado, incluso |
| TLS | Caddy automático | Automático |
| Deploy | `git pull && docker compose up -d --build` | `git push` na branch |
| Backup | Você configura | Automático no banco |
| Escala | Manual (mais workers, mais Droplets) | Botão |
| Exige | Saber o básico de Linux e Docker | Repositório no GitHub |

**Recomendação:** comece pelo **Droplet**. O projeto já é Docker Compose, o custo é menor e
você mantém controle. Migrar para App Platform depois é simples — as imagens são as mesmas.

---

## Caminho A — Droplet (recomendado)

### 1. Criar o servidor

No painel da DigitalOcean: **Create → Droplets**

- **Imagem:** Ubuntu 24.04 LTS
- **Tipo:** Basic → Regular
- **Região:** **New York** — a DigitalOcean **não tem datacenter no Brasil**. Nova York é
  a mais próxima, com cerca de 110–130 ms de latência a partir do Brasil. Perceptível, mas
  aceitável para uma aplicação de gestão. Se a latência for crítica, veja as alternativas
  no fim deste guia.
- **Autenticação:** SSH Key (não "Password")
- **Tamanho:**

| Droplet | Preço | Serve? |
|---|---:|---|
| 1 vCPU / **1 GB** | ~US$ 6 | Funciona, mas **só com swap** (passo 3). O build é lento. |
| 1 vCPU / **2 GB** | ~US$ 12 | **Recomendado.** Compila sem drama e sobra folga. |
| 2 vCPU / 4 GB | ~US$ 24 | Só quando o tráfego justificar. |

A aplicação em execução usa cerca de **235 MB** (API 122 + Postgres 92 + Caddy 20). O que
pesa é *compilar* — e isso acontece uma vez a cada deploy, não o tempo todo.

> Redimensionar depois são dois cliques e alguns minutos fora do ar. Não precisa acertar
> de primeira.

### 2. Apontar o domínio

Você **não precisa transferir nem comprar nada**. O domínio continua no registrador atual;
só é preciso dizer a ele para qual IP o nome responde.

Não custa nada a mais: o registro anual você já paga, e nem a DigitalOcean nem o Let's
Encrypt cobram por DNS ou certificado.

#### No registro.br (domínios `.br`)

1. Entre em [registro.br](https://registro.br) → **Meus Domínios** → clique no domínio
2. Aba **DNS** → mantenha a opção de usar os servidores DNS do próprio registro.br
3. Clique em **Editar Zona** e adicione dois registros:

| Tipo | Nome | Dados / Valor |
|---|---|---|
| `A` | *(deixe em branco — é o domínio raiz)* | `<IP-DO-DROPLET>` |
| `A` | `www` | `<IP-DO-DROPLET>` |

4. Salve. A propagação costuma levar de alguns minutos a algumas horas.

> **Alternativa:** dá para usar o DNS da DigitalOcean (também grátis) trocando os
> *nameservers* no registro.br para `ns1.digitalocean.com`, `ns2…`, `ns3…`. Só vale a pena
> se você quiser gerenciar tudo num painel só — não muda em nada o resultado.

#### Confirmar antes de seguir

```bash
dig +short digitaisbr.com        # deve devolver o IP do Droplet
```

**Espere isto responder o IP certo antes do passo 6.** O Caddy só consegue emitir o
certificado se o domínio já resolver para o servidor — se subir antes, ele tenta, falha e
fica reagendando por alguns minutos.

### 3. Preparar o servidor

```bash
ssh root@<IP-DO-DROPLET>

# Docker e git
apt update && apt install -y docker.io docker-compose-v2 docker-buildx git
systemctl enable --now docker

# firewall: só SSH e web
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable

# usuário sem privilégios para a aplicação
adduser --disabled-password --gecos "" digitaisbr
usermod -aG docker digitaisbr
```

#### Swap — obrigatório no Droplet de 1 GB, recomendado em todos

Sem swap, a compilação estoura a memória e o deploy falha no meio. Com 2 GB de swap ela
passa, apenas mais devagar.

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile

# torna permanente, para sobreviver a reinícios
echo '/swapfile none swap sw 0 0' >> /etc/fstab

free -h        # deve mostrar 2Gi em Swap
```

### 4. Publicar o código

```bash
su - digitaisbr
git clone git@github.com:digitaisbr/digitaisbr.git app && cd app
```

O repositório é privado, então o servidor precisa de permissão de leitura. No próprio
Droplet:

```bash
ssh-keygen -t ed25519 -C "droplet-digitaisbr" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Copie a saída e cadastre em **github.com/digitaisbr/digitaisbr → Settings → Deploy keys →
Add deploy key** (sem marcar "Allow write access" — o servidor só precisa ler).

### 5. Configurar os segredos

```bash
cp .env.production.example .env.production
```

Gere cada segredo e cole no arquivo:

```bash
openssl rand -base64 48    # JWT_SECRET
openssl rand -base64 48    # JWT_REFRESH_SECRET
openssl rand -base64 32    # POSTGRES_PASSWORD
```

Preencha também `DOMINIO`, `EMAIL_TLS` e `ACCESS_CODE`. Depois:

```bash
chmod 600 .env.production      # só o dono lê
```

### 6. Subir

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

O que acontece: as imagens são construídas, o Postgres sobe, a API **aplica as migrations
automaticamente** e só então aceita tráfego, e o Caddy emite o certificado TLS.

Acompanhe:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

### 7. Criar o administrador real

O banco sobe **vazio** — sem seed, sem contas. Crie o primeiro administrador:

```bash
docker compose -f docker-compose.prod.yml exec api node -e '
const { PrismaClient } = require("@prisma/client");
const { hash } = require("@node-rs/bcrypt");
(async () => {
  const p = new PrismaClient();
  // os três planos precisam existir antes do primeiro associado
  const planos = [
    { nivel: "BASICO", nome: "Básico", preco: 49.9, ordem: 1, limiteProdutos: 20,
      comissaoExtraPct: 0, suporte: "Email", descricao: "Plano inicial.", recursos: [] },
    { nivel: "INTERMEDIARIO", nome: "Intermediário", preco: 99.9, ordem: 2, limiteProdutos: 100,
      comissaoExtraPct: 2, suporte: "Chat", descricao: "Plano intermediário.", recursos: [] },
    { nivel: "AVANCADO", nome: "Avançado", preco: 199.9, ordem: 3, limiteProdutos: -1,
      comissaoExtraPct: 5, suporte: "Prioritário", descricao: "Plano completo.", recursos: [] },
  ];
  for (const plano of planos) {
    await p.plano.upsert({ where: { nivel: plano.nivel }, create: plano, update: {} });
  }

  await p.usuario.create({
    data: {
      email: process.env.ADMIN_EMAIL,
      nome: "Administrador",
      senhaHash: await hash(process.env.ADMIN_SENHA, 10),
      role: "ADMIN",
    },
  });
  console.log("administrador criado:", process.env.ADMIN_EMAIL);
  await p.$disconnect();
})();
' -- ADMIN_EMAIL=voce@digitaisbr.com ADMIN_SENHA='<senha-forte>'
```

Depois disso, use a própria interface (**Cadastros → Associados**) para o resto.

### 8. Conferir

```bash
curl -I https://digitaisbr.com                  # front
curl -I https://digitaisbr.com/api/planos       # 401 = guard ativo, API no ar
```

Abra `https://digitaisbr.com`, informe o código de acesso e entre com o administrador criado.

---

## Caminho B — App Platform

Se preferir não administrar servidor:

1. **Create → Apps**, conecte o repositório do GitHub.
2. Crie **dois componentes**, ambos por Dockerfile:
   - `api` — source `apps/api`, Dockerfile `apps/api/Dockerfile`, rota `/api`, porta 3000
   - `web` — source `apps/web`, Dockerfile `apps/web/Dockerfile`, rota `/`, porta 80
3. **Add Resource → Database → PostgreSQL 16.** A DO injeta `${db.DATABASE_URL}`.
4. Variáveis de ambiente do componente `api` (marque como **encrypted**):
   `DATABASE_URL=${db.DATABASE_URL}`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_CODE`,
   `CORS_ORIGINS=https://<seu-domínio>`, `NODE_ENV=production`.
5. Domínio em **Settings → Domains**. O TLS é automático.

As migrations rodam sozinhas na subida, pelo mesmo entrypoint.

> **Atenção:** o App Platform reinicia os contêineres a cada deploy. Como não há estado em
> memória (a sessão vive no token e no banco), isso não afeta os usuários.

---

## Banco gerenciado (recomendado a partir de produção real)

O `docker-compose.prod.yml` traz um Postgres em contêiner — bom para começar, mas **volume
Docker não é backup**.

Para migrar ao gerenciado:

1. **Create → Databases → PostgreSQL 16**, mesma região do Droplet.
2. Em *Trusted Sources*, libere apenas o Droplet.
3. Remova o serviço `db` do compose e troque a `DATABASE_URL` do serviço `api` pela string
   do cluster, acrescentando `?sslmode=require&connection_limit=20`.
4. Migre os dados, se já houver:

```bash
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U digitaisbr digitaisbr > backup.sql
psql "<CONNECTION-STRING-DO-CLUSTER>" < backup.sql
```

Custa a partir de ~US$ 15/mês e traz backup diário, restauração pontual e atualização de versão.

---

## Operação do dia a dia

```bash
cd ~/app
C="docker compose -f docker-compose.prod.yml --env-file .env.production"

$C ps                    # o que está rodando
$C logs -f api           # logs da API
$C restart api           # reiniciar um serviço
$C up -d --build         # publicar uma versão nova
$C down                  # derrubar (dados ficam nos volumes)
```

### Publicar uma atualização

```bash
cd ~/app && git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

As migrations pendentes são aplicadas sozinhas. Há um breve intervalo entre parar e subir —
para deploy sem queda, seria preciso duas instâncias atrás do balanceador.

### Backup manual (enquanto o banco for em contêiner)

```bash
$C exec -T db pg_dump -U digitaisbr digitaisbr | gzip > backup-$(date +%F).sql.gz
```

Vale agendar no `crontab` e enviar para o **Spaces** (o S3 da DigitalOcean).

---

## Quando o tráfego crescer

Medimos ~1.200 req/s numa instância, o que comporta **~2.500 usuários ativos** com folga
(detalhes em `docs/RELATORIO-TESTES-CARGA.md`). Na ordem de melhor retorno:

| # | Ação | Ganho |
|---|---|---|
| 1 | Rodar a API em cluster (4–8 workers) | 4–8× — leva a ~15–20 mil usuários |
| 2 | Cache nos analíticos (dashboard, relatórios) | tira as consultas mais caras do caminho quente |
| 3 | Banco gerenciado com réplica de leitura | isola analítico de transacional |
| 4 | Segundo Droplet + Load Balancer (~US$ 12) | escala quase linear |
| 5 | Spaces + CDN para o front | tira o estático da API |

O passo 1 é uma linha: no `docker-compose.prod.yml`, troque o comando do serviço `api` para
usar o modo cluster do Node ou PM2.

---

## Segurança pós-deploy

Já resolvido pelos artefatos:

- ✅ TLS automático e renovado sozinho
- ✅ HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- ✅ Banco sem porta exposta — só a rede interna do compose o alcança
- ✅ API roda como usuário sem privilégios dentro do contêiner
- ✅ Migrations aplicadas antes de aceitar tráfego

Ainda depende de você:

- ☐ Segredos gerados (item 1 do topo)
- ☐ Rate limit menor no login — hoje são 300/min para todas as rotas
- ☐ Swagger fechado em produção — `/api/docs` expõe o mapa completo da API
- ☐ Backup testado (fazer backup e **restaurar** ao menos uma vez)
- ☐ Monitoramento de erros 5xx
- ☐ Expurgo de `notificacoes` e `logs_auditoria`, que crescem sem teto

A análise completa está no capítulo 11 da documentação técnica.

---

## Estimativa de custo

| Item | Piloto | Produção |
|---|---:|---:|
| Droplet | US$ 12 (1 vCPU / 2 GB) | US$ 24 (2 vCPU / 4 GB) |
| Banco gerenciado | — (no Droplet) | US$ 15 |
| Backup automático do Droplet | US$ 2,40 | US$ 4,80 |
| Spaces (guardar backups) | — | US$ 5 |
| **Total/mês** | **~US$ 14** | **~US$ 49** |

> Valores aproximados, de referência. **Confirme na
> [página de preços da DigitalOcean](https://www.digitalocean.com/pricing)** antes de decidir —
> os planos mudam. O backup automático custa 20% do valor do Droplet.

---

## Alternativas com datacenter no Brasil

A DigitalOcean não tem região brasileira. Se os ~120 ms de latência incomodarem, estes
provedores têm presença no país e rodam exatamente os mesmos arquivos deste repositório —
`docker-compose.prod.yml`, Dockerfiles e Caddyfile funcionam sem alteração:

| Provedor | Região BR | Preço aproximado | Observação |
|---|---|---|---|
| **Vultr** | São Paulo | ~US$ 12 (1 vCPU / 2 GB) | Painel e experiência muito parecidos com a DO |
| **Magalu Cloud** | Brasil | em R$ | Nacional, cobrança em real, suporte em português |
| **AWS Lightsail** | São Paulo | ~US$ 12 | Da AWS, mas simplificado como um VPS comum |
| **Hostinger VPS** | Brasil | ~R$ 40 | Barato; leia sobre o desempenho antes |

O passo a passo é o mesmo em qualquer um: criar o servidor, apontar o DNS, instalar Docker,
clonar o repositório, preencher os segredos e subir.

**Vale a pena trocar?** Só se a diferença for sentida no uso. Para um sistema de gestão —
onde se abre uma tela, lê, clica de novo — 120 ms a mais por requisição raramente incomoda.
Para algo em tempo real, incomodaria.

---

O domínio fica à parte e você já o paga hoje — no registro.br, um `.com.br` custa por volta
de R$ 40/ano. A DigitalOcean não cobra por DNS, e o TLS é gratuito.
