const { chromium } = require('playwright');
const EXEC = process.env.HOME + '/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const FILE = 'file://' + __dirname + '/dist2/index.html';
const fs = require('fs'); const OUT = __dirname + '/verify2'; fs.mkdirSync(OUT, { recursive: true });

const vis = () => document.querySelectorAll('#dbr-app .ant-table-tbody tr.ant-table-row:not([style*="display: none"])').length;

(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXEC });
  const p = await (await b.newContext({ viewport:{width:1440,height:1000}})).newPage();
  const errs=[]; p.on('console', m=>{ if(m.type()==='error') errs.push(m.text().slice(0,140)); });
  p.on('pageerror', e=>errs.push('PAGEERR '+e.message.slice(0,140)));

  // Associados: pagination
  await p.goto(FILE + '#/associados', { waitUntil:'load' }); await p.waitForTimeout(800);
  let visible = await p.evaluate(vis);
  let pagerBtns = await p.$$eval('.dbr-pager .dbr-pg', bs=>bs.map(b=>b.textContent));
  console.log('associados: visible rows page1 =', visible, '| pager =', JSON.stringify(pagerBtns));

  // go page 2
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('.dbr-pager .dbr-pg')].find(x=>x.textContent==='2'); b&&b.click(); });
  await p.waitForTimeout(400);
  let firstRowP2 = await p.evaluate(()=>{ const r=[...document.querySelectorAll('#dbr-app .ant-table-tbody tr.ant-table-row')].find(t=>t.style.display!=='none'); return r?r.textContent.replace(/\s+/g,' ').trim().slice(0,30):''; });
  console.log('associados page2 firstRow =', firstRowP2, '| visible=', await p.evaluate(vis));

  // search
  await p.fill('#dbr-app .ant-input', 'Karen'); await p.waitForTimeout(400);
  let searchRes = await p.evaluate(()=>{ return [...document.querySelectorAll('#dbr-app .ant-table-tbody tr.ant-table-row')].filter(t=>t.style.display!=='none').map(t=>t.textContent.replace(/\s+/g,' ').trim().slice(0,20)); });
  console.log('search "Karen" ->', JSON.stringify(searchRes));

  // native select filter
  let selInfo = await p.evaluate(()=>{ const s=document.querySelector('.dbr-native-select'); return s?{opts:[...s.options].map(o=>o.textContent)}:null; });
  console.log('first filter select opts =', JSON.stringify(selInfo));
  await p.fill('#dbr-app .ant-input', ''); await p.waitForTimeout(200);
  if(selInfo && selInfo.opts.length>1){
    await p.evaluate((val)=>{ const s=document.querySelector('.dbr-native-select'); s.value=val; s.dispatchEvent(new Event('change')); }, selInfo.opts[1]);
    await p.waitForTimeout(400);
    console.log('after filter "'+selInfo.opts[1]+'": visible=', await p.evaluate(vis), 'count=', await p.$eval('.dbr-count', e=>e.textContent).catch(()=>'-'));
  }

  // row -> detail navigation
  await p.goto(FILE + '#/associados', { waitUntil:'load' }); await p.waitForTimeout(600);
  await p.evaluate(()=>{ const r=[...document.querySelectorAll('#dbr-app .ant-table-tbody tr.ant-table-row')].find(t=>t.getAttribute('data-detail-route')); r&&r.click(); });
  await p.waitForTimeout(600);
  console.log('row click -> hash', p.url().split('#')[1], '| body has "Dados Cadastrais":', (await p.innerText('body')).includes('Dados Cadastrais'));
  await p.screenshot({ path: OUT+'/detail.png' });

  // catalogo pagination + vendas
  await p.goto(FILE + '#/catalogo', { waitUntil:'load' }); await p.waitForTimeout(600);
  console.log('catalogo pager =', JSON.stringify(await p.$$eval('.dbr-pager .dbr-pg', bs=>bs.map(b=>b.textContent))));
  await p.goto(FILE + '#/vendas', { waitUntil:'load' }); await p.waitForTimeout(600);
  console.log('vendas visible p1 =', await p.evaluate(vis), 'pager =', JSON.stringify(await p.$$eval('.dbr-pager .dbr-pg', bs=>bs.map(b=>b.textContent)).catch(()=>[])));

  await p.screenshot({ path: OUT+'/associados.png' });
  console.log('CONSOLE ERRORS:', errs.length, errs.slice(0,6));
  await b.close();
})();
