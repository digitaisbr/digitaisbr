# -*- coding: utf-8 -*-
"""Extrai o dataset real das capturas do clone -> JSON para o seed do Prisma."""
import json, re, html, os, glob, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP  = os.path.join(BASE, 'capturas')
HTML = os.path.join(CAP, 'html')
OUT  = os.path.join(BASE, 'apps', 'api', 'prisma', 'seed-data')

def read(slug):
    p = os.path.join(HTML, slug + '.html')
    return open(p, encoding='utf-8', errors='ignore').read() if os.path.exists(p) else ''

def nosvg(s):
    return re.sub(r'<svg.*?</svg>', ' ', s, flags=re.S)

def clean(s):
    s = nosvg(s)
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()

def cells(tr):
    tds = re.findall(r'<td[^>]*>(.*?)</td>', nosvg(tr), flags=re.S)
    out = []
    for td in tds:
        t = re.sub(r'<[^>]+>', '\x01', td)
        t = html.unescape(t)
        parts = [p.strip() for p in t.split('\x01') if p.strip()]
        out.append(parts)
    key = re.search(r'data-row-key="([^"]+)"', tr)
    return (key.group(1) if key else None), out

def descriptions(slug):
    """Retorna {label: content} das ant-descriptions da página."""
    s = nosvg(read(slug))
    pairs = re.findall(
        r'class="ant-descriptions-item-label"><span>(.*?)</span></th>'
        r'<td[^>]*class="ant-descriptions-item-content"><span>(.*?)</span></td>',
        s, flags=re.S)
    return {clean(l): clean(c) for l, c in pairs}

def money(s):
    if not s: return None
    m = re.search(r'-?[\d.,]+', s.replace('R$', '').strip())
    if not m: return None
    v = m.group(0)
    if ',' in v and '.' in v:      # 1.234,56
        v = v.replace('.', '').replace(',', '.')
    elif ',' in v:                  # 1234,56
        v = v.replace(',', '.')
    try: return round(float(v), 2)
    except ValueError: return None

def intbr(s):
    if s is None: return None
    v = re.sub(r'[^\d-]', '', str(s).replace('.', ''))
    return int(v) if v not in ('', '-') else None

def pct(s):
    m = re.search(r'([\d.,]+)\s*%', s or '')
    return float(m.group(1).replace(',', '.')) if m else None

def dt(s):
    """dd/mm/yyyy -> ISO"""
    m = re.search(r'(\d{2})/(\d{2})/(\d{4})', s or '')
    return f'{m.group(3)}-{m.group(2)}-{m.group(1)}' if m else None

def followers(s):
    """791.3K -> 791300"""
    m = re.match(r'([\d.,]+)\s*([KMk m]?)', (s or '').strip())
    if not m: return None
    n = float(m.group(1).replace(',', '.'))
    mult = {'K': 1_000, 'k': 1_000, 'M': 1_000_000, 'm': 1_000_000}.get(m.group(2).strip(), 1)
    return int(n * mult)

def dump(name, data):
    p = os.path.join(OUT, name + '.json')
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    n = len(data) if isinstance(data, list) else len(data.keys())
    print(f'  {name:22s} {n:4d}  -> {os.path.relpath(p, BASE)}')

TAB = json.load(open(os.path.join(CAP, 'tabelas-dados.json'), encoding='utf-8'))
def rows(route):
    return [cells(tr) for tr in TAB[route]['rows']]

# ---------------------------------------------------------------- entidades

def stats(slug):
    """[(titulo, valor), ...] dos ant-statistic da página."""
    s = nosvg(read(slug))
    xs = [clean(x) for x in re.findall(r'<div class="ant-statistic[^"]*"[^>]*>(.*?)</div></div>', s, flags=re.S)]
    return list(zip(xs[0::2], xs[1::2]))

def redes_de(td_html):
    return sorted(set(re.findall(r'aria-label="(instagram|youtube|tiktok|twitter|facebook|linkedin)"', td_html)))

