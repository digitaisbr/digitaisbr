#!/bin/bash
# Suíte end-to-end da API DigitaisBR.
#
# A suíte de escrita cria vendas, cupons, posts e chamados reais, então ela NÃO
# é idempotente: rodar duas vezes sem limpar faz a segunda execução falhar nas
# contagens do seed. Por isso o banco é reseedado aqui, e não à mão.
#
# Requer a API no ar (npm run start:prod ou start:dev).
set -u
cd "$(dirname "$0")/.."

echo "╔══════════════════════════════════════════════╗"
echo "║  DigitaisBR — testes end-to-end da API        ║"
echo "╚══════════════════════════════════════════════╝"
echo

if [ "${PULAR_SEED:-}" = "1" ]; then
  echo "▸ seed ignorado (PULAR_SEED=1)"
else
  printf "▸ reseedando o banco… "
  if npx ts-node prisma/seed.ts > /dev/null 2>&1; then
    echo "ok"
  else
    echo "FALHOU"
    echo "  Não foi possível reseedar. O banco está no ar? (docker compose up -d)"
    exit 1
  fi
fi
echo

bash test/e2e-leitura.sh
echo
bash test/e2e-escrita.sh
echo
echo "▸ deixando o banco em estado limpo"
npx ts-node prisma/seed.ts > /dev/null 2>&1 && echo "  reseedado"
