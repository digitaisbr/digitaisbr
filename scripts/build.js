const fs = require('fs');
const path = require('path');
const DIR = __dirname + '/capture';
const PAGES = DIR + '/pages';

// route/nav manifest
const MANIFEST = [
  // admin area
  { slug: 'root',          route: '/',              area: 'admin', label: 'Dashboard' },
  { slug: 'associados',    route: '/associados',    area: 'admin', label: 'Associados' },
  { slug: 'associados_novo',route: '/associados/novo',area:'admin', label: 'Novo Associado' },
  { slug: 'planos',        route: '/planos',        area: 'admin', label: 'Planos' },
  { slug: 'catalogo',      route: '/catalogo',      area: 'admin', label: 'Catálogo' },
  { slug: 'catalogo_novo', route: '/catalogo/novo', area: 'admin', label: 'Novo Produto' },
  { slug: 'lojas',         route: '/lojas',         area: 'admin', label: 'Lojas' },
  { slug: 'vendas',        route: '/vendas',        area: 'admin', label: 'Vendas' },
  { slug: 'comissoes',     route: '/comissoes',     area: 'admin', label: 'Comissões' },
  { slug: 'financeiro',    route: '/financeiro',    area: 'admin', label: 'Financeiro' },
  { slug: 'parceiros',     route: '/parceiros',     area: 'admin', label: 'Parceiros' },
  { slug: 'conteudos',     route: '/conteudos',     area: 'admin', label: 'Conteúdos' },
  { slug: 'comunidade',    route: '/comunidade',    area: 'admin', label: 'Comunidade' },
  { slug: 'notificacoes',  route: '/notificacoes',  area: 'admin', label: 'Notificações' },
  { slug: 'servicos',      route: '/servicos',      area: 'admin', label: 'Serviços' },
  { slug: 'suporte',       route: '/suporte',       area: 'admin', label: 'Suporte' },
  { slug: 'comunicacoes',  route: '/comunicacoes',  area: 'admin', label: 'Comunicações' },
  { slug: 'relatorios',    route: '/relatorios',    area: 'admin', label: 'Relatórios' },
  // portal area
  { slug: 'portal',              route: '/portal',              area: 'portal', label: 'Painel' },
  { slug: 'portal_loja',         route: '/portal/loja',         area: 'portal', label: 'Loja' },
  { slug: 'portal_vendas',       route: '/portal/vendas',       area: 'portal', label: 'Vendas' },
  { slug: 'portal_beneficios',   route: '/portal/beneficios',   area: 'portal', label: 'Benefícios' },
  { slug: 'portal_plano',        route: '/portal/plano',        area: 'portal', label: 'Plano' },
  { slug: 'portal_conteudos',    route: '/portal/conteudos',    area: 'portal', label: 'Conteúdos' },
  { slug: 'portal_comunidade',   route: '/portal/comunidade',   area: 'portal', label: 'Comunidade' },
  { slug: 'portal_notificacoes', route: '/portal/notificacoes', area: 'portal', label: 'Notificações' },
  { slug: 'portal_suporte',      route: '/portal/suporte',      area: 'portal', label: 'Suporte' },
  { slug: 'portal_links',        route: '/portal/links',        area: 'portal', label: 'Links' },
  { slug: 'portal_materiais',    route: '/portal/materiais',    area: 'portal', label: 'Materiais' },
  { slug: 'portal_financeiro',   route: '/portal/financeiro',   area: 'portal', label: 'Financeiro' },
  { slug: 'portal_perfil',       route: '/portal/perfil',       area: 'portal', label: 'Perfil' },
  { slug: 'portal_cupons',       route: '/portal/cupons',       area: 'portal', label: 'Cupons' },
  { slug: 'portal_performance',  route: '/portal/performance',  area: 'portal', label: 'Performance' },
  { slug: 'portal_redes-sociais',route: '/portal/redes-sociais',area: 'portal', label: 'Redes Sociais' },
  { slug: 'portal_ranking',      route: '/portal/ranking',      area: 'portal', label: 'Ranking' },
  { slug: 'portal_servicos',     route: '/portal/servicos',     area: 'portal', label: 'Serviços' },
];

const logoData = 'data:image/png;base64,' + fs.readFileSync(DIR + '/logo.png').toString('base64');

const styleSet = new Map(); // hash -> css
const pages = {};

function extractStyles(html) {
  const out = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}
function extractRoot(html) {
  // grab <div id="root"> ... </div> up to the trailing scripts
  const start = html.indexOf('<div id="root">');
  if (start < 0) return '';
  // find the closing before the first <script> after root
  const after = html.indexOf('<script', start);
  let seg = after > 0 ? html.slice(start, after) : html.slice(start);
  // trim trailing whitespace/newlines
  return seg.trim();
}
function sanitize(root) {
  // strip any script tags, inline handlers, and neutralize external asset refs
  root = root.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  root = root.replace(/\son\w+="[^"]*"/gi, '');
  root = root.replace(/src="\/logo\.png"/gi, 'src="%DBR_LOGO%"');
  // any remaining absolute site asset -> keep but harmless; blank hrefs to routes
  root = root.replace(/href="\/[^"]*"/gi, 'href="javascript:void(0)"');
  return root;
}