def ex_associados():
    raw = TAB['/associados']['rows']
    out = []
    for tr in raw:
        rid, c = cells(tr)
        tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, flags=re.S)
        d = descriptions('associados_' + rid)
        st = dict(stats('associados_' + rid))
        redes = redes_de(tds[4])
        if not redes and (c[4] and c[4][0] == 'T'):
            redes = ['tiktok']
        out.append({
            'id': rid,
            'nome': c[0][0],
            'handle': (c[0][1] if len(c[0]) > 1 else '').lstrip('@'),
            'nicho': c[1][0] if c[1] else None,
            'seguidores': followers(c[2][0] if c[2] else ''),
            'engajamento': pct(c[3][0] if c[3] else ''),
            'redes': redes,
            'plano': c[5][0] if c[5] else None,
            'status': c[6][0] if c[6] else None,
            'totalVendas': intbr(c[7][0] if c[7] else None),
            'comissaoAcumulada': money(c[8][0] if c[8] else None),
            'email': d.get('Email'),
            'cpfCnpj': d.get('CPF/CNPJ'),
            'telefone': d.get('Telefone'),
            'endereco': d.get('Endereço'),
            'cidade': d.get('Cidade'),
            'uf': d.get('UF'),
            'slugLoja': d.get('Slug da Loja'),
            'atualizadoEm': dt(d.get('Última atualização')),
            'membroDesde': dt(st.get('Membro desde')),
            'nomeLoja': st.get('Loja'),
        })
    return sorted(out, key=lambda x: int(x['id'].split('-')[1]))

def ex_produtos():
    out = []
    for tr in TAB['/catalogo']['rows']:
        rid, c = cells(tr)
        d = descriptions('catalogo_' + rid)
        s = nosvg(read('catalogo_' + rid))
        m = re.search(r'Detalhes do Produto.*?<div class="ant-card-body"><div class="ant-typography[^"]*">(.*?)</div>', s, flags=re.S)
        estoque = c[4][0] if c[4] else ''
        lojas = re.search(r'Lojas com este produto \((\d+)\)', s)
        out.append({
            'id': rid,
            'nome': c[0][0],
            'sku': (c[0][1] if len(c[0]) > 1 else '').replace('SKU: ', ''),
            'categoria': c[1][0] if c[1] else None,
            'preco': money(c[2][0] if c[2] else None),
            'comissaoPct': pct(c[3][0] if c[3] else ''),
            'estoque': -1 if 'Ilimitado' in estoque else intbr(estoque),
            'exclusividade': c[5][0] if c[5] else 'Todos',
            'status': c[6][0] if c[6] else None,
            'descricao': clean(m.group(1)) if m else None,
            'checkoutUrl': d.get('Checkout'),
            'criadoEm': dt(d.get('Criado em')),
            'atualizadoEm': dt(d.get('Atualizado em')),
            'qtdLojas': int(lojas.group(1)) if lojas else 0,
        })
    return sorted(out, key=lambda x: int(x['id'].split('-')[1]))

def ex_lojas():
    out = []
    for tr in TAB['/lojas']['rows']:
        rid, c = cells(tr)
        sub = c[0][1] if len(c[0]) > 1 else ''
        dono, _, slug = sub.partition(' — /')
        ativa = 'aria-checked="true"' in re.findall(r'<td[^>]*>(.*?)</td>', tr, flags=re.S)[5]
        s = nosvg(read('lojas_' + rid + '_preview'))
        m = re.search(r'color: rgba\(255, 255, 255, 0\.75\)[^"]*">(.*?)</div>', s, flags=re.S)
        prods = re.findall(r'data-produto="([^"]+)"', s)
        out.append({
            'id': rid,
            'nome': c[0][0],
            'dono': dono.strip(),
            'slug': slug.strip(),
            'plano': c[1][0] if c[1] else None,
            'qtdProdutos': intbr(c[2][0] if c[2] else None),
            'visualizacoes': intbr(c[3][0] if c[3] else None),
            'vendas': intbr(c[4][0] if c[4] else None),
            'ativa': ativa,
            'descricao': clean(m.group(1)) if m else None,
            'produtosPreview': produtos_do_preview(s),
        })
    return sorted(out, key=lambda x: int(x['id'].split('-')[1]))

