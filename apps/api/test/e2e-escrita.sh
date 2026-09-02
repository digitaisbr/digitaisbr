#!/bin/bash
API=http://localhost:3000/api
ok=0; fail=0
check(){ if [ "$2" = "$3" ]; then echo "  ✓ $1"; ok=$((ok+1)); else echo "  ✗ $1 — esperado [$2], obtido [$3]"; fail=$((fail+1)); fi; }
j(){ python3 -c "import sys,json;d=json.load(sys.stdin);print($1)" 2>/dev/null || echo ERRO; }
TA=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"administrador@digitaisbr.com","senha":"Admin@2026"}' | j "d['accessToken']")
TS=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"email":"ana-silva@email.com","senha":"Assoc@2026"}' | j "d['accessToken']")
HA="Authorization: Bearer $TA"; HS="Authorization: Bearer $TS"
JA=(-H "$HA" -H 'Content-Type: application/json'); JS=(-H "$HS" -H 'Content-Type: application/json')

echo "── CICLO DE VIDA DA VENDA ──"
ASSOC=$(curl -s "$API/associados?search=ana%20silva" -H "$HA" | j "d['data'][0]['id']")
PROD=$(curl -s "$API/catalogo/produtos?search=odonto" -H "$HA" | j "d['data'][0]['id']")
PRECO=$(curl -s "$API/catalogo/produtos?search=odonto" -H "$HA" | j "d['data'][0]['preco']")
PCT=$(curl -s "$API/catalogo/produtos?search=odonto" -H "$HA" | j "d['data'][0]['comissaoPct']")
V=$(curl -s -X POST $API/vendas "${JA[@]}" -d "{\"produtoId\":\"$PROD\",\"associadoId\":\"$ASSOC\",\"clienteNome\":\"Cliente Teste\",\"quantidade\":2}")
VID=$(echo "$V" | j "d['id']")
check "venda criada com total = preço × qtd" "$(python3 -c "print(round($PRECO*2,2))")" "$(echo "$V" | j "d['total']")"
check "venda nasce aguardando pgto" AGUARDANDO_PGTO "$(echo "$V" | j "d['status']")"
check "comissão gerada junto" AGUARDANDO_PGTO "$(echo "$V" | j "d['comissao']['status']")"
check "comissão = comissaoPct do produto" "$(python3 -c "print(round($PRECO*2*$PCT/100,2))")" "$(echo "$V" | j "d['comissao']['valor']")"
check "ref sequencial CHK-" CHK "$(echo "$V" | j "d['ref'][:3]")"
check "transição inválida barrada" 409 "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/vendas/$VID/status "${JA[@]}" -d '{"status":"REEMBOLSADA"}')"
check "marcar como paga" PAGA "$(curl -s -X PATCH $API/vendas/$VID/status "${JA[@]}" -d '{"status":"PAGA"}' | j "d['status']")"
check "comissão vai a processando" PROCESSANDO "$(curl -s $API/vendas/$VID -H "$HA" | j "d['comissao']['status']")"
check "reembolso permitido após paga" REEMBOLSADA "$(curl -s -X PATCH $API/vendas/$VID/status "${JA[@]}" -d '{"status":"REEMBOLSADA","motivo":"teste"}' | j "d['status']")"
check "comissão cancelada no reembolso" CANCELADA "$(curl -s $API/vendas/$VID -H "$HA" | j "d['comissao']['status']")"
check "status final é terminal" 409 "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/vendas/$VID/status "${JA[@]}" -d '{"status":"PAGA"}')"

echo "── CUPOM E DESCONTO ──"
CUP=$(curl -s -X POST $API/portal/cupons "${JS[@]}" -d '{"codigo":"TESTE25","tipoDesconto":"PERCENTUAL","desconto":25}')
check "cupom criado" TESTE25 "$(echo "$CUP" | j "d['codigo']")"
check "código duplicado barrado" 409 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/portal/cupons "${JS[@]}" -d '{"codigo":"TESTE25","tipoDesconto":"PERCENTUAL","desconto":25}')"
V2=$(curl -s -X POST $API/vendas "${JA[@]}" -d "{\"produtoId\":\"$PROD\",\"associadoId\":\"$ASSOC\",\"clienteNome\":\"Cliente Cupom\",\"quantidade\":1,\"cupom\":\"TESTE25\"}")
check "desconto de 25% aplicado" "$(python3 -c "print(round($PRECO*0.75,2))")" "$(echo "$V2" | j "d['total']")"
check "cupom inexistente barrado" 400 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/vendas "${JA[@]}" -d "{\"produtoId\":\"$PROD\",\"associadoId\":\"$ASSOC\",\"clienteNome\":\"X\",\"cupom\":\"NAOEXISTE\"}")"

echo "── COMISSÕES E SAQUE ──"
CID=$(curl -s "$API/comissoes?status=AGUARDANDO_PGTO&limit=1" -H "$HA" | j "d['data'][0]['id']")
check "pagamento em lote" 1 "$(curl -s -X POST $API/comissoes/pagar "${JA[@]}" -d "{\"ids\":[\"$CID\"]}" | j "d['quantidade']")"
check "repagamento barrado" 409 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/comissoes/pagar "${JA[@]}" -d "{\"ids\":[\"$CID\"]}")"
check "saque acima do saldo barrado" 400 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/financeiro/saques "${JS[@]}" -d '{"valor":999999,"metodo":"PIX","destino":"ana@email.com"}')"

