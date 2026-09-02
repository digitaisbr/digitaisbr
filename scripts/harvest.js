const { chromium } = require('playwright');
const fs = require('fs');
const EXEC = process.env.HOME + '/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const BASE = 'https://digitaisbr-plataforma.web.app';
const OUT = __dirname + '/capture';
const PAGES = OUT + '/pages';

// list routes to harvest full table data from
const LIST_ROUTES = [
  '/associados', '/vendas', '/comissoes', '/lojas', '/parceiros', '/catalogo',
  '/suporte', '/conteudos', '/notificacoes',
  '/portal/vendas', '/portal/cupons', '/portal/ranking', '/portal/materiais',
];
// entities whose rows link to detail pages via action buttons
const DETAIL_SOURCES = [
  { route: '/associados', max: 3 },
  { route: '/catalogo',   max: 3 },
  { route: '/lojas',      max: 2 },
  { route: '/conteudos',  max: 2 },
];

const slug = r => r === '/' ? 'root' : r.replace(/^\//,'').replace(/\//g,'_') || 'root';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXEC });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('digitaisbr_access','granted'); } catch(e){} });
  const page = await ctx.newPage();

  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.fill('input[type="text"], input[type="email"]', 'administrador@digitaisbr.com');
  await page.fill('input[type="password"]', 'Admin@2026');
  await page.click('button[type="submit"], button:has-text("Entrar")');
  await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 }).catch(()=>{});
  await page.waitForTimeout(2000);
  console.log('logged in:', page.url());

  const spaNav = async (route) => {
    await page.evaluate((r) => { window.history.pushState({}, '', r); window.dispatchEvent(new PopStateEvent('popstate')); }, route);
    await page.waitForTimeout(1800);
  };

  // ---- 1) harvest full tables across all pagination pages ----
  const tables = {};
  for (const route of LIST_ROUTES) {
    try {
      await spaNav(route);
      const info = await page.evaluate(() => {
        const t = document.querySelector('.ant-table');
        if (!t) return { hasTable: false };
        const pageItems = [...document.querySelectorAll('.ant-pagination-item')].map(e => e.getAttribute('title') || e.textContent.trim());
        return { hasTable: true, pages: pageItems };
      });
      if (!info.hasTable) { console.log('NO TABLE', route); continue; }
      const pageNums = (info.pages && info.pages.length) ? info.pages : ['1'];
      const rows = [];
      let header = '';
      for (const pn of pageNums) {
        // click pagination item with this title/number
        await page.evaluate((num) => {
          const it = [...document.querySelectorAll('.ant-pagination-item')].find(e => (e.getAttribute('title')||e.textContent.trim()) === String(num));
          if (it) { const a = it.querySelector('a') || it; a.click(); }
        }, pn);
        await page.waitForTimeout(1200);
        const chunk = await page.evaluate(() => {
          const head = document.querySelector('.ant-table-thead');
          const trs = [...document.querySelectorAll('.ant-table-tbody > tr.ant-table-row')];
          return { head: head ? head.outerHTML : '', rows: trs.map(tr => tr.outerHTML) };
        });
        if (!header) header = chunk.head;
        rows.push(...chunk.rows);
      }
      // dedupe rows
      const uniq = [...new Set(rows)];
      tables[route] = { header, rows: uniq, pages: pageNums.length };
      console.log(`TABLE ${route}: ${uniq.length} rows over ${pageNums.length} pages`);
    } catch (e) { console.log('ERR table', route, e.message.split('\n')[0]); }
  }
  fs.writeFileSync(OUT + '/tables.json', JSON.stringify(tables));

  // ---- 2) capture detail pages via row action buttons ----
  const details = [];
  for (const src of DETAIL_SOURCES) {
    try {
      await spaNav(src.route);
      // collect candidate clickable "view" targets: eye icon buttons inside rows, or clickable cards
      const count = await page.evaluate(() => {
        return document.querySelectorAll('.ant-table-tbody > tr.ant-table-row').length
            || document.querySelectorAll('[class*="card"]').length;
      });
      const n = Math.min(src.max, count || src.max);
      for (let i = 0; i < n; i++) {
        await spaNav(src.route); // reset to list each time
        const before = page.url();
        // try clicking the first action button (eye) of row i, else the row itself
        const navigated = await page.evaluate((idx) => {
          const rows = [...document.querySelectorAll('.ant-table-tbody > tr.ant-table-row')];
          if (rows[idx]) {
            const btns = rows[idx].querySelectorAll('button, a, .anticon');
            // eye is usually the first action icon
            const eye = rows[idx].querySelector('.anticon-eye')?.closest('button,a') || btns[0];
            if (eye) { eye.click(); return true; }
          }
          const cards = [...document.querySelectorAll('.ant-card')];
          if (cards[idx]) { cards[idx].click(); return true; }
          return false;
        }, i);
        await page.waitForTimeout(2000);
        const url = page.url().replace(BASE, '');
        if (url && url !== before.replace(BASE,'') && !url.startsWith(src.route.replace(/\/$/,'')+'?')) {
          const s = slug(url.split('?')[0]);
          if (!details.find(d => d.route === url)) {
            const html = await page.content();
            fs.writeFileSync(PAGES + '/' + s + '.html', html);
            await page.screenshot({ path: PAGES + '/' + s + '.png', fullPage: true }).catch(()=>{});
            const title = await page.$eval('h1,h2,h3', e=>e.innerText).catch(()=>'');
            details.push({ route: url, slug: s, from: src.route, title: title.slice(0,50) });
            console.log(`DETAIL ${url} (from ${src.route}) ${title.slice(0,30)}`);
          }
        } else {
          console.log(`no-nav ${src.route} row ${i} -> ${url}`);
        }
      }
    } catch (e) { console.log('ERR detail', src.route, e.message.split('\n')[0]); }
  }
  fs.writeFileSync(OUT + '/details.json', JSON.stringify(details, null, 2));
  await browser.close();
  console.log('HARVEST DONE. tables:', Object.keys(tables).length, 'details:', details.length);
})();