def produtos_do_preview(s):
    """Nomes dos produtos listados no preview público da loja."""
    nomes = re.findall(r'<div class="ant-card-meta-title"><span class="ant-typography[^"]*"[^>]*>(.*?)</span>', s, flags=re.S)
    return [clean(n) for n in nomes if clean(n)]

def ex_vendas():
    out = []
    for tr in TAB['/vendas']['rows']:
        rid, c = cells(tr)
        prod = c[2] if len(c) > 2 else []
        assoc = c[3] if len(c) > 3 else []
        out.append({
            'id': rid,
            'ref': c[1][0] if c[1] else None,
            'produto': prod[0] if prod else None,
            'categoriaProduto': prod[1] if len(prod) > 1 else None,
            'associado': assoc[-1] if assoc else None,
            'cliente': c[4][0] if c[4] else None,
            'quantidade': intbr(c[5][0] if c[5] else None),
            'total': money(c[6][0] if c[6] else None),
            'comissao': money(c[7][0] if c[7] else None),
            'data': dt(c[8][0] if c[8] else None),
            'status': c[9][0] if c[9] else None,
        })
    return sorted(out, key=lambda x: int(x['id'].split('-')[1]))

def ex_comissoes():
    out = []
    for tr in TAB['/comissoes']['rows']:
        rid, c = cells(tr)
        assoc = c[1] if len(c) > 1 else []
        prod = c[2] if len(c) > 2 else []
        pago = c[7][0] if len(c) > 7 and c[7] else None
        out.append({
            'id': rid,
            'associado': assoc[-2] if len(assoc) > 1 else (assoc[0] if assoc else None),
            'associadoEmail': assoc[-1] if assoc else None,
            'produto': prod[0] if prod else None,
            'categoriaProduto': prod[1] if len(prod) > 1 else None,
            'valorVenda': money(c[3][0] if c[3] else None),
            'percentual': pct(c[4][0] if c[4] else ''),
            'valor': money(c[5][0] if c[5] else None),
            'dataVenda': dt(c[6][0] if c[6] else None),
            'pagoEm': dt(pago),
            'status': c[8][0] if len(c) > 8 and c[8] else None,
        })
    return sorted(out, key=lambda x: int(x['id'].split('-')[1]))

def ex_parceiros():
    out = []
    for tr in TAB['/parceiros']['rows']:
        rid, c = cells(tr)
        out.append({
            'id': rid,
            'nome': c[0][0],
            'segmento': c[0][1] if len(c[0]) > 1 else None,
            'cnpj': c[1][0] if c[1] else None,
            'email': c[2][0] if c[2] else None,
            'qtdBeneficios': intbr(c[3][0] if c[3] else None),
            'status': c[4][0] if c[4] else None,
        })
    return sorted(out, key=lambda x: int(x['id'].split('-')[1]))

def ex_tickets():
    out = []
    for tr in TAB['/suporte']['rows']:
        rid, c = cells(tr)
        ass = c[1] if len(c) > 1 else []
        atrib = c[5][0] if len(c) > 5 and c[5] else None
        out.append({
            'id': rid,
            'assunto': ass[0] if ass else None,
            'solicitante': ass[1].rstrip(' ·').strip() if len(ass) > 1 else None,
            'planoSolicitante': ass[2] if len(ass) > 2 else None,
            'categoria': c[2][0] if c[2] else None,
            'prioridade': c[3][0] if c[3] else None,
            'qtdMensagens': intbr(c[4][0] if c[4] else None),
            'atribuido': None if atrib in ('-', None) else atrib,
            'status': c[6][0] if len(c) > 6 and c[6] else None,
            'data': dt(c[7][0] if len(c) > 7 and c[7] else None),
        })
    return sorted(out, key=lambda x: x['id'])

def ex_cupons():
    out = []
    for tr in TAB['/portal/cupons']['rows']:
        rid, c = cells(tr)
        usos = (c[3][0] if c[3] else '0 / 0').split('/')
        desc = c[1][0] if c[1] else ''
        val = c[4][0] if c[4] else ''
        out.append({
            'id': rid,
            'codigo': c[0][0],
            'tipoDesconto': 'PERCENTUAL' if '%' in desc else 'VALOR',
            'desconto': pct(desc) if '%' in desc else money(desc),
            'compraMinima': money(c[2][0]) if c[2] and c[2][0] != '-' else None,
            'usos': intbr(usos[0]),
            'limiteUsos': intbr(usos[1]) if len(usos) > 1 else None,
            'validade': dt(val),
            'semLimiteValidade': 'Sem limite' in val,
            'expirado': 'Expirado' in val,
            'status': c[5][0] if c[5] else None,
        })
    return sorted(out, key=lambda x: int(x['id'].split('-')[1]))

