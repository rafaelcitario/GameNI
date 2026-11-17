/* Fase 3-2 "CÓDIGO DE HAMMING": pacotes de 7 bits chegam com ruído no canal. Os 3 círculos de paridade (diagrama de Venn)
   ficam VERMELHOS quando têm número ímpar de 1s: o bit errado é o que está em todos os círculos vermelhos e em nenhum verde.
   Modos: corrigir (síndrome), codificar (escolher os bits de paridade) e distância de Hamming. */
(function () {
  'use strict';
  const NI = window.NI, W = NI.W, PAL = NI.PAL, F = NI.font, UI = NI.ui, A = NI.audio, fx = NI.fx, U = NI.U, L = NI.logic;
  const C = [[72, 142], [108, 142], [90, 172]], RAD = 34;
  const POS = [[50, 130], [130, 130], [90, 124], [90, 200], [66, 166], [114, 166], [90, 150]]; // posições 1..7: p1 p2 d1 p3 d2 d3 d4
  const NAMES = ['P1', 'P2', 'D1', 'P3', 'D2', 'D3', 'D4'], PAR = [0, 1, 3], MEM = [[0, 2, 4, 6], [1, 2, 5, 6], [3, 4, 5, 6]];
  const rnd4 = R => [R.int(0, 1), R.int(0, 1), R.int(0, 1), R.int(0, 1)];

  function ring(g, cx, cy, r, col) { // círculo em pixels (algoritmo do ponto médio)
    g.fillStyle = col; let x = r, y = 0, d = 1 - r;
    const put = (a, b) => { g.fillRect(cx + a, cy + b, 1, 1); g.fillRect(cx - a, cy + b, 1, 1); g.fillRect(cx + a, cy - b, 1, 1); g.fillRect(cx - a, cy - b, 1, 1); };
    while (x >= y) { put(x, y); put(y, x); y++; if (d < 0) d += 2 * y + 1; else { x--; d += 2 * (y - x) + 1; } }
  }
  function disc(g, cx, cy, r, col) { g.fillStyle = col; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + 0.5)); g.fillRect(cx - w, cy + dy, 2 * w + 1, 1); } }

  class Hamming extends NI.engines.Rounds {
    constructor(ctx, phase) { super(ctx, phase); this.word = new Array(7).fill(0); this.mode = 'fix'; this.stage = 'idle'; this.btns = []; this.pops = new Array(7).fill(0); this.wrongRun = 0; }
    circles() { return L.hamCircles(this.word); }
    startRound() {
      const w = this.wave, R = this.R; let mode = w.kind; if (mode === 'mix') mode = R.pick(['fix', 'fix', 'encode', 'dist']);
      this.mode = mode; this.stage = 'play'; this.err = -1; this.msg = ''; this.pt = 0; this.okT = 0; this.btns = []; this.sel = -1; this.pops.fill(0); this.wrongRun = 0;
      const base = mode === 'dist' ? 9 : mode === 'encode' ? 16 : 12, f = w.kind === 'mix' ? { fix: 1, encode: 1.2, dist: 0.8 }[mode] : 1;
      this.T = w.time ? w.time * base / 12 * f / (1 + (this.ctx.skill - 1) * 0.6) : 0; this.tLeft = this.T;
      if (mode === 'fix') {
        this.data = rnd4(R); this.orig = L.hamEncode(this.data); this.word = this.orig.slice();
        if (R() >= (w.clean || 0)) { this.err = R.int(0, 6); this.word[this.err] ^= 1; A.sfx('zap', { x: POS[this.err][0] }); fx.burst(POS[this.err][0], POS[this.err][1], 10, [PAL.R, PAL.Y, PAL.W], { speed: 70 }); fx.shake(2, 0.15); }
        this.btns = [{ x: 30, y: 274, w: 120, h: 28, label: 'SEM ERRO' }];
      } else if (mode === 'encode') {
        let d, e; do { d = rnd4(R); e = L.hamEncode(d); } while (!(e[0] || e[1] || e[3]));
        this.data = d; this.orig = e; this.word = [0, 0, d[0], 0, d[1], d[2], d[3]];
      } else {
        const a = L.hamEncode(rnd4(R)), b = a.slice(), k = R.int(1, 4); R.sample([0, 1, 2, 3, 4, 5, 6], k).forEach(i => b[i] ^= 1);
        this.wa = a; this.wb = b; this.dist = k; this.btns = [1, 2, 3, 4].map((v, i) => ({ x: 6 + i * 43, y: 274, w: 39, h: 28, label: String(v), v }));
      }
    }
    good(x, y, pts) { this.ctx.right('ham', x, y, { pts: pts || 200 }); fx.burst(x, y, 16, [PAL.G, PAL.W, PAL.C], { speed: 80 }); this.stage = 'done'; this.endRound(true, 1.3); }
    lose(hint, x, y) { this.ctx.leak('ham', hint, x, y); this.stage = 'done'; this.endRound(false, 2.0); }
    miss(hint, x, y) {
      this.ctx.wrong('ham', hint, x, y); if (!this.hint && ++this.wrongRun >= 2) { this.wrongRun = 0; this.ctx.hurt(1, x, y, 'erros'); }
    }
    sync() { const c = this.circles(); return c[0] | (c[1] << 1) | (c[2] << 2); } // síndrome = posição (1..7) do erro

    tap(i) { // toque num bit
      if (this.stage !== 'play') return; const [x, y] = POS[i], s = this.sync();
      if (this.mode === 'fix') {
        if (s === 0) { this.miss('Os 3 círculos estão verdes: o pacote está certo. Toque em SEM ERRO e não mexa nos bits.', x, y); return; }
        if (i === s - 1) { this.word[i] ^= 1; this.pops[i] = 1; A.sfx('flip'); this.msg = 'CORRIGIDO! ERA A POSIÇÃO ' + s + ' (' + NAMES[s - 1] + ')'; this.good(x, y); }
        else { const red = this.circles().map((v, k) => v ? k + 1 : 0).filter(Boolean); this.miss('Círculos vermelhos: ' + red.join(' e ') + ' → síndrome ' + red.map(k => 1 << (k - 1)).join('+') + ' = ' + s + ': o bit errado é a posição ' + s + ' (' + NAMES[s - 1] + ').', x, y); }
      } else if (this.mode === 'encode') {
        if (!PAR.includes(i)) { fx.text(x, y - 12, 'TRAVADO', PAL.S); A.sfx('no'); return; }
        const was = this.word[i] === this.orig[i]; this.word[i] ^= 1; this.pops[i] = 1; A.sfx('flip');
        if (was) this.miss('Esse bit de paridade já estava certo. Cada círculo precisa terminar com número PAR de 1s.', x, y);
        if (this.word.every((b, k) => b === this.orig[k])) { this.msg = 'PARIDADES CERTAS: CÍRCULOS PARES'; this.good(90, 150, 250); }
      }
    }
    answer(v) {
      if (this.stage !== 'play' || this.mode !== 'dist') return; const ok = v === this.dist;
      const diff = this.wa.map((b, i) => b !== this.wb[i] ? i + 1 : 0).filter(Boolean); this.msg = 'DIFEREM NAS POSIÇÕES ' + diff.join(', ') + ': DISTÂNCIA = ' + this.dist;
      if (ok) this.good(90, 150, 200); else { this.ctx.wrong('ham', 'Distância de Hamming = quantas posições diferem. Aqui: ' + diff.join(', ') + ' → ' + this.dist + '.', 90, 150); this.stage = 'done'; this.endRound(false, 2.2); }
      this.pickV = v;
    }
    noError() {
      if (this.stage !== 'play' || this.mode !== 'fix') return;
      if (this.sync() === 0) { this.msg = 'PACOTE LIMPO: SÍNDROME 0'; this.good(90, 150, 150); } else this.miss('Há círculo vermelho: o pacote veio corrompido. Ache o bit que está em TODOS os vermelhos e em nenhum verde.', 90, 276);
    }

    tick(dt, ended, between) {
      for (let i = 0; i < 7; i++) if (this.pops[i] > 0) this.pops[i] -= dt * 4;
      if (between || ended || this.stage !== 'play') { this.okT += dt; return; }
      this.pt += dt;
      if (this.T) {
        this.tLeft -= dt; if (this.tLeft < 3 && Math.floor(this.tLeft * 2) !== Math.floor((this.tLeft + dt) * 2)) A.sfx('tick');
        if (this.tLeft <= 0) {
          if (this.mode === 'fix') { this.word = this.orig.slice(); this.msg = 'ERA A POSIÇÃO ' + (this.err + 1) + ' (' + (this.err >= 0 ? NAMES[this.err] : '-') + ')'; this.lose('Síndrome: some os pesos 1, 2 e 4 dos círculos vermelhos para achar a posição do bit errado.', 90, 150); }
          else if (this.mode === 'encode') { this.word = this.orig.slice(); this.lose('Escolha cada bit de paridade para que o seu círculo tenha número PAR de 1s.', 90, 150); }
          else { this.msg = 'A DISTÂNCIA ERA ' + this.dist; this.lose('Compare posição a posição: a distância de Hamming é o número de posições diferentes.', 90, 150); }
        }
      }
    }

    bot(dt) {
      const D = NI.debug, acc = D.botAcc === undefined ? 1 : D.botAcc; this.botT -= dt; if (this.botT > 0 || this.stage !== 'play' || this.pt < (D.botDelay || 0) * 0.6) return;
      this.botT = (D.botDelay || 0) * 0.3 + 0.3 + this.R() * 0.3; const ok = this.R() <= acc;
      if (this.mode === 'fix') {
        if (this.err < 0) { if (ok) this.noError(); else this.tap(this.R.int(0, 6)); }
        else this.tap(ok ? this.err : (this.err + 1 + this.R.int(0, 5)) % 7);
      } else if (this.mode === 'encode') {
        const wrong = PAR.filter(i => this.word[i] !== this.orig[i]); if (!wrong.length) return;
        const fine = PAR.filter(i => this.word[i] === this.orig[i]); this.tap(ok || !fine.length ? wrong[0] : fine[0]);
      } else this.answer(ok ? this.dist : (this.dist % 4) + 1);
    }

    onDown(p) {
      if (this.stage !== 'play') return;
      const b = this.btns.findIndex(b => UI.hit(b, p)); if (b >= 0) { A.sfx('tap'); if (this.mode === 'fix') this.noError(); else this.answer(this.btns[b].v); return; }
      if (this.mode === 'dist') return;
      let bi = -1, bd = 14; POS.forEach(([x, y], i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; bi = i; } }); if (bi >= 0) this.tap(bi);
    }

    /* ---------- desenho ---------- */
    drawVenn(g) {
      const c = this.circles(), pulse = 0.55 + 0.45 * this.pulse(9);
      for (let k = 0; k < 3; k++) {
        const col = c[k] ? PAL.R : PAL.G; g.globalAlpha = c[k] ? pulse : 0.85; ring(g, C[k][0], C[k][1], RAD, col); ring(g, C[k][0], C[k][1], RAD - 1, col); g.globalAlpha = 1;
        F.draw(g, 'C' + (k + 1), [38, 142, 90][k], [104, 104, 214][k], col, 1, 'c', PAL.K);
      }
      const hintOn = this.hint, need = this.mode === 'encode' ? PAR.filter(i => this.word[i] !== this.orig[i]) : [];
      for (let i = 0; i < 7; i++) {
        const [x, y] = POS[i], par = PAR.includes(i), pop = this.pops[i] > 0 ? 1 + this.pops[i] * 0.6 : 1, r = Math.round(9 * pop);
        const bad = this.mode === 'fix' && i === this.err && this.stage === 'play';
        disc(g, x, y + 1, r, PAL.K); disc(g, x, y, r, par ? PAL.O : PAL.C); if (bad && hintOn) { ring(g, x, y, 11, PAL.W); ring(g, x, y, 12, PAL.W); }
        if (this.mode === 'encode' && hintOn && need.includes(i)) { g.globalAlpha = this.pulse(10); ring(g, x, y, 11, PAL.W); g.globalAlpha = 1; }
        F.draw(g, String(this.word[i]), x, y - 6, PAL.K, 2, 'c');
        if (hintOn || this.stage !== 'play') F.draw(g, NAMES[i], x, y + 11, PAL.S, 1, 'c', PAL.K);
      }
      // lâmpadas dos círculos + síndrome
      for (let k = 0; k < 3; k++) { const x = 8 + k * 57; g.fillStyle = PAL.K; g.fillRect(x, 229, 52, 12); g.fillStyle = c[k] ? PAL.R : PAL.G; g.fillRect(x, 228, 52, 12); F.draw(g, 'C' + (k + 1) + (c[k] ? ' ÍMPAR' : ' PAR'), x + 26, 231, PAL.K, 1, 'c'); }
      const s = this.sync();
      if (this.mode === 'fix') {
        if (hintOn && this.stage === 'play') F.draw(g, s ? 'SÍNDROME ' + c.map((v, k) => v ? 1 << k : 0).filter(Boolean).join('+') + ' = ' + s + ' (' + NAMES[s - 1] + ')' : 'TUDO PAR: SEM ERRO', W / 2, 246, s ? PAL.Y : PAL.G, 1, 'c', PAL.K);
        else if (this.stage !== 'play') F.draw(g, this.msg, W / 2, 246, PAL.G, 1, 'c', PAL.K);
      } else F.draw(g, this.stage === 'play' ? (hintOn ? 'DEIXE OS 3 CÍRCULOS PARES' : 'TOQUE NOS BITS LARANJA') : '', W / 2, 246, PAL.Y, 1, 'c', PAL.K);
    }
    drawWords(g) {
      const rows = [[this.wa, 'A', PAL.C, 100], [this.wb, 'B', PAL.M, 134]], done = this.stage !== 'play';
      rows.forEach(([w, n, col, y]) => { F.draw(g, n, 8, y + 6, col, 1, 'l', PAL.K); w.forEach((b, i) => { const x = 28 + i * 21, diff = done && this.wa[i] !== this.wb[i]; g.fillStyle = PAL.K; g.fillRect(x, y + 1, 19, 22); g.fillStyle = diff ? PAL.Y : col; g.fillRect(x, y, 19, 22); F.draw(g, String(b), x + 9.5, y + 4, PAL.K, 2, 'c'); }); });
      if (done) { F.draw(g, 'XOR', 8, 176, PAL.Y, 1, 'l', PAL.K); this.wa.forEach((b, i) => { const x = 28 + i * 21, d = b ^ this.wb[i]; F.draw(g, String(d), x + 9.5, 172, d ? PAL.Y : PAL.S, 2, 'c', PAL.K); }); F.para(g, this.msg, 8, 200, 164, PAL.G, 1, 9, 'c'); }
      else F.para(g, 'DISTÂNCIA DE HAMMING = QUANTAS POSIÇÕES DIFEREM?', 10, 180, 160, PAL.W, 1, 9, 'c');
    }
    draw(g) {
      if (!this.wave || this.state === 'intro' || this.state === 'clear') return;
      this.header(g, this.T && this.stage === 'play' ? Math.max(0, this.tLeft / this.T) : null, 'PACOTE');
      const t = { fix: 'CONSERTE O BIT CORROMPIDO', encode: 'CALCULE OS BITS DE PARIDADE', dist: 'MEÇA A DISTÂNCIA' }[this.mode];
      F.draw(g, t, W / 2, 50, PAL.W, 1, 'c', PAL.K);
      F.draw(g, this.mode === 'dist' ? 'DOIS PACOTES CHEGARAM' : '4 DADOS + 3 PARIDADES (7,4)', W / 2, 60, PAL.S, 1, 'c', PAL.K);
      if (this.mode === 'dist') this.drawWords(g); else this.drawVenn(g);
      if (this.mode === 'fix' && this.stage === 'play') this.btns.forEach(b => UI.button(g, b, b.label, { color: PAL.G, scale: 1 }));
      if (this.mode === 'dist') this.btns.forEach(b => UI.button(g, b, b.label, { color: this.stage !== 'play' ? (b.v === this.dist ? PAL.G : b.v === this.pickV ? PAL.R : '#3a3a58') : PAL.C, scale: 2 }));
    }
  }
  NI.engines.hamming = Hamming;

  const w = (n, kind, time, o) => Object.assign({ n, kind, time }, o);
  NI.tcfg.hamming = {
    waves: [
      w(3, 'fix', 0, { hint: true, title: 'TREINO', sub: 'o erro está só nos círculos vermelhos', recap: 'Círculo vermelho = número ímpar de 1s. O bit errado está em todos os vermelhos e em nenhum verde.' }),
      w(5, 'fix', 10, { clean: 0.25, title: 'TESTE', sub: 'sem ajuda; alguns pacotes vêm limpos', recap: 'Síndrome: círculos vermelhos valem 1, 2 e 4. A soma é a posição do bit errado. Zero = sem erro.' }),
      w(3, 'encode', 16, { hint: true, title: 'CODIFICAR', sub: 'escolha os bits de paridade', recap: 'Cada bit de paridade é escolhido para deixar o seu círculo PAR. Hamming (7,4) acrescenta 3 bits a 4.' }),
      w(3, 'dist', 9, { title: 'DISTÂNCIA', sub: 'quantas posições diferem?', recap: 'Distância de Hamming = posições diferentes. Distância mínima 3 corrige 1 erro (2t+1) e detecta 2.' }),
      w(6, 'mix', 9, { title: 'ONDA FINAL', sub: 'tudo misturado, sem ajuda' })
    ]
  };
})();
