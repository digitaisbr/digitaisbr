#!/usr/bin/env python3
"""
Resumo dos acessos ao site a partir do log do Caddy.

O Caddy grava uma linha JSON por requisição. Isso é preciso, mas ilegível em
volume. Este script agrega em algo que dá para ler numa reunião.

Uso, no servidor:
    docker exec app-proxy-1 sh -c 'cat /data/acesso.log*' | python3 relatorio-acesso.py
    ... | python3 relatorio-acesso.py --dias 7
"""
import argparse
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

# Fuso de Brasília. O log vem em UTC; agrupar por dia em UTC jogaria o
# movimento da noite para o dia seguinte.
BRASILIA = timezone(timedelta(hours=-3))

# Requisições que não representam uma pessoa olhando uma página.
ESTATICOS = ('/assets/', '/favicon', '/robots.txt', '.js', '.css', '.map',
             '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2')


def eh_pagina(uri: str) -> bool:
    """Uma visualização de página, e não um recurso que o navegador buscou junto."""
    if uri.startswith('/api/'):
        return False
    return not any(p in uri for p in ESTATICOS)


def barra(n: int, maximo: int, largura: int = 28) -> str:
    return '█' * max(1, round(n / maximo * largura)) if maximo else ''


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--dias', type=int, default=0,
                    help='considerar apenas os últimos N dias (0 = tudo)')
    args = ap.parse_args()

    corte = None
    if args.dias:
        corte = datetime.now(timezone.utc) - timedelta(days=args.dias)

    total = api = 0
    paginas = Counter()
    ips = set()
    ips_por_dia = defaultdict(set)
    req_por_dia = Counter()
    paginas_por_dia = Counter()
    status = Counter()
    referencias = Counter()
    navegadores = Counter()
    lentas = []
    primeiro = ultimo = None

    for linha in sys.stdin:
        linha = linha.strip()
        if not linha or not linha.startswith('{'):
            continue
        try:
            ev = json.loads(linha)
        except json.JSONDecodeError:
            continue
        if ev.get('msg') != 'handled request':
            continue

        quando = datetime.fromtimestamp(ev['ts'], timezone.utc)
        if corte and quando < corte:
            continue

        req = ev.get('request', {})
        uri = req.get('uri', '')
        ip = req.get('client_ip') or req.get('remote_ip', '')
        dia = quando.astimezone(BRASILIA).strftime('%d/%m')

        total += 1
        primeiro = quando if primeiro is None else min(primeiro, quando)
        ultimo = quando if ultimo is None else max(ultimo, quando)
        status[ev.get('status', 0)] += 1
        req_por_dia[dia] += 1
        if ip:
            ips.add(ip)
            ips_por_dia[dia].add(ip)

        if uri.startswith('/api/'):
            api += 1
        elif eh_pagina(uri):
            paginas[uri] += 1
            paginas_por_dia[dia] += 1

        cab = req.get('headers', {})
        ref = (cab.get('Referer') or [''])[0]
        # referência interna é navegação, não origem de tráfego
        if ref and req.get('host', '') not in ref:
            referencias[ref] += 1
        ua = (cab.get('User-Agent') or [''])[0]
        if ua:
            for nome in ('Edg', 'OPR', 'Chrome', 'Safari', 'Firefox', 'curl', 'bot'):
                if nome.lower() in ua.lower():
                    navegadores[{'Edg': 'Edge', 'OPR': 'Opera'}.get(nome, nome)] += 1
                    break
            else:
                navegadores['outro'] += 1

        d = ev.get('duration', 0)
        if d > 1.0:
            lentas.append((d, uri))

    if not total:
        print('Nenhum acesso registrado no período.')
        return 0

    print()
    print('  RELATÓRIO DE ACESSOS — DigitaisBR')
    print('  ' + '─' * 52)
    fmt = '%d/%m/%Y %H:%M'
    print(f'  período   {primeiro.astimezone(BRASILIA):{fmt}} → '
          f'{ultimo.astimezone(BRASILIA):{fmt}} (Brasília)')
    print(f'  visitas   {sum(paginas.values()):>6} visualizações de página')
    print(f'  pessoas   {len(ips):>6} endereços distintos')
    print(f'  API       {api:>6} chamadas')
    print(f'  total     {total:>6} requisições')

    print()
    print('  POR DIA')
    pico = max(req_por_dia.values())
    for dia in sorted(req_por_dia, key=lambda d: (d[3:], d[:2])):
        print(f'   {dia}  {paginas_por_dia[dia]:>4} páginas  '
              f'{len(ips_por_dia[dia]):>3} pessoas   {barra(req_por_dia[dia], pico)}')

    if paginas:
        print()
        print('  PÁGINAS MAIS VISTAS')
        for uri, n in paginas.most_common(10):
            print(f'   {n:>4}  {uri[:60]}')

    if referencias:
        print()
        print('  DE ONDE VIERAM')
        for ref, n in referencias.most_common(5):
            print(f'   {n:>4}  {ref[:60]}')

    if navegadores:
        print()
        print('  NAVEGADORES')
        for nav, n in navegadores.most_common(6):
            print(f'   {n:>4}  {nav}')

    print()
    print('  RESPOSTAS')
    for cod, n in sorted(status.items()):
        marca = '  ← erro' if cod >= 500 else ('  ← falha do cliente' if cod >= 400 else '')
        print(f'   {n:>4}  HTTP {cod}{marca}')

    if lentas:
        print()
        print(f'  LENTAS (acima de 1s): {len(lentas)}')
        for d, uri in sorted(lentas, reverse=True)[:5]:
            print(f'   {d:>5.1f}s  {uri[:55]}')

    print()
    return 0


if __name__ == '__main__':
    sys.exit(main())