def ex_planos():
    s = nosvg(read('planos'))
    i = s.find('Gestão de Planos')
    cards = re.split(r'<div class="ant-col ant-col-xs-24 ant-col-md-8', s[i:])[1:]
    out = []
    for c in cards:
        nome = re.search(r'<h4 class="ant-typography[^"]*"[^>]*>(.*?)</h4>', c, flags=re.S)
        preco = re.search(r'font-weight: 700[^"]*">(R\$ [\d.,]+)</span>', c)
        desc = re.search(r'/mês</span></div><span class="ant-typography ant-typography-secondary[^"]*">(.*?)</span>', c, flags=re.S)
        ativos = re.search(r'ant-statistic-content-value-int">(\d+)<', c)
        feats = re.findall(r'aria-label="check-circle"[^>]*>.*?<span class="ant-typography[^"]*">(.*?)</span>', c, flags=re.S)
        if not nome: continue
        out.append({
            'nome': clean(nome.group(1)),
            'preco': money(preco.group(1)) if preco else None,
            'descricao': clean(desc.group(1)) if desc else None,
            'associadosAtivos': int(ativos.group(1)) if ativos else 0,
            'recursos': [clean(f) for f in feats],
        })
    ordem = {'Básico': 1, 'Intermediário': 2, 'Avançado': 3}
    return sorted(out, key=lambda x: ordem.get(x['nome'], 9))

def ex_beneficios():
    s = nosvg(read('portal_beneficios'))
    out = []
    liberados = re.findall(
        r'<strong>(.*?)</strong></span><span class="ant-tag[^"]*"[^>]*>(.*?)</span>.*?'
        r'font-size: 12px;">(.*?)</span><br>.*?'
        r'Parceiro:\s*(.*?)\s*·\s*Tipo:\s*(.*?)\s*·\s*Plano mín:\s*<span class="ant-tag[^"]*"[^>]*>(.*?)</span>',
        s, flags=re.S)
    for nome, valor, desc, parceiro, tipo, plano in liberados:
        out.append({
            'nome': clean(nome), 'valor': clean(valor), 'descricao': clean(desc),
            'parceiro': clean(parceiro), 'tipo': clean(tipo).upper(),
            'planoMinimo': clean(plano),
        })
    bloq = re.search(r'Bloqueados \(\d+\)(.*?)$', s, flags=re.S)
    if bloq:
        for nome, plano in re.findall(
                r'<div style="opacity: 0\.6;"><span class="ant-typography[^"]*"[^>]*>(.*?)</span><br>'
                r'<span class="ant-typography ant-typography-secondary[^"]*"[^>]*>Requer\s*'
                r'<span class="ant-tag[^"]*"[^>]*>(.*?)</span>', bloq.group(1), flags=re.S):
            out.append({
                'nome': clean(nome), 'valor': None, 'descricao': None,
                'parceiro': None, 'tipo': None, 'planoMinimo': clean(plano),
            })
    # usos por benefício vêm do "Top 5 Benefícios" do dashboard
    usos = {}
    for nome, n in re.findall(
            r'<span class="ant-typography[^"]*" style="font-size: 13px;">([^<]*)</span><br>'
            r'<span class="ant-typography ant-typography-secondary[^"]*" style="font-size: 11px;">(\d+) utilizações',
            nosvg(read('root'))):
        usos[clean(nome)] = int(n)
    for b in out:
        b['utilizacoes'] = usos.get(b['nome'])
    return out