echo "── LIMITES POR PLANO ──"
check "loja Básico limitada a 20 produtos" "$(curl -s $API/portal/plano -H "$HS" | j "d['uso']['produtos']['limite']")" 20
check "personalização visual exige Intermediário" 403 "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/portal/loja "${JS[@]}" -d '{"corPrimaria":"#ff0000"}')"
check "renomear loja é permitido no Básico" 200 "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/portal/loja "${JS[@]}" -d '{"nome":"Loja Ana Silva"}')"
PROD_AV=$(curl -s "$API/catalogo/produtos?planoMinimo=AVANCADO&limit=1" -H "$HA" | j "d['data'][0]['id']")
check "produto exclusivo bloqueado no Básico" 403 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/portal/loja/produtos/$PROD_AV "${JS[@]}")"

echo "── COMUNIDADE ──"
P=$(curl -s -X POST $API/comunidade/posts "${JS[@]}" -d '{"conteudo":"Post de teste automatizado do e2e."}')
PID=$(echo "$P" | j "d['id']")
check "post publicado" "Ana Silva" "$(echo "$P" | j "d['autor']['nome']")"
check "curtir" True "$(curl -s -X POST $API/comunidade/posts/$PID/curtir -H "$HS" | j "d['curtido']")"
check "descurtir" False "$(curl -s -X POST $API/comunidade/posts/$PID/curtir -H "$HS" | j "d['curtido']")"
check "comentar" 201 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/comunidade/posts/$PID/comentarios "${JS[@]}" -d '{"conteudo":"Comentário de teste"}')"
check "admin fixa post" True "$(curl -s -X PATCH $API/comunidade/posts/$PID/fixar/true -H "$HA" | j "d['fixado']")"
check "associado não fixa post" 403 "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $API/comunidade/posts/$PID/fixar/true -H "$HS")"

echo "── SUPORTE ──"
T=$(curl -s -X POST $API/suporte "${JS[@]}" -d '{"assunto":"Teste automatizado do e2e","categoria":"Sistema","mensagem":"Mensagem inicial do chamado de teste."}')
TID=$(echo "$T" | j "d['id']")
check "ticket numerado SUP-" SUP "$(echo "$T" | j "d['numero'][:3]")"
check "primeira mensagem na thread" 1 "$(echo "$T" | j "len(d['mensagens'])")"
check "associado não cria nota interna" 403 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/suporte/$TID/mensagens "${JS[@]}" -d '{"conteudo":"nota","interna":true}')"
check "admin responde" 201 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/suporte/$TID/mensagens "${JA[@]}" -d '{"conteudo":"Resposta do atendimento"}')"
check "resposta move para em andamento" EM_ANDAMENTO "$(curl -s $API/suporte/$TID -H "$HA" | j "d['status']")"
check "admin vê nota interna" 201 "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/suporte/$TID/mensagens "${JA[@]}" -d '{"conteudo":"Nota interna","interna":true}')"
check "associado vê só as 2 públicas" 2 "$(curl -s $API/suporte/$TID -H "$HS" | j "len(d['mensagens'])")"
check "admin vê as 3 (inclui a interna)" 3 "$(curl -s $API/suporte/$TID -H "$HA" | j "len(d['mensagens'])")"

echo "── ISOLAMENTO ENTRE ASSOCIADOS ──"
OUTRO=$(curl -s "$API/suporte?limit=50" -H "$HA" | python3 -c "
import sys,json
d=json.load(sys.stdin)
alvo=[t for t in d['data'] if t['associado'] and t['associado']['nome']!='Ana Silva']
print(alvo[0]['id'] if alvo else '')")
check "ticket de outro associado bloqueado" 403 "$(curl -s -o /dev/null -w '%{http_code}' $API/suporte/$OUTRO -H "$HS")"

echo "── VITRINE PÚBLICA ──"
check "vitrine sem autenticação" 200 "$(curl -s -o /dev/null -w '%{http_code}' $API/lojas/publica/ana-silva)"
check "perfil público sem autenticação" 200 "$(curl -s -o /dev/null -w '%{http_code}' $API/associados/perfil/ana-silva)"
check "privacidade: email oculto" None "$(curl -s $API/associados/perfil/ana-silva | j "d['email']")"
V1=$(curl -s $API/lojas/publica/ana-silva | j "d['produtos'][0]['nome']" >/dev/null; curl -s "$API/lojas?search=ana" -H "$HA" | j "d['data'][0]['visualizacoes']")
curl -s -o /dev/null $API/lojas/publica/ana-silva
V2N=$(curl -s "$API/lojas?search=ana" -H "$HA" | j "d['data'][0]['visualizacoes']")
check "visualização contabilizada" "$((V1+1))" "$V2N"

echo
echo "═══ $ok passaram, $fail falharam ═══"
