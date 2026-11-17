/* Motor "Terminal": pacotes de dados caem; a ARMA que você escolhe (= resposta) destrói o pacote mais baixo antes que cruze o firewall.
   Camada de ação: arraste a nave para desviar do ruído e pegar bônus; chefes com padrões de tiro, fúria e cura quando você deixa vazar. */
(function () {
  'use strict';
  const NI = window.NI, W = NI.W, H = NI.H, PAL = NI.PAL, F = NI.font, UI = NI.ui, A = NI.audio, fx = NI.fx, U = NI.U;
  const FIRE_Y = 226, SHIP_Y = 244, BTN_Y = 268, BTN_H = 44, TOP = 44, BOSS_TOP = 88, BOSS_Y = 46, CW = 158;
  const BCOL = [PAL.C, PAL.Y, PAL.G, PAL.M];
  const GOOD = { 'VERDADE': 1, 'SIM': 1, 'OK': 1 };
  const FAM = [['GC', 'A'], ['GG', 'G'], ['GU', 'V'], ['CC', 'P'], ['AC', 'T'], ['UC', 'S'], ['CU', 'L'], ['CG', 'R']];
  NI.tcfg = NI.tcfg || {};

  /* constrói as "linhas" de um cartão (altura + função de desenho) a partir do alvo gerado */
  function buildCard(t, hintOn) {
    const inner = CW - 10, rows = [];
    const text = (lines, sc, col) => {
      const lh = sc === 2 ? 15 : 9;
      rows.push({ h: (lines.length - 1) * lh + 7 * sc, d(g, cx, y) { lines.forEach((l, i) => F.draw(g, l, cx, y + i * lh, col, sc, 'c', sc === 2 ? PAL.K : null)); } });
    };
    if (t.type === 'icon' && !t.q) t.q = 'QUE TIPO DE SIGNO?';
    if (t.q) text(F.wrap(t.q, inner), 1, PAL.Y);
    if (t.type === 'bars') {
      rows.push({
        h: 30, d(g, cx, y) {
          t.bars.forEach((arr, k) => {
            const n = arr.length, bw = 9, gp = 3, gw = n * bw + (n - 1) * gp, gx = cx - 74 + 8 + k * 76, col = k ? PAL.M : PAL.C;
            F.draw(g, k ? 'B' : 'A', gx - 6, y + 12, col, 1, 'c');
            arr.forEach((p, i) => { const h = Math.max(1, Math.round(p * 26)); g.fillStyle = col; g.fillRect(gx + 4 + i * (bw + gp), y + 29 - h, bw, h); });
            g.fillStyle = '#4a4a78'; g.fillRect(gx + 2, y + 29, gw + 4, 1);
          });
        }
      });
    } else if (t.type === 'icon') {
      const cap = F.wrap(t.text, t.icon ? 108 : inner), ch = (cap.length - 1) * 9 + 7;
      if (t.icon) rows.push({ h: Math.max(24, ch), d(g, cx, y) { const hh = Math.max(24, ch); NI.spr.draw(g, t.icon, cx - 56, y + hh / 2, { scale: 2 }); cap.forEach((l, i) => F.draw(g, l, cx - 34, y + (hh - ch) / 2 + i * 9, PAL.W, 1)); } });
      else { rows.push({ h: 14, d(g, cx, y) { F.draw(g, t.big, cx, y, PAL.C, 2, 'c', PAL.K); } }); text(cap, 1, PAL.W); }
    } else if (t.type === 'dna') {
      const s = t.seq;
      if (s.length === 1) rows.push({ h: 22, d(g, cx, y) { NI.spr.base(g, s, cx, y + 11, 20); } });
      else rows.push({
        h: 16, d(g, cx, y) {
          const parts = s.split('>'), sz = 14, gap = 4, arrow = 18, gw = n => n * sz + (n - 1) * gap;
          const tot = parts.reduce((a, p) => a + gw(p.length), 0) + (parts.length - 1) * arrow; let px = cx - tot / 2;
          parts.forEach((p, k) => {
            [...p].forEach(c => { NI.spr.base(g, c, px + sz / 2, y + 8, sz); px += sz + gap; }); px -= gap;
            if (k < parts.length - 1) { F.draw(g, '→', px + arrow / 2, y + 5, PAL.Y, 1, 'c'); px += arrow; }
          });
        }
      });
      if (t.legend) {
        const ent = FAM.map(f => f[0] + '_=' + NI.logic.AA[f[1]][0]);
        text([ent.slice(0, 3).join('  '), ent.slice(3, 6).join('  '), ent.slice(6).join('  ')], 1, PAL.S);
      }
    } else {
      const sc = t.big ? 2 : 1; text(t.lines || F.wrap(t.text, inner, sc), sc, PAL.W);
    }
    if (hintOn) text(F.wrap('DICA: ' + t.hint, inner), 1, PAL.G);
    t.rows = rows; t.w = CW; t.h = 8 + rows.reduce((a, r) => a + r.h, 0) + (rows.length - 1) * 3;
    if (!t.colors) t.colors = GOOD[t.opts[0]] ? [PAL.G, PAL.R] : (t.opts.length === 2 && t.opts[0] === 'SEM PERDA' ? [PAL.C, PAL.O] : BCOL);
  }

  class Terminal {
    constructor(ctx, phase) {
      this.ctx = ctx; this.phase = phase; this.cfg = NI.tcfg[phase.cfg];
      if (!this.cfg) throw new Error('config terminal ausente: ' + phase.cfg);
      this.R = U.R; this.waves = this.cfg.waves; this.wi = -1; this.wave = null; this.boss = null;
      this.targets = []; this.bullets = []; this.pickups = []; this.beams = []; this.bolts = []; this.pending = null; this.uid = 0;
      this.ship = { x: W / 2, tx: W / 2, y: SHIP_Y }; this.state = 'wait'; this.st = 0; this.t = 0;
      this.spawnLeft = 0; this.spawnT = 0; this.hazT = 2; this.slowT = 0; this.cool = 0; this.resolved = 0;
      this.btnT = [0, 0, 0, 0]; this.drag = null; this.botT = 1; this.lastOpts = ['', '', '']; this.lastColors = BCOL; this.cur = null;
      ctx.strikes = 0;
    }
    get bgSpeed() { return this.slowT > 0 ? 0.4 : 1; }
    get bossLate() { return this.waves.some(w => !w.boss); } // aquecimento com a música do mundo; música de chefe só na luta

    /* ---------- ondas ---------- */
    nextWave() {
      const ctx = this.ctx; this.wi++; this.resolved = 0;
      if (this.wi >= this.waves.length) { this.state = 'done'; ctx.finish(true); return; }
      const w = this.wave = this.waves[this.wi];
      this.state = 'intro'; this.st = 0; this.spawnLeft = w.boss ? Infinity : w.n; this.spawnT = 0.4; this.hazT = 2.5; this.pending = null;
      ctx.showBanner(w.boss ? 'CHEFE!' : (w.title || 'ONDA ' + (this.wi + 1)), w.boss ? w.boss.name : w.sub, w.boss ? PAL.R : NI.WORLDS[ctx.world].color, 1.7);
      if (w.boss) {
        A.sfx('warn'); fx.flash(PAL.R, 0.3); A.music('boss');
        this.boss = { name: w.boss.name, sprite: w.boss.sprite, hp: w.boss.hp, max: w.boss.hp, x: W / 2, y: -30, flash: 0, atkT: 3.4, charge: 0, rage: 0, cnt: 0, dead: false, deadT: 0 };
      }
    }
    makeTarget() {
      const w = this.wave, t = this.cfg.gen(w.tier, this.R, w);
      buildCard(t, !!w.hint);
      t.id = ++this.uid; t.t = 0; t.dying = 0; t.shake = 0; t.wrongT = 0; t.alive = true; t.x = W / 2;
      t.gold = !w.boss && !w.hint && this.wi >= 1 && this.R() < 0.1;
      t.y = (w.boss ? BOSS_TOP : TOP) + t.h / 2;
      return t;
    }
    spaceFor(t) { // evita sobrepor o cartão que acabou de nascer
      let top = Infinity; for (const o of this.targets) if (o.alive) top = Math.min(top, o.y - o.h / 2);
      return top > (this.wave.boss ? BOSS_TOP : TOP) + t.h + 5;
    }
    current() { let b = null; for (const t of this.targets) if (t.alive && (!b || t.y > b.y)) b = t; return b; }
    progressNow() {
      let tot = 0, done = 0;
      this.waves.forEach((w, i) => { const n = w.boss ? w.boss.hp : w.n; tot += n; if (i < this.wi) done += n; else if (i === this.wi) done += w.boss ? (this.boss ? this.boss.max - this.boss.hp : 0) : this.resolved; });
      return tot ? Math.min(1, done / tot) : 0;
    }

    /* ---------- laço ---------- */
    update(dt, ended) {
      const ctx = this.ctx; this.t += dt;
      this.ship.x += (this.ship.tx - this.ship.x) * Math.min(1, 16 * dt);
      for (let i = 0; i < 4; i++) if (this.btnT[i] > 0) this.btnT[i] -= dt;
      if (this.cool > 0) this.cool -= dt;
      for (const b of this.beams) b.t += dt; this.beams = this.beams.filter(b => b.t < 0.16);
      for (const t of this.targets) { if (t.shake > 0) t.shake -= dt; if (t.wrongT > 0) t.wrongT -= dt; if (t.dying > 0) t.dying -= dt; }
      this.targets = this.targets.filter(t => t.alive || t.dying > 0);
      if (this.boss) {
        const b = this.boss; if (b.flash > 0) b.flash -= dt;
        if (b.dead) { const p = b.deadT; b.deadT += dt; if (((b.deadT * 14) | 0) !== ((p * 14) | 0)) { fx.burst(b.x + (U.R() - 0.5) * 50, b.y + (U.R() - 0.5) * 30, 10, [PAL.Y, PAL.O, PAL.R, PAL.W], { speed: 90 }); A.sfx('boom', { x: b.x }); } }
        else if (b.y < BOSS_Y) b.y = Math.min(BOSS_Y, b.y + 60 * dt);
      }
      if (ended) return;
      const sl = this.slowT > 0 ? 0.4 : 1; if (this.slowT > 0) this.slowT -= dt;
      this.st += dt;
      if (this.state === 'wait') this.nextWave();
      else if (this.state === 'intro') { if (this.st > 1.6) { this.state = 'wave'; this.st = 0; } }
      else if (this.state === 'wave') this.updateWave(dt);
      else if (this.state === 'clear') { if (this.st > 1.7) this.nextWave(); }
      for (const t of this.targets) {
        if (!t.alive) continue;
        t.t += dt; t.y += this.wave.speed * ctx.skill * sl * dt;
        if (t.y + t.h / 2 >= FIRE_Y) this.leakTarget(t);
      }
      for (const b of this.bullets) {
        b.x += b.vx * sl * dt; b.y += b.vy * sl * dt;
        if (Math.abs(b.x - this.ship.x) < 5 && Math.abs(b.y - this.ship.y) < 6) { b.dead = true; ctx.hurt(1, this.ship.x, this.ship.y, 'tiro'); }
        if (b.y > H + 4 || b.x < -6 || b.x > W + 6) b.dead = true;
      }
      this.bullets = this.bullets.filter(b => !b.dead);
      for (const p of this.pickups) {
        p.y += 28 * dt; p.t += dt;
        if (Math.abs(p.x - this.ship.x) < 11 && Math.abs(p.y - this.ship.y) < 12) { p.dead = true; this.collect(p); }
        if (p.y > H) p.dead = true;
      }
      this.pickups = this.pickups.filter(p => !p.dead);
      for (const b of this.bolts) { b.t += dt; if (b.t >= 0.3) { b.done = true; if (this.boss && !this.boss.dead) this.bossHit(); } }
      this.bolts = this.bolts.filter(b => !b.done);
      this.cur = this.current(); if (this.cur) { this.lastOpts = this.cur.opts; this.lastColors = this.cur.colors; }
      ctx.progress = ctx.ended ? 1 : this.progressNow();
      if (NI.debug.bot) this.bot(dt);
    }
    updateWave(dt) {
      const w = this.wave, ctx = this.ctx;
      if (this.spawnLeft > 0 && !(this.boss && this.boss.y < BOSS_Y - 1)) {
        this.spawnT -= dt;
        if (this.spawnT <= 0) {
          this.pending = this.pending || this.makeTarget();
          if (this.spaceFor(this.pending)) { this.targets.push(this.pending); this.pending = null; this.spawnLeft--; this.spawnT = (w.gap / ctx.skill) * (0.85 + this.R() * 0.3); }
        }
      }
      if (w.hazard > 0) this.hazard(dt, w.hazard + (this.boss ? this.boss.rage * 0.5 : 0));
      if (this.boss && !this.boss.dead && this.boss.y >= BOSS_Y - 1 && w.hazard > 0) this.bossAttack(dt);
      if (!w.boss && this.spawnLeft <= 0 && !this.pending && !this.targets.some(t => t.alive)) {
        if (this.wi >= this.waves.length - 1) { this.state = 'done'; ctx.progress = 1; ctx.finish(true); }
        else { this.state = 'clear'; this.st = 0; this.bullets = []; ctx.showBanner('ONDA COMPLETA!', '', PAL.G, 1.6); A.sfx('star', { i: 2 }); if (w.recap) ctx.tip('RESUMO: ' + w.recap, PAL.G, 3.6); }
      }
    }
    hazard(dt, lvl) {
      this.hazT -= dt; if (this.hazT > 0) return;
      const R = this.R, itv = [0, 2.1, 1.4, 0.9, 0.65][Math.min(4, Math.round(lvl))] / this.hz(); this.hazT = itv * (0.8 + R() * 0.4);
      const kind = lvl >= 3 ? R.int(0, 2) : lvl >= 2 ? R.int(0, 1) : 0, y = 24;
      if (kind === 0) this.bullet(R.range(10, W - 10), y, R.range(-6, 6), R.range(45, 65));
      else if (kind === 1) { const x = R.range(10, W - 10), dx = this.ship.x - x, dy = this.ship.y - y, d = Math.hypot(dx, dy); this.bullet(x, y, dx / d * 60, dy / d * 60); }
      else this.wall(y, 42);
    }
    hz() { return 1 + (this.ctx.skill - 1) * 0.4; } // a adaptação de dificuldade pesa menos nos tiros do que nos cartões
    wall(y, vy) { const gap = this.R.int(1, 5); for (let i = 0; i < 7; i++) if (i !== gap && i !== gap + 1) this.bullet(12 + i * 26, y, 0, vy); }
    bullet(x, y, vx, vy) { this.bullets.push({ x, y, vx, vy, ch: this.R() < 0.5 ? '0' : '1' }); }
    bossAttack(dt) {
      const b = this.boss; b.atkT -= dt; b.charge = b.atkT < 0.55 ? 1 : 0;
      if (b.atkT > 0) return;
      const pat = b.cnt++ % 3, bx = b.x, by = b.y + 20; A.sfx('laser', { x: bx });
      if (pat === 0) { for (let i = -2; i <= 2; i++) { const a = Math.PI / 2 + i * 0.32; this.bullet(bx, by, Math.cos(a) * 58, Math.sin(a) * 58); } }
      else if (pat === 1) { for (let k = 0; k < 3; k++) { const dx = this.ship.x - bx + (k - 1) * 18, dy = this.ship.y - by, d = Math.hypot(dx, dy); this.bullet(bx, by, dx / d * 64, dy / d * 64); } }
      else this.wall(by, 38);
      b.atkT = Math.max(1.9, 3.1 - b.rage * 0.55) / this.hz();
    }

    /* ---------- respostas ---------- */
    answer(i) {
      const ctx = this.ctx, t = this.current(); if (ctx.ended || !t || i >= t.opts.length || this.cool > 0) return;
      this.btnT[i] = 0.12; A.sfx('laser', { x: this.ship.x });
      if (i === t.answer) this.kill(t); else this.miss(t);
    }
    kill(t) {
      const ctx = this.ctx; t.alive = false; t.dying = 0.22; this.resolved++; this.cool = 0.09;
      this.beams.push({ x1: this.ship.x, y1: this.ship.y - 8, x2: t.x, y2: t.y, t: 0 });
      fx.burst(t.x, t.y, 26, [PAL.C, PAL.W, PAL.Y, PAL.G], { speed: 80 }); A.sfx('boom', { x: t.x }); fx.shake(1.4, 0.12);
      ctx.right(t.concept, t.x, t.y - t.h / 2); ctx.strikes = Math.max(0, ctx.strikes - 1);
      if (!this.wave.hint && this.R() < 0.2 && ctx.tipT <= 0) ctx.tip('LEMBRE: ' + t.hint, PAL.G, 2.6);
      if (t.gold) this.pickups.push({ x: t.x, y: t.y, t: 0, kind: this.R.pick(ctx.shield < ctx.shieldMax ? ['heal', 'slow', 'bomb', 'heal'] : ['slow', 'bomb']) });
      if (this.boss && !this.boss.dead) this.bolts.push({ x: t.x, y: t.y, t: 0 });
    }
    miss(t) {
      const ctx = this.ctx; t.shake = 0.3; t.wrongT = 0.35; ctx.strikes++;
      ctx.wrong(t.concept, t.hint, t.x, t.y - t.h / 2);
      if (!this.wave.hint && ctx.strikes >= 2) { ctx.strikes = 0; ctx.hurt(1, this.ship.x, this.ship.y, 'erros'); } // 2 erros seguidos custam escudo
    }
    leakTarget(t) {
      t.alive = false; t.dying = 0; this.resolved++;
      fx.burst(t.x, FIRE_Y, 18, [PAL.R, PAL.O], { speed: 70 }); A.sfx('boom', { x: t.x });
      this.ctx.leak(t.concept, t.hint, t.x, FIRE_Y - 4);
      const b = this.boss; if (b && !b.dead && b.hp < b.max) { b.hp++; fx.text(b.x, b.y + 22, 'CHEFE SE CURA!', PAL.R); }
    }
    bossHit() {
      const b = this.boss, ctx = this.ctx; b.hp--; b.flash = 0.16;
      fx.burst(b.x, b.y, 14, [PAL.Y, PAL.W, PAL.O], { speed: 70 }); A.sfx('boom', { x: b.x }); fx.shake(2, 0.15);
      const f = b.hp / b.max;
      if (f < 0.66 && b.rage < 1) { b.rage = 1; ctx.showBanner('O CHEFE SE ENFURECE!', 'ataques mais rápidos', PAL.R, 1.4); A.sfx('warn'); fx.flash(PAL.R, 0.25); }
      else if (f < 0.33 && b.rage < 2) { b.rage = 2; ctx.showBanner('ÚLTIMA FASE!', 'termine com ele!', PAL.R, 1.4); A.sfx('warn'); fx.flash(PAL.R, 0.25); }
      if (b.hp <= 0) {
        b.dead = true; b.hp = 0; this.bullets = []; this.state = 'done'; this.targets.forEach(t => { if (t.alive) { t.alive = false; t.dying = 0.25; } });
        fx.shake(6, 0.8); fx.freeze(0.18); ctx.progress = 1; ctx.finish(true);
      }
    }
    collect(p) {
      const ctx = this.ctx; fx.burst(p.x, p.y, 14, [PAL.G, PAL.W], { speed: 60 }); A.sfx('pickup'); ctx.addScore(150, p.x, p.y);
      if (p.kind === 'heal') ctx.heal(1);
      else if (p.kind === 'slow') { this.slowT = 5; A.sfx('slow'); fx.text(W / 2, 90, 'CÂMERA LENTA!', PAL.C); }
      else { this.bullets = []; fx.flash(PAL.Y, 0.2); fx.shake(3, 0.3); A.sfx('boom'); fx.text(W / 2, 90, 'LIMPEZA!', PAL.Y); }
    }

    /* ---------- bot (testes automáticos): responde e desvia ---------- */
    bot(dt) { this.botDodge(dt); this.botAnswer(dt); }
    botDodge(dt) {
      // NI.debug.botSpeed: velocidade máx. do dedo (px/s); botReact: de quanto em quanto tempo ele "reavalia" (tempo de reação humano)
      const s = this.ship, D = NI.debug; this.reactT = (this.reactT || 0) - dt;
      if (this.reactT <= 0) {
        this.reactT = D.botReact || 0; let best = s.tx, bs = Infinity;
        for (let cx = 9; cx <= W - 9; cx += 3) {
          let d = Math.abs(cx - s.tx) * 0.02;
          for (const b of this.bullets) {
            const dy = s.y - b.y; if (dy < -8) continue; const tt = Math.max(0, dy / Math.max(1, b.vy)); if (tt > 1.6) continue;
            const ex = Math.abs(b.x + b.vx * tt - cx); if (ex < 13) d += (13 - ex) * (1.7 - tt);
          }
          if (d < bs) { bs = d; best = cx; }
        }
        this.botGoal = best;
      }
      const vmax = (D.botSpeed || 1e9) * dt, dx = (this.botGoal === undefined ? s.tx : this.botGoal) - s.tx; s.tx += Math.max(-vmax, Math.min(vmax, dx));
    }
    botAnswer(dt) {
      const t = this.current(); this.botT -= dt; if (!t || this.botT > 0 || this.ctx.ended || t.t < (NI.debug.botDelay || 0)) return;
      this.botT = 0.3 + this.R() * 0.2;
      const acc = NI.debug.botAcc === undefined ? 1 : NI.debug.botAcc; let i = t.answer; if (this.R() > acc) i = (t.answer + 1) % t.opts.length;
      this.answer(i);
    }
    intensity() {
      const near = this.targets.some(t => t.alive && t.y > FIRE_Y - 50) ? 0.1 : 0;
      return 0.3 + 0.2 * (Math.max(0, this.wi) / Math.max(1, this.waves.length)) + Math.min(0.3, this.ctx.combo * 0.025) + near;
    }

    /* ---------- entrada ---------- */
    layout(n) { const bw = (172 - (n - 1) * 3) / n, r = []; for (let i = 0; i < n; i++) r.push({ x: 4 + i * (bw + 3), y: BTN_Y, w: bw, h: BTN_H }); return r; }
    onDown(p) {
      if (p.y >= BTN_Y - 4) { // toda a faixa inferior é botão: sem "pontos mortos" entre eles
        const n = (this.current() || { opts: this.lastOpts }).opts.length;
        this.answer(U.clamp(Math.floor((p.x - 2) / (176 / n)), 0, n - 1)); return;
      }
      this.drag = p.id;
    }
    onMove(p) { if (this.drag === p.id && p.dx) this.ship.tx = U.clamp(this.ship.tx + p.dx * 1.25, 9, W - 9); }
    onUp(p) { if (this.drag === p.id) this.drag = null; }
    onKey(k) {
      if (k >= '1' && k <= '4') this.answer(+k - 1);
      else if (k === 'ArrowLeft') this.ship.tx = Math.max(9, this.ship.tx - 24); else if (k === 'ArrowRight') this.ship.tx = Math.min(W - 9, this.ship.tx + 24);
    }

    /* ---------- desenho ---------- */
    draw(g) {
      const ctx = this.ctx, cur = this.current();
      if (this.boss) this.drawBoss(g);
      const danger = this.targets.some(t => t.alive && t.y + t.h / 2 > FIRE_Y - 30);
      g.fillStyle = danger && ((this.t * 8) | 0) % 2 ? PAL.R : '#7a1f35';
      for (let x = 0; x < W; x += 6) g.fillRect(x, FIRE_Y, 4, 1);
      g.fillStyle = 'rgba(255,77,109,.12)'; g.fillRect(0, FIRE_Y + 1, W, 4);
      for (const p of this.pickups) NI.spr.draw(g, 'pk_' + p.kind, p.x, p.y + Math.sin(p.t * 6) * 1.5);
      for (const t of this.targets) this.drawCard(g, t, t === cur);
      for (const b of this.bolts) { const k = U.ease.inQuad(Math.min(1, b.t / 0.3)), bx = b.x + (this.boss.x - b.x) * k, by = b.y + (this.boss.y - b.y) * k; g.fillStyle = PAL.Y; g.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 4, 4); g.fillStyle = PAL.W; g.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 2, 2); }
      g.globalAlpha = 0.78; for (const b of this.bullets) F.draw(g, b.ch, b.x, b.y - 3, ((this.t * 10) | 0) % 2 ? PAL.R : PAL.O, 1, 'c'); g.globalAlpha = 1;
      for (const b of this.beams) { g.globalAlpha = 1 - b.t / 0.16; g.strokeStyle = PAL.C; g.lineWidth = 3; g.beginPath(); g.moveTo(b.x1, b.y1); g.lineTo(b.x2, b.y2); g.stroke(); g.strokeStyle = PAL.W; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1; }
      if (!(ctx.invuln > 0 && ((this.t * 14) | 0) % 2)) {
        const fl = ((this.t * 14) | 0) % 2;
        NI.spr.draw(g, 'ship', this.ship.x, this.ship.y);
        NI.spr.draw(g, fl ? 'flame1' : 'flame2', this.ship.x - 3, this.ship.y + 12); NI.spr.draw(g, fl ? 'flame2' : 'flame1', this.ship.x + 3, this.ship.y + 12);
      }
      if (this.slowT > 0) { g.fillStyle = 'rgba(76,201,240,.10)'; g.fillRect(0, 19, W, H); F.draw(g, 'LENTO ' + Math.ceil(this.slowT), W - 4, 22, PAL.C, 1, 'r', PAL.K); }
      this.drawButtons(g, cur);
    }
    drawBoss(g) {
      const b = this.boss; if (b.dead && b.deadT > 1.4) return;
      const x = b.x + (b.dead ? (U.R() - 0.5) * 4 : Math.sin(this.t * 1.6) * 8), y = b.y + Math.sin(this.t * 3) * 2;
      NI.spr.draw(g, b.sprite, x, y, { scale: 2, flash: b.flash > 0 ? true : (b.charge && ((this.t * 16) | 0) % 2 ? PAL.R : false) });
      if (!b.dead && b.y >= BOSS_Y - 1) {
        UI.panel(g, 28, 68, 124, 7, { fill: '#2a0f1a', border: PAL.R }); UI.bar(g, 30, 70, 120, 3, b.hp / b.max, b.rage ? PAL.O : PAL.R, '#2a0f1a');
        F.draw(g, b.name, W / 2, 78, PAL.W, 1, 'c', PAL.K);
      }
    }
    drawCard(g, t, cur) {
      const x = Math.round(t.x - t.w / 2 + (t.shake > 0 ? Math.sin(t.shake * 70) * 2 : 0)), y = Math.round(t.y - t.h / 2);
      if (!t.alive) g.globalAlpha = Math.max(0, t.dying / 0.22);
      const near = t.y + t.h / 2 > FIRE_Y - 36, blink = ((this.t * 14) | 0) % 2;
      g.fillStyle = blink ? PAL.O : PAL.Y; g.fillRect(x + 22, y - 3, 3, 3); g.fillRect(x + t.w - 25, y - 3, 3, 3);
      UI.panel(g, x, y, t.w, t.h, { border: t.wrongT > 0 ? PAL.R : t.gold ? PAL.Y : near && ((this.t * 8) | 0) % 2 ? PAL.R : cur ? PAL.C : '#4a4a78', fill: t.gold ? '#2a2410' : '#10142e' });
      let cy = y + 4; for (const r of t.rows) { r.d(g, x + t.w / 2, cy); cy += r.h + 3; }
      if (t.gold) NI.spr.draw(g, 'star', x + t.w - 6, y - 4);
      if (cur && t.alive) { g.fillStyle = PAL.Y; [[x - 2, y - 2], [x + t.w - 2, y - 2], [x - 2, y + t.h + 1], [x + t.w - 2, y + t.h + 1]].forEach(([a, c]) => g.fillRect(a, c, 4, 1)); }
      g.globalAlpha = 1;
    }
    drawButtons(g, cur) {
      const opts = cur ? cur.opts : this.lastOpts, cols = cur ? cur.colors : this.lastColors, n = opts.length, L = this.layout(n);
      const sc = opts.every(o => F.width(String(o), 2) <= L[0].w - 6) ? 2 : 1;
      for (let i = 0; i < n; i++) UI.button(g, L[i], String(opts[i]), { color: cols[i] || BCOL[i], scale: sc, down: this.btnT[i] > 0, disabled: !cur, glow: !!(cur && this.wave && this.wave.hint && i === cur.answer) });
    }
  }
  Terminal.K = { FIRE_Y, SHIP_Y, BTN_Y, BTN_H, TOP, BOSS_TOP, BOSS_Y, CW, BCOL }; // para os motores que herdam (canhão de bits)
  NI.engines.terminal = Terminal;
})();