def ex_conteudos():
    s = nosvg(read('conteudos'))
    out = []
    for c in re.split(r'<div class="ant-card ant-card-bordered ant-card-hoverable', s)[1:]:
        titulo = re.search(r'<div class="ant-card-body"[^>]*><span class="ant-typography[^"]*"[^>]*><strong>(.*?)</strong>', c, flags=re.S)
        if not titulo:
            continue
        ctags = re.sub(r'<span role="img"[^>]*>\s*</span>', '', c)
        tags = [clean(t) for t in re.findall(r'<span class="ant-tag[^"]*"[^>]*>(.*?)</span>', ctags, flags=re.S)]
        desc = re.search(r'ant-typography-ellipsis-multiple-line[^"]*"[^>]*>(.*?)</div>', c, flags=re.S)
        views = re.search(r'aria-label="eye"[^>]*>\s*</span>\s*([\d.,]+)', c)
        likes = re.search(r'aria-label="heart"[^>]*>\s*</span>\s*([\d.,]+)', c)
        autor = re.search(r'aria-label="user".*?<span class="ant-typography ant-typography-secondary[^"]*" style="font-size: 11px;">(.*?)</span>', c, flags=re.S)
        data = re.search(r'aria-label="clock-circle"[^>]*>\s*</span>\s*([^<]+)</span>', c)
        tipos  = {'Artigo', 'Vídeo', 'Podcast', 'Curso', 'E-book'}
        status = {'Publicado', 'Rascunho', 'Arquivado'}
        planos = {'Intermediário+', 'Avançado', 'Intermediário'}
        out.append({
            'titulo': clean(titulo.group(1)),
            'tipo': next((t for t in tags if t in tipos), None),
            'status': next((t for t in tags if t in status), None),
            'planoMinimo': next((t for t in tags if t in planos), 'Básico'),
            'descricao': clean(desc.group(1)) if desc else None,
            'visualizacoes': intbr(views.group(1)) if views else 0,
            'curtidas': intbr(likes.group(1)) if likes else 0,
            'autor': clean(autor.group(1)) if autor else None,
            'publicadoEm': clean(data.group(1)) if data else None,
        })
    return out

def ex_notificacoes():
    s = nosvg(read('notificacoes'))
    out = []
    blocos = re.findall(
        r'<span class="ant-typography[^"]*" style="font-size: 14px;">(.*?)</span>'
        r'<span class="ant-tag[^"]*"[^>]*>(.*?)</span>'
        r'<span class="ant-tag[^"]*"[^>]*>(.*?)</span></div>'
        r'<span class="ant-typography ant-typography-secondary[^"]*" style="font-size: 13px;">(.*?)</span>'
        r'.*?aria-label="clock-circle"[^>]*>\s*</span>([^<]+)</span>',
        s, flags=re.S)
    vistos = set()
    for titulo, tipo, canal, msg, quando in blocos:
        t = clean(titulo)
        if t in vistos: continue
        vistos.add(t)
        data, _, hora = clean(quando).partition('·')
        out.append({
            'titulo': t,
            'tipo': clean(tipo),
            'canal': clean(canal),
            'mensagem': clean(msg),
            'data': dt(data),
            'enviadaEm': clean(hora),
        })
    return out

def ex_campanhas():
    s = nosvg(read('comunicacoes'))
    out = []
    for tr in re.findall(r'<tr class="ant-table-row[^"]*" data-row-key="(CAMP-\d+)">(.*?)</tr>', s, flags=re.S):
        rid, body = tr
        _, c = cells('<tr data-row-key="%s">%s</tr>' % (rid, body))
        flat = [' '.join(x) for x in c]
        out.append({
            'id': rid,
            'titulo': c[0][0] if c[0] else None,
            'previa': c[0][1] if len(c[0]) > 1 else None,
            'canal': flat[1] if len(flat) > 1 else None,
            'publico': flat[2] if len(flat) > 2 else None,
            'enviados': intbr(flat[3]) if len(flat) > 3 else None,
            'taxaAbertura': pct(flat[4]) if len(flat) > 4 else None,
            'status': flat[5] if len(flat) > 5 else None,
            'data': dt(flat[6]) if len(flat) > 6 else None,
        })
    return out

