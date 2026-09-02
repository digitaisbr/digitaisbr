const fs = require('fs');
const path = require('path');
const DIR = __dirname + '/capture';
const PAGES = DIR + '/pages';

const BASE_MANIFEST = [
  { slug:'root', route:'/', area:'admin', label:'Dashboard' },
  { slug:'associados', route:'/associados', area:'admin', label:'Associados' },
  { slug:'associados_novo', route:'/associados/novo', area:'admin', label:'Novo Associado' },
  { slug:'planos', route:'/planos', area:'admin', label:'Planos' },
  { slug:'catalogo', route:'/catalogo', area:'admin', label:'Catálogo' },
  { slug:'catalogo_novo', route:'/catalogo/novo', area:'admin', label:'Novo Produto' },
  { slug:'lojas', route:'/lojas', area:'admin', label:'Lojas' },
  { slug:'vendas', route:'/vendas', area:'admin', label:'Vendas' },
  { slug:'comissoes', route:'/comissoes', area:'admin', label:'Comissões' },
  { slug:'financeiro', route:'/financeiro', area:'admin', label:'Financeiro' },
  { slug:'parceiros', route:'/parceiros', area:'admin', label:'Parceiros' },
  { slug:'conteudos', route:'/conteudos', area:'admin', label:'Conteúdos' },
  { slug:'comunidade', route:'/comunidade', area:'admin', label:'Comunidade' },
  { slug:'notificacoes', route:'/notificacoes', area:'admin', label:'Notificações' },
  { slug:'servicos', route:'/servicos', area:'admin', label:'Serviços' },
  { slug:'suporte', route:'/suporte', area:'admin', label:'Suporte' },
  { slug:'comunicacoes', route:'/comunicacoes', area:'admin', label:'Comunicações' },
  { slug:'relatorios', route:'/relatorios', area:'admin', label:'Relatórios' },
  { slug:'portal', route:'/portal', area:'portal', label:'Painel' },
  { slug:'portal_loja', route:'/portal/loja', area:'portal', label:'Loja' },
  { slug:'portal_vendas', route:'/portal/vendas', area:'portal', label:'Vendas' },
  { slug:'portal_beneficios', route:'/portal/beneficios', area:'portal', label:'Benefícios' },
  { slug:'portal_plano', route:'/portal/plano', area:'portal', label:'Plano' },
  { slug:'portal_conteudos', route:'/portal/conteudos', area:'portal', label:'Conteúdos' },
  { slug:'portal_comunidade', route:'/portal/comunidade', area:'portal', label:'Comunidade' },
  { slug:'portal_notificacoes', route:'/portal/notificacoes', area:'portal', label:'Notificações' },
  { slug:'portal_suporte', route:'/portal/suporte', area:'portal', label:'Suporte' },
  { slug:'portal_links', route:'/portal/links', area:'portal', label:'Links' },
  { slug:'portal_materiais', route:'/portal/materiais', area:'portal', label:'Materiais' },
  { slug:'portal_financeiro', route:'/portal/financeiro', area:'portal', label:'Financeiro' },
  { slug:'portal_perfil', route:'/portal/perfil', area:'portal', label:'Perfil' },
  { slug:'portal_cupons', route:'/portal/cupons', area:'portal', label:'Cupons' },
  { slug:'portal_performance', route:'/portal/performance', area:'portal', label:'Performance' },
  { slug:'portal_redes-sociais', route:'/portal/redes-sociais', area:'portal', label:'Redes Sociais' },
  { slug:'portal_ranking', route:'/portal/ranking', area:'portal', label:'Ranking' },
  { slug:'portal_servicos', route:'/portal/servicos', area:'portal', label:'Serviços' },
];

const logoData = 'data:image/png;base64,' + fs.readFileSync(DIR + '/logo.png').toString('base64');
const detailsList = JSON.parse(fs.readFileSync(DIR + '/details_all.json', 'utf-8')); // [{route, slug}]
const tablesRaw = JSON.parse(fs.readFileSync(DIR + '/tables.json', 'utf-8'));

// -------- style + root extraction --------
const styleSet = new Map();
function collectStyles(html) {
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi; let m;
  while ((m = re.exec(html))) { const css = m[1]; const key = css.length + ':' + css.slice(0,64) + css.slice(-64); if (!styleSet.has(key)) styleSet.set(key, css); }
}
function extractRoot(html) {
  const start = html.indexOf('<div id="root">'); if (start < 0) return '';
  const after = html.indexOf('<script', start);
  return (after > 0 ? html.slice(start, after) : html.slice(start)).trim();
}
function sanitize(root) {
  root = root.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  root = root.replace(/\son\w+="[^"]*"/gi, '');
  root = root.replace(/src="\/logo\.png"/gi, 'src="%DBR_LOGO%"');
  root = root.replace(/href="\/[^"]*"/gi, 'href="javascript:void(0)"');
  return root;
}
function textOf(html){ return html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }
function firstMatch(html, re){ const m = html.match(re); return m ? textOf(m[1]) : ''; }

