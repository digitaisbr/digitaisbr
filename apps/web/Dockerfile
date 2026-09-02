# ============================================================================
#  Front DigitaisBR — build estático servido por Caddy
#  O bundle é puro HTML/JS/CSS: não precisa de Node em produção.
# ============================================================================

FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# a API é consumida por caminho relativo (/api), então o mesmo build serve
# qualquer domínio — nada de host embutido no bundle
RUN npm run build

FROM caddy:2-alpine AS runtime
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
