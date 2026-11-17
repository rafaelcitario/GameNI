/* Fase 4-1 "AMOSTRADOR A/D": o sinal analógico (ciano) é amostrado (pontos amarelos) e reconstruído pelo conversor D/A (magenta).
   Ajuste a taxa de amostragem Fs e os bits para TRAVAR o sinal: Fs > 2 x f (Nyquist), bits suficientes e dentro da taxa de dados.
   Ensina: analógico x digital, amostragem, quantização (2^n níveis), teorema de Nyquist, aliasing e taxa de bits (Fs x bits). */
(function () {
  'use strict';
  const NI = window.NI, W = NI.W, PAL = NI.PAL, F = NI.font, UI = NI.ui, A = NI.audio, fx = NI.fx, U = NI.U, L = NI.logic;
  const FS = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32], X0 = 8, SW = 164, CY = 120, AMP = 40, TWO_PI = Math.PI * 2;
  const sinc = x => x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x), LAN = 8;

  class Sampler extends NI.engines.Rounds {
    constructor(ctx, phase) {
      super(ctx, phase); this.fsI = 2; this.bits = 2; this.f = [3]; this.lock = 0; this.stage = 'idle'; this.fid = 0; this.held = null; this.clock = 0;
      this.btns = [{ k: 'fs-', x: 6, y: 262, w: 34, h: 22, label: '-' }, { k: 'fs+', x: 140, y: 262, w: 34, h: 22, label: '+' }, { k: 'b-', x: 6, y: 288, w: 34, h: 22, label: '-' }, { k: 'b+', x: 140, y: 288, w: 34, h: 22, label: '+' }];
    }
    get Fs() { return FS[this.fsI]; }
    fmax() { return Math.max(...this.f); }
    sig(t) { let s = 0; this.f.forEach((f, i) => s += Math.sin(TWO_PI * f * t + i * 1.3)); return s / this.f.length; }
    fsMin(f) { return FS.find(v => v > 2 * f) || FS[FS.length - 1]; }

    startRound() {
      const w = this.wave, R = this.R; let plan;
      if (w.mode === 'change') { const a = R.pick(w.fs); let b; do { b = R.pick(w.fs); } while (Math.abs(a - b) < 2); const c = R.pick(w.fs.filter(v => v !== b)); plan = [{ t: 0, f: [a] }, { t: 6, f: [b] }, { t: 13, f: [c] }]; }
      else if (w.mode === 'two') { const a = R.pick([2, 3]), b = a + R.int(2, 4); plan = [{ t: 0, f: [a, b] }, { t: 10, f: [a + 1, b + 1] }]; }
      else plan = [{ t: 0, f: [R.pick(w.fs)] }];
      this.plan = plan; this.f = plan[0].f; this.pi = 0; this.bmin = R.pick(w.bmin); this.pt = 0; this.lock = 0; this.stage = 'play'; this.msg = ''; this.held = null; this.lastLamp = 0;
      const fm = Math.max(...plan.map(p => this.fsMin(Math.max(...p.f)))); this.B = w.slack === undefined ? Infinity : fm * this.bmin + R.int(0, w.slack);
      this.fsI = 0; this.bits = 1; this.T = w.time ? w.time / (1 + (this.ctx.skill - 1) * 0.6) : 0; this.tLeft = this.T;
    }
    lamps() { const Fs = this.Fs, fm = this.fmax(); return { ny: Fs > 2 * fm, bi: this.bits >= this.bmin, da: Fs * this.bits <= this.B }; }
    press(k) {
      if (this.stage !== 'play') return; A.sfx('tap');
      if (k === 'fs+') this.fsI = Math.min(FS.length - 1, this.fsI + 1); else if (k === 'fs-') this.fsI = Math.max(0, this.fsI - 1);
      else if (k === 'b+') this.bits = Math.min(6, this.bits + 1); else if (k === 'b-') this.bits = Math.max(1, this.bits - 1);
    }
    tick(dt, ended, between) {
      if (this.held) { this.held.t += dt; if (this.held.t > 0.4) { this.held.r = (this.held.r || 0) + dt; if (this.held.r > 0.11) { this.held.r = 0; this.press(this.held.k); } } }
      if (between || ended || this.stage !== 'play') return;
      this.pt += dt; this.clock += dt * this.Fs; if (this.clock >= 1) { this.clock %= 1; A.sfx('sample', { x: 90 }); }
      const nx = this.plan[this.pi + 1]; if (nx && this.pt >= nx.t) { this.pi++; this.f = nx.f; this.lock = Math.max(0, this.lock - 0.3); A.sfx('warn'); fx.text(90, 86, 'O SINAL MUDOU!', PAL.Y, { scale: 1 }); fx.flash(PAL.Y, 0.1); }
      const l = this.lamps(), ok = l.ny && l.bi && l.da;
      this.lock = U.clamp(this.lock + (ok ? dt / 2.2 : -dt / 7), 0, 1);
      if (ok && Math.floor(this.pt * 2) !== Math.floor((this.pt - dt) * 2)) fx.burst(90, CY, 2, [PAL.G, PAL.W], { speed: 30 });
      if (this.lock >= 1) this.win();
      if (this.T) { this.tLeft -= dt; if (this.tLeft < 4 && Math.floor(this.tLeft * 2) !== Math.floor((this.tLeft + dt) * 2)) A.sfx('tick'); if (this.tLeft <= 0) this.lose(); }
    }
    win() { this.stage = 'done'; A.sfx('win'); fx.flash(PAL.G, 0.12); fx.burst(90, CY, 24, [PAL.G, PAL.C, PAL.M, PAL.W], { speed: 90 }); this.ctx.right('sampler', 90, CY - 20, { pts: 250 }); this.msg = 'TRAVADO: ' + this.Fs + ' HZ × ' + this.bits + ' BITS'; this.endRound(true, 1.6); }
    lose() {
      const l = this.lamps(); this.stage = 'done';
      const hint = !l.ny ? 'Nyquist: amostre a MAIS que o dobro da maior frequência (Fs > 2f). Abaixo disso ocorre aliasing: o sinal vira outro.' : !l.bi ? this.bmin + ' bits dão ' + (1 << this.bmin) + ' níveis. Poucos bits = degraus grandes (ruído de quantização).' : 'Taxa de dados = Fs x bits. Use o mínimo de Fs (Nyquist) e de bits que o sinal pede para caber no limite.';
      this.msg = 'MÍNIMO: ' + this.fsMin(this.fmax()) + ' HZ E ' + this.bmin + ' BITS'; this.ctx.leak('sampler', hint, 90, CY); this.endRound(false, 2.2);
    }

    bot(dt) {
      const D = NI.debug, acc = D.botAcc === undefined ? 1 : D.botAcc; this.botT -= dt; if (this.botT > 0 || this.stage !== 'play' || this.pt < (D.botDelay || 0) * 0.5) return;
      this.botT = (D.botDelay || 0) * 0.15 + 0.25 + this.R() * 0.25; const want = FS.indexOf(this.fsMin(this.fmax())), wb = this.bmin;
      let k = null; if (this.fsI < want) k = 'fs+'; else if (this.bits < wb) k = 'b+'; else if (this.fsI > want && this.R() > acc) k = 'fs+'; else if (this.fsI > want) k = 'fs-'; else if (this.bits > wb) k = 'b-';
      if (k) this.press(k);
    }
    onDown(p) { const b = this.btns.find(b => UI.hit(b, p)); if (b) { this.press(b.k); this.held = { k: b.k, t: 0 }; } }
    onUp() { this.held = null; }
    onKey(k) { const m = { ArrowRight: 'fs+', ArrowLeft: 'fs-', ArrowUp: 'b+', ArrowDown: 'b-' }[k]; if (m) this.press(m); }

    /* ---------- desenho ---------- */
    draw(g) {
      if (!this.wave || this.state === 'intro' || this.state === 'clear') return;
      const hintOn = this.hint, Fs = this.Fs, bits = this.bits, lv = 1 << bits, l = this.lamps(), fm = this.fmax(), sc = this.t * 0.35;
      this.header(g, this.T && this.stage === 'play' ? Math.max(0, this.tLeft / this.T) : null, 'SINAL');
      F.draw(g, 'TRAVE O SINAL', W / 2, 50, PAL.W, 1, 'c', PAL.K);
      F.draw(g, this.f.length > 1 ? 'SINAL COM 2 TONS: ' + this.f.join(' E ') + ' HZ' : 'SINAL: ' + this.f[0] + ' HZ (' + this.f[0] + ' CICLOS/S)', W / 2, 60, PAL.C, 1, 'c', PAL.K);
      // osciloscópio
      g.fillStyle = '#05060f'; g.fillRect(X0 - 2, CY - AMP - 6, SW + 4, 2 * AMP + 12); g.fillStyle = '#1a1f45'; g.fillRect(X0 - 2, CY, SW + 4, 1);
      if (bits <= 4) { g.fillStyle = 'rgba(255,209,102,.18)'; const n = lv - 1; for (let j = 0; j <= n; j++) g.fillRect(X0, Math.round(CY - AMP * (j / n * 2 - 1)), SW, 1); }
      const qs = {}, q = k => qs[k] !== undefined ? qs[k] : (qs[k] = L.quant(this.sig(k / Fs + sc), bits));
      const pts = [], orig = []; let err = 0, pw = 0;
      for (let px = 0; px <= SW; px += 2) {
        const t = px / SW, o = this.sig(t + sc), c = Math.floor(t * Fs); let r = 0;
        for (let k = c - LAN + 1; k <= c + LAN; k++) { const x = t * Fs - k, w = x === 0 ? 1 : sinc(x) * sinc(x / LAN); r += q(k) * w; }
        orig.push(o); pts.push(r); err += (r - o) * (r - o); pw += o * o;
      }
      this.fid = Math.max(0, 1 - Math.sqrt(err / Math.max(1e-6, pw)));
      g.fillStyle = PAL.C; orig.forEach((o, i) => g.fillRect(X0 + i * 2, Math.round(CY - AMP * o), 2, 1));
      g.fillStyle = PAL.M; pts.forEach((r, i) => { const y = Math.round(CY - AMP * U.clamp(r, -1.4, 1.4)); g.fillRect(X0 + i * 2, y, 2, 2); });
      for (let k = 0; k <= Fs; k++) { const x = X0 + Math.round(k / Fs * SW), y = Math.round(CY - AMP * q(k)); g.fillStyle = 'rgba(255,209,102,.45)'; g.fillRect(x, Math.min(y, CY), 1, Math.abs(CY - y)); g.fillStyle = PAL.Y; g.fillRect(x - 1, y - 1, 3, 3); }
      F.draw(g, 'ORIGINAL', X0 + 2, CY - AMP - 3, PAL.C, 1, 'l', PAL.K); F.draw(g, 'D/A', X0 + SW - 2, CY - AMP - 3, PAL.M, 1, 'r', PAL.K);
      // lâmpadas
      [['NYQUIST', l.ny], ['BITS', l.bi], ['DADOS', l.da]].forEach(([n, ok], i) => { const x = 8 + i * 57; g.fillStyle = PAL.K; g.fillRect(x, 176, 52, 12); g.fillStyle = ok ? PAL.G : PAL.R; g.fillRect(x, 175, 52, 12); F.draw(g, n, x + 26, 178, PAL.K, 1, 'c'); });
      // contas na tela (o conteúdo da matéria)
      F.draw(g, 'Fs ' + Fs + ' ' + (l.ny ? '>' : '≤') + ' 2 × ' + fm + ' = ' + 2 * fm + (l.ny ? '' : '  ALIASING!'), W / 2, 193, l.ny ? PAL.G : PAL.R, 1, 'c', PAL.K);
      F.draw(g, 'NÍVEIS: 2^' + bits + ' = ' + lv + (l.bi ? '' : '  (PEDE ' + (1 << this.bmin) + ')'), W / 2, 203, l.bi ? PAL.G : PAL.R, 1, 'c', PAL.K);
      F.draw(g, 'DADOS: ' + Fs + '×' + bits + ' = ' + Fs * bits + (this.B < Infinity ? '/' + this.B : '') + ' BITS/S', W / 2, 213, l.da ? PAL.G : PAL.R, 1, 'c', PAL.K);
      F.draw(g, 'FIDELIDADE ' + Math.round(this.fid * 100) + '%', 8, 224, PAL.W, 1, 'l', PAL.K); UI.bar(g, 8, 233, 164, 4, this.fid, this.fid >= 0.8 ? PAL.G : PAL.O, '#10142e');
      F.draw(g, this.stage === 'done' && this.msg ? this.msg : 'TRAVA DO SINAL', 8, 241, this.stage === 'done' ? PAL.G : PAL.W, 1, 'l', PAL.K); UI.bar(g, 8, 250, 164, 5, this.lock, PAL.G, '#10142e');
      if (hintOn && this.stage === 'play') F.draw(g, 'DICA: Fs ACIMA DE 2 × f', W / 2, 257, PAL.Y, 1, 'c', PAL.K);
      // controles
      this.btns.forEach(b => UI.button(g, b, b.label, { color: b.k[0] === 'f' ? PAL.C : PAL.O, scale: 2, disabled: this.stage !== 'play' }));
      F.draw(g, 'AMOSTRAGEM ' + Fs + ' HZ', W / 2, 269, PAL.W, 1, 'c', PAL.K); F.draw(g, 'BITS ' + bits + ' (' + lv + ' NÍVEIS)', W / 2, 295, PAL.W, 1, 'c', PAL.K);
    }
  }
  NI.engines.sampler = Sampler;

  const w = (n, time, mode, fs, bmin, o) => Object.assign({ n, time, mode, fs, bmin }, o);
  NI.tcfg.sampler = {
    waves: [
      w(3, 0, 'fixed', [2, 3, 4], [3], { hint: true, title: 'TREINO', sub: 'amostre a mais que o dobro de f', recap: 'Nyquist: Fs > 2 x f. Abaixo disso ocorre aliasing: o sinal reconstruído tem outra frequência.' }),
      w(3, 20, 'fixed', [3, 4, 5], [3, 4], { slack: 6, title: 'TESTE', sub: 'agora existe um limite de dados', recap: 'n bits dão 2^n níveis. Taxa de dados = Fs x bits: mais qualidade custa mais bits por segundo.' }),
      w(3, 30, 'change', [2, 3, 4, 5, 6], [3], { slack: 8, title: 'DESAFIO', sub: 'o sinal muda: acompanhe!', recap: 'Sinal digital = amostras quantizadas. O conversor D/A com filtro reconstrói a onda se Fs > 2 f.' }),
      w(3, 32, 'two', [2], [3, 4], { slack: 8, title: 'ONDA FINAL', sub: 'dois tons juntos: vale o maior' })
    ]
  };
})();
