# -*- coding: utf-8 -*-
"""
Gera a documentação da plataforma DigitaisBR em HTML e PDF.

A referência de rotas é lida do Swagger da API em execução, de modo que o
documento nunca descreva um endpoint que não exista.

Uso:
    npm run start:prod &          # a API precisa estar no ar
    python3 tools/gerar_docs.py
"""
import html
import json
import re
import os
import subprocess
import sys
import urllib.request
from datetime import date

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(BASE, 'tools', 'docs')
SAIDA = os.path.join(BASE, 'docs')

SWAGGER_URL = os.environ.get('SWAGGER_URL', 'http://localhost:3000/api/docs-json')
CHROME = os.path.expanduser('~/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome')

# ordem de apresentação dos módulos no capítulo de referência
ORDEM_TAGS = [
    'Autenticação',
    'Dashboard e Relatórios',
    'Planos',
    'Associados',
    'Catálogo',
    'Lojas',
    'Vendas',
    'Comissões',
    'Financeiro',
    'Parceiros e Benefícios',
    'Conteúdos',
    'Comunidade',
    'Suporte',
    'Serviços (Jurídico e Contábil)',
    'Notificações e Campanhas',
    'Gamificação',
    'Portal do Associado',
]

SRC = os.path.join(BASE, 'apps', 'api', 'src', 'modules')


def baixar_swagger() -> dict:
    """Lê a especificação da API em execução — assim o documento nunca
    descreve um endpoint que não exista."""
    try:
        with urllib.request.urlopen(SWAGGER_URL, timeout=10) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception as e:
        sys.exit(
            f'Não foi possível ler o Swagger em {SWAGGER_URL}.\n'
            f'Suba a API antes de gerar a documentação.\nDetalhe: {e}'
        )

VERBOS = ('Get', 'Post', 'Patch', 'Put', 'Delete')


def mapear_acesso() -> dict[tuple[str, str], str]:
    """
    Extrai o nível de acesso real de cada rota lendo os decoradores
    @Roles / @Public nos controllers. O Swagger não expõe esse metadado,
    e inferir pelo caminho produziria rótulos errados.

    Devolve {(metodo, caminho): 'admin' | 'publico' | 'autenticado'}.
    """
    mapa: dict[tuple[str, str], str] = {}

    for raiz, _, arquivos in os.walk(SRC):
        for nome in sorted(arquivos):
            if not nome.endswith('.controller.ts'):
                continue
            fonte = open(os.path.join(raiz, nome), encoding='utf-8').read()

            m = re.search(r"@Controller\(\s*'([^']*)'\s*\)", fonte)
            prefixo = m.group(1) if m else ''

            corte = fonte.index('export class')
            # decoradores antes da classe valem para todas as rotas dela
            admin_na_classe = '@Roles(Role.ADMIN)' in fonte[:corte]
            corpo = fonte[corte:]

            # métodos são separados por linha em branco; cada bloco carrega
            # a corrida completa de decoradores que o precede
            for bloco in re.split(r'\n\n(?=\s*@)', corpo):
                verbo = re.search(
                    r'@(%s)\(\s*(?:\x27([^\x27]*)\x27)?\s*\)' % '|'.join(VERBOS), bloco
                )
                if not verbo:
                    continue

                metodo = verbo.group(1).lower()
                sufixo = verbo.group(2) or ''

                if '@Public()' in bloco:
                    acesso = 'publico'
                elif '@Roles(Role.ADMIN)' in bloco or admin_na_classe:
                    acesso = 'admin'
                else:
                    acesso = 'autenticado'

                partes = [p for p in (prefixo, sufixo) if p]
                caminho = '/' + '/'.join(partes) if partes else '/'
                caminho = re.sub(r':(\w+)', r'{\1}', caminho)  # :id -> {id}
                mapa[(metodo, caminho)] = acesso

    return mapa


def tabela_rotas(spec: dict) -> str:
    acessos = mapear_acesso()
    faltando: list[tuple[str, str]] = []
    grupos: dict[str, list[tuple[str, str, str]]] = {}
    for path, ops in spec.get('paths', {}).items():
        for metodo, op in ops.items():
            if metodo not in ('get', 'post', 'patch', 'put', 'delete'):
                continue
            tag = (op.get('tags') or ['Outros'])[0]
            grupos.setdefault(tag, []).append((metodo, path, op.get('summary', '')))

    tags = [t for t in ORDEM_TAGS if t in grupos]
    tags += [t for t in sorted(grupos) if t not in ORDEM_TAGS]

    partes: list[str] = []
    total = 0

    for tag in tags:
        rotas = sorted(grupos[tag], key=lambda r: (r[1], r[0]))
        total += len(rotas)
        partes.append(
            f'<h3>{html.escape(tag)} '
            f'<span style="font-weight:400;color:#8c94a3;font-size:9.4pt">'
            f'· {len(rotas)} rota{"s" if len(rotas) > 1 else ""}</span></h3>'
        )
        partes.append(
            '<table class="compacta">'
            '<thead><tr>'
            '<th style="width:8%">Método</th>'
            '<th style="width:36%">Caminho</th>'
            '<th style="width:11%">Acesso</th>'
            '<th>Descrição</th>'
            '</tr></thead><tbody>'
        )
        for metodo, path, resumo in rotas:
            # o Swagger publica os caminhos com o prefixo global; o mapa
            # vem dos decoradores, que não o incluem
            sem_prefixo = re.sub(r'^/api(?=/)', '', path)
            nivel = acessos.get((metodo, sem_prefixo))
            if nivel is None:
                faltando.append((metodo, path))
                nivel = 'autenticado'

            acesso = {
                'publico': '<span class="selo pub">PÚBLICO</span>',
                'admin': '<span class="selo admin">ADMIN</span>',
                'autenticado': '<span style="color:#8c94a3;font-size:8pt">autenticado</span>',
            }[nivel]

            partes.append(
                f'<tr>'
                f'<td><span class="selo {metodo}">{metodo.upper()}</span></td>'
                f'<td><code>{html.escape(path)}</code></td>'
                f'<td>{acesso}</td>'
                f'<td>{html.escape(resumo)}</td>'
                f'</tr>'
            )
        partes.append('</tbody></table>')

    print(f'  referência de rotas: {total} em {len(tags)} módulos')
    admin = sum(1 for v in acessos.values() if v == 'admin')
    pub = sum(1 for v in acessos.values() if v == 'publico')
    print(f'  acesso: {admin} admin · {pub} públicas · {len(acessos) - admin - pub} autenticadas')
    if faltando:
        print(f'  AVISO: {len(faltando)} rota(s) sem acesso mapeado: {faltando[:5]}')
    return '\n'.join(partes)