// -------- load all pages --------
const pages = {};
const allManifest = BASE_MANIFEST.slice();
for (const it of BASE_MANIFEST) {
  const p = path.join(PAGES, it.slug + '.html'); if (!fs.existsSync(p)) { console.log('MISS', it.slug); continue; }
  const html = fs.readFileSync(p, 'utf-8'); collectStyles(html); pages[it.route] = sanitize(extractRoot(html));
}
// detail pages + build name->route map per category
const nameToRoute = { assoc: {}, prod: {}, store: {} };
for (const d of detailsList) {
  const p = path.join(PAGES, d.slug + '.html'); if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, 'utf-8'); collectStyles(html); pages[d.route] = sanitize(extractRoot(html));
  allManifest.push({ slug: d.slug, route: d.route, area: 'admin', label: d.route, detail: true });
  let name = '';
  if (d.route.startsWith('/associados/')) name = firstMatch(html, /<h4[^>]*class="[^"]*ant-typography[^"]*"[^>]*>([\s\S]*?)<\/h4>/i), nameToRoute.assoc[name.toLowerCase()] = d.route;
  else if (d.route.startsWith('/catalogo/')) name = firstMatch(html, /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i), nameToRoute.prod[name.toLowerCase()] = d.route;
  else if (d.route.startsWith('/lojas/')) name = firstMatch(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i), nameToRoute.store[name.toLowerCase()] = d.route;
}
console.log('names: assoc', Object.keys(nameToRoute.assoc).length, 'prod', Object.keys(nameToRoute.prod).length, 'store', Object.keys(nameToRoute.store).length);

// -------- link rows to detail routes --------
function linkRows(routeKey, rows) {
  const map = routeKey === '/associados' ? nameToRoute.assoc
            : routeKey === '/catalogo'  ? nameToRoute.prod
            : routeKey === '/lojas'     ? nameToRoute.store : null;
  return rows.map(r => {
    if (!map) return r;
    const txt = textOf(r).toLowerCase();
    // longest name match wins
    let best = '', bestLen = 0;
    for (const nm of Object.keys(map)) { if (nm && txt.includes(nm) && nm.length > bestLen) { best = map[nm]; bestLen = nm.length; } }
    if (best) return r.replace(/^<tr /, `<tr data-detail-route="${best}" `);
    return r;
  });
}

const TABLES = {};
for (const [route, v] of Object.entries(tablesRaw)) {
  TABLES[route] = { header: v.header, rows: linkRows(route, v.rows) };
}
// count links
let linked = 0, total = 0;
for (const r of ['/associados','/catalogo','/lojas']) { const rr = TABLES[r].rows; total += rr.length; linked += rr.filter(x=>x.includes('data-detail-route')).length; }
console.log('row->detail linked:', linked, '/', total);

