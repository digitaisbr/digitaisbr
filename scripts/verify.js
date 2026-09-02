const { chromium } = require('playwright');
const EXEC = process.env.HOME + '/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const FILE = 'file://' + __dirname + '/dist/index.html';
const OUT = __dirname + '/verify';
const fs = require('fs'); fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXEC });
  const p = await (await b.newContext({ viewport:{width:1440,height:1000}})).newPage();
  const errs=[]; p.on('console', m=>{ if(m.type()==='error') errs.push(m.text().slice(0,120)); });
  const routes = ['/', '/associados', '/comissoes', '/comunidade', '/portal', '/portal/loja', '/portal/ranking'];
  for (const r of routes) {
    await p.goto(FILE + '#' + r, { waitUntil:'load' });
    await p.waitForTimeout(700);
    const name = r==='/'?'root':r.replace(/\//g,'_').replace(/^_/,'');
    await p.screenshot({ path: OUT + '/' + name + '.png', fullPage:false });
    const txt=(await p.innerText('body')).replace(/\s+/g,' ').slice(0,90);
    const hasLogo = await p.$eval('img', i=>i.src.startsWith('data:')).catch(()=>false);
    console.log(r, '| logo:', hasLogo, '|', txt);
  }
  // test clicking a sidebar item
  await p.goto(FILE + '#/', { waitUntil:'load' }); await p.waitForTimeout(600);
  const clicked = await p.evaluate(()=>{
    const els=[...document.querySelectorAll('.ant-menu-title-content, .ant-menu-item')];
    const t=els.find(e=>/Comunidade/i.test(e.textContent));
    if(t){ t.click(); return true; } return false;
  });
  await p.waitForTimeout(700);
  console.log('sidebar click Comunidade ->', p.url().split('#')[1], '| clicked:', clicked);
  console.log('CONSOLE ERRORS:', errs.length, errs.slice(0,5));
  await b.close();
})();
