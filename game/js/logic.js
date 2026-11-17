/* Lógica pura de "Natureza da Informação" (sem DOM) — roda no navegador e no Node (testes). */
(function (root) {
  'use strict';
  const L = {};

  /* ---------- sistemas de numeração ---------- */
  L.mask = bits => (1 << bits) - 1;
  L.toBase = (n, base, pad = 0) => (n >>> 0).toString(base).toUpperCase().padStart(pad, '0');
  L.toBin = (n, bits) => (n & L.mask(bits)).toString(2).padStart(bits, '0');
  L.toTwos = (n, bits) => n & L.mask(bits);
  L.fromTwos = (u, bits) => (u & (1 << (bits - 1))) ? u - (1 << bits) : u;
  L.hex = (n, digits = 2) => '0x' + L.toBase(n, 16, digits);
  L.oct = (n, digits = 2) => '0o' + L.toBase(n, 8, digits);
  L.group = (s, size) => { // agrupa da direita para a esquerda: "10110101",4 -> "1011 0101"
    const out = []; for (let i = s.length; i > 0; i -= size) out.unshift(s.slice(Math.max(0, i - size), i));
    return out.join(' ');
  };

  /* ---------- Shannon ---------- */
  L.info = p => -Math.log2(p);
  L.entropy = ps => { let h = 0; for (const p of ps) if (p > 0) h -= p * Math.log2(p); return h; };
  L.hb = p => (p <= 0 || p >= 1) ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
  L.redundancy = ps => 1 - L.entropy(ps) / Math.log2(ps.length);
  // distribuição "diádica" (potências de 1/2) com `pieces` símbolos: entropia exata
  L.dyadic = function (rnd, pieces) {
    const a = [1]; let guard = 0;
    while (a.length < pieces && guard++ < 500) {
      const i = Math.floor(rnd() * a.length);
      if (a[i] <= 1 / 16) continue;
      const v = a[i] / 2; a.splice(i, 1, v, v);
    }
    return a.sort((x, y) => y - x);
  };
  L.normalize = ps => { const s = ps.reduce((a, b) => a + b, 0); return ps.map(p => p / s); };

  /* ---------- códigos e compressão ---------- */
  L.huffman = function (syms, freqs) {
    let nextId = syms.length; const steps = [];
    const pool = syms.map((s, i) => ({ id: i, sym: s, f: freqs[i] }));
    while (pool.length > 1) {
      pool.sort((a, b) => a.f - b.f || a.id - b.id);
      const a = pool.shift(), b = pool.shift();
      const n = { id: nextId++, f: a.f + b.f, l: a, r: b };
      steps.push({ a: a.id, b: b.id, out: n.id, f: n.f });
      pool.push(n);
    }
    const root = pool[0], codes = {};
    (function walk(n, c) {
      if (n.sym !== undefined) { codes[n.sym] = c || '0'; return; }
      walk(n.l, c + '0'); walk(n.r, c + '1');
    })(root, '');
    return { root, steps, codes };
  };
  // o par escolhido (por frequência) é um par dos dois menores valores?
  L.isSmallestPair = (freqs, i, j) => {
    if (i === j) return false;
    const s = freqs.slice().sort((a, b) => a - b);
    const mine = [freqs[i], freqs[j]].sort((a, b) => a - b);
    return mine[0] === s[0] && mine[1] === s[1];
  };
  L.avgLen = (codes, syms, freqs) => {
    let t = 0, s = 0; syms.forEach((x, i) => { t += freqs[i]; s += freqs[i] * codes[x].length; });
    return s / t;
  };
  L.isPrefixFree = codes => {
    const c = Object.values(codes);
    for (let i = 0; i < c.length; i++) for (let j = 0; j < c.length; j++) if (i !== j && c[j].startsWith(c[i])) return false;
    return true;
  };
  L.freqs = str => { const m = {}; for (const ch of str) m[ch] = (m[ch] || 0) + 1; return m; };
  L.rle = s => s.replace(/(.)\1*/g, m => m.length + m[0]);
  L.unrle = s => s.replace(/(\d+)(\D)/g, (_, n, c) => c.repeat(+n));

  /* ---------- detecção e correção de erros ---------- */
  L.parity = bits => bits.reduce((a, b) => a ^ b, 0);
  L.hamDist = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; };
  // Hamming(7,4): posições 1..7 = [p1,p2,d1,p3,d2,d3,d4]
  L.hamEncode = d => [d[0] ^ d[1] ^ d[3], d[0] ^ d[2] ^ d[3], d[0], d[1] ^ d[2] ^ d[3], d[1], d[2], d[3]];
  // 1 = paridade ímpar (círculo "vermelho")
  L.hamCircles = b => [b[0] ^ b[2] ^ b[4] ^ b[6], b[1] ^ b[2] ^ b[5] ^ b[6], b[3] ^ b[4] ^ b[5] ^ b[6]];
  L.hamSyndrome = b => { const c = L.hamCircles(b); return c[0] | (c[1] << 1) | (c[2] << 2); };
  L.hamDecode = b => {
    const pos = L.hamSyndrome(b), fixed = b.slice(); if (pos) fixed[pos - 1] ^= 1;
    return { pos, fixed, data: [fixed[2], fixed[4], fixed[5], fixed[6]] };
  };

  /* ---------- álgebra booleana ---------- */
  L.gate = (g, a, b) => {
    switch (g) {
      case 'AND': return a & b; case 'OR': return a | b; case 'XOR': return a ^ b;
      case 'NAND': return (a & b) ^ 1; case 'NOR': return (a | b) ^ 1; case 'XNOR': return (a ^ b) ^ 1;
      case 'NOT': return a ^ 1; case 'BUF': return a;
    }
    throw new Error('porta desconhecida ' + g);
  };

  /* ---------- sinais ---------- */
  L.alias = (f, fs) => Math.abs(f - fs * Math.round(f / fs));
  L.quant = (x, bits) => { const n = (1 << bits) - 1; return Math.round((x + 1) / 2 * n) / n * 2 - 1; };

  /* ---------- DNA / RNA ---------- */
  const B = 'UCAG', AAS = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
  L.codonTable = {};
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++)
    L.codonTable[B[i] + B[j] + B[k]] = AAS[16 * i + 4 * j + k];
  L.AA = {
    F: ['Phe', 'Fenilalanina'], L: ['Leu', 'Leucina'], S: ['Ser', 'Serina'], Y: ['Tyr', 'Tirosina'],
    C: ['Cys', 'Cisteína'], W: ['Trp', 'Triptofano'], P: ['Pro', 'Prolina'], H: ['His', 'Histidina'],
    Q: ['Gln', 'Glutamina'], R: ['Arg', 'Arginina'], I: ['Ile', 'Isoleucina'], M: ['Met', 'Metionina'],
    T: ['Thr', 'Treonina'], N: ['Asn', 'Asparagina'], K: ['Lys', 'Lisina'], V: ['Val', 'Valina'],
    A: ['Ala', 'Alanina'], D: ['Asp', 'Ác. aspártico'], E: ['Glu', 'Ác. glutâmico'], G: ['Gly', 'Glicina'],
    '*': ['PARE', 'Códon de parada']
  };
  L.aaName = codon => L.AA[L.codonTable[codon]][0];
  L.pairDNA = b => ({ A: 'T', T: 'A', G: 'C', C: 'G' })[b];
  L.transcribe = tpl => [...tpl].map(b => ({ A: 'U', T: 'A', G: 'C', C: 'G' })[b]).join('');
  L.mutKind = (oldC, newC) => {
    const a = L.codonTable[oldC], b = L.codonTable[newC];
    if (a === b) return 'silenciosa';
    if (b === '*') return 'parada';
    return 'troca';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = L;
  else { root.NI = root.NI || {}; root.NI.logic = L; }
})(typeof window !== 'undefined' ? window : globalThis);