let hashCounter = 0;
for (const item of MANIFEST) {
  const p = path.join(PAGES, item.slug + '.html');
  if (!fs.existsSync(p)) { console.log('MISSING', item.slug); continue; }
  const html = fs.readFileSync(p, 'utf-8');
  for (const css of extractStyles(html)) {
    const key = css.length + ':' + css.slice(0, 64) + css.slice(-64);
    if (!styleSet.has(key)) styleSet.set(key, css);
  }
  pages[item.route] = sanitize(extractRoot(html));
}

const mergedCss = [...styleSet.values()].join('\n');
console.log('unique style blocks:', styleSet.size, '| merged css KB:', Math.round(mergedCss.length/1024));
console.log('pages:', Object.keys(pages).length);

const navMap = {};
for (const it of MANIFEST) navMap[it.route] = it;

const bootData = JSON.stringify(pages);
const navJson = JSON.stringify(MANIFEST);

const routerScript = `
(function(){
  var PAGES = window.__DBR_PAGES__;
  var NAV = window.__DBR_NAV__;
  var app = document.getElementById('dbr-app');
  function labelRoute(area, label){
    for(var i=0;i<NAV.length;i++){ if(NAV[i].area===area && NAV[i].label.toLowerCase()===label.toLowerCase()) return NAV[i].route; }
    return null;
  }
  function currentArea(route){ return route.indexOf('/portal')===0 ? 'portal' : 'admin'; }
  function render(route){
    if(!PAGES[route]) route = '/';
    app.innerHTML = String(PAGES[route]).split('%DBR_LOGO%').join(window.__DBR_LOGO__);
    window.scrollTo(0,0);
    wire(route);
  }
  function normText(el){ return (el.textContent||'').trim().replace(/\\s+/g,' '); }
  function wire(route){
    var area = currentArea(route);
    // sidebar menu items (antd)
    var items = app.querySelectorAll('.ant-menu-item, .ant-menu-submenu-title, a, .ant-menu-title-content');
    items.forEach(function(el){
      var t = normText(el);
      if(!t) return;
      var r = labelRoute(area, t) || labelRoute('admin', t) || labelRoute('portal', t);
      if(r){ el.style.cursor='pointer'; el.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); go(r); }, true); }
    });
    // topbar: allow jump between admin<->portal via logo click -> home of area; and any element literally 'Portal'/'Admin'
  }
  function go(route){ if(location.hash !== '#'+route){ location.hash = route; } else { render(route); } }
  window.addEventListener('hashchange', function(){ render(location.hash.slice(1)||'/'); });
  render(location.hash.slice(1) || '/');
})();
`;

const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DigitaisBR — Clone estático (JS)</title>
<style>${mergedCss}</style>
<style>
  html,body{margin:0;padding:0;background:#f5f5f5;}
  #dbr-app{min-height:100vh;}
  .dbr-toolbar{position:fixed;bottom:14px;right:14px;z-index:99999;background:#001529;color:#fff;border-radius:10px;padding:8px 12px;font:12px/1.3 -apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.3);opacity:.92}
  .dbr-toolbar b{color:#40a9ff}
  .dbr-toolbar select{margin-left:6px;font-size:12px}
</style>`;

const body = `<div id="dbr-app"></div>
<div class="dbr-toolbar">
  <b>DigitaisBR</b> · clone estático
  <label>· ir para
    <select onchange="location.hash=this.value">
      ${MANIFEST.map(m=>`<option value="${m.route}">${m.area==='portal'?'Portal · ':''}${m.label}</option>`).join('')}
    </select>
  </label>
</div>
<script>window.__DBR_LOGO__=${JSON.stringify(logoData)};window.__DBR_PAGES__=${bootData};window.__DBR_NAV__=${navJson};</script>
<script>${routerScript}</script>`;

const outDir = __dirname + '/dist';
fs.mkdirSync(outDir, { recursive: true });
// Artifact skeleton wraps head/body, but we also emit a full standalone file for download.
fs.writeFileSync(outDir + '/_head.html', head);
fs.writeFileSync(outDir + '/_body.html', body);
const full = '<!doctype html>\n<html lang="pt-BR">\n<head>\n' + head + '\n</head>\n<body>\n' + body + '\n</body>\n</html>';
fs.writeFileSync(outDir + '/index.html', full);
console.log('WROTE', outDir + '/index.html', '|', Math.round(full.length/1024), 'KB');
