#!/bin/sh
# Aplica as migrations antes de aceitar tráfego. O contêiner pode ser recriado
# a qualquer momento, então o schema precisa estar em dia na subida.
set -e

echo "▸ aplicando migrations"

# o banco pode ainda estar subindo; tenta algumas vezes antes de desistir
tentativa=1
until npx prisma migrate deploy; do
  if [ "$tentativa" -ge 10 ]; then
    echo "✗ banco indisponível após 10 tentativas — abortando"
    exit 1
  fi
  echo "  banco indisponível (tentativa $tentativa/10), aguardando…"
  tentativa=$((tentativa + 1))
  sleep 3
done

echo "▸ iniciando a API"
exec "$@"