// -------- enhancer script --------
const enhancer = `
(function(){
  var PAGES = window.__DBR_PAGES__, NAV = window.__DBR_NAV__, TABLES = window.__DBR_TABLES__, LOGO = window.__DBR_LOGO__;
  var app = document.getElementById('dbr-app');
  var PAGE_SIZE = 10;
  function area(route){ return route.indexOf('/portal')===0 ? 'portal':'admin'; }
  function labelRoute(a,label){ for(var i=0;i<NAV.length;i++){ if(NAV[i].area===a && (NAV[i].label||'').toLowerCase()===label.toLowerCase()) return NAV[i].route; } return null; }
  function norm(el){ return (el.textContent||'').trim().replace(/\\s+/g,' '); }
  function go(route){ if(location.hash!=='#'+route) location.hash=route; else render(route); }

  function render(route){
    if(!PAGES[route]) route='/';
    app.innerHTML = String(PAGES[route]).split('%DBR_LOGO%').join(LOGO);
    window.scrollTo(0,0);
    wireNav(route);
    if(TABLES[route]) enhanceTable(route);
    wireDetailBack();
  }
  function wireNav(route){
    var a = area(route);
    app.querySelectorAll('.ant-menu-item, .ant-menu-submenu-title, .ant-menu-title-content, a').forEach(function(el){
      var t = norm(el); if(!t) return;
      var r = labelRoute(a,t) || labelRoute('admin',t) || labelRoute('portal',t);
      if(r){ el.style.cursor='pointer'; el.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); go(r); }, true); }
    });
    // breadcrumb "home" and back arrows to list
    app.querySelectorAll('.ant-breadcrumb a, .anticon-home').forEach(function(el){
      el.style.cursor='pointer';
      el.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); go(a==='portal'?'/portal':'/'); }, true);
    });
  }
  function wireDetailBack(){
    // back arrow button on detail pages -> browser back
    var back = app.querySelector('.anticon-arrow-left');
    if(back){ var b = back.closest('button')||back; b.style.cursor='pointer'; b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); history.back(); }, true); }
  }

  function enhanceTable(route){
    var data = TABLES[route];
    var tbody = app.querySelector('.ant-table-tbody');
    var table = app.querySelector('.ant-table');
    if(!tbody || !table) return;
    // inject full rowset
    tbody.innerHTML = data.rows.join('');
    var allRows = [].slice.call(tbody.querySelectorAll('tr.ant-table-row'));
    // header labels
    var ths = [].slice.call(app.querySelectorAll('.ant-table-thead th')).map(function(th){ return norm(th).toLowerCase(); });

    // wire row -> detail
    allRows.forEach(function(tr){
      var dr = tr.getAttribute('data-detail-route');
      if(dr){
        tr.style.cursor='pointer';
        // eye action button
        var eye = tr.querySelector('.anticon-eye');
        if(eye){ var eb = eye.closest('button,a')||eye; eb.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); go(dr); }, true); }
        tr.addEventListener('click', function(e){
          if(e.target.closest('.anticon-edit, .anticon-delete, button, a')) { if(e.target.closest('.anticon-eye')) return; }
          go(dr);
        });
      }
    });

    // ----- filter state -----
    var state = { q:'', filters:{} }; // filters: colIdx -> value
    function cellText(tr, idx){ var tds = tr.children; return tds[idx] ? (tds[idx].textContent||'').trim() : ''; }
    function rowText(tr){ return (tr.textContent||'').toLowerCase(); }
    function apply(){
      var filtered = allRows.filter(function(tr){
        if(state.q && rowText(tr).indexOf(state.q.toLowerCase())<0) return false;
        for(var k in state.filters){ var v=state.filters[k]; if(!v) continue; if(cellText(tr, +k).toLowerCase().indexOf(v.toLowerCase())<0) return false; }
        return true;
      });
      // paginate
      var pages = Math.max(1, Math.ceil(filtered.length/PAGE_SIZE));
      if(state.page===undefined) state.page=1;
      if(state.page>pages) state.page=pages;
      allRows.forEach(function(tr){ tr.style.display='none'; });
      var start=(state.page-1)*PAGE_SIZE;
      filtered.slice(start, start+PAGE_SIZE).forEach(function(tr){ tr.style.display=''; });
      renderPager(filtered.length, pages);
      renderCount(filtered.length);
    }

    // ----- search input -----
    var search = app.querySelector('.ant-input:not([type="checkbox"])');
    if(search){ search.value=''; search.addEventListener('input', function(){ state.q=this.value; state.page=1; apply(); }); }

    // ----- replace antd selects in toolbar with working native selects -----
    var toolbarSelects = [].slice.call(app.querySelectorAll('.ant-select')).filter(function(s){ return !s.closest('.ant-pagination') && !s.classList.contains('ant-pagination-options-size-changer'); });
    toolbarSelects.forEach(function(sel){
      var label = (sel.getAttribute('title') || (sel.querySelector('.ant-select-content')||{}).getAttribute && sel.querySelector('.ant-select-content').getAttribute('title')) || (sel.textContent||'').trim() || 'Todos';
      var ph = label.toLowerCase();
      var key=''; ['status','plano','categoria','nicho','tipo','rede','prioridade','plans'].forEach(function(k){ if(ph.indexOf(k)>=0) key=k; });
      var colIdx=-1; ths.forEach(function(t,i){ if(key && t.indexOf(key)>=0 && colIdx<0) colIdx=i; });
      if(colIdx<0) return; // cannot map -> leave as-is
      var vals={}; allRows.forEach(function(tr){ var c=cellText(tr,colIdx); if(c) vals[c]=1; });
      var opts = Object.keys(vals).sort();
      var ns=document.createElement('select');
      ns.className='dbr-native-select';
      ns.innerHTML='<option value="">'+label+'</option>'+opts.map(function(o){return '<option>'+o+'</option>';}).join('');
      ns.addEventListener('change', function(){ state.filters[colIdx]=this.value; state.page=1; apply(); });
      sel.parentNode.insertBefore(ns, sel);
      sel.style.display='none';
    });

    // ----- pager -----
    var pagerHost = app.querySelector('.ant-pagination') || app.querySelector('.ant-table-pagination');
    var customPager;
    function renderPager(count, pages){
      if(!pagerHost) return;
      if(!customPager){ customPager=document.createElement('div'); customPager.className='dbr-pager'; pagerHost.parentNode.insertBefore(customPager, pagerHost); pagerHost.style.display='none'; }
      var html='';
      html+='<button class="dbr-pg" data-pg="prev" '+(state.page<=1?'disabled':'')+'>‹</button>';
      for(var i=1;i<=pages;i++){ html+='<button class="dbr-pg'+(i===state.page?' active':'')+'" data-pg="'+i+'">'+i+'</button>'; }
      html+='<button class="dbr-pg" data-pg="next" '+(state.page>=pages?'disabled':'')+'>›</button>';
      customPager.innerHTML=html;
      customPager.querySelectorAll('.dbr-pg').forEach(function(b){ b.addEventListener('click', function(){ var v=this.getAttribute('data-pg'); if(v==='prev') state.page=Math.max(1,state.page-1); else if(v==='next') state.page=state.page+1; else state.page=+v; apply(); }); });
    }
    function renderCount(count){
      var host = app.querySelector('.ant-table-pagination') ? (app.querySelector('.dbr-count')||null) : null;
      var el = app.querySelector('.dbr-count');
      if(!el){ el=document.createElement('span'); el.className='dbr-count'; if(customPager) customPager.parentNode.insertBefore(el, customPager); }
      el.textContent = count + ' registro(s)';
    }
    state.page=1; apply();
  }

  window.addEventListener('hashchange', function(){ render(location.hash.slice(1)||'/'); });
  render(location.hash.slice(1)||'/');
})();
`;

