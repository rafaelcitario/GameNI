/* Motor "Canhão de bits": o mesmo campo de ação do Terminal (cartões caindo, ruído, chefe), mas a ARMA é um registrador de n chaves.
   Ligue e desligue os bits até o valor do canhão igualar o do cartão mais baixo: ele dispara sozinho e recarrega (zera).
   Ensina pesos dos bits, hexadecimal/octal, ASCII, soma binária, overflow e complemento de dois, com o valor aparecendo em tempo real. */
(function () {
  'use strict';
  const NI = window.NI, W = NI.W, PAL = NI.PAL, F = NI.font, UI = NI.ui, A = NI.audio, fx = NI.fx, U = NI.U, gen = NI.gen;
  const Terminal = NI.engines.terminal;
  const RD_Y = 262, TG_Y = 278, TG_H = 34, GAP = 3, HOLD = 0.18, OFF = '#2e3258';

  class BitCannon extends Terminal {
    constructor(ctx, phase) {
      super(ctx, phase);
      this.nb = this.waves[0].bits; this.bits = new Array(this.nb).fill(0); this.hold = 0; this.tgT = new Array(8).fill(0); this.reloadT = 0; this.lastSigned = false;
    }
    nextWave() {
      super.nextWave();
      if (this.wave && this.state === 'intro') { this.nb = this.wave.bits; this.bits = new Array(this.nb).fill(0); this.hold = 0; }
    }

    /* ---------- o registrador ---------- */
    weight(i, signed) { return (signed && i === 0 ? -1 : 1) * (1 << (this.nb - 1 - i)); }
    pattern(c) { const n = this.nb, v = c.value & ((1 << n) - 1), p = []; for (let i = 0; i < n; i++) p.push(v >> (n - 1 - i) & 1); return p; } // bits que o alvo exige (0 = esquerda)
    value(signed) { return gen.bitValue(this.bits, signed); }
    toggle(i) {
      if (this.ctx.ended || i < 0 || i >= this.nb) return;
      this.bits[i] ^= 1; this.tgT[i] = 0.12; this.hold = 0;
      A.sfx('bit', { i: this.nb - 1 - i, on: this.bits[i] }); // bit mais pesado = tom mais agudo
      const r = this.tgRect(i); fx.burst(r.x + r.w / 2, r.y, 5, [this.bits[i] ? PAL.C : PAL.S, PAL.W], { speed: 34 });
    }
    reload() { this.bits.fill(0); this.hold = 0; this.reloadT = 0.22; }
    fire(c) { this.hold = 0; A.sfx('laser', { x: this.ship.x }); this.kill(c); this.reload(); }
    leakTarget(t) { super.leakTarget(t); this.reload(); }

    update(dt, ended) {
      for (let i = 0; i < 8; i++) if (this.tgT[i] > 0) this.tgT[i] -= dt;
      if (this.reloadT > 0) this.reloadT -= dt;
      super.update(dt, ended);
      if (ended) return;
      const c = this.cur; if (c) this.lastSigned = c.signed;
      if (c && c.alive && this.value(c.signed) === c.value) { this.hold += dt; if (this.hold >= HOLD) this.fire(c); } else this.hold = 0;
    }

    /* ---------- bot (testes): liga os bits certos, na ordem, com a pressa e os erros configurados ---------- */
    botAnswer(dt) {
      const t = this.current(), D = NI.debug; this.botT -= dt;
      if (!t || this.botT > 0 || this.ctx.ended || t.t < (D.botDelay || 0)) return;
      this.botT = 0.3 + this.R() * 0.2;
      const want = this.pattern(t), wrong = [], right = []; want.forEach((b, i) => (this.bits[i] === b ? right : wrong).push(i));
      if (!wrong.length) return;
      const acc = D.botAcc === undefined ? 1 : D.botAcc;
      this.toggle(this.R() > acc && right.length ? this.R.pick(right) : wrong[0]);
    }

    /* ---------- entrada ---------- */
    tgRect(i) { const n = this.nb, S = 172 + GAP, x0 = Math.round(i * S / n), x1 = Math.round((i + 1) * S / n); return { x: 4 + x0, y: TG_Y, w: x1 - x0 - GAP, h: TG_H }; }
    onDown(p) {
      if (p.y >= RD_Y - 2) { const n = this.nb; this.toggle(U.clamp(Math.floor((p.x - 4 + GAP / 2) / ((172 + GAP) / n)), 0, n - 1)); return; } // faixa inferior inteira = chaves
      this.drag = p.id;
    }
    onKey(k) { if (k >= '1' && k <= '8') this.toggle(+k - 1); else super.onKey(k); }

    /* ---------- desenho: leitura do canhão + chaves ---------- */
    drawButtons(g, cur) {
      const n = this.nb, signed = cur ? cur.signed : this.lastSigned, want = cur ? this.pattern(cur) : null;
      let sum = 0; const parts = []; for (let i = 0; i < n; i++) if (this.bits[i]) { const v = this.weight(i, signed); sum += v; parts.push(v); }
      const match = !!cur && cur.alive && sum === cur.value, hintOn = !!(cur && this.wave && this.wave.hint);
      // leitura: soma dos pesos ligados e o valor (verde quando bate com o cartão)
      const vt = '= ' + sum, formula = parts.length ? parts.map((v, k) => (k && v > 0 ? '+' : '') + v).join('') : '0';
      F.draw(g, vt, W - 6, RD_Y, match ? PAL.G : PAL.Y, 2, 'r', PAL.K);
      if (parts.length && F.width(formula) + F.width(vt, 2) + 16 < W) F.draw(g, formula, 6, RD_Y + 4, PAL.W, 1, 'l', PAL.K);
      for (let i = 0; i < n; i++) {
        const r = this.tgRect(i), on = this.bits[i], dy = this.tgT[i] > 0 ? 1 : 0, neg = signed && i === 0;
        UI.button(g, r, '', { color: match ? PAL.G : on ? (neg ? PAL.M : PAL.C) : OFF, down: dy > 0, glow: hintOn && want[i] !== on });
        F.draw(g, String(this.weight(i, signed)), r.x + r.w / 2, r.y + 4 + dy, on ? PAL.K : neg ? PAL.M : PAL.S, 1, 'c');
        F.draw(g, on ? '1' : '0', r.x + r.w / 2, r.y + 15 + dy, on ? PAL.K : PAL.W, 2, 'c');
      }
      if (this.reloadT > 0) { g.fillStyle = 'rgba(255,255,255,' + (this.reloadT / 0.22 * 0.4).toFixed(2) + ')'; g.fillRect(4, TG_Y, 172, TG_H); }
    }
  }
  NI.engines.bitcannon = BitCannon;

  /* ---------- configurações das fases ---------- */
  const bcGen = (tier, R, w) => { const t = gen.bitcannon(R.pick(w.kinds), tier, R, w.bits); t.text = t.show; t.big = true; t.opts = []; t.answer = -1; return t; };
  const w = (n, speed, gap, tier, hazard, o) => Object.assign({ n, speed, gap, tier, hazard: hazard || 0 }, o);
  const boss = (name, sprite, hp, speed, gap, tier, hazard, o) => Object.assign({ boss: { name, sprite, hp }, speed, gap, tier, hazard }, o);

  NI.tcfg.bits = {
    gen: bcGen, waves: [
      w(5, 12, 6.0, 1, 0, { hint: true, bits: 4, kinds: ['dec'], title: 'TREINO', sub: 'ligue os bits que somam o número', recap: 'Cada bit vale uma potência de 2: 8, 4, 2, 1. O número é a SOMA dos bits ligados.' }),
      w(6, 15, 5.0, 1, 0, { bits: 5, kinds: ['dec'], title: 'TESTE', sub: '5 bits: 16, 8, 4, 2, 1', recap: 'Com n bits você escreve 2^n valores diferentes: de 0 até 2^n - 1.' }),
      w(7, 16, 5.0, 2, 1, { bits: 6, kinds: ['hex', 'oct'], title: 'HEXA E OCTAL', sub: 'agrupe os bits de 4 em 4 ou de 3 em 3', recap: 'Hexadecimal: 4 bits por dígito. Octal: 3 bits por dígito. Agrupe a partir da direita.' }),
      w(4, 13, 6.0, 2, 0, { hint: true, bits: 8, kinds: ['asc'], title: 'ASCII', sub: 'cada caractere é um número de 8 bits', recap: 'ASCII: A = 65, B = 66... e o caractere 0 = 48. Letras e dígitos viram números.' }),
      w(7, 15, 5.2, 3, 1, { bits: 8, kinds: ['asc', 'hex', 'dec'], title: 'ONDA FINAL', sub: 'um byte inteiro: 8 bits' })
    ]
  };
  NI.tcfg.overflow = {
    gen: bcGen, waves: [
      w(5, 12, 6.0, 1, 0, { hint: true, bits: 4, kinds: ['add'], title: 'SOMA BINÁRIA', sub: '0+0=0  0+1=1  1+1=10 (vai um)', recap: 'Soma binária é a escolar: 1 + 1 = 10 (escreve 0 e vai 1 para a coluna seguinte).' }),
      w(5, 13, 5.6, 2, 0, { hint: true, bits: 4, kinds: ['ovf'], title: 'OVERFLOW!', sub: 'e se o resultado não cabe?', recap: 'Overflow: o resultado passa do máximo (4 bits: 15) e o excesso é perdido: sobra o resto da divisão por 16.' }),
      w(5, 13, 5.6, 2, 0, { hint: true, bits: 4, kinds: ['twos'], title: 'COMPLEMENTO DE DOIS', sub: 'o bit da esquerda pesa -8', recap: 'Complemento de dois: o bit mais à esquerda pesa -2^(n-1). Para negar: inverta os bits e some 1.' }),
      boss('OVERFLOW', 'boss1', 11, 15, 5.8, 2, 1, { bits: 4, kinds: ['add', 'ovf', 'twos'], sub: 'a soma que não cabe!' })
    ]
  };
})();
