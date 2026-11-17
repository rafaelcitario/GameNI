/* Teste de fumaça/QA do jogo (ferramenta de desenvolvimento, NÃO roda no workflow): servidor estático embutido
   + Playwright (Chromium headless) com tempo simulado e um "robô" que joga as fases.
   Requer:  npm i playwright && npx playwright install chromium      (na pasta tools/ ou na raiz)
   Capturas de tela vão para tools/out/ (ou NI_SHOTS=/outra/pasta).
   uso:
     node smoke.js boot
     node smoke.js run <id...> [--acc=1] [--god] [--delay=2] [--speed=130] [--react=0.3] [--cards=N] [--boss] [--shots=6,20]
     node smoke.js batch <id...> --n=10 [mesmos parâmetros do bot]     -> taxa de vitória / escudo médio
     node smoke.js all [--acc=1] */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', 'game'), OUT = process.env.NI_SHOTS || path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; res.end('nf'); return; }
  res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); res.end(fs.readFileSync(f));
});
const args = process.argv.slice(2), mode = args[0];
const opt = k => { const a = args.find(x => x.startsWith('--' + k)); return a ? (a.includes('=') ? a.split('=')[1] : true) : null; };
const num = (k, d) => opt(k) !== null ? +opt(k) : d;
const ids = args.slice(1).filter(x => !x.startsWith('--'));

