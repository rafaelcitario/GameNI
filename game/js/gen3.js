/* Gerador (3/3): alvos do canhão de bits (fases 1-3 e 1-4). Puro e testável em Node.
   gen.bitcannon(kind, tier, R, bits) -> { kind, concept, q, show, value, bits, signed, hint }
   O jogador liga/desliga 'bits' chaves até o valor do canhão igualar 'value' (com 'signed', o bit mais à esquerda pesa -2^(bits-1)). */
(function (root) {
  'use strict';
  const NI = root.NI = root.NI || {};
  const L = NI.logic || require('./logic.js');
  const gen = NI.gen = NI.gen || {};
  gen.names = gen.names || {}; gen.names.ovf = 'Overflow';

  const bin = (v, n) => L.toBin(v, n), hx = v => v.toString(16).toUpperCase(), oc = v => v.toString(8);
  const parts = (v, n) => { const p = []; for (let i = n - 1; i >= 0; i--) if (v >> i & 1) p.push(1 << i); return p.join('+'); };

  gen.bitcannon = function (kind, tier, R, bits) {
    bits = bits || 4; const max = (1 << bits) - 1;
    if (kind === 'dec') {
      const v = R.int(1, max);
      return { kind, concept: 'bits', q: 'LIGUE OS BITS DO NÚMERO', show: String(v), value: v, bits, signed: false, hint: v + ' = ' + parts(v, bits) + ' → ' + bin(v, bits) };
    }
    if (kind === 'hex') {
      const v = R.int(1, max), d = Math.ceil(bits / 4);
      return { kind, concept: 'bases', q: 'HEXA: LIGUE OS BITS', show: '0x' + hx(v).padStart(d, '0') + ' (HEX)', value: v, bits, signed: false, hint: '0x' + hx(v) + ' = ' + v + ' = ' + bin(v, bits) + (d === 2 ? ' (cada dígito = 4 bits)' : '') };
    }
    if (kind === 'oct') {
      const v = R.int(1, max), d = Math.ceil(bits / 3);
      return { kind, concept: 'bases', q: 'OCTAL: LIGUE OS BITS', show: '0o' + oc(v).padStart(d, '0') + ' (OCT)', value: v, bits, signed: false, hint: '0o' + oc(v) + ' = ' + v + ' = ' + bin(v, bits) + ' (cada dígito = 3 bits)' };
    }
    if (kind === 'asc') {
      const pool = []; for (let c = 65; c <= 90; c++) pool.push(c); for (let c = 48; c <= 57; c++) pool.push(c);
      const v = R.pick(pool), ch = String.fromCharCode(v), letter = v >= 65, base = letter ? 65 : 48, off = v - base;
      return { kind, concept: 'asc', q: 'ASCII: LIGUE O CÓDIGO DE', show: "'" + ch + "'", value: v, bits: 8, signed: false, hint: "'" + ch + "' = " + (off ? base + '+' + off + ' = ' : '') + v + ' = ' + bin(v, 8) + (letter ? ' (A = 65)' : ' (o caractere ' + ch + ' não é o número ' + ch + '!)') };
    }
    if (kind === 'add') {
      let a, b; do { a = R.int(1, 12); b = R.int(1, 12); } while (a + b > 15);
      const v = a + b, carry = ((a & b) | ((a ^ b) & ~v)) & 0xF; // houve "vai-um" se algum bit gerou carry
      return { kind, concept: 'add', q: tier <= 1 ? 'SOME EM BINÁRIO' : 'SOME E LIGUE O RESULTADO', show: tier <= 1 ? bin(a, 4) + '+' + bin(b, 4) : a + '+' + b, value: v, bits: 4, signed: false, hint: bin(a, 4) + ' + ' + bin(b, 4) + ' = ' + bin(v, 4) + ' (' + a + '+' + b + '=' + v + ')' + (carry ? ' com vai-um' : '') };
    }
    if (kind === 'ovf') {
      let a, b; do { a = R.int(6, 15); b = R.int(6, 15); } while (a + b < 17); // soma >= 17: o resultado truncado nunca é 0 (evita acerto grátis com o canhão zerado)
      const s = a + b, v = s & 15;
      return { kind, concept: 'ovf', q: 'OVERFLOW: SOMA EM 4 BITS', show: a + '+' + b, value: v, bits: 4, signed: false, hint: a + '+' + b + ' = ' + s + ' não cabe em 4 bits (máx. 15): sobra ' + s + '-16 = ' + v + ' = ' + bin(v, 4) };
    }
    if (kind === 'twos') {
      let v; do { v = R.int(-8, 7); } while (v === 0);
      const pat = v & 15;
      return { kind, concept: 'twos', q: 'COMPLEMENTO DE DOIS', show: (v > 0 ? '+' : '') + v, value: v, bits: 4, signed: true, hint: v < 0 ? v + ' = ' + bin(pat, 4) + ': o bit da esquerda pesa -8. Inverta ' + bin(-v, 4) + ' e some 1' : '+' + v + ' = ' + bin(pat, 4) + ' (bit de sinal 0)' };
    }
    throw new Error('tipo de alvo desconhecido: ' + kind);
  };
  gen.bitValue = function (state, signed) { // valor do canhão para um vetor de bits (índice 0 = bit mais à esquerda)
    const n = state.length; let v = 0; for (let i = 0; i < n; i++) if (state[i]) v += (signed && i === 0 ? -1 : 1) * (1 << (n - 1 - i)); return v;
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = gen;
})(typeof window !== 'undefined' ? window : globalThis);
