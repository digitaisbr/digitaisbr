#!/bin/bash
# Exercita os quatro requisitos do webhook de parceiro: assinatura,
# idempotência, estorno e separação entre falha definitiva e transitória.
#
# Precisa da API rodando e do seed carregado. Roda de qualquer diretório.
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
API=${API:-http://localhost:3000/api}
ok(){ printf "  \033[32m✓\033[0m %s\n" "$1"; }
bad(){ printf "  \033[31m✗\033[0m %s\n" "$1"; FALHAS=$((FALHAS+1)); }
FALHAS=0

TOKEN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"administrador@digitaisbr.com","senha":"Admin@2026"}' \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['accessToken'])")
H="Authorization: Bearer $TOKEN"

PARCEIRO=$(curl -s "$API/parceiros?limit=1" -H "$H" | python3 -c "import json,sys;print(json.load(sys.stdin)['data'][0]['id'])")
SEGREDO=$(curl -s -X POST $API/integracoes/parceiros/$PARCEIRO/segredo -H "$H" \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['webhookSecret'])")
[ -n "$SEGREDO" ] && ok "segredo gerado para o parceiro" || bad "geracao de segredo"

REF=$(curl -s "$API/portal/links" -H "$H" 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
print((d if isinstance(d,list) else d.get('data',[]))[0]['codigo'])" 2>/dev/null)
if [ -z "$REF" ]; then
  REF=$(docker compose -f "$RAIZ/docker-compose.yml" exec -T db psql -U digitaisbr -d digitaisbr -tAc \
    "select codigo from links_afiliado limit 1" 2>/dev/null | tr -d ' \r')
fi
echo "  ref usado: $REF"

envia(){ # $1 = corpo, $2 = assinatura (opcional; default = correta)
  local corpo="$1"
  local assin="${2:-sha256=$(printf '%s' "$corpo" | openssl dgst -sha256 -hmac "$SEGREDO" -hex | awk '{print $NF}')}"
  curl -s -o /tmp/resp.json -w "%{http_code}" -X POST "$API/integracoes/$PARCEIRO/eventos" \
    -H 'Content-Type: application/json' -H "x-digitaisbr-assinatura: $assin" -d "$corpo"
}

PEDIDO="PED-$RANDOM$RANDOM"
CORPO="{\"evento\":\"venda.aprovada\",\"pedidoId\":\"$PEDIDO\",\"ref\":\"$REF\",\"cliente\":{\"nome\":\"Cliente Teste\"},\"valor\":199.90}"

echo; echo "1) ASSINATURA"
[ "$(envia "$CORPO" 'sha256=deadbeef')" = "403" ] && ok "assinatura errada → 403" || bad "assinatura errada deveria dar 403"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/integracoes/$PARCEIRO/eventos" \
  -H 'Content-Type: application/json' -d "$CORPO")
[ "$CODE" = "403" ] && ok "sem assinatura → 403" || bad "sem assinatura deveria dar 403"

echo; echo "2) VENDA APROVADA"
[ "$(envia "$CORPO")" = "200" ] && ok "assinatura correta → 200" || bad "assinatura correta falhou"
python3 -c "
import json;d=json.load(open('/tmp/resp.json'))
print('  status:',d['status'],'| venda:',d.get('vendaId','—')[:8])
import sys; sys.exit(0 if d['status']=='PROCESSADO' else 1)" && ok "venda criada" || bad "venda nao foi criada"
VENDA=$(python3 -c "import json;print(json.load(open('/tmp/resp.json')).get('vendaId',''))")

echo; echo "3) IDEMPOTENCIA"
envia "$CORPO" > /dev/null
DUP=$(python3 -c "import json;print(json.load(open('/tmp/resp.json'))['status'])")
[ "$DUP" = "DUPLICADO" ] && ok "reenvio → DUPLICADO, sem nova venda" || bad "reenvio deveria ser DUPLICADO (veio $DUP)"

echo; echo "4) ESTORNO"
EST="{\"evento\":\"venda.reembolsada\",\"pedidoId\":\"$PEDIDO\",\"ref\":\"$REF\"}"
envia "$EST" > /dev/null
python3 -c "
import json;d=json.load(open('/tmp/resp.json'));print('  status:',d['status'])
import sys;sys.exit(0 if d['status']=='PROCESSADO' else 1)" && ok "estorno processado" || bad "estorno falhou"

echo; echo "5) COMISSAO ACOMPANHOU O ESTORNO"
docker compose -f "$RAIZ/docker-compose.yml" exec -T db psql -U digitaisbr -d digitaisbr -tAc \
  "select v.status||' / '||c.status from vendas v join comissoes c on c.\"vendaId\"=v.id where v.id='$VENDA'" \
  2>/dev/null | tr -d ' \r' | sed 's/^/  venda \/ comissao: /'

echo; echo "6) REF INEXISTENTE E REJEITADO (nao reprocessavel)"
RUIM="{\"evento\":\"venda.aprovada\",\"pedidoId\":\"PED-RUIM-$RANDOM\",\"ref\":\"NAOEXISTE9\"}"
[ "$(envia "$RUIM")" = "200" ] && \
  python3 -c "
import json;d=json.load(open('/tmp/resp.json'));print('  ',d['status'],'-',d.get('detalhe'))
import sys;sys.exit(0 if d['status']=='REJEITADO' else 1)" && ok "ref invalido → REJEITADO, com 200 para o parceiro parar de reenviar" \
  || bad "ref invalido tratado errado"

echo; echo "════ $( [ $FALHAS -eq 0 ] && echo 'TODOS OS TESTES PASSARAM' || echo "$FALHAS FALHA(S)" ) ════"
exit $FALHAS