def montar_manual() -> str:
    """Manual de uso — não depende do Swagger, é um guia de operação."""
    css = open(os.path.join(DOCS, 'estilo.css'), encoding='utf-8').read()
    corpo = open(os.path.join(DOCS, 'manual.html'), encoding='utf-8').read()
    return (
        '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n'
        '<meta charset="utf-8">\n'
        '<title>DigitaisBR — Manual de Uso</title>\n'
        f'<style>\n{css}\n</style>\n'
        '</head>\n<body>\n'
        f'{corpo}\n'
        '</body>\n</html>\n'
    )


def montar_html(spec: dict) -> str:
    css = open(os.path.join(DOCS, 'estilo.css'), encoding='utf-8').read()
    # fragmentos na ordem dos capítulos:
    #   1  caps. 1-3   visão, arquitetura, autenticação
    #   2  caps. 4-5   modelo de dados, regras de negócio
    #   3a caps. 6-7   módulos funcionais, referência da API
    #   2b caps. 8-11  interface, desenvolvimento, escalabilidade, segurança
    #   3c caps. 12-14 dados, testes, operação
    #   3b cap.  15    deploy
    partes = ['conteudo-1', 'conteudo-2', 'conteudo-3a', 'conteudo-2b', 'conteudo-3c', 'conteudo-3b']
    corpo = '\n'.join(
        open(os.path.join(DOCS, f'{nome}.html'), encoding='utf-8').read()
        for nome in partes
    )
    corpo = corpo.replace('<!--ROTAS-->', tabela_rotas(spec))

    return (
        '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n'
        '<meta charset="utf-8">\n'
        '<title>DigitaisBR — Documentação da Plataforma</title>\n'
        f'<style>\n{css}\n</style>\n'
        '</head>\n<body>\n'
        f'{corpo}\n'
        '</body>\n</html>\n'
    )


def gerar_pdf(caminho_html: str, caminho_pdf: str) -> None:
    if not os.path.exists(CHROME):
        sys.exit(f'Chromium não encontrado em {CHROME}.')
    subprocess.run(
        [
            CHROME, '--headless', '--disable-gpu', '--no-sandbox',
            '--no-pdf-header-footer',
            f'--print-to-pdf={caminho_pdf}',
            f'file://{caminho_html}',
        ],
        check=True,
        capture_output=True,
    )


def main() -> None:
    os.makedirs(SAIDA, exist_ok=True)
    print('Gerando documentação DigitaisBR\n')

    spec = baixar_swagger()
    print(f'  swagger: {spec["info"]["title"]} v{spec["info"]["version"]}')

    caminho_html = os.path.join(SAIDA, 'documentacao.html')
    caminho_pdf = os.path.join(SAIDA, 'DigitaisBR-Documentacao.pdf')

    with open(caminho_html, 'w', encoding='utf-8') as f:
        f.write(montar_html(spec))
    print(f'  HTML: {os.path.relpath(caminho_html, BASE)} '
          f'({os.path.getsize(caminho_html) / 1024:.0f} KB)')

    gerar_pdf(caminho_html, caminho_pdf)
    print(f'  PDF:  {os.path.relpath(caminho_pdf, BASE)} '
          f'({os.path.getsize(caminho_pdf) / 1024:.0f} KB)')

    # ---- manual de uso ----
    manual_html = os.path.join(SAIDA, 'manual.html')
    manual_pdf = os.path.join(SAIDA, 'DigitaisBR-Manual-de-Uso.pdf')
    with open(manual_html, 'w', encoding='utf-8') as f:
        f.write(montar_manual())
    gerar_pdf(manual_html, manual_pdf)
    print(f'  PDF:  {os.path.relpath(manual_pdf, BASE)} '
          f'({os.path.getsize(manual_pdf) / 1024:.0f} KB)')

    print(f'\nConcluído em {date.today().isoformat()}.')


if __name__ == '__main__':
    main()