const mergedCss = [...styleSet.values()].join('\n');
console.log('unique style blocks:', styleSet.size, '| css KB:', Math.round(mergedCss.length/1024), '| pages:', Object.keys(pages).length);

const extraCss = `
  html,body{margin:0;padding:0;background:#f5f5f5}
  #dbr-app{min-height:100vh}
  .dbr-native-select{height:32px;border:1px solid #d9d9d9;border-radius:6px;padding:0 10px;font-size:14px;background:#fff;color:#000;min-width:150px;margin-right:8px}
  .dbr-pager{display:flex;gap:6px;justify-content:flex-end;align-items:center;padding:12px 0;flex-wrap:wrap}
  .dbr-pg{min-width:32px;height:32px;border:1px solid #d9d9d9;border-radius:6px;background:#fff;cursor:pointer;font-size:14px;color:#000}
  .dbr-pg.active{border-color:#1677ff;color:#1677ff;font-weight:600}
  .dbr-pg:disabled{opacity:.4;cursor:not-allowed}
  .dbr-count{color:#666;font-size:13px;margin-right:12px}
  .dbr-toolbar{position:fixed;bottom:14px;right:14px;z-index:99999;background:#001529;color:#fff;border-radius:10px;padding:8px 12px;font:12px/1.3 -apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.3);opacity:.94}
  .dbr-toolbar b{color:#40a9ff}
  .dbr-toolbar select{margin-left:6px;font-size:12px;max-width:180px}
`;

const navJson = JSON.stringify(allManifest);
const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>DigitaisBR — Clone interativo (JS)</title>
<style>${mergedCss}</style><style>${extraCss}</style>`;
const navOptions = BASE_MANIFEST.map(m=>`<option value="${m.route}">${m.area==='portal'?'Portal · ':''}${m.label}</option>`).join('');
const body = `<div id="dbr-app"></div>
<div class="dbr-toolbar"><b>DigitaisBR</b> · clone interativo
  <label>· ir para <select onchange="location.hash=this.value">${navOptions}</select></label>
</div>
<script>window.__DBR_LOGO__=${JSON.stringify(logoData)};</script>
<script>window.__DBR_NAV__=${navJson};</script>
<script>window.__DBR_TABLES__=${JSON.stringify(TABLES)};</script>
<script>window.__DBR_PAGES__=${JSON.stringify(pages)};</script>
<script>${enhancer}</script>`;

const outDir = __dirname + '/dist2';
fs.mkdirSync(outDir, { recursive: true });
const full = '<!doctype html>\n<html lang="pt-BR">\n<head>\n'+head+'\n</head>\n<body>\n'+body+'\n</body>\n</html>';
fs.writeFileSync(outDir + '/index.html', full);
console.log('WROTE', outDir+'/index.html', Math.round(full.length/1024/1024*10)/10, 'MB | routes:', Object.keys(pages).length);
