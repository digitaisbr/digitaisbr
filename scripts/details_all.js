const { chromium } = require('playwright');
const fs = require('fs');
const EXEC = process.env.HOME + '/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const BASE = 'https://digitaisbr-plataforma.web.app';
const OUT = __dirname + '/capture';
const PAGES = OUT + '/pages';

const TARGETS = [];
for (let i = 1; i <= 30; i++) TARGETS.push('/associados/' + 'assoc-' + i);
for (let i = 1; i <= 25; i++) TARGETS.push('/catalogo/' + 'prod-' + i);
for (let i = 1; i <= 20; i++) TARGETS.push('/lojas/' + 'store-' + i + '/preview');
// a couple of editar form samples
TARGETS.push('/associados/assoc-1/editar', '/catalogo/prod-1/editar');

const slug = r => r.replace(/^\//,'').replace(/\//g,'_');

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
  console.log('logged in');

  const captured = [];
  for (const route of TARGETS) {
    try {
      await page.evaluate((r) => { window.history.pushState({}, '', r); window.dispatchEvent(new PopStateEvent('popstate')); }, route);
      await page.waitForTimeout(1500);
      const finalPath = page.url().replace(BASE, '').split('?')[0];
      const bodyTxt = (await page.innerText('body').catch(()=>'')).toLowerCase();
      const notFound = /não encontrad|nao encontrad|404|not found/.test(bodyTxt);
      if (finalPath !== route || notFound || bodyTxt.length < 60) {
        console.log(`skip ${route} -> ${finalPath} nf=${notFound} len=${bodyTxt.length}`);
        continue;
      }
      const s = slug(route);
      fs.writeFileSync(PAGES + '/' + s + '.html', await page.content());
      captured.push({ route, slug: s });
      if (captured.length % 15 === 0) console.log('...', captured.length, 'captured');
    } catch (e) { console.log('ERR', route, e.message.split('\n')[0]); }
  }
  fs.writeFileSync(OUT + '/details_all.json', JSON.stringify(captured, null, 2));
  await browser.close();
  console.log('DONE details:', captured.length, '/', TARGETS.length);
})();
