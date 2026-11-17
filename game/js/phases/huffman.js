/* Fase 2-3 "FORJA DE HUFFMAN": junte SEMPRE os dois símbolos de menor frequência até sobrar uma árvore; depois leia os códigos.
   Ensina: código de Huffman, código livre de prefixo (nenhum código é início de outro), símbolo raro = código longo, compressão sem perda. */
(function () {
  'use strict';
  const NI = window.NI, W = NI.W, PAL = NI.PAL, F = NI.font, UI = NI.ui, A = NI.audio, fx = NI.fx, U = NI.U;
  const PY = 96, PH = 28, LETTERS = 'ABCDEFGH';

  class Huffman extends NI.engines.Rounds {
    constructor(ctx, phase) { super(ctx, phase); this.pool = []; this.stage = 'merge'; this.log = []; this.sel = -1; this.btns = []; this.wrongRun = 0; this.shake = 0; }

    startRound() {
      const w = this.wave, R = this.R, k = w.k; let f;
      do { f = []; for (let i = 0; i < k; i++) f.push(R.int(1, w.max || 9)); } while (new Set(f).size < Math.min(k, 3));
      const letters = LETTERS.slice(0, k).split(''); this.freq = f; this.letters = letters; this.n = f.reduce((a, b) => a + b, 0);
      this.pool = f.map((fr, i) => ({ sym: letters[i], f: fr, name: letters[i], x: 90, y: PY, pop: 0 })); this.order();
      this.pool.forEach(t => t.x = t.tx);
      this.log = []; this.sel = -1; this.stage = 'merge'; this.treeT = 0; this.root = null; this.q = null; this.btns = []; this.msg = ''; this.wrongRun = 0;
      this.T = w.perMerge ? (k - 1) * w.perMerge / (1 + (this.ctx.skill - 1) * 0.6) : 0; this.tLeft = this.T; this.pt = 0;
    }
    order() { // posição dos blocos (no treino a fila é mantida ordenada, como no algoritmo)
      if (this.wave.sorted) this.pool.sort((a, b) => a.f - b.f || a.name.length - b.name.length);
      const m = this.pool.length; this.pool.forEach((t, i) => { t.tx = 4 + (i + 0.5) * 172 / m; t.w = Math.min(34, Math.floor(172 / m) - 3); });
    }
    smallest() { const s = this.pool.slice().sort((a, b) => a.f - b.f); return [s[0], s[1]]; }
    isPair(a, b) { const s = this.pool.map(t => t.f).sort((x, y) => x - y), m = [a.f, b.f].sort((x, y) => x - y); return a !== b && m[0] === s[0] && m[1] === s[1]; }

    pick(i) {
      if (this.stage !== 'merge' || i < 0 || i >= this.pool.length) return;
      const t = this.pool[i], ctx = this.ctx; A.sfx('tap');
      if (this.sel < 0) { this.sel = i; return; }
      if (this.sel === i) { this.sel = -1; return; }
      this.merge(this.pool[this.sel], t);
    }
    merge(a, b) {
      const ctx = this.ctx, x = (a.x + b.x) / 2;
      if (!this.isPair(a, b)) {
        const [s1, s2] = this.smallest(); this.sel = -1; this.shake = 0.3;
        ctx.wrong('huffman', 'Huffman junta SEMPRE os dois menores: ' + s1.f + ' e ' + s2.f + '. Quem aparece pouco ganha o código mais longo.', x, PY + 10, { silent: false });
        if (!this.hint && ++this.wrongRun >= 2) { this.wrongRun = 0; ctx.hurt(1, x, PY + 10, 'erros'); }
        return;
      }
      this.wrongRun = 0; this.sel = -1;
      const n = { l: a, r: b, f: a.f + b.f, name: a.name + b.name, x, y: PY, pop: 1 };
      this.pool = this.pool.filter(t => t !== a && t !== b); this.pool.push(n); this.log.push(a.f + ' + ' + b.f + ' = ' + n.f); this.order();
      A.sfx('merge'); this.flare = 1; fx.burst(x, PY + 14, 12, [PAL.O, PAL.Y, PAL.W], { speed: 60 }); fx.shake(2, 0.12); ctx.right('huffman', x, PY + 14, { pts: 100 });
      if (this.pool.length === 1) this.forged();
    }
    codes(n, c, out) { if (!n.l) out[n.sym] = c || '0'; else { this.codes(n.l, c + '0', out); this.codes(n.r, c + '1', out); } return out; }
    forged() {
      this.stage = 'tree'; this.treeT = 0; this.root = this.pool[0]; this.code = this.codes(this.root, '', {});
      const fixed = Math.ceil(Math.log2(this.letters.length)) * this.n; let huff = 0; this.freq.forEach((f, i) => huff += f * this.code[this.letters[i]].length);
      this.fixed = fixed; this.huff = huff; A.sfx('win'); fx.flash(PAL.O, 0.15);
      // posições da árvore: folhas em ordem, nós internos no meio dos filhos
      let idx = 0; const k = this.letters.length, dx = 164 / k, place = n => {
        if (!n.l) { n.h = 0; n.tx2 = 8 + dx * (idx++ + 0.5); } else { place(n.l); place(n.r); n.h = Math.max(n.l.h, n.r.h) + 1; n.tx2 = (n.l.tx2 + n.r.tx2) / 2; } };
      place(this.root); const step = Math.min(30, 118 / this.root.h), setY = n => { n.ty2 = 218 - n.h * step; if (n.l) { setY(n.l); setY(n.r); } }; setY(this.root);
    }
    askQuestion() {
      const R = this.R, syms = this.letters, lens = syms.map(s => this.code[s].length), minL = Math.min(...lens), uniqMin = lens.filter(l => l === minL).length === 1;
      if (uniqMin && R() < 0.4) { // "qual símbolo tem o MENOR código?" -> o mais frequente
        const right = syms[lens.indexOf(minL)], opts = R.shuffle([right, ...R.sample(syms.filter(s => s !== right), 2)]);
        this.q = { text: 'QUAL SÍMBOLO TEM O MENOR CÓDIGO?', opts, right: opts.indexOf(right), hint: 'O símbolo MAIS frequente ganha o código MAIS curto: ' + right + ' (frequência ' + this.freq[syms.indexOf(right)] + ').' };
      } else {
        const s = R.pick(syms), right = this.code[s], others = [...new Set(syms.filter(x => x !== s).map(x => this.code[x]).filter(c => c !== right))], opts = R.shuffle([right, ...R.sample(others, 2)]);
        this.q = { text: 'QUAL É O CÓDIGO DE ' + s + '?', opts, right: opts.indexOf(right), hint: 'Siga a árvore da raiz até a folha ' + s + ': esquerda = 0, direita = 1. Código de ' + s + ' = ' + right + '.' };
      }
      this.stage = 'ask'; this.qT = 8; this.btns = this.q.opts.map((o, i) => ({ x: 6 + i * 56, y: 277, w: 52, h: 28, label: o })); A.sfx('ask');
    }
    answer(i) {
      if (this.stage !== 'ask') return; const ctx = this.ctx, q = this.q, b = this.btns[i]; this.stage = 'done'; this.qSel = i;
      if (i === q.right) ctx.right('huffman', b.x + b.w / 2, b.y, { pts: 200 }); else ctx.wrong('huffman', q.hint, b.x + b.w / 2, b.y);
      this.msg = 'FIXO ' + this.fixed + ' BITS → HUFFMAN ' + this.huff + ' BITS (-' + Math.round((1 - this.huff / this.fixed) * 100) + '%)'; this.endRound(i === q.right, 2.2);
    }
    autoForge() { // tempo esgotado: a forja termina sozinha, mostrando como seria o certo
      while (this.pool.length > 1) { const [a, b] = this.smallest(); const n = { l: a, r: b, f: a.f + b.f, name: a.name + b.name, x: (a.x + b.x) / 2, y: PY, pop: 1 }; this.pool = this.pool.filter(t => t !== a && t !== b); this.pool.push(n); }
      this.order(); this.forged(); this.stage = 'done'; this.msg = 'FIXO ' + this.fixed + ' BITS → HUFFMAN ' + this.huff + ' BITS (-' + Math.round((1 - this.huff / this.fixed) * 100) + '%)';
      this.ctx.leak('huffman', 'Junte sempre os dois menores até restar um só nó: a raiz. Os códigos saem do caminho raiz → folha.', 90, PY + 10); this.endRound(false, 2.6);
    }

    tick(dt, ended, between) {
      for (const t of this.pool) { t.x += (t.tx - t.x) * Math.min(1, dt * 12); if (t.pop > 0) t.pop -= dt * 4; }
      if (this.shake > 0) this.shake -= dt; if (this.flare > 0) this.flare -= dt * 2; if (between || ended) { this.treeT += dt; return; }
      this.pt += dt;
      if (this.stage === 'merge' && this.T) { this.tLeft -= dt; if (this.tLeft <= 0) this.autoForge(); }
      else if (this.stage === 'tree') { this.treeT += dt; if (this.treeT > 1.9) this.askQuestion(); }
      else if (this.stage === 'ask') { this.qT -= dt; if (this.qT <= 0) { this.ctx.wrong('huffman', this.q.hint, 90, 270); this.stage = 'done'; this.msg = 'FIXO ' + this.fixed + ' BITS → HUFFMAN ' + this.huff + ' BITS (-' + Math.round((1 - this.huff / this.fixed) * 100) + '%)'; this.endRound(false, 2.2); } }
    }

    bot(dt) {
      const D = NI.debug, acc = D.botAcc === undefined ? 1 : D.botAcc; this.botT -= dt; if (this.botT > 0) return;
      if (this.stage === 'merge') {
        if (this.pt < (D.botDelay || 0) * 0.3) return; this.botT = (D.botDelay || 0) * 0.35 + 0.3 + this.R() * 0.3;
        let a, b; if (this.R() <= acc) { [a, b] = this.smallest(); } else { const s = this.R.sample(this.pool, 2); a = s[0]; b = s[1]; }
        this.pick(this.pool.indexOf(a)); this.pick(this.pool.indexOf(b));
      } else if (this.stage === 'ask') {
        if (this.qT > 8 - (D.botDelay || 0) * 0.5) return; this.botT = 0.3; this.answer(this.R() <= acc ? this.q.right : (this.q.right + 1) % 3);
      }
    }

    onDown(p) {
      if (this.stage === 'ask') { const i = this.btns.findIndex(b => UI.hit(b, p)); if (i >= 0) this.answer(i); return; }
      if (this.stage !== 'merge') return;
      let bi = -1, bd = 1e9; this.pool.forEach((t, i) => { const d = Math.abs(p.x - t.x); if (p.y > PY - 14 && p.y < PY + PH + 14 && d < bd && d < t.w / 2 + 6) { bd = d; bi = i; } }); if (bi >= 0) this.pick(bi);
    }

    /* ---------- desenho ---------- */
    token(g, t, sel, glow) {
      const w = t.w, h = PH, x = Math.round(t.x - w / 2), y = Math.round(t.y + Math.sin(this.t * 2 + t.tx * 0.1) * 1 - (sel ? 4 : 0)), pop = t.pop > 0 ? 1 + t.pop * 0.25 : 1;
      const bw = Math.round(w * pop), bx = Math.round(t.x - bw / 2);
      g.fillStyle = PAL.K; g.fillRect(bx, y + 2, bw, h);
      g.fillStyle = t.l ? PAL.O : PAL.C; g.fillRect(bx, y, bw, h - 1); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(bx + 1, y, bw - 2, 1); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(bx, y + h - 4, bw, 3);
      if (sel || glow) { g.strokeStyle = PAL.W; g.globalAlpha = sel ? 1 : 0.4 + 0.6 * this.pulse(10); g.lineWidth = 1; g.strokeRect(bx - 0.5, y - 0.5, bw + 1, h); g.globalAlpha = 1; }
      const nm = t.name.length > 3 ? t.name.slice(0, 2) + '+' : t.name, sc = w >= 26 ? 2 : 1;
      F.draw(g, nm, t.x, y + 3, PAL.K, 1, 'c'); F.draw(g, String(t.f), t.x, y + (sc === 2 ? 12 : 14), PAL.K, sc, 'c');
    }
    drawTree(g) {
      const e = Math.min(1, this.treeT / 1.2), r = this.root; if (!r) return;
      const walk = (n, f) => { f(n); if (n.l) { walk(n.l, f); walk(n.r, f); } };
      g.lineWidth = 1;
      walk(r, n => {
        if (!n.l) return;
        [[n.l, '0'], [n.r, '1']].forEach(([c, b]) => {
          g.strokeStyle = PAL.S; g.beginPath(); g.moveTo(Math.round(n.tx2) + 0.5, Math.round(n.ty2) + 6); g.lineTo(Math.round(c.tx2) + 0.5, Math.round(c.ty2) - 6); g.stroke();
          F.draw(g, b, (n.tx2 + c.tx2) / 2 + (b === '0' ? -5 : 5), (n.ty2 + c.ty2) / 2 - 2, b === '0' ? PAL.C : PAL.O, 1, 'c', PAL.K);
        });
      });
      let i = 0;
      walk(r, n => {
        const x = Math.round(n.tx2), y = Math.round(n.ty2);
        if (n.l) { g.fillStyle = PAL.K; g.fillRect(x - 9, y - 6, 18, 13); g.fillStyle = PAL.O; g.fillRect(x - 9, y - 7, 18, 12); F.draw(g, String(n.f), x, y - 4, PAL.K, 1, 'c'); }
        else {
          g.fillStyle = PAL.K; g.fillRect(x - 8, y - 6, 16, 13); g.fillStyle = PAL.C; g.fillRect(x - 8, y - 7, 16, 12); F.draw(g, n.sym, x, y - 4, PAL.K, 1, 'c');
          F.draw(g, this.code[n.sym], x, y + 8 + ((i++ % 2) ? 9 : 0), e >= 1 ? PAL.Y : PAL.S, 1, 'c', PAL.K);
        }
      });
    }
    furnace(g) { // a forja: chama maior a cada fusão
      const fl = Math.max(0, this.flare || 0), cx = 90, fr = ((this.t * 8) | 0) % 2 ? 'flame1' : 'flame2';
      g.fillStyle = '#2a1a1a'; g.fillRect(cx - 34, 252, 68, 46); g.fillRect(cx + 14, 232, 12, 22);
      g.fillStyle = '#3d2626'; for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) g.fillRect(cx - 33 + c * 13 + (r % 2) * 6, 254 + r * 11, 11, 9);
      g.fillStyle = PAL.K; g.fillRect(cx - 16, 262, 32, 28); g.fillStyle = 'rgba(255,120,30,' + (0.5 + fl * 0.5).toFixed(2) + ')'; g.fillRect(cx - 14, 264, 28, 26);
      NI.spr.draw(g, fr, cx, 280, { scale: 3 + Math.round(fl * 3) }); if (fl > 0) NI.spr.draw(g, 'flame2', cx - 8, 278, { scale: 2 });
    }
    draw(g) {
      if (!this.wave || this.state === 'intro' || this.state === 'clear') return;
      this.header(g, this.T && this.stage === 'merge' ? Math.max(0, this.tLeft / this.T) : null, 'RODADA');
      F.draw(g, 'JUNTE OS 2 MENORES', W / 2, 50, PAL.W, 1, 'c', PAL.K);
      F.draw(g, 'MENSAGEM COM ' + this.n + ' SÍMBOLOS', W / 2, 60, PAL.S, 1, 'c', PAL.K);
      if (this.stage === 'merge') {
        const glow = this.hint ? this.smallest() : [];
        this.pool.forEach((t, i) => this.token(g, t, i === this.sel, glow.includes(t)));
        const ly = PY + PH + 14;
        if (this.sel >= 0) F.draw(g, 'AGORA TOQUE NO OUTRO', W / 2, ly, PAL.Y, 1, 'c', PAL.K);
        else F.draw(g, this.hint ? 'OS 2 MENORES BRILHAM' : 'TOQUE EM 2 BLOCOS', W / 2, ly, this.hint ? PAL.G : PAL.S, 1, 'c', PAL.K);
        this.log.slice(-4).forEach((s, i, a) => F.draw(g, (this.log.length - a.length + i + 1) + ') ' + s, 14, ly + 16 + i * 10, PAL.S, 1, 'l', PAL.K));
        this.furnace(g);
      } else {
        this.drawTree(g);
        if (this.stage === 'done') F.para(g, this.msg, 6, 258, 168, PAL.G, 1, 9, 'c');
        else if (this.stage === 'ask') F.draw(g, 'CÓDIGO LIVRE DE PREFIXO', W / 2, 250, PAL.Y, 1, 'c', PAL.K);
        else F.draw(g, 'ESQUERDA = 0   DIREITA = 1', W / 2, 262, PAL.Y, 1, 'c', PAL.K);
      }
      if (this.stage === 'ask') {
        F.draw(g, this.q.text, W / 2, 263, PAL.W, 1, 'c', PAL.K); UI.bar(g, 6, 313, 168, 3, this.qT / 8, PAL.O, '#10142e');
        this.btns.forEach(b => UI.button(g, b, b.label, { color: PAL.C, scale: b.label.length > 4 ? 1 : 2 }));
      } else if (this.stage === 'done' && this.q) this.btns.forEach((b, i) => UI.button(g, b, b.label, { color: i === this.q.right ? PAL.G : i === this.qSel ? PAL.R : '#3a3a58', scale: b.label.length > 4 ? 1 : 2, disabled: i !== this.q.right && i !== this.qSel }));
    }
  }
  NI.engines.huffman = Huffman;

  const w = (n, k, o) => Object.assign({ n, k }, o);
  NI.tcfg.huffman = {
    waves: [
      w(2, 4, { hint: true, sorted: true, max: 8, title: 'TREINO', sub: 'junte os dois MENORES, sempre', recap: 'Huffman: junte os dois de menor frequência, some, repita. A raiz é a soma total.' }),
      w(3, 5, { perMerge: 6, max: 9, title: 'TESTE', sub: 'sem ajuda: ache os menores', recap: 'Símbolo frequente = código curto. Símbolo raro = código longo. Nenhum código é prefixo de outro.' }),
      w(3, 6, { perMerge: 5, max: 12, title: 'DESAFIO', sub: 'mais símbolos, menos tempo', recap: 'Huffman nunca fica pior que o código de tamanho fixo e é ótimo entre os códigos livres de prefixo.' }),
      w(3, 7, { perMerge: 4.5, max: 14, title: 'ONDA FINAL', sub: 'forje os 7 símbolos' })
    ]
  };
})();
