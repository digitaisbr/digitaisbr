# Documentação

- **`DigitaisBR-Manual-de-Uso.pdf`** — **como usar a plataforma** (14 páginas). Guia do
  administrador, guia do associado, tarefas passo a passo e perguntas frequentes.
  *Este é o documento para quem vai operar o sistema.*
- **`DigitaisBR-Documentacao.pdf`** — documentação técnica (51 páginas, 15 capítulos):
  arquitetura, modelo de dados, API, capacidade e segurança.
- **`RELATORIO-TESTES-CARGA.md`** — relatório dos testes de carga: metodologia, resultados por
  endpoint, o gargalo encontrado e corrigido, e como reproduzir.
- `documentacao.html` — mesma versão do PDF em HTML, para leitura no navegador.
- `DIGITAISBR_visual.pdf` e `LOGO*.zip` — brand book e kit de logos (fornecidos).

## Regenerar

O documento é gerado, não editado à mão. A referência de rotas vem do Swagger da API em
execução, e os rótulos de acesso são lidos dos decoradores `@Roles` / `@Public` no código —
assim a documentação não descreve endpoints que não existem nem inventa permissões.

```bash
cd apps/api && npm run start:prod &   # a API precisa estar no ar
cd ../.. && python3 tools/gerar_docs.py
```

Fontes editáveis em `tools/docs/`:

| Arquivo | Conteúdo |
|---|---|
| `estilo.css` | folha de estilo de impressão (A4, quebras de página, tipografia) |
| `conteudo-1.html` | capa, sumário, capítulos 1–3 |
| `conteudo-2.html` | capítulos 4–5 — modelo de dados e regras de negócio |
| `conteudo-3a.html` | capítulos 6–7 — módulos funcionais e referência da API |
| `conteudo-2b.html` | capítulos 8–11 — interface, desenvolvimento, escalabilidade, segurança |
| `conteudo-3c.html` | capítulos 12–14 — dados, testes, operação |
| `conteudo-3b.html` | capítulo 15 — publicar na internet |
| `manual.html` | manual de uso (documento independente) |

A ordem de montagem está declarada em `tools/gerar_docs.py`; os nomes dos arquivos não
seguem a ordem dos capítulos, por isso ela é explícita lá.

O marcador `<!--ROTAS-->` em `conteudo-3.html` é substituído pela tabela das 166 rotas.