def ex_escritorios():
    s = nosvg(read('servicos'))
    out = []
    for bloco in re.split(r'<div style="padding: 16px; border-width: 1px 1px 1px 3px;', s)[1:]:
        nome = re.search(r'<strong>(.*?)</strong>', bloco, flags=re.S)
        if not nome: continue
        head = bloco[:bloco.find('ant-space-item')]
        tipo = re.search(r'<span class="ant-tag ant-tag-filled ant-tag-\w+[^"]*"[^>]*>(.*?)</span>', head, flags=re.S)
        esp = re.findall(r'<span class="ant-tag ant-tag-filled css-9injdo[^"]*" style="font-size: 11px; margin: 0px;">(.*?)</span>', bloco, flags=re.S)
        campo = lambda ic: (lambda m: clean(m.group(1)) if m else None)(
            re.search(r'aria-label="%s"[^>]*>\s*</span>([^<]+)</span>' % ic, bloco))
        atend = re.search(r'([\d.]+)\s*atendimentos', clean(bloco))
        ativo = 'Inativo' not in clean(head)
        out.append({
            'nome': clean(nome.group(1)),
            'tipo': clean(tipo.group(1)) if tipo else None,
            'especialidades': [clean(e) for e in esp],
            'responsavel': campo('user'),
            'email': campo('mail'),
            'telefone': campo('phone'),
            'localizacao': campo('environment'),
            'atendimentos': intbr(atend.group(1)) if atend else 0,
            'ativo': ativo,
        })
    return out

def _rate(bloco):
    """Nota do ant-rate (conta estrelas cheias/meias)."""
    full = len(re.findall(r'ant-rate-star ant-rate-star-full', bloco))
    half = len(re.findall(r'ant-rate-star ant-rate-star-half', bloco))
    return full + 0.5 * half if (full or half) else None

def ex_profissionais():
    s = nosvg(read('portal_servicos'))
    out = []
    for b in re.split(r'<div style="min-width: 260px; max-width: 320px;', s)[1:]:
        nome = re.search(r'<strong>(.*?)</strong>', b, flags=re.S)
        if not nome: continue
        esp = re.search(r'ant-tag-blue[^"]*" style="font-size: 10px; margin: 0px;">(.*?)</span>', b, flags=re.S)
        bio = re.search(r'ant-typography-secondary[^"]*" style="font-size: 12px; margin-bottom: 10px;">(.*?)</div>', b, flags=re.S)
        aval = re.search(r'\((\d+)\)', clean(b))
        valor = re.search(r'R\$\s*([\d.,]+)\s*/h', clean(b))
        disp = re.search(r'<span class="ant-tag ant-tag-filled ant-tag-\w+[^"]*"[^>]*>(Disponível|Indisponível)</span>', b)
        out.append({
            'nome': clean(nome.group(1)),
            'especialidade': clean(esp.group(1)) if esp else None,
            'bio': clean(bio.group(1)) if bio else None,
            'nota': _rate(b),
            'avaliacoes': int(aval.group(1)) if aval else 0,
            'valorHora': money(valor.group(1)) if valor else None,
            'disponivel': bool(disp and disp.group(1) == 'Disponível'),
        })
    return out

def ex_materiais():
    s = nosvg(read('portal_materiais'))
    out = []
    for c in re.split(r'<div class="ant-card ant-card-bordered ant-card-hoverable', s)[1:]:
        nome = re.search(r'<div class="ant-card-meta-title">.*?<span class="ant-typography[^"]*" style="font-size: 13px;">(.*?)</span>', c, flags=re.S)
        if not nome: continue
        dim = re.search(r'color: rgb\(255, 255, 255\); border-width: medium[^"]*">(.*?)</span>', c, flags=re.S)
        tags = re.findall(r'<span class="ant-tag ant-tag-filled css-9injdo[^"]*"[^>]*style="[^"]*font-size: 10px;">(.*?)</span>', c, flags=re.S)
        desc = re.search(r'ant-typography-secondary[^"]*" style="font-size: 11px[^"]*">(.*?)</div>', c, flags=re.S)
        copy = re.search(r'font-style: italic[^"]*">(.*?)</div>', c, flags=re.S)
        return_tags = [clean(t) for t in tags]
        out.append({
            'nome': clean(nome.group(1)),
            'dimensao': clean(dim.group(1)) if dim else None,
            'tipo': return_tags[0] if return_tags else None,
            'categoria': return_tags[1] if len(return_tags) > 1 else None,
            'descricao': clean(desc.group(1)) if desc else None,
            'textoCopy': clean(copy.group(1)) if copy else None,
        })
    return out

