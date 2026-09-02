#!/bin/bash
# Sobe a plataforma inteira: banco, API e interface.
set -e
cd "$(dirname "$0")"

echo "▸ banco"
docker compose up -d >/dev/null
until docker exec digitaisbr-db pg_isready -U digitaisbr -d digitaisbr >/dev/null 2>&1; do sleep 1; done

echo "▸ API      http://localhost:3000/api  (docs em /api/docs)"
cd apps/api
[ -d node_modules ] || npm install
[ -f .env ] || cp .env.example .env
npx prisma migrate deploy >/dev/null
npm run start:dev &
API=$!

echo "▸ interface http://localhost:5173"
cd ../web
[ -d node_modules ] || npm install
[ -f .env ] || cp .env.example .env
npm run dev &
WEB=$!

echo
echo "  Código de acesso: X9k#Lm\$2vQ8!pTzR"
echo "  Admin:     administrador@digitaisbr.com / Admin@2026"
echo "  Associada: ana-silva@email.com / Assoc@2026"
echo
echo "Ctrl+C encerra os dois processos."

trap 'kill $API $WEB 2>/dev/null' INT TERM
wait
