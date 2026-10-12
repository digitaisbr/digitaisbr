#!/usr/bin/env bash
# Remove do razão da associação os lançamentos que não são dinheiro dela:
# a venda processada pelo parceiro e a comissão paga por ele ao associado.
# As mensalidades correspondentes já foram inseridas em 30/09/2026.
#
# Uso:  bash tools/corrigir-razao.sh
set -euo pipefail

API=https://www.digitaisbr.com.br/api
read -rp 'e-mail admin: ' EMAIL
read -rsp 'senha: ' SENHA; echo

TOKEN=$(curl -fsS -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"senha\":\"$SENHA\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["accessToken"])')

curl -fsS -H "Authorization: Bearer $TOKEN" "$API/financeiro/lancamentos" > razao-antes.json
echo "cópia do razão salva em razao-antes.json"
echo

# os cinco lançamentos que saem: 4 vendas de parceiro + 1 comissão
for ID in 140cf36a-32a1-4a29-9697-cb0b139f6a48 \
          1c98062e-07f7-49b1-8d5a-d78d5c24b7f5 \
          db3695b9-befc-4977-b261-f52fac305a77 \
          a6f2ac95-c598-496a-8c4c-648bbec10b62 \
          afbcddda-56fb-4ef5-9c67-031f83bc96d9; do
  printf '  removendo %s ... ' "${ID:0:8}"
  curl -fsS -o /dev/null -X DELETE "$API/financeiro/lancamentos/$ID" \
    -H "Authorization: Bearer $TOKEN" && echo ok
  sleep 1   # o limitador de requisições da API não gosta de rajada
done

echo
echo '--- DRE depois ---'
curl -fsS -H "Authorization: Bearer $TOKEN" "$API/financeiro/dre" > dre-depois.json
python3 - dre-depois.json <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
for nome in ('receitas', 'custos'):
    bloco = d[nome]
    print('  {:<10} R$ {:>10,.2f}'.format(nome, bloco['total']))
    for l in bloco['composicao']:
        print('     {:<16} {:>6}%  R$ {:>9,.2f}'.format(l['categoria'], l['percentual'], l['valor']))
print('  {:<10} R$ {:>10,.2f}   margem {}%'.format('resultado', d['resultadoLiquido'], d['margem']))
PY