def ex_conquistas():
    s = nosvg(read('portal_ranking'))
    i = s.find('Conquistas (')
    out = []
    for c in re.split(r'<div class="ant-card ant-card-bordered ant-card-small', s[i:])[1:]:
        nome = re.search(r'<strong>(.*?)</strong>', c, flags=re.S)
        if not nome: continue
        desbloq = 'Desbloqueada' in clean(c)
        prog = re.search(r'(\d+(?:\.\d+)?)\s*%', clean(c))
        frac = re.search(r'(\d+)\s*/\s*(\d+)', clean(c))
        out.append({
            'nome': clean(nome.group(1)),
            'desbloqueada': desbloq,
            'progressoPct': float(prog.group(1)) if (prog and not desbloq) else (100.0 if desbloq else None),
            'progressoAtual': intbr(frac.group(1)) if frac else None,
            'progressoMeta': intbr(frac.group(2)) if frac else None,
        })
    return out

def tabela(slug):
    """Linhas da primeira ant-table da página, já em células de texto."""
    s = nosvg(read(slug))
    trs = re.findall(r'<tr class="ant-table-row[^"]*"[^>]*>(.*?)</tr>', s, flags=re.S)
    return [cells('<tr>' + tr + '</tr>')[1] for tr in trs]

def ex_saques():
    out = []
    for c in tabela('portal_financeiro'):
        if len(c) < 6: continue
        concl = c[5][0] if c[5] else None
        out.append({
            'data': dt(c[0][0] if c[0] else None),
            'valor': money(c[1][0] if c[1] else None),
            'metodo': c[2][0] if c[2] else None,
            'destino': ' '.join(c[3]) if c[3] else None,
            'status': c[4][0] if c[4] else None,
            'concluidoEm': dt(concl) if concl not in ('-', None) else None,
        })
    return out

def ex_links():
    out = []
    for c in tabela('portal_links'):
        if len(c) < 7: continue
        out.append({
            'produto': c[0][0] if c[0] else None,
            'codigo': c[1][0] if c[1] else None,
            'cliques': intbr(c[2][0] if c[2] else None),
            'conversoes': intbr(c[3][0] if c[3] else None),
            'taxa': pct(c[4][0] if c[4] else ''),
            'receita': money(c[5][0] if c[5] else None),
            'comissao': money(c[6][0] if c[6] else None),
        })
    return out

def ex_redes_sociais():
    s = nosvg(read('portal_redes-sociais'))
    out = []
    for rede in ('Instagram', 'YouTube', 'TikTok', 'Twitter / X'):
        i = s.find('>' + rede + '</strong>')
        if i < 0:
            continue
        bloco = s[i:i + 4000]
        bloco = bloco[:bloco.find('<ul class="ant-card-actions"')] or bloco
        conectada = '>Conectado</span>' in bloco
        handle = re.search(r'<span class="ant-typography ant-typography-secondary[^"]*">([^<]+)</span>', bloco)
        def stat(titulo):
            m = re.search(r'<div class="ant-statistic-title">%s</div></div>'
                          r'<div class="ant-statistic-content"[^>]*>(.*?)</div>' % re.escape(titulo),
                          bloco, flags=re.S)
            return clean(m.group(1)) if m else None
        eng = stat('Engajamento')
        out.append({
            'rede': rede,
            'conectada': conectada,
            'handle': clean(handle.group(1)) if (conectada and handle) else None,
            'seguidores': followers(stat('Seguidores') or '') if conectada else None,
            'engajamento': float(eng.replace(' ', '').rstrip('%')) if conectada and eng else None,
            'posts': intbr((stat('Posts') or '').replace(' ', '')) if conectada else None,
        })
    return out

