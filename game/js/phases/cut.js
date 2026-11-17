/* Fase 2-1 "20 PERGUNTAS": ache o glitch com o mínimo de perguntas sim/não.
   Cada corte entre os blocos é UMA pergunta ("está à esquerda?") = 1 bit. O melhor corte divide a probabilidade ao meio.
   Ensina: informação como incerteza, bit = pergunta sim/não, I = -log2(p), codificação de fonte (Shannon-Fano). */
(function () {
  'use strict';
  const NI = window.NI, W = NI.W, PAL = NI.PAL, F = NI.font, UI = NI.ui, A = NI.audio, fx = NI.fx, U = NI.U, L = NI.logic;
  const AX = 4, AW = 172, BASE = 170, SLOT_H = 22;
  const ent = ps => { const s = ps.reduce((a, b) => a + b, 0); return L.entropy(ps.map(p => p / s)); };
  const BAD = 0.14; // um corte "bom" fica a 14 pontos (de desequilíbrio) do melhor corte possível

  // distribuições de probabilidade das rodadas
  const gens = {
    eq4: () => ({ ps: [0.25, 0.25, 0.25, 0.25], frac: true }),
    eq8: () => ({ ps: new Array(8).fill(0.125), frac: true }),
    dyadic: R => ({ ps: R.shuffle(L.dyadic(R, R.int(4, 6))), frac: true }),
    free: R => {
      const k = R.int(5, 7), w = []; for (let i = 0; i < k; i++) w.push(R.int(4, 40));
      const s = w.reduce((a, b) => a + b), pc = w.map(x => Math.max(3, Math.round(x / s * 100)));
      pc[pc.indexOf(Math.max(...pc))] += 100 - pc.reduce((a, b) => a + b); return { ps: pc.map(x => x / 100), frac: false };
    }
  };

  class Cut extends NI.engines.Rounds {
    constructor(ctx, phase) { super(ctx, phase); this.cells = []; this.n = 0; this.beam = null; this.later = []; this.aim = -1; this.pt = 0; }
    lab(p) { return this.frac ? '1/' + Math.round(1 / p) : Math.round(p * 100) + '%'; }
    mass(a, b) { let s = 0; for (let i = a; i <= b; i++) s += this.cells[i].p; return s; }
    Hrem() { return ent(this.cells.slice(this.lo, this.hi + 1).map(c => c.p)); }
    cellX(i) { return AX + Math.round(i * AW / this.n); }
    cellW(i) { return this.cellX(i + 1) - this.cellX(i); }
    boundX(k) { return this.cellX(k); }
    imb(k) { const l = this.mass(this.lo, k - 1), r = this.mass(k, this.hi); return Math.abs(l - r) / (l + r); }
    best() { let bk = this.lo + 1, bi = 9; for (let k = this.lo + 1; k <= this.hi; k++) { const v = this.imb(k); if (v < bi - 1e-9) { bi = v; bk = k; } } return { k: bk, imb: bi }; }

    startRound() {
      const w = this.wave, d = gens[w.dist](this.R); this.frac = d.frac; this.n = d.ps.length; this.cells = d.ps.map(p => ({ p, dead: 0 }));
      let r = this.R(), acc = 0; this.secret = this.n - 1; for (let i = 0; i < this.n; i++) { acc += d.ps[i]; if (r < acc) { this.secret = i; break; } }
      this.lo = 0; this.hi = this.n - 1; this.q = 0; this.H0 = this.Hrem(); this.found = false; this.over = false; this.aim = -1; this.pt = 0; this.msg = ''; this.lastInfo = '';
      this.T = w.time ? w.time / (1 + (this.ctx.skill - 1) * 0.6) : 0; this.tLeft = this.T; this.quick = 0; this.wrongRun = 0;
    }
    nearest(x) { let bk = -1, bd = 1e9; for (let k = this.lo + 1; k <= this.hi; k++) { const d = Math.abs(x - this.boundX(k)); if (d < bd) { bd = d; bk = k; } } return bk; }

    commit(k) {
      if (this.state !== 'round' || this.found || k <= this.lo || k > this.hi) return;
      const ctx = this.ctx, best = this.best(), im = this.imb(k), l = this.mass(this.lo, k - 1), r = this.mass(k, this.hi), tot = l + r, x = this.boundX(k), left = this.secret < k;
      this.q++; this.lastInfo = 'INFO DA PERGUNTA: ' + U.num(L.hb(l / tot), 2) + ' BIT';
      A.sfx('cut'); this.beam = { x, t: 0 }; this.later.push({ t: 0.22, f: () => A.sfx(left ? 'yes' : 'no') });
      const q = im <= best.imb + 0.001 ? 2 : im <= best.imb + BAD ? 1 : 0;
      const bl = Math.round(this.mass(this.lo, best.k - 1) / tot * 100), br = 100 - bl;
      if (q === 2) { ctx.right('cut', x, BASE - 30, { pts: 150 }); fx.text(x, BASE - 56, 'PERFEITO!', PAL.G); }
      else if (q === 1) ctx.right('cut', x, BASE - 30, { pts: 90 });
      else ctx.wrong('cut', 'Corte onde as probabilidades se dividem ao meio: ' + bl + '% x ' + br + '% aqui. Cortar ' + Math.round(l / tot * 100) + '% x ' + Math.round(r / tot * 100) + '% rende menos que 1 bit.', x, BASE - 30);
      // a resposta elimina o lado errado
      const a = left ? k : this.lo, b = left ? this.hi : k - 1;
      for (let i = a; i <= b; i++) { this.cells[i].dead = 1; fx.burst(this.cellX(i) + this.cellW(i) / 2, BASE + 8, 6, [PAL.S, PAL.E], { speed: 40 }); }
      if (left) this.hi = k - 1; else this.lo = k;
      if (this.lo === this.hi) this.resolve(true);
    }
    resolve(ok) {
      const ctx = this.ctx, c = this.cells[this.secret], x = this.cellX(this.secret) + this.cellW(this.secret) / 2; this.found = true; this.over = !ok;
      if (ok) {
        const info = -Math.log2(c.p); A.sfx('boom', { x }); fx.burst(x, BASE + 8, 20, [PAL.Y, PAL.O, PAL.W], { speed: 80 }); fx.shake(3, 0.2);
        this.msg = 'ACHOU! PROB. ' + this.lab(c.p) + ' = ' + U.num(info, 2) + ' BITS = ' + this.q + ' PERGUNTAS';
        ctx.addScore(200, x, BASE - 14, PAL.Y);
        if (this.q <= Math.ceil(info) + 0) { fx.text(W / 2, BASE - 84, 'MÍNIMO!', PAL.G, { scale: 2 }); ctx.addScore(150); }
        this.endRound(true, 1.9);
      } else {
        this.msg = 'O GLITCH ESTAVA AQUI! TEMPO ESGOTADO'; ctx.leak('cut', 'Cada pergunta deve cortar a probabilidade ao meio: com 8 opções iguais bastam 3 perguntas (3 bits).', x, BASE);
        fx.burst(x, BASE + 8, 12, [PAL.R, PAL.O], { speed: 60 }); this.endRound(false, 2.0);
      }
    }
    tick(dt, ended, between) {
      for (let i = this.later.length - 1; i >= 0; i--) { const e = this.later[i]; e.t -= dt; if (e.t <= 0) { this.later.splice(i, 1); e.f(); } }
      if (this.beam) { this.beam.t += dt; if (this.beam.t > 0.35) this.beam = null; }
      for (const c of this.cells) if (c.dead > 0 && c.dead < 1.5) c.dead += dt * 4;
      if (between || ended || this.found) return;
      this.pt += dt;
      if (this.T) { this.tLeft -= dt; if (this.tLeft < 4 && Math.floor(this.tLeft * 2) !== Math.floor((this.tLeft + dt) * 2)) A.sfx('tick'); if (this.tLeft <= 0) this.resolve(false); }
    }

    /* ---------- bot: corta no melhor ponto (ou erra com a probabilidade configurada) ---------- */
    bot(dt) {
      const D = NI.debug; this.botT -= dt; if (this.found || this.botT > 0 || this.pt < (D.botDelay || 0) * 0.5) return;
      this.botT = (D.botDelay || 0) * 0.5 + 0.3 + this.R() * 0.3;
      const acc = D.botAcc === undefined ? 1 : D.botAcc; let k = this.best().k;
      if (this.R() > acc) k = this.lo + 1 + Math.floor(this.R() * (this.hi - this.lo)); this.commit(k);
    }

    /* ---------- entrada: segure entre dois blocos, veja as somas e solte para perguntar ---------- */
    onDown(p) { if (this.state === 'round' && !this.found && p.y > 80 && p.y < 230) { this.aim = this.nearest(p.x); if (this.aim > 0) A.sfx('tap'); } }
    onMove(p) { if (this.aim >= 0 && p.y > 60 && p.y < 240) { const k = this.nearest(p.x); if (k !== this.aim && k > 0) { this.aim = k; A.sfx('tick'); } } }
    onUp() { if (this.aim > 0) this.commit(this.aim); this.aim = -1; }

    /* ---------- desenho ---------- */
    draw(g) {
      if (!this.wave) return;
      const hintOn = this.hint, n = this.n; if (!n || this.state === 'intro' || this.state === 'clear') return;
      this.header(g, this.T ? Math.max(0, this.tLeft / this.T) : null, 'RODADA');
      F.draw(g, 'ONDE ESTÁ O GLITCH?', W / 2, 52, PAL.W, 1, 'c', PAL.K);
      F.draw(g, '1 CORTE = 1 PERGUNTA = 1 BIT', W / 2, 62, PAL.S, 1, 'c', PAL.K);
      // o glitch paira acima e desce quando o tempo acaba
      const urg = this.T ? 1 - Math.max(0, this.tLeft / this.T) : 0;
      if (!this.found) NI.spr.draw(g, 'glitch', W / 2 + Math.sin(this.t * 1.7) * 52, 80 + urg * 34 + Math.sin(this.t * 5) * 2, { scale: 2 });
      const pmax = Math.max(...this.cells.map(c => c.p)), best = hintOn && !this.found ? this.best().k : -1;
      const l = this.aim > 0 ? this.mass(this.lo, this.aim - 1) : 0, r = this.aim > 0 ? this.mass(this.aim, this.hi) : 0;
      for (let i = 0; i < n; i++) {
        const c = this.cells[i], x = this.cellX(i), w = this.cellW(i) - 2, alive = i >= this.lo && i <= this.hi, bh = Math.round(8 + 50 * c.p / pmax);
        const col = !alive ? '#1c2040' : this.aim > 0 ? (i < this.aim ? PAL.C : PAL.M) : PAL.C;
        g.fillStyle = col; g.fillRect(x + 1, BASE - bh, w, bh); g.fillStyle = 'rgba(255,255,255,.25)'; if (alive) g.fillRect(x + 1, BASE - bh, w, 1);
        g.fillStyle = alive ? PAL.D : '#10142e'; g.fillRect(x + 1, BASE + 2, w, SLOT_H);
        if (this.found && i === this.secret) { NI.spr.draw(g, 'glitch', x + 1 + w / 2, BASE + 2 + SLOT_H / 2, { scale: 2 }); g.strokeStyle = this.over ? PAL.R : PAL.Y; g.lineWidth = 1; g.strokeRect(x + 1.5, BASE + 2.5, w - 1, SLOT_H - 1); }
        else if (alive) F.draw(g, '?', x + 1 + w / 2, BASE + 2 + 7, PAL.W, 1, 'c');
        else F.draw(g, 'X', x + 1 + w / 2, BASE + 2 + 7, '#3a3a5a', 1, 'c');
        F.draw(g, this.lab(c.p), x + 1 + w / 2, BASE + SLOT_H + 6, alive ? PAL.W : '#3a3a5a', 1, 'c');
      }
      // cortes possíveis, corte escolhido e a dica do melhor corte
      if (!this.found) for (let k = this.lo + 1; k <= this.hi; k++) {
        const x = this.boundX(k), sel = k === this.aim, isBest = k === best;
        g.fillStyle = sel ? PAL.W : isBest ? 'rgba(255,209,102,' + (0.4 + 0.6 * this.pulse(8)).toFixed(2) + ')' : 'rgba(141,153,174,.5)';
        g.fillRect(x - (sel ? 1 : 0), BASE - 62, sel ? 2 : 1, 62 + SLOT_H + 3);
        if (isBest) F.draw(g, 'CORTE AQUI', Math.min(W - 32, Math.max(32, x)), BASE - 72, PAL.Y, 1, 'c', PAL.K);
      }
      if (this.beam) { const e = this.beam.t / 0.35; g.globalAlpha = 1 - e; g.fillStyle = PAL.W; g.fillRect(this.beam.x - 1 - e * 6, BASE - 70, 2 + e * 12, 100); g.globalAlpha = 1; }
      // leitura do corte ou resultado da rodada
      const y = BASE + SLOT_H + 20;
      if (this.found) F.para(g, this.msg, 8, y + 4, 164, this.over ? PAL.R : PAL.G, 1, 9, 'c');
      else if (this.aim > 0) {
        const tot = l + r, pl = Math.round(l / tot * 100); F.draw(g, 'ESQ ' + pl + '%  |  DIR ' + (100 - pl) + '%', W / 2, y, PAL.W, 1, 'c', PAL.K);
        F.draw(g, 'INFO: ' + U.num(L.hb(l / tot), 2) + ' BIT (MÁX. 1)', W / 2, y + 11, pl >= 40 && pl <= 60 ? PAL.G : PAL.O, 1, 'c', PAL.K);
      } else F.draw(g, this.lastInfo || 'SEGURE ENTRE DOIS BLOCOS E SOLTE', W / 2, y, this.lastInfo ? PAL.Y : PAL.S, 1, 'c', PAL.K);
      // medidor de incerteza: cada bom corte tira ~1 bit
      const hr = this.found ? 0 : this.Hrem(), my = 252;
      F.draw(g, 'PERGUNTAS: ' + this.q, 8, my, PAL.W, 1, 'l', PAL.K); F.draw(g, 'FALTAM ' + U.num(hr, 1) + (Math.abs(hr - 1) < 0.05 ? ' BIT' : ' BITS'), W - 8, my, PAL.Y, 1, 'r', PAL.K);
      UI.bar(g, 8, my + 10, W - 16, 5, this.H0 ? hr / this.H0 : 0, PAL.Y, '#10142e');
      if (hintOn && !this.found) F.para(g, 'DICA: corte onde as probabilidades somam 50% de cada lado. Cortes desiguais informam menos.', 10, 274, 160, PAL.G, 1, 9, 'c');
    }
  }
  NI.engines.cut = Cut;

  const w = (n, time, dist, o) => Object.assign({ n, time, dist }, o);
  NI.tcfg.cut = {
    waves: [
      w(3, 0, 'eq4', { hint: true, title: 'TREINO', sub: 'cada corte divide as opções ao meio', recap: '4 opções iguais = 2 perguntas = 2 bits. Cada pergunta sim/não vale no máximo 1 bit.' }),
      w(3, 16, 'eq8', { title: 'TESTE', sub: '8 opções: quantas perguntas?', recap: 'N opções igualmente prováveis exigem log2(N) perguntas: 8 opções = 3 bits.' }),
      w(4, 20, 'dyadic', { title: 'DESAFIO', sub: 'o mais provável merece menos perguntas', recap: 'I = -log2(p): evento raro (p pequena) tem mais informação e pede mais perguntas.' }),
      w(4, 22, 'free', { title: 'ONDA FINAL', sub: 'probabilidades quaisquer' })
    ]
  };
})();
