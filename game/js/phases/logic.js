/* Fase 3-3 "PORTAS LÓGICAS": ligue e desligue as chaves de entrada até a(s) porta(s) de saída ficarem iguais ao ALVO.
   Os fios acendem em tempo real: o jogador descobre na prática o que AND, OR, XOR, NOT, NAND, NOR e XNOR fazem,
   monta um meio somador e um somador completo (SOMA e VAI-UM). */
(function () {
  'use strict';
  const NI = window.NI, W = NI.W, PAL = NI.PAL, F = NI.font, UI = NI.ui, A = NI.audio, fx = NI.fx, U = NI.U, L = NI.logic;
  const OFF = '#2e3258', WIRE0 = '#3a4070';
  const OPHINT = {
    AND: 'AND: a saída só é 1 quando TODAS as entradas são 1.',
    OR: 'OR: a saída só é 0 quando TODAS as entradas são 0.',
    XOR: 'XOR: a saída é 1 quando as entradas são DIFERENTES.',
    NAND: 'NAND = NOT(AND): só dá 0 quando as duas entradas são 1.',
    NOR: 'NOR = NOT(OR): só dá 1 quando as duas entradas são 0.',
    XNOR: 'XNOR: a saída é 1 quando as entradas são IGUAIS.',
    NOT: 'NOT inverte o sinal: 0 vira 1 e 1 vira 0.'
  };
  const I = (name, x, y) => ({ name, x, y, val: 0, locked: false });
  const TPL = { // cada molde: entradas, portas (em ordem topológica), saídas e a expressão escrita
    T1: o => ({ ins: [I('A', 20, 112), I('B', 20, 170)], gates: [{ id: 'g1', op: o[0], from: ['A', 'B'], x: 86, y: 141 }], outs: [{ from: 'g1', x: 150, y: 141, name: 'SAÍDA' }], expr: 'SAÍDA = A ' + o[0] + ' B' }),
    T1n: () => ({ ins: [I('A', 20, 141)], gates: [{ id: 'g1', op: 'NOT', from: ['A'], x: 86, y: 141 }], outs: [{ from: 'g1', x: 150, y: 141, name: 'SAÍDA' }], expr: 'SAÍDA = NOT A' }),
    T2n: o => ({ ins: [I('A', 20, 112), I('B', 20, 176)], gates: [{ id: 'n1', op: 'NOT', from: ['A'], x: 58, y: 112 }, { id: 'g2', op: o[0], from: ['n1', 'B'], x: 112, y: 146 }], outs: [{ from: 'g2', x: 152, y: 146, name: 'SAÍDA' }], expr: 'SAÍDA = (NOT A) ' + o[0] + ' B' }),
    T2: o => ({ ins: [I('A', 20, 104), I('B', 20, 142), I('C', 20, 192)], gates: [{ id: 'g1', op: o[0], from: ['A', 'B'], x: 66, y: 123 }, { id: 'g2', op: o[1], from: ['g1', 'C'], x: 114, y: 160 }], outs: [{ from: 'g2', x: 152, y: 160, name: 'SAÍDA' }], expr: 'SAÍDA = (A ' + o[0] + ' B) ' + o[1] + ' C' }),
    T3: o => ({ ins: [I('A', 20, 100), I('B', 20, 138), I('C', 20, 192)], gates: [{ id: 'g1', op: o[0], from: ['A', 'B'], x: 64, y: 118 }, { id: 'n1', op: 'NOT', from: ['C'], x: 64, y: 192 }, { id: 'g2', op: o[1], from: ['g1', 'n1'], x: 114, y: 156 }], outs: [{ from: 'g2', x: 152, y: 156, name: 'SAÍDA' }], expr: 'SAÍDA = (A ' + o[0] + ' B) ' + o[1] + ' (NOT C)' }),
    HA: () => ({ ins: [I('A', 20, 122), I('B', 20, 176)], gates: [{ id: 's', op: 'XOR', from: ['A', 'B'], x: 86, y: 114 }, { id: 'c', op: 'AND', from: ['A', 'B'], x: 86, y: 184 }], outs: [{ from: 's', x: 150, y: 114, name: 'SOMA' }, { from: 'c', x: 150, y: 184, name: 'VAI-UM' }], expr: 'SOMA = A XOR B  VAI-UM = A AND B', hint: 'Meio somador: SOMA = A XOR B e VAI-UM = A AND B. É a soma de 2 bits: 1 + 1 = 10.' }),
    FA: () => ({ ins: [I('A', 18, 104), I('B', 18, 148), I('C', 18, 196)], gates: [{ id: 'x1', op: 'XOR', from: ['A', 'B'], x: 56, y: 114 }, { id: 'a1', op: 'AND', from: ['A', 'B'], x: 56, y: 162 }, { id: 'x2', op: 'XOR', from: ['x1', 'C'], x: 100, y: 126 }, { id: 'a2', op: 'AND', from: ['x1', 'C'], x: 100, y: 192 }, { id: 'o1', op: 'OR', from: ['a1', 'a2'], x: 132, y: 176 }], outs: [{ from: 'x2', x: 160, y: 126, name: 'SOMA' }, { from: 'o1', x: 160, y: 176, name: 'VAI-UM' }], expr: 'SOMA = A XOR B XOR C', hint: 'Somador completo: SOMA = A XOR B XOR Cin; VAI-UM = (A AND B) OR (Cin AND (A XOR B)).' })
  };
  const SN = { A: 0, B: 1, C: 2 };

  class Logic extends NI.engines.Rounds {
    constructor(ctx, phase) { super(ctx, phase); this.c = null; this.stage = 'idle'; this.hold = 0; this.vals = {}; this.shake = {}; }

    /* ---------- lógica do circuito ---------- */
    evalC(c, v) { // v: valores das entradas (na ordem de c.ins) -> { id: valor }
      const m = {}; c.ins.forEach((s, i) => m[s.name] = v[i]); c.gates.forEach(g => { m[g.id] = L.gate(g.op, m[g.from[0]], g.op === 'NOT' ? 0 : m[g.from[1]]); }); return m;
    }
    matchV(c, v) { const m = this.evalC(c, v); return c.outs.every(o => m[o.from] === o.target); }
    matches(c) { return this.matchV(c, c.ins.map(s => s.val)); }
    solutions(c) { const n = c.ins.length, out = []; for (let k = 0; k < 1 << n; k++) { const v = c.ins.map((s, i) => s.locked ? s.val : k >> i & 1); if (this.matchV(c, v) && !out.some(o => o.join() === v.join())) out.push(v); } return out; }

    make() {
      const w = this.wave, R = this.R;
      for (let tries = 0; tries < 80; tries++) {
        const name = R.pick(w.tpls), ops = [R.pick(w.ops), R.pick(w.ops)], c = TPL[name](ops); c.tpl = name;
        const n = c.ins.length, sol = c.ins.map(() => R.int(0, 1)), tgt = this.evalC(c, sol), lockN = Math.min(w.lock || 0, n - 1), idx = R.sample([...Array(n).keys()], lockN);
        c.ins.forEach((s, i) => { s.locked = idx.includes(i); s.val = s.locked ? sol[i] : R.int(0, 1); }); c.outs.forEach(o => o.target = tgt[o.from]);
        if (this.matches(c)) continue; return c;
      }
      throw new Error('não consegui montar um circuito');
    }
    startRound() {
      const w = this.wave; this.c = this.make(); this.stage = 'play'; this.hold = 0; this.pt = 0; this.togs = 0; this.shake = {}; this.msg = '';
      const cur = this.c.ins.map(s => s.val); this.minTog = Math.min(...this.solutions(this.c).map(v => v.filter((b, i) => b !== cur[i]).length));
      this.T = w.time ? w.time / (1 + (this.ctx.skill - 1) * 0.6) : 0; this.tLeft = this.T; this.prev = this.evalC(this.c, cur);
    }
    toggle(i) {
      const c = this.c, s = c.ins[i]; if (this.stage !== 'play' || !s) return;
      if (s.locked) { A.sfx('no'); fx.text(s.x, s.y - 16, 'TRAVADA', PAL.S); this.shake[i] = 0.25; return; }
      s.val ^= 1; this.togs++; this.hold = 0; A.sfx('flip'); const m = this.evalC(c, c.ins.map(q => q.val)); let k = 0;
      c.gates.forEach(g => { if (m[g.id] !== this.prev[g.id] && k++ < 3) A.sfx('gate', { g: g.op }); }); this.prev = m;
    }
    win() {
      const c = this.c, ctx = this.ctx; this.stage = 'done'; A.sfx('win'); fx.flash(PAL.G, 0.12);
      c.outs.forEach(o => fx.burst(o.x, o.y, 16, [PAL.G, PAL.Y, PAL.W], { speed: 80 }));
      ctx.right('logic', c.outs[0].x, c.outs[0].y - 14, { pts: 200 }); if (this.togs <= this.minTog) { ctx.addScore(150, 90, 100, PAL.Y); fx.text(90, 92, 'DIRETO!', PAL.G, { scale: 2 }); }
      this.endRound(true, 1.4);
    }
    lose() {
      const c = this.c, sol = this.solutions(c)[0]; if (sol) { c.ins.forEach((s, i) => s.val = sol[i]); this.msg = 'UMA SOLUÇÃO: ' + c.ins.map((s, i) => s.name + '=' + sol[i]).join('  '); }
      const hint = c.hint || OPHINT[c.gates[c.gates.length - 1].op] || OPHINT.AND; this.stage = 'done';
      this.ctx.leak('logic', hint, 90, 150); this.endRound(false, 2.4);
    }
    tick(dt, ended, between) {
      for (const k in this.shake) { this.shake[k] -= dt; if (this.shake[k] <= 0) delete this.shake[k]; }
      if (between || ended || this.stage !== 'play') return;
      this.pt += dt;
      if (this.matches(this.c)) { this.hold += dt; if (this.hold >= 0.3) this.win(); } else this.hold = 0;
      if (this.T && this.stage === 'play') { this.tLeft -= dt; if (this.tLeft < 3 && Math.floor(this.tLeft * 2) !== Math.floor((this.tLeft + dt) * 2)) A.sfx('tick'); if (this.tLeft <= 0) this.lose(); }
    }

    bot(dt) {
      const D = NI.debug, acc = D.botAcc === undefined ? 1 : D.botAcc; this.botT -= dt; if (this.botT > 0 || this.stage !== 'play' || this.pt < (D.botDelay || 0) * 0.6) return;
      this.botT = (D.botDelay || 0) * 0.25 + 0.3 + this.R() * 0.3; const c = this.c, cur = c.ins.map(s => s.val);
      let best = null, bd = 99; this.solutions(c).forEach(v => { const d = v.filter((b, i) => b !== cur[i]).length; if (d < bd) { bd = d; best = v; } });
      if (!best) return; const diff = cur.map((b, i) => best[i] !== b ? i : -1).filter(i => i >= 0); if (!diff.length) return;
      const free = c.ins.map((s, i) => s.locked ? -1 : i).filter(i => i >= 0); this.toggle(this.R() <= acc ? diff[0] : this.R.pick(free));
    }
    onDown(p) { if (this.stage !== 'play') return; this.c.ins.forEach((s, i) => { if (Math.abs(p.x - s.x) < 17 && Math.abs(p.y - s.y) < 15) this.toggle(i); }); }

    /* ---------- desenho ---------- */
    wire(g, pts, on) {
      g.fillStyle = on ? PAL.Y : WIRE0; let len = 0; const segs = [];
      for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], l = Math.abs(x1 - x0) + Math.abs(y1 - y0); segs.push([x0, y0, x1, y1, l]); len += l; g.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) + 1, Math.abs(y1 - y0) + 1); }
      if (on) { g.fillStyle = PAL.W; for (let k = 0; k < 2; k++) { let d = ((this.t * 36 + k * len / 2) % len), s = 0; while (s < segs.length - 1 && d > segs[s][4]) { d -= segs[s][4]; s++; } const sg = segs[s], f = sg[4] ? d / sg[4] : 0; g.fillRect(Math.round(sg[0] + (sg[2] - sg[0]) * f) - 0, Math.round(sg[1] + (sg[3] - sg[1]) * f) - 0, 2, 2); } }
    }
    route(a, b) { const mx = Math.round((a[0] + b[0]) / 2); return [a, [mx, a[1]], [mx, b[1]], b]; }
    drawTable(g, c) {
      const n = c.ins.length, m = c.outs.length, rows = 1 << n, cw = 17, tw = (n + m) * cw, x0 = Math.round((W - tw) / 2), y0 = 238, cur = c.ins.map(s => s.val);
      c.ins.forEach((s, i) => F.draw(g, s.name, x0 + i * cw + cw / 2, y0, PAL.C, 1, 'c', PAL.K)); c.outs.forEach((o, i) => F.draw(g, m > 1 ? (i ? 'V' : 'S') : 'OUT', x0 + (n + i) * cw + cw / 2, y0, PAL.Y, 1, 'c', PAL.K));
      for (let r = 0; r < rows; r++) {
        const v = c.ins.map((s, i) => rows > 1 ? (r >> (n - 1 - i)) & 1 : 0), mm = this.evalC(c, v), y = y0 + 10 + r * 9, ok = c.outs.every(o => mm[o.from] === o.target), here = v.join() === cur.join();
        if (here) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x0 - 2, y - 1, tw + 3, 9); }
        v.forEach((b, i) => F.draw(g, String(b), x0 + i * cw + cw / 2, y, PAL.W, 1, 'c')); c.outs.forEach((o, i) => F.draw(g, String(mm[o.from]), x0 + (n + i) * cw + cw / 2, y, ok ? PAL.G : PAL.S, 1, 'c'));
      }
      g.fillStyle = PAL.S; g.fillRect(x0 + n * cw - 1, y0 + 1, 1, 10 + rows * 9);
    }
    draw(g) {
      if (!this.wave || !this.c || this.state === 'intro' || this.state === 'clear') return;
      const c = this.c, cur = c.ins.map(s => s.val), m = this.evalC(c, cur), hintOn = this.hint;
      this.header(g, this.T && this.stage === 'play' ? Math.max(0, this.tLeft / this.T) : null, 'CIRCUITO');
      F.draw(g, c.outs.length > 1 ? 'ABRA AS DUAS PORTAS' : 'ABRA A PORTA: SAÍDA = ALVO', W / 2, 50, PAL.W, 1, 'c', PAL.K);
      if (hintOn) F.draw(g, c.expr, W / 2, 61, PAL.G, 1, 'c', PAL.K); else F.draw(g, 'ACHE A COMBINAÇÃO DAS CHAVES', W / 2, 61, PAL.S, 1, 'c', PAL.K);
      // fios
      const src = id => { const s = c.ins.find(q => q.name === id); return s ? [s.x + 13, s.y] : (g2 => [g2.x + 13, g2.y])(c.gates.find(q => q.id === id)); };
      c.gates.forEach(gt => gt.from.forEach((f, k) => { const a = src(f), b = [gt.x - 13, gt.y + (gt.from.length === 2 ? (k ? 4 : -4) : 0)]; this.wire(g, this.route(a, b), m[f] === 1); }));
      c.outs.forEach(o => this.wire(g, this.route(src(o.from), [o.x - 8, o.y]), m[o.from] === 1));
      // portas lógicas
      c.gates.forEach(gt => {
        const x = gt.x - 13, y = gt.y - 7, v = m[gt.id]; g.fillStyle = PAL.K; g.fillRect(x, y + 1, 26, 14); g.fillStyle = '#1b2050'; g.fillRect(x, y, 26, 14); g.fillStyle = v ? PAL.Y : PAL.S; g.fillRect(x, y, 26, 1); g.fillRect(x, y + 13, 26, 1); g.fillRect(x, y, 1, 14); g.fillRect(x + 25, y, 1, 14);
        F.draw(g, gt.op, gt.x, y + 4, v ? PAL.Y : PAL.W, 1, 'c');
      });
      // chaves de entrada
      c.ins.forEach((s, i) => {
        const sx = this.shake[i] ? Math.round(Math.sin(this.t * 60) * 2) : 0; const r = { x: s.x - 13 + sx, y: s.y - 10, w: 26, h: 20 };
        UI.button(g, r, '', { color: s.locked ? '#3a3a58' : s.val ? PAL.Y : OFF }); F.draw(g, s.name, r.x + 5, r.y + 6, s.val && !s.locked ? PAL.K : PAL.C, 1, 'l'); F.draw(g, String(s.val), r.x + 17, r.y + 3, s.val && !s.locked ? PAL.K : PAL.W, 2, 'c');
        if (s.locked) NI.spr.draw(g, 'lock', r.x + 22, r.y - 3, { scale: 1 });
      });
      // portas de saída e alvos
      c.outs.forEach(o => {
        const ok = m[o.from] === o.target, x = o.x - 8, y = o.y - 11, open = ok && (this.hold > 0 || this.stage === 'done');
        g.fillStyle = PAL.K; g.fillRect(x, y + 1, 16, 22); g.fillStyle = ok ? PAL.G : PAL.R; g.fillRect(x, y, 16, 22); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + 2, y + 2, 12, 18);
        F.draw(g, String(m[o.from]), o.x, y + 4, PAL.W, 2, 'c'); if (open) { g.fillStyle = PAL.W; g.globalAlpha = 0.5 + 0.5 * this.pulse(14); g.fillRect(x - 1, y - 1, 18, 1); g.fillRect(x - 1, y + 22, 18, 1); g.globalAlpha = 1; }
        F.draw(g, o.name, o.x, y - 9, PAL.S, 1, 'c', PAL.K); F.draw(g, 'ALVO ' + o.target, o.x, y + 27, PAL.Y, 1, 'c', PAL.K);
      });
      if (this.stage === 'done' && this.msg) F.para(g, this.msg, 8, 252, 164, PAL.G, 1, 9, 'c');
      else if (hintOn && c.ins.length <= 2 && c.gates.length <= 2 && c.tpl !== 'T2n') this.drawTable(g, c);
      else if (hintOn && c.hint) F.para(g, c.hint, 8, 246, 164, PAL.G, 1, 9, 'c');
      else if (!hintOn) F.draw(g, 'FIOS AMARELOS = SINAL 1', W / 2, 262, PAL.S, 1, 'c', PAL.K);
    }
  }
  NI.engines.logic = Logic;

  const w = (n, time, tpls, ops, o) => Object.assign({ n, time, tpls, ops }, o);
  const ALL = ['AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR'];
  NI.tcfg.logic = {
    waves: [
      w(4, 0, ['T1', 'T1n'], ['AND', 'OR', 'XOR'], { hint: true, title: 'TREINO', sub: 'a tabela-verdade mostra a regra de cada porta', recap: 'AND: todas 1. OR: pelo menos uma 1. NOT inverte. XOR: entradas diferentes.' }),
      w(5, 12, ['T1', 'T2n'], ALL, { title: 'TESTE', sub: 'sem tabela: descubra mexendo', recap: 'NAND = NOT AND, NOR = NOT OR, XNOR = entradas iguais. NAND e NOR sozinhas montam qualquer circuito.' }),
      w(3, 12, ['HA'], ['XOR'], { hint: true, title: 'MEIO SOMADOR', sub: 'SOMA = XOR  VAI-UM = AND', recap: 'Meio somador: 1 + 1 = 10 (soma 0, vai-um 1). O somador completo soma também o vai-um que chega.' }),
      w(5, 14, ['T2', 'T3', 'FA'], ALL, { title: 'ONDA FINAL', sub: 'circuitos maiores e chaves travadas', lock: 1 })
    ]
  };
})();
