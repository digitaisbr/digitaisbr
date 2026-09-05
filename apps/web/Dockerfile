# ============================================================================
#  Front DigitaisBR — build estático servido por Caddy
#  O bundle é puro HTML/JS/CSS: não precisa de Node em produção.
# ============================================================================

FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# 1 liga os atalhos de login das contas de demonstração. Só para o ambiente
# de testes com dados fake — nunca com dado real (ver Login.tsx).
ARG VITE_DEMO=""
ENV VITE_DEMO=$VITE_DEMO
# a API é consumida por caminho relativo (/api), então o mesmo build serve
# qualquer domínio — nada de host embutido no bundle
RUN npm run build

FROM caddy:2-alpine AS runtime
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
