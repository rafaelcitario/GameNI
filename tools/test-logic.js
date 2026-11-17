/* Testes da lógica pura. Uso: node tools/test-logic.js */
'use strict';
const assert = require('assert');
const L = require('../game/js/logic.js');
let n = 0; const ok = (name, fn) => { fn(); n++; };
const close = (a, b, e = 1e-9) => assert(Math.abs(a - b) < e, `${a} != ${b}`);

ok('bases', () => {
  assert.strictEqual(L.toBin(37, 8), '00100101');
  assert.strictEqual(L.hex(47), '0x2F');
  assert.strictEqual(L.oct(31, 2), '0o37');
  assert.strictEqual(L.group('10110101', 4), '1011 0101');
  assert.strictEqual(L.group('110101', 3), '110 101');
  assert.strictEqual(L.toTwos(-5, 8), 251);
  assert.strictEqual(L.toBin(-5, 8), '11111011');
  assert.strictEqual(L.fromTwos(251, 8), -5);
  assert.strictEqual(L.fromTwos(127, 8), 127);
});

ok('entropia', () => {
  close(L.info(1 / 8), 3);
  close(L.entropy([0.5, 0.25, 0.125, 0.125]), 1.75);
  close(L.entropy([0.25, 0.25, 0.25, 0.25]), 2);
  close(L.entropy([1]), 0);
  close(L.hb(0.5), 1);
  close(L.redundancy([0.5, 0.5]), 0);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 2; k <= 8; k++) {
    const d = L.dyadic(rnd, k);
    assert.strictEqual(d.length, k); close(d.reduce((a, b) => a + b, 0), 1);
    const h = L.entropy(d); assert(Math.abs(h * 16 - Math.round(h * 16)) < 1e-9, 'H diádica múltiplo de 1/16');
  }
});

ok('huffman', () => {
  const s = ['A', 'B', 'C', 'D'], f = [5, 2, 1, 1];
  const h = L.huffman(s, f);
  assert.strictEqual(h.steps.length, 3);
  assert(L.isPrefixFree(h.codes));
  assert.strictEqual(h.codes.A.length, 1);
  close(L.avgLen(h.codes, s, f), (5 * 1 + 2 * 2 + 1 * 3 + 1 * 3) / 9);
  assert(!L.isPrefixFree({ A: '0', B: '01', C: '11' }));
  assert(L.isSmallestPair(f, 2, 3)); assert(!L.isSmallestPair(f, 1, 2)); assert(!L.isSmallestPair(f, 0, 1));
  assert(L.isSmallestPair([3, 1, 1, 1], 1, 3)); // empates: qualquer par de menores vale
  const m = L.freqs('BANANA'); assert.deepStrictEqual(m, { B: 1, A: 3, N: 2 });
  // Huffman nunca é pior que comprimento fixo e nunca melhor que a entropia
  const msg = 'ABRACADABRA', fr = L.freqs(msg), syms = Object.keys(fr), fv = syms.map(k => fr[k]);
  const hh = L.huffman(syms, fv), avg = L.avgLen(hh.codes, syms, fv), H = L.entropy(fv.map(x => x / msg.length));
  assert(avg >= H - 1e-9 && avg < H + 1);
});

ok('rle', () => {
  assert.strictEqual(L.rle('AAAABBC'), '4A2B1C');
  assert.strictEqual(L.unrle('4A2B1C'), 'AAAABBC');
});

ok('hamming', () => {
  for (let v = 0; v < 16; v++) {
    const d = [v >> 3 & 1, v >> 2 & 1, v >> 1 & 1, v & 1], w = L.hamEncode(d);
    assert.strictEqual(L.hamSyndrome(w), 0);
    for (let e = 0; e < 7; e++) {
      const r = w.slice(); r[e] ^= 1;
      assert.strictEqual(L.hamSyndrome(r), e + 1, 'síndrome aponta a posição');
      assert.deepStrictEqual(L.hamDecode(r).data, d);
    }
  }
  assert.strictEqual(L.parity([1, 0, 1, 1]), 1);
  assert.strictEqual(L.hamDist('10110', '10011'), 2);
});

ok('booleana', () => {
  const t = { AND: [0, 0, 0, 1], OR: [0, 1, 1, 1], XOR: [0, 1, 1, 0], NAND: [1, 1, 1, 0], NOR: [1, 0, 0, 0], XNOR: [1, 0, 0, 1] };
  for (const g in t) for (let i = 0; i < 4; i++) assert.strictEqual(L.gate(g, i >> 1, i & 1), t[g][i], g);
  assert.strictEqual(L.gate('NOT', 1), 0);
  // De Morgan
  for (let i = 0; i < 4; i++) { const a = i >> 1, b = i & 1; assert.strictEqual(L.gate('NAND', a, b), L.gate('OR', a ^ 1, b ^ 1)); }
});

ok('sinais', () => {
  close(L.alias(7, 10), 3); close(L.alias(3, 10), 3); close(L.alias(10, 10), 0); close(L.alias(12, 10), 2);
  close(L.quant(1, 3), 1); close(L.quant(-1, 3), -1);
  assert(Math.abs(L.quant(0.3, 8) - 0.3) < 0.01);
});

ok('dna', () => {
  assert.strictEqual(Object.keys(L.codonTable).length, 64);
  assert.strictEqual(L.codonTable.AUG, 'M'); assert.strictEqual(L.codonTable.UGG, 'W');
  ['UAA', 'UAG', 'UGA'].forEach(c => assert.strictEqual(L.codonTable[c], '*'));
  assert.strictEqual(L.codonTable.GCU, 'A'); assert.strictEqual(L.codonTable.GCG, 'A');
  assert.strictEqual(L.codonTable.GAU, 'D'); assert.strictEqual(L.codonTable.GAA, 'E');
  assert.strictEqual(L.codonTable.UUU, 'F'); assert.strictEqual(L.codonTable.AAA, 'K');
  assert.strictEqual(L.aaName('AUG'), 'Met');
  assert.strictEqual(L.transcribe('TAC'), 'AUG');
  assert.strictEqual(L.pairDNA('G'), 'C');
  assert.strictEqual(L.mutKind('GAA', 'GAG'), 'silenciosa');
  assert.strictEqual(L.mutKind('GAA', 'UAA'), 'parada');
  assert.strictEqual(L.mutKind('GAA', 'GAU'), 'troca');
  // 20 aminoácidos + parada
  assert.strictEqual(new Set(Object.values(L.codonTable)).size, 21);
  // 64 códons, 4^3: 6 bits por códon, 2 bits por base
  assert.strictEqual(Math.log2(64), 6);
});

console.log(`logic.js: ${n} grupos de testes OK`);