def ex_posts_comunidade():
    s = nosvg(read('comunidade'))
    out = []
    sep = '<div style="background: rgb(255, 255, 255); border-radius: 8px; border: 1px solid rgb(232, 232, 232); overflow: hidden; transition: box-shadow 0.2s;">'
    for b in s.split(sep)[1:]:
        autor = re.search(r'<span class="ant-typography[^"]*" style="font-size: 14px;"><strong>(.*?)</strong>', b, flags=re.S)
        if not autor:
            continue
        t = clean(b)
        plano = re.search(r'font-size: 9px; margin: 0px; line-height: 14px; padding: 0px 4px;">(.*?)</span>', b, flags=re.S)
        papel = re.search(r'<div style="font-size: 12px; color: rgb\(102, 102, 102\); line-height: 1\.3;">(.*?)</div>', b, flags=re.S)
        data = re.search(r'<span>(\d{2}/\d{2}/\d{4})</span>', b)
        cat = re.search(r'<span class="ant-tag ant-tag-filled ant-tag-\w+[^"]*" style="font-size: 9px; margin: 0px; line-height: 14px; padding: 0px 5px;">(.*?)</span>', b, flags=re.S)
        corpo = re.search(r'white-space: pre-line;">(.*?)</div>', b, flags=re.S)
        img = re.search(r'<img alt="([^"]*)"', b)
        curt = re.search(r'aria-label="like"[^>]*>\s*</span>\s*</span>\s*<span>(\d+)</span>', b)
        coment = re.search(r'(\d+)\s*coment', t)
        views = re.search(r'([\d.,]+)\s*visualizações', t)
        out.append({
            'autor': clean(autor.group(1)),
            'planoAutor': clean(plano.group(1)) if plano else None,
            'papelAutor': clean(papel.group(1)) if papel else None,
            'categoria': clean(cat.group(1)) if cat else None,
            'conteudo': clean(corpo.group(1)) if corpo else None,
            'legendaImagem': img.group(1) if img else None,
            'data': dt(data.group(1)) if data else None,
            'fixado': 'Fixado pela administração' in t,
            'curtidas': int(curt.group(1)) if curt else 0,
            'comentarios': int(coment.group(1)) if coment else 0,
            'visualizacoes': intbr(views.group(1)) if views else 0,
        })
    return out

def ex_metricas_diarias():
    out = []
    for c in tabela('portal_performance'):
        if len(c) < 6: continue
        out.append({
            'data': dt(c[0][0] if c[0] else None),
            'cliques': intbr(c[1][0] if c[1] else None),
            'conversoes': intbr(c[2][0] if c[2] else None),
            'taxa': pct(c[3][0] if c[3] else ''),
            'receita': money(c[4][0] if c[4] else None),
            'comissao': money(c[5][0] if c[5] else None) or 0.0,
        })
    return out

def ex_categorias_comunidade():
    return sorted({p['categoria'] for p in ex_posts_comunidade() if p['categoria']})

def ex_categorias_produto():
    return sorted({p['categoria'] for p in ex_produtos() if p['categoria']})

def main():
    os.makedirs(OUT, exist_ok=True)
    print('Extraindo dataset das capturas -> seed-data/\n')
    tabelas = [
        ('planos', ex_planos), ('associados', ex_associados), ('produtos', ex_produtos),
        ('lojas', ex_lojas), ('vendas', ex_vendas), ('comissoes', ex_comissoes),
        ('parceiros', ex_parceiros), ('beneficios', ex_beneficios), ('conteudos', ex_conteudos),
        ('tickets', ex_tickets), ('cupons', ex_cupons), ('notificacoes', ex_notificacoes),
        ('campanhas', ex_campanhas), ('escritorios', ex_escritorios), ('profissionais', ex_profissionais),
        ('materiais', ex_materiais), ('conquistas', ex_conquistas), ('saques', ex_saques),
        ('links-afiliado', ex_links), ('redes-sociais', ex_redes_sociais),
        ('posts-comunidade', ex_posts_comunidade), ('metricas-diarias', ex_metricas_diarias),
        ('categorias-comunidade', ex_categorias_comunidade), ('categorias-produto', ex_categorias_produto),
    ]
    total = 0
    for nome, fn in tabelas:
        data = fn()
        dump(nome, data)
        total += len(data)
    print(f'\n{total} registros em {len(tabelas)} arquivos.')

if __name__ == '__main__':
    main()
