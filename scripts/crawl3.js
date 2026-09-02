const { chromium } = require('playwright');
const fs = require('fs');
const EXEC = process.env.HOME + '/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const BASE = 'https://digitaisbr-plataforma.web.app';
const OUT = __dirname + '/capture';
const PAGES = OUT + '/pages';

const ROUTES = [
  '/', '/associados', '/associados/novo', '/planos', '/catalogo', '/catalogo/novo',
  '/lojas', '/vendas', '/comissoes', '/financeiro', '/parceiros', '/conteudos',
  '/comunidade', '/notificacoes', '/servicos', '/suporte', '/comunicacoes', '/relatorios',
  '/portal', '/portal/loja', '/portal/vendas', '/portal/beneficios', '/portal/plano',
  '/portal/conteudos', '/portal/comunidade', '/portal/notificacoes', '/portal/suporte',
  '/portal/links', '/portal/materiais', '/portal/financeiro', '/portal/perfil',
  '/portal/cupons', '/portal/performance', '/portal/redes-sociais', '/portal/ranking', '/portal/servicos',
];
const slug = r => r === '/' ? 'root' : r.replace(/^\//,'').replace(/\//g,'_') || 'root';

(async () => {
  fs.mkdirSync(PAGES, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: EXEC });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('digitaisbr_access','granted'); } catch(e){} });
  const page = await ctx.newPage();

  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.fill('input[type="text"], input[type="email"]', 'administrador@digitaisbr.com');
  await page.fill('input[type="password"]', 'Admin@2026');
  await page.click('button[type="submit"], button:has-text("Entrar")');
  // wait until we leave /login
  await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 }).catch(()=>{});
  await page.waitForTimeout(2500);
  console.log('post-login url:', page.url());

  const spaNav = async (route) => {
    await page.evaluate((r) => {
      window.history.pushState({}, '', r);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, route);
  };

  const summary = [];
  for (const r of ROUTES) {
    const s = slug(r);
    try {
      await spaNav(r);
      await page.waitForTimeout(2200);
      const finalUrl = page.url().replace(BASE,'');
      const html = await page.content();
      fs.writeFileSync(PAGES + '/' + s + '.html', html);
      await page.screenshot({ path: PAGES + '/' + s + '.png', fullPage: true }).catch(()=>{});
      const title = await page.$eval('h1,h2,h3,.ant-page-header-heading-title', e=>e.innerText).catch(()=>'');
      const txtlen = (await page.innerText('body').catch(()=>'')).length;
      const redirected = !finalUrl.startsWith(r) && r !== '/';
      summary.push({ r, finalUrl, title: title.slice(0,60), bytes: html.length, txtlen, redirected });
      console.log(`${redirected?'RDR':'OK '} ${r} -> ${finalUrl} | ${title.slice(0,45)} | ${txtlen}c`);
    } catch (e) {
      summary.push({ r, error: e.message.split('\n')[0] });
      console.log(`ERR ${r}: ${e.message.split('\n')[0]}`);
    }
  }
  fs.writeFileSync(OUT + '/summary.json', JSON.stringify(summary, null, 2));
  await browser.close();
  console.log('DONE', summary.length);
})();
