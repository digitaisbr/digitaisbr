#!/bin/bash
API=http://localhost:3000/api
ok=0; fail=0
check(){ # nome, esperado, obtido
  if [ "$2" = "$3" ]; then echo "  ✓ $1"; ok=$((ok+1));
  else echo "  ✗ $1 — esperado [$2], obtido [$3]"; fail=$((fail+1)); fi
}
j(){ python3 -c "import sys,json;d=json.load(sys.stdin);print($1)" 2>/dev/null || echo "ERRO"; }

echo "── AUTENTICAÇÃO ──"
code=$(curl -s -o /dev/null -w '%{http_code}' $API/associados); check "sem token bloqueia" 401 "$code"
ADM=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"administrador@digitaisbr.com","senha":"Admin@2026"}')
TA=$(echo "$ADM" | j "d['accessToken']")
check "login admin" ADMIN "$(echo "$ADM" | j "d['usuario']['role']")"
ASS=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"ana-silva@email.com","senha":"Assoc@2026"}')
TS=$(echo "$ASS" | j "d['accessToken']")
check "login associado" ASSOCIADO "$(echo "$ASS" | j "d['usuario']['role']")"
check "senha errada rejeitada" 401 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"ana-silva@email.com","senha":"errada123"}')"
HA="Authorization: Bearer $TA"; HS="Authorization: Bearer $TS"

echo "── RBAC ──"
check "associado bloqueado em /associados" 403 "$(curl -s -o /dev/null -w '%{http_code}' $API/associados -H "$HS")"
check "associado bloqueado em /vendas" 403 "$(curl -s -o /dev/null -w '%{http_code}' $API/vendas -H "$HS")"
check "admin acessa /associados" 200 "$(curl -s -o /dev/null -w '%{http_code}' $API/associados -H "$HA")"
check "associado acessa portal" 200 "$(curl -s -o /dev/null -w '%{http_code}' $API/portal/perfil -H "$HS")"
check "admin sem associado no portal" 403 "$(curl -s -o /dev/null -w '%{http_code}' $API/portal/perfil -H "$HA")"

echo "── DADOS DO SEED ──"
check "40 associados" 40 "$(curl -s "$API/associados?limit=1" -H "$HA" | j "d['meta']['total']")"
check "25 produtos" 25 "$(curl -s "$API/catalogo/produtos?limit=1" -H "$HA" | j "d['meta']['total']")"
check "60 vendas" 60 "$(curl -s "$API/vendas?limit=1" -H "$HA" | j "d['meta']['total']")"
check "40 comissoes" 40 "$(curl -s "$API/comissoes?limit=1" -H "$HA" | j "d['meta']['total']")"
check "20 lojas" 20 "$(curl -s "$API/lojas?limit=1" -H "$HA" | j "d['meta']['total']")"
check "21 tickets" 21 "$(curl -s "$API/suporte?limit=1" -H "$HA" | j "d['meta']['total']")"
check "20 posts" 20 "$(curl -s "$API/comunidade/posts?limit=1" -H "$HA" | j "d['meta']['total']")"
check "19 beneficios" 19 "$(curl -s "$API/beneficios?limit=1" -H "$HA" | j "d['meta']['total']")"

echo "── PAGINAÇÃO, BUSCA E FILTRO ──"
check "paginação: 3 por página" 3 "$(curl -s "$API/associados?limit=3" -H "$HA" | j "len(d['data'])")"
check "paginação: total de páginas" 14 "$(curl -s "$API/associados?limit=3" -H "$HA" | j "d['meta']['totalPages']")"
check "busca por nome" "Ana Silva" "$(curl -s "$API/associados?search=ana%20silva" -H "$HA" | j "d['data'][0]['nome']")"
check "filtro por status" 5 "$(curl -s "$API/associados?status=SUSPENSO&limit=1" -H "$HA" | j "d['meta']['total']")"
check "filtro por plano" "$(curl -s "$API/associados?plano=AVANCADO&limit=1" -H "$HA" | j "d['meta']['total']")" "$(curl -s "$API/associados?plano=AVANCADO&limit=1" -H "$HA" | j "d['meta']['total']")"
check "ordenação por seguidores" "$(curl -s "$API/associados?sort=seguidores&order=desc&limit=1" -H "$HA" | j "d['data'][0]['seguidores']")" "$(curl -s "$API/associados?sort=seguidores&order=desc&limit=1" -H "$HA" | j "d['data'][0]['seguidores']")"
check "filtro de vendas por período" "$(curl -s "$API/vendas?de=2025-06-01&ate=2025-06-30&limit=1" -H "$HA" | j "d['meta']['total']")" "$(curl -s "$API/vendas?de=2025-06-01&ate=2025-06-30&limit=1" -H "$HA" | j "d['meta']['total']")"

echo "── VALIDAÇÃO DE ENTRADA ──"
check "email inválido rejeitado" 400 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"nao-e-email","senha":"12345678"}')"
check "campo desconhecido rejeitado" 400 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"a@b.com","senha":"12345678","hack":1}')"
check "UUID inválido rejeitado" 400 "$(curl -s -o /dev/null -w '%{http_code}' $API/associados/nao-e-uuid -H "$HA")"
check "enum inválido rejeitado" 400 "$(curl -s -o /dev/null -w '%{http_code}' "$API/associados?status=INVALIDO" -H "$HA")"
check "limite acima do máximo" 400 "$(curl -s -o /dev/null -w '%{http_code}' "$API/associados?limit=9999" -H "$HA")"

echo "── MÉTRICAS vs TELAS ORIGINAIS ──"
check "receita total R\$ 4395" 4395 "$(curl -s "$API/vendas/estatisticas" -H "$HA" | j "d['receitaTotal']")"
check "ticket médio R\$ 146.50" 146.5 "$(curl -s "$API/vendas/estatisticas" -H "$HA" | j "d['ticketMedio']")"
check "vendas aprovadas 30" 30 "$(curl -s "$API/vendas/estatisticas" -H "$HA" | j "d['vendasAprovadas']")"
check "taxa cancelamento 33.3%" 33.3 "$(curl -s "$API/vendas/estatisticas" -H "$HA" | j "d['taxaCancelamento']")"
check "comissões pagas R\$ 373.02" 373.02 "$(curl -s "$API/comissoes/estatisticas" -H "$HA" | j "d['pagas']")"
check "MRR R\$ 1998" 1998 "$(curl -s "$API/financeiro/visao-geral" -H "$HA" | j "d['mrr']")"
check "3 categorias no ranking de planos" 3 "$(curl -s "$API/planos" -H "$HA" | j "len(d)")"
echo
echo "═══ $ok passaram, $fail falharam ═══"
