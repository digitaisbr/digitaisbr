#!/usr/bin/env bash
# Recria o conteúdo "Podcast: De 0 a 100K Seguidores", excluído por engano em
# 30/09/2026 durante a verificação da proteção de exclusão.
#
# A API não expõe visualizacoes/curtidas em nenhum DTO, então o conteúdo volta
# com os contadores zerados. O passo 2 devolve os valores originais indo direto
# ao banco.
#
# Uso:  bash tools/restaurar-conteudo.sh
set -euo pipefail

API=https://www.digitaisbr.com.br/api
read -rp 'e-mail admin: ' EMAIL
read -rsp 'senha: ' SENHA; echo

TOKEN=$(curl -fsS -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"senha\":\"$SENHA\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["accessToken"])')

echo '--- passo 1: recriando o conteúdo ---'
curl -fsS -X POST "$API/conteudos" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"titulo":"Podcast: De 0 a 100K Seguidores","tipo":"PODCAST","planoMinimo":"BASICO","status":"PUBLICADO","descricao":"Ep. 8 — Como a creator Ana Silva cresceu de 0 a 100K em 6 meses.","autor":"Equipe DigitaisBR"}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("  ok:", d["id"], "|", d["titulo"])'

echo
echo '--- passo 2: devolvendo os contadores originais ---'
ssh root@159.223.143.229 "docker exec -i app-db-1 psql -U digitaisbr -d digitaisbr" <<'SQL'
UPDATE conteudos SET visualizacoes = 2720, curtidas = 255
 WHERE titulo = 'Podcast: De 0 a 100K Seguidores';
SELECT titulo, visualizacoes, curtidas, status FROM conteudos
 WHERE titulo = 'Podcast: De 0 a 100K Seguidores';
SQL
