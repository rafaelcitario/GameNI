/* Fase 4-3 "NEURÔNIOS": o alvo está escondido; só os neurônios o enxergam. Cada disparo (potencial de ação) é igual aos outros: tudo-ou-nada.
   O que muda é a TAXA de disparos (codificação por taxa: mais rápido = mais perto) e QUAIS neurônios disparam (codificação populacional: a direção).
   Conte os disparos, decifre o alvo e atire arrastando e soltando. */
(function () {
  'use strict';
  const NI = window.NI, W = NI.W, PAL = NI.PAL, F = NI.font, UI = NI.ui, A = NI.audio, fx = NI.fx, U = NI.U;
  const CX = 90, CY = 158, RN = 66, RATE = [22, 12, 5], RR = [24, 46], RAD = [14, 36, 56], DIRS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  const rad = d => d * Math.PI / 180, pol = (a, r) => [CX + r * Math.sin(rad(a)), CY - r * Math.cos(rad(a))];
  const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
  const dirName = a => { const i = a / 45; return Number.isInteger(i) ? DIRS[i % 8] : 'ENTRE ' + DIRS[Math.floor(i) % 8] + ' E ' + DIRS[Math.ceil(i) % 8]; };
  function ring(g, cx, cy, r, col) { g.fillStyle = col; let x = r, y = 0, d = 1 - r; const put = (a, b) => { g.fillRect(cx + a, cy + b, 1, 1); g.fillRect(cx - a, cy + b, 1, 1); g.fillRect(cx + a, cy - b, 1, 1); g.fillRect(cx - a, cy - b, 1, 1); }; while (x >= y) { put(x, y); put(y, x); y++; if (d < 0) d += 2 * y + 1; else { x--; d += 2 * (y - x) + 1; } } }
  function disc(g, cx, cy, r, col) { g.fillStyle = col; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + 0.5)); g.fillRect(cx - w, cy + dy, 2 * w + 1, 1); } }

  class Neural extends NI.engines.Rounds {
    constructor(ctx, phase) { super(ctx, phase); this.n = 4; this.spikes = []; this.stage = 'idle'; this.aim = null; this.cnt = []; this.win = []; this.flash = []; this.miss = 0; this.cool = 0; this.zapT = 0; this.nxt = []; }
    startRound() {
      const w = this.wave, R = this.R, n = w.neurons; this.n = n; this.stage = 'play'; this.pt = 0; this.cool = 0; this.miss = 0; this.msg = ''; this.aim = null; this.spikes = [];
      const step = w.offset ? 22.5 : 360 / n; this.theta = R.int(0, Math.round(360 / step) - 1) * step; this.ringI = w.rings > 1 ? R.int(0, 2) : 1;
      this.cnt = new Array(n).fill(0); this.win = new Array(n).fill(0); this.flash = new Array(n).fill(0); this.shown = false; this.nxt = []; for (let i = 0; i < n; i++) this.nxt[i] = this.isi(i);
      this.T = w.time ? w.time / (1 + (this.ctx.skill - 1) * 0.6) : 0; this.tLeft = this.T;
    }
    lam(i) { const w = this.wave, d = angDiff(this.theta, i * 360 / this.n), t = Math.max(0, Math.cos(rad(d))), g = this.n === 4 ? t : t * t; return (w.base || 0.5) + RATE[this.ringI] * g; }
    isi(i) { return -Math.log(1 - this.R()) / this.lam(i); } // intervalo entre disparos: processo de Poisson exato (a taxa não depende do FPS)
    spike(i) {
      this.cnt[i]++; this.win[i] += 1; this.flash[i] = 1; const [x, y] = pol(i * 360 / this.n, RN); this.spikes.push({ a: i * 360 / this.n, r: RN - 8, t: 0 });
      if (this.zapT <= 0) { A.sfx('zap', { x }); this.zapT = 0.045; }
    }
    poisson(dt) { for (let i = 0; i < this.n; i++) { if (this.nxt[i] === undefined) this.nxt[i] = this.isi(i); this.nxt[i] -= dt; for (let k = 0; this.nxt[i] <= 0 && k < 4; k++) { this.spike(i); this.nxt[i] += this.isi(i); } } }
    tick(dt, ended, between) {
      if (this.zapT > 0) this.zapT -= dt; if (this.cool > 0) this.cool -= dt;
      for (let i = this.spikes.length - 1; i >= 0; i--) { const s = this.spikes[i]; s.r -= dt * 150; if (s.r < 6) this.spikes.splice(i, 1); }
      for (let i = 0; i < this.n; i++) { this.flash[i] = Math.max(0, this.flash[i] - dt * 5); this.win[i] *= Math.exp(-dt / 1.0); }
      if (ended || this.stage === 'idle') return;
      if (this.stage === 'play' && !between) {
        this.pt += dt; this.poisson(dt);
        if (this.T) { this.tLeft -= dt; if (this.tLeft < 3 && Math.floor(this.tLeft * 2) !== Math.floor((this.tLeft + dt) * 2)) A.sfx('tick'); if (this.tLeft <= 0) this.hit(); }
      } else if (between) this.poisson(dt * 0.4);
    }
    fire(a, r) {
      if (this.stage !== 'play' || this.cool > 0) return; const w = this.wave, ctx = this.ctx, ringA = r < RR[0] ? 0 : r < RR[1] ? 1 : 2;
      const okA = angDiff(a, this.theta) <= w.tol, okR = w.rings === 1 || ringA === this.ringI; A.sfx('laser', { x: pol(a, 30)[0] }); this.tracer = { a, r: Math.max(r, 10), t: 0 };
      if (okA && okR) {
        this.stage = 'done'; const [x, y] = pol(this.theta, RAD[this.ringI]); this.shown = true; A.sfx('boom', { x }); fx.burst(x, y, 22, [PAL.Y, PAL.O, PAL.W], { speed: 90 }); fx.shake(3, 0.2);
        ctx.right('neural', x, y - 10, { pts: this.miss ? 120 : 250 }); this.msg = 'ACERTOU: ' + dirName(this.theta) + (w.rings > 1 ? ', ' + ['PERTO', 'MÉDIO', 'LONGE'][this.ringI] : ''); this.endRound(true, 1.5); return;
      }
      this.cool = 0.9; this.miss++; const [x, y] = pol(a, Math.max(r, 12));
      const hint = !okA ? 'Os neurônios que mais disparam apontam a direção do alvo. Aqui o alvo estava ' + dirName(this.theta) + '.' : 'Mais disparos por segundo = alvo mais perto: o neurônio principal disparava ~' + RATE[this.ringI] + '/s: ' + ['PERTO (anel interno)', 'DISTÂNCIA MÉDIA', 'LONGE (anel externo)'][this.ringI] + '.';
      ctx.wrong('neural', hint, x, y); if (!this.hint && this.miss >= 2) { this.miss = 0; ctx.hurt(1, x, y, 'erros'); }
    }
    hit() { // o alvo chegou ao núcleo
      this.stage = 'done'; this.shown = true; this.msg = 'ERA ' + dirName(this.theta); const [x, y] = pol(this.theta, RAD[this.ringI]); fx.burst(CX, CY, 16, [PAL.R, PAL.O], { speed: 70 }); fx.shake(3, 0.25);
      this.ctx.leak('neural', 'Conte os disparos: os neurônios que disparam mais indicam a direção; mais disparos por segundo = alvo mais perto.', x, y); this.endRound(false, 2.0);
    }

    bot(dt) {
      const D = NI.debug, acc = D.botAcc === undefined ? 1 : D.botAcc; this.botT -= dt; if (this.botT > 0 || this.stage !== 'play' || this.cool > 0 || this.pt < Math.max(0.8, D.botDelay || 0) * 0.5) return;
      this.botT = 0.5; let sx = 0, sy = 0, mx = 0; this.cnt.forEach((c, i) => { const a = rad(i * 360 / this.n); sx += c * Math.sin(a); sy += c * Math.cos(a); mx = Math.max(mx, c); });
      if (!mx) return; let a = (Math.atan2(sx, sy) * 180 / Math.PI + 360) % 360; if (this.R() > acc) a += (this.R() - 0.5) * 120;
      const tot = this.cnt.reduce((q, c) => q + c, 0), rate = (tot / Math.max(0.5, this.pt) - this.n * (this.wave.base || 0.5)) / (this.n === 4 ? 1 : 2), ringE = RATE.reduce((b, r, k) => Math.abs(r - rate) < Math.abs(RATE[b] - rate) ? k : b, 0);
      this.fire(a, RAD[ringE]);
    }
    aimAt(p) { const dx = p.x - CX, dy = p.y - CY; this.aim = { a: (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360, r: Math.hypot(dx, dy) }; }
    onDown(p) { if (this.stage === 'play' && p.y > 70 && p.y < 250) this.aimAt(p); }
    onMove(p) { if (this.aim) this.aimAt(p); }
    onUp() { if (this.aim) { const a = this.aim; this.aim = null; this.fire(a.a, a.r); } }

    /* ---------- desenho ---------- */
    draw(g) {
      if (!this.wave || this.state === 'intro' || this.state === 'clear') return;
      const w = this.wave, n = this.n, hintOn = this.hint; this.header(g, this.T && this.stage === 'play' ? Math.max(0, this.tLeft / this.T) : null, 'ALVO');
      F.draw(g, 'ONDE ESTÁ O ALVO?', W / 2, 50, PAL.W, 1, 'c', PAL.K); F.draw(g, 'LEIA OS DISPAROS E ATIRE', W / 2, 60, PAL.S, 1, 'c', PAL.K);
      // campo de mira
      disc(g, CX, CY, RN + 12, '#0b0b24'); [RR[0], RR[1], RN - 4].forEach((r, k) => ring(g, CX, CY, r, w.rings > 1 ? (hintOn ? ['#4a3a7a', '#3a3a6a', '#2a2a5a'][k] : '#2a2a52') : '#1c1c3c'));
      g.fillStyle = '#1c1c3c'; g.fillRect(CX, CY - RN, 1, 2 * RN); g.fillRect(CX - RN, CY, 2 * RN, 1);
      if (this.T && this.stage === 'play') { const f = this.tLeft / this.T, r = Math.round(10 + (RN + 8 - 10) * f); g.globalAlpha = 0.5 + 0.3 * this.pulse(10); ring(g, CX, CY, r, f < 0.35 ? PAL.R : PAL.O); g.globalAlpha = 1; }
      for (let i = 0; i < n; i++) { const [x, y] = pol(i * 360 / n, RN); g.strokeStyle = 'rgba(120,90,200,.25)'; g.beginPath(); g.moveTo(x, y); g.lineTo(CX, CY); g.stroke(); }
      for (const s of this.spikes) { const [x, y] = pol(s.a, s.r); g.fillStyle = PAL.W; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); g.fillStyle = PAL.Y; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
      for (let i = 0; i < n; i++) {
        const [x, y] = pol(i * 360 / n, RN), f = this.flash[i]; disc(g, Math.round(x), Math.round(y) + 1, 8, PAL.K); disc(g, Math.round(x), Math.round(y), 8, f > 0.05 ? PAL.W : '#5b3fa0'); disc(g, Math.round(x), Math.round(y), 5, f > 0.05 ? PAL.Y : '#7a5ad0');
        if (f > 0.3) { g.globalAlpha = f; ring(g, Math.round(x), Math.round(y), 11, PAL.Y); g.globalAlpha = 1; }
        if (hintOn || this.stage === 'done') { const [lx, ly] = pol(i * 360 / n, RN + 17); F.draw(g, String(Math.round(this.win[i])), Math.round(lx), Math.round(ly) - 3, this.win[i] > 4 ? PAL.Y : PAL.S, 1, 'c', PAL.K); }
      }
      if (this.tracer) { this.tracer.t += 1 / 30; const [x, y] = pol(this.tracer.a, this.tracer.r); g.strokeStyle = PAL.W; g.beginPath(); g.moveTo(CX, CY); g.lineTo(x, y); g.stroke(); if (this.tracer.t > 0.25) this.tracer = null; }
      if (this.shown) { const [x, y] = pol(this.theta, RAD[this.ringI]); NI.spr.draw(g, 'drone', x, y, { scale: 2 }); }
      if (this.aim && this.stage === 'play') { const r = Math.min(this.aim.r, RN + 6), [x, y] = pol(this.aim.a, r); g.strokeStyle = PAL.G; g.beginPath(); g.moveTo(CX, CY); g.lineTo(x, y); g.stroke(); ring(g, Math.round(x), Math.round(y), 4, PAL.G); g.fillStyle = PAL.G; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
      disc(g, CX, CY, 7, PAL.K); disc(g, CX, CY, 6, PAL.C); disc(g, CX, CY, 3, PAL.W);
      // legenda e mensagens
      if (this.stage === 'done') F.draw(g, this.msg, W / 2, 252, PAL.G, 1, 'c', PAL.K);
      else if (hintOn && w.rings > 1) { F.draw(g, 'DISPAROS/S DO PRINCIPAL:', W / 2, 252, PAL.Y, 1, 'c', PAL.K); F.draw(g, RATE[0] + ' PERTO, ' + RATE[1] + ' MÉDIO, ' + RATE[2] + ' LONGE', W / 2, 262, PAL.Y, 1, 'c', PAL.K); }
      else if (hintOn) F.draw(g, 'MAIS DISPAROS = ALVO AQUI', W / 2, 252, PAL.Y, 1, 'c', PAL.K);
      else F.draw(g, w.rings > 1 ? 'DIREÇÃO + DISTÂNCIA: SOLTE' : 'ARRASTE, MIRE E SOLTE', W / 2, 250, PAL.S, 1, 'c', PAL.K);
      if (hintOn && this.stage !== 'done') F.para(g, 'Cada disparo é igual (tudo ou nada). Muda a TAXA.', 10, 280, 160, PAL.G, 1, 9, 'c');
      if (this.cool > 0) F.draw(g, 'RECARREGANDO...', W / 2, 296, PAL.R, 1, 'c', PAL.K);
    }
  }
  NI.engines.neural = Neural;

  const w = (n, time, neurons, rings, tol, o) => Object.assign({ n, time, neurons, rings, tol }, o);
  NI.tcfg.neural = {
    waves: [
      w(4, 0, 4, 1, 45, { hint: true, base: 0.3, title: 'TREINO', sub: 'quem dispara mais aponta o alvo', recap: 'Potencial de ação: tudo ou nada. A informação está na TAXA de disparos (codificação por taxa).' }),
      w(5, 9, 8, 1, 30, { base: 0.7, title: 'TESTE', sub: '8 neurônios, cada um prefere uma direção', recap: 'Codificação populacional: a direção sai do conjunto de neurônios que mais disparam.' }),
      w(4, 10, 4, 3, 45, { hint: true, base: 0.4, title: 'TAXA', sub: 'mais disparos por segundo = mais perto', recap: 'Taxa de disparos codifica intensidade: mais rápido = estímulo mais forte (alvo mais perto).' }),
      w(5, 9, 8, 3, 28, { base: 0.9, offset: true, title: 'ONDA FINAL', sub: 'direção e distância, com ruído' })
    ]
  };
})();