(async () => {
  await new Promise(r => server.listen(0, r)); const port = server.address().port;
  const browser = await chromium.launch(); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message + '\n' + String(e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!/404/.test(t)) errors.push('CONSOLE ' + t); } });
  page.on('requestfailed', r => { if (!/sprites\//.test(r.url())) errors.push('REQFAIL ' + r.url()); });
  page.on('response', r => { if (r.status() >= 400 && !/assets\/sprites\//.test(r.url())) errors.push('HTTP' + r.status() + ' ' + r.url().replace(/.*:\d+/, '')); });
  await page.goto('http://localhost:' + port + '/');
  await page.waitForFunction(() => window.NI && NI.engine && NI.engine.scene);
  await page.evaluate(() => { NI.engine.manual = true; });
  const step = (sec) => page.evaluate(s => { for (let i = 0; i < Math.round(s * 30); i++) NI.engine.step(1 / 30); }, sec);
  const shot = async (name) => { await page.screenshot({ path: path.join(OUT, name + '.png') }); };
  const tap = async (lx, ly) => {
    const b = await page.evaluate(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    await page.mouse.click(b.x + lx / 180 * b.w, b.y + ly / 320 * b.h);
  };
  const P = { acc: num('acc', 1), delay: num('delay', 0), speed: num('speed', 0), react: num('react', 0), god: !!opt('god') };

  async function playOne(id, o) {
    await page.evaluate(({ id, P }) => { const D = NI.debug; D.bot = true; D.botAcc = P.acc; D.botDelay = P.delay; D.botSpeed = P.speed; D.botReact = P.react; D.god = P.god; NI.save.reset(); NI.save.setUnlockAll(true); NI.engine.go('play', { id }, true); }, { id, P });
    let simT = 0, done = false, nCards = 0, lastShot = -99, bossShots = 0; const stages = (opt('stage') || '').split(',').filter(Boolean), stageDone = {}; const maxCards = num('cards', 0), shots = (opt('shots') || '').split(',').filter(Boolean).map(Number);
    while (simT < 900 && !done) {
      const chunk = o.fast ? 3 : 0.5; await step(chunk); simT += chunk;
      if (shots.length && simT >= shots[0]) await shot('p' + id + '-t' + shots.shift());
      if (stages.length) { const sg = await page.evaluate(() => { const e = NI.play.engine; return e.stage || (e.state === 'round' ? e.mode : '') || ''; }); const i = stages.findIndex(x => x.split('@')[0] === sg); if (i >= 0 && !stageDone[stages[i]]) { stageDone[stages[i]] = 1; await shot('p' + id + '-stage-' + sg + '-w' + await page.evaluate(() => NI.play.engine.wi)); } }
      if (!o.fast && (maxCards || opt('boss'))) {
        const st = await page.evaluate(() => { const e = NI.play.engine, c = e.current ? e.current() : null; return { card: c ? c.t : -1, type: c ? c.type : '', boss: e.boss ? { hp: e.boss.hp, max: e.boss.max, y: e.boss.y, dead: e.boss.dead } : null, hint: e.wave && e.wave.hint, wi: e.wi }; });
        if (maxCards && nCards < maxCards && st.card > 1.2 && simT - lastShot > 5) { await shot('p' + id + '-card' + (++nCards) + '-' + st.type + (st.hint ? '-hint' : '') + '-w' + st.wi); lastShot = simT; }
        if (opt('boss') && st.boss && !st.boss.dead && st.boss.y > 40 && bossShots < 3 && st.card > 1.0 && simT - lastShot > 8) { await shot('p' + id + '-boss' + (++bossShots)); lastShot = simT; }
      }
      done = await page.evaluate(() => !!NI.play.shown);
    }
    return page.evaluate(() => { const c = NI.play.ctx, e = NI.play.engine; return { win: c.win, shown: !!NI.play.shown, shield: c.shield, score: Math.round(c.score), acc: +c.accuracy().toFixed(2), maxCombo: c.maxCombo, time: +c.time.toFixed(0), stats: c.stats, hits: c.hits, stars: c.stars(), wi: e.wi, skill: +c.skill.toFixed(2) }; });
  }

  if (mode === 'boot') {
    await step(1.5); await shot('title-tap');
    await tap(90, 160); await step(1.0); await shot('title-menu');
    await page.evaluate(() => NI.engine.go('map', { focus: '1-1' }, true)); await step(1.0); await shot('map-1');
    await page.evaluate(() => { NI.save.setUnlockAll(true); NI.engine.go('map', { focus: '3-1' }, true); }); await step(1.0); await shot('map-3');
    await page.evaluate(() => NI.dom.briefing(NI.phaseById('1-1'), () => { }, () => { })); await step(0.3); await shot('briefing');
    await page.evaluate(() => NI.dom.codex(() => { })); await step(0.3); await shot('codex');
    await page.evaluate(() => NI.dom.settings(() => { })); await step(0.3); await shot('settings');
  } else if (mode === 'batch') {
    const n = num('n', 8);
    for (const id of ids) {
      let wins = 0, sh = 0, acc = 0, t = 0, losses = [], hits = {}; const T0 = Date.now();
      for (let k = 0; k < n; k++) { const r = await playOne(id, { fast: true }); Object.keys(r.hits).forEach(k => hits[k] = (hits[k] || 0) + r.hits[k]); if (r.win) { wins++; sh += r.shield; } else losses.push(r.wi); acc += r.acc; t += r.time; }
      console.log(id.padEnd(4), 'vitórias ' + wins + '/' + n, ' escudo médio (vitórias) ' + (wins ? (sh / wins).toFixed(1) : '-'), ' precisão média ' + (acc / n).toFixed(2), ' tempo médio ' + (t / n).toFixed(0) + 's', ' danos/partida ' + JSON.stringify(Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, +(v / n).toFixed(1)]))), losses.length ? ' derrotas na onda ' + losses.join(',') : '', ' [' + ((Date.now() - T0) / 1000).toFixed(0) + 's]');
    }
  } else {
    const list = mode === 'all' ? await page.evaluate(() => NI.PHASES.map(p => p.id)) : ids;
    for (const id of list) {
      const r = await playOne(id, { fast: false });
      console.log(id.padEnd(4), JSON.stringify(r));
      await shot('p' + id + (r.shown ? '-result' : '-stuck'));
    }
  }
  console.log(errors.length ? 'ERRORS (' + errors.length + '):\n' + [...new Set(errors)].join('\n') : 'NO ERRORS');
  await browser.close(); server.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
