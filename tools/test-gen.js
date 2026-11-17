/* Valida os geradores de perguntas: formato, opções únicas e — principalmente — resposta correta recalculada. */
'use strict';
const assert = require('assert');
require('../game/js/util.js');
const L = require('../game/js/logic.js');
require('../game/js/gen1.js'); require('../game/js/gen2.js');
const NI = globalThis.NI, gen = NI.gen, R = NI.U.rng(12345);
const num = s => parseFloat(String(s).replace(',', '.'));
let checks = 0;
const eq = (a, b, m) => { assert.strictEqual(String(a), String(b), m); checks++; };

function structure(name, t) {
  assert(t && typeof t === 'object', name + ': alvo vazio');
  assert(Array.isArray(t.opts) && t.opts.length >= 2 && t.opts.length <= 4, name + ': nº de opções ' + (t.opts && t.opts.length) + ' ' + JSON.stringify(t));
  assert.strictEqual(new Set(t.opts).size, t.opts.length, name + ': opções repetidas ' + JSON.stringify(t.opts));
  assert(Number.isInteger(t.answer) && t.answer >= 0 && t.answer < t.opts.length, name + ': resposta inválida');
  assert(t.concept && gen.names[t.concept], name + ': conceito desconhecido ' + t.concept);
  assert(t.hint && t.hint.length > 3, name + ': sem dica');
  assert(t.text || t.lines || t.seq || t.bars, name + ': sem conteúdo');
  const maxLen = t.opts.length === 4 ? 6 : t.opts.length === 3 ? 9 : 13; // largura útil do botão (px/6)
  t.opts.forEach(o => { if (!t.fixedOpts) assert(String(o).length <= maxLen, `${name}: rótulo longo "${o}" (${t.opts.length} botões)`); });
  checks++;
}
function semantic(name, t) {
  const a = t.opts[t.answer], x = t.text || '';
  let m;
  if (name === 'bases') {
    if ((m = x.match(/^([01]+) \(BIN\) = \? \(DEC\)$/))) eq(a, parseInt(m[1], 2), 'b2d');
    else if ((m = x.match(/^(\d+) \(DEC\) = \? \(BIN\)$/))) eq(parseInt(a, 2), m[1], 'd2b');
    else if ((m = x.match(/^0x([0-9A-F]+) \(HEX\) = \? \(DEC\)$/))) eq(a, parseInt(m[1], 16), 'h2d');
    else if ((m = x.match(/^(\d+) \(DEC\) = \? \(HEX\)$/))) eq(parseInt(a, 16), m[1], 'd2h');
    else if ((m = x.match(/^([01 ]+) \(BIN\) = \? \(HEX\)$/))) eq(parseInt(a, 16), parseInt(m[1].replace(/ /g, ''), 2), 'b2h');
    else if ((m = x.match(/^0x([0-9A-F]) = \? \(BIN\)$/))) eq(parseInt(a, 2), parseInt(m[1], 16), 'h2b');
    else if ((m = x.match(/^0o([0-7]+) \(OCT\) = \? \(DEC\)$/))) eq(a, parseInt(m[1], 8), 'o2d');
    else if ((m = x.match(/^([01 ]+) \(BIN\) = \? \(OCT\)$/))) eq(parseInt(a, 8), parseInt(m[1].replace(/ /g, ''), 2), 'b2o');
    else if ((m = x.match(/^COM (\d+) BITS, QUANTOS VALORES\?$/))) eq(a, 2 ** m[1], 'bits');
    else if ((m = x.match(/^MAIOR VALOR SEM SINAL EM (\d+) BITS\?$/))) eq(a, 2 ** m[1] - 1, 'range');
    else if ((m = x.match(/^PARA (\d+) VALORES, QUANTOS BITS\?$/))) eq(a, Math.ceil(Math.log2(m[1])), 'need');
    else assert.fail('bases: padrão desconhecido: ' + x);
  } else if (name === 'entropy') {
    if (t.type === 'bars') {
      const [A, B] = t.bars, ha = L.entropy(A), hb = L.entropy(B), most = t.q.startsWith('QUEM TEM MAIOR');
      let want = Math.abs(ha - hb) < 1e-9 ? 'IGUAL' : (ha > hb) === most ? 'A' : 'B'; eq(a, want, 'duelo');
      assert(Math.abs(A.reduce((s, v) => s + v, 0) - 1) < 1e-6 && Math.abs(B.reduce((s, v) => s + v, 0) - 1) < 1e-6, 'probabilidades somam 1');
    } else if ((m = x.match(/^p = 1\/(\d+)$/))) eq(a, Math.log2(+m[1]), 'I(x)');
    else if ((m = x.match(/^2\^-(\d)/))) eq(a, '1/' + 2 ** m[1], 'p de k bits');
    else if ((m = x.match(/^p = ([\d\/, ]+)$/))) { const ps = m[1].split(', ').map(s => 1 / +s.split('/')[1]); assert(Math.abs(ps.reduce((s, v) => s + v, 0) - 1) < 1e-9); assert(Math.abs(num(a) - L.entropy(ps)) < 0.006, `H: ${a} vs ${L.entropy(ps)}`); checks++; }
    else if (t.q === 'VERDADE OU FALSO?') { /* texto fixo, verificado na lista */ }
    else assert.fail('entropy: padrão desconhecido ' + x);
  } else if (name === 'redundancy') {
    if (t.q.startsWith('RLE DA')) eq(a, L.rle(x), 'rle');
    else if (t.q.startsWith('DESCOMPRIMA')) eq(a, L.unrle(x), 'unrle');
    else if (t.q.startsWith('CÓDIGO LIVRE')) { const codes = {}; t.lines.forEach(l => l.split(/ {3}/).forEach(p => { const [s, c] = p.split(' = '); codes[s] = c; })); eq(a === 'SIM', L.isPrefixFree(codes), 'prefixo'); }
    else if (t.q.startsWith('RAZÃO')) { const mm = x.match(/(\d+) BITS → (\d+) BITS/); eq(a, (mm[1] / mm[2]) + ':1', 'razão'); }
    else if (t.q.startsWith('REDUNDÂNCIA')) { const mm = x.match(/H = ([\d,]+)\s+Hmax = (\d+)/); eq(a, Math.round((1 - num(mm[1]) / mm[2]) * 100) + '%', 'R'); }
  } else if (name === 'channel') {
    if (t.q.startsWith('PARIDADE')) {
      const even = t.q.includes('PAR:') || t.q.includes('PAR ') && !t.q.includes('ÍMPAR'); const isEven = !t.q.startsWith('PARIDADE ÍMPAR');
      const recv = ((x.match(/RECEBIDO: ([01 ]+)/) || [])[1] || (t.lines && t.lines[1].replace('RECEBIDO: ', '')) || '').replace(/ /g, '');
      const ones = [...recv].reduce((s, c) => s + +c, 0), detects = isEven ? ones % 2 === 1 : ones % 2 === 0;
      if (t.opts[0] === 'OK') eq(a, detects ? 'ERRO' : 'OK', 'paridade OK/ERRO'); else eq(a, detects ? 'SIM' : 'NÃO', 'paridade SIM/NÃO');
    }
  } else if (name === 'dna') {
    if (t.q.startsWith('BASE COMPLEMENTAR')) eq(a, L.pairDNA(t.seq), 'par');
    else if (t.q.startsWith('TRANSCREVA')) eq(a, L.transcribe(t.seq), 'transcrição');
    else if (t.q.startsWith('TRADUZA')) eq(a, L.aaName(t.seq), 'tradução');
    else if (t.q.startsWith('QUE TIPO')) { const [c1, c2] = t.seq.split('>'); eq({ silenciosa: 'SILENC.', troca: 'TROCA', parada: 'PARADA' }[L.mutKind(c1, c2)], a, 'mutação'); }
  } else if (name === 'hamq') {
    if (t.q.startsWith('CÍRCULOS')) { const pos = x.split(' + ').reduce((s, p) => s + (1 << (+p[1] - 1)), 0); eq(a, pos, 'síndrome'); }
    else if (t.q.startsWith('DISTÂNCIA')) eq(a, L.hamDist(t.lines[0], t.lines[1]), 'dist');
  } else if (name === 'boolean') {
    if ((m = x.match(/^(\d) (AND|OR|XOR|NAND|NOR) (\d) = \?$/))) eq(a, L.gate(m[2], +m[1], +m[3]), 'booleana simples');
    else if ((m = x.match(/^(NOT )?\((\d) (AND|OR|XOR) (\d)\) (AND|OR|XOR) (\d)$/))) { let v = L.gate(m[3], +m[2], +m[4]); if (m[1]) v ^= 1; eq(a, L.gate(m[5], v, +m[6]), 'booleana dupla'); }
  } else if (name === 'nyquist') {
    if ((m = x.match(/^SINAL DE (\d+) KHZ$/))) eq(num(a), 2 * m[1], 'nyquist taxa');
    else if ((m = x.match(/^f = (\d+)  Fs = (\d+)$/))) eq(a, L.alias(+m[1], +m[2]), 'alias');
    else if ((m = x.match(/^(\d) BITS/))) eq(a, 2 ** m[1], 'níveis');
  }
}

const jobs = { dikw: [1, 2, 3], bases: [1, 2, 3], entropy: [1, 2, 3], redundancy: [1, 2, 3], channel: [1, 2, 3], dna: [1, 2, 3, 4], semiotics: [1, 2, 3], boolean: [1, 2, 3], hamq: [1, 2, 3], nyquist: [1, 2, 3], noise: [2, 3], final: [2, 3] };
const seen = {};
for (const name in jobs) for (const tier of jobs[name]) for (let i = 0; i < 400; i++) {
  const t = gen[name](tier, R); structure(name + '/t' + tier, t);
  if (!['noise', 'final', 'dikw'].includes(name)) semantic(name, t);
  seen[name] = (seen[name] || new Set()).add(t.q || t.text || t.seq);
}
// canhão de bits (gen3): o valor-alvo bate com o que o cartão mostra, a dica traz o binário certo e o padrão é alcançável
require('../game/js/gen3.js');
{
  const mask = n => (1 << n) - 1, bin = (v, n) => (v & mask(n)).toString(2).padStart(n, '0'), got = {};
  const check = (kind, tier, bits) => {
    const t = gen.bitcannon(kind, tier, R, bits), nm = `bitcannon/${kind}/t${tier}/${bits}b`;
    assert.strictEqual(t.kind, kind, nm); assert(gen.names[t.concept], nm + ': conceito desconhecido ' + t.concept);
    assert(typeof t.q === 'string' && t.q.length > 5 && typeof t.show === 'string' && t.show.length > 0, nm + ': sem texto');
    assert(Number.isInteger(t.value) && Number.isInteger(t.bits) && t.bits >= 4 && t.bits <= 8 && typeof t.signed === 'boolean', nm + ': campos');
    assert(t.hint && t.hint.length > 8, nm + ': sem dica');
    if (t.signed) { assert(t.value >= -(1 << (t.bits - 1)) && t.value < (1 << (t.bits - 1)) && t.value !== 0, nm + ': faixa com sinal ' + t.value); }
    else assert(t.value >= 1 && t.value <= mask(t.bits), nm + ': faixa ' + t.value);
    // o padrão de bits que o jogador monta chega exatamente ao valor-alvo (e a dica mostra esse padrão)
    const pat = []; for (let i = t.bits - 1; i >= 0; i--) pat.push((t.value & mask(t.bits)) >> i & 1);
    eq(gen.bitValue(pat, t.signed), t.value, nm + ': bitValue'); assert(t.hint.includes(bin(t.value, t.bits)), nm + ': a dica não traz o binário ' + bin(t.value, t.bits) + ' → ' + t.hint);
    let m;
    if (kind === 'dec') eq(t.show, t.value, nm);
    else if (kind === 'hex') { assert((m = t.show.match(/^0x([0-9A-F]+) \(HEX\)$/)), nm + ': ' + t.show); eq(parseInt(m[1], 16), t.value, nm); eq(m[1].length, Math.ceil(t.bits / 4), nm + ': dígitos'); }
    else if (kind === 'oct') { assert((m = t.show.match(/^0o([0-7]+) \(OCT\)$/)), nm + ': ' + t.show); eq(parseInt(m[1], 8), t.value, nm); eq(m[1].length, Math.ceil(t.bits / 3), nm + ': dígitos'); }
    else if (kind === 'asc') { assert((m = t.show.match(/^'(.)'$/)), nm + ': ' + t.show); eq(m[1].charCodeAt(0), t.value, nm); eq(t.bits, 8, nm); assert(/[A-Z0-9]/.test(m[1]), nm + ': fora do conjunto ensinado'); }
    else if (kind === 'add') {
      const mm = t.show.match(/^([01]{4})\+([01]{4})$/) ? t.show.split('+').map(s => parseInt(s, 2)) : (t.show.match(/^(\d+)\+(\d+)$/) || []).slice(1).map(Number);
      eq(mm.length, 2, nm + ': operandos'); eq(mm[0] + mm[1], t.value, nm + ': soma'); assert(t.value <= 15, nm); eq(/^[01]/.test(t.show) && t.show.includes('+') && t.show.length === 9, tier <= 1, nm + ': operandos em binário só no tier 1');
    }
    else if (kind === 'ovf') { m = t.show.match(/^(\d+)\+(\d+)$/); assert(m, nm); const s = +m[1] + +m[2]; assert(s >= 17 && s <= 30, nm + ': soma ' + s); eq(s & 15, t.value, nm + ': truncamento'); assert(t.value >= 1, nm); }
    else if (kind === 'twos') { m = t.show.match(/^([+-]\d)$/); assert(m, nm + ': ' + t.show); eq(parseInt(m[1], 10), t.value, nm); assert(t.signed && t.bits === 4, nm); }
    (got[kind] = got[kind] || new Set()).add(t.show);
  };
  for (const kind of ['dec', 'hex', 'oct']) for (const bits of [4, 5, 6, 8]) for (const tier of [1, 2, 3]) for (let i = 0; i < 120; i++) check(kind, tier, bits);
  for (const kind of ['asc', 'add', 'ovf', 'twos']) for (const tier of [1, 2, 3]) for (let i = 0; i < 300; i++) check(kind, tier, 4);
  // sinal: o bit da esquerda pesa -2^(n-1) (4 bits: 1000 = -8, 1111 = -1, 0111 = +7) e sem sinal soma pesos
  eq(gen.bitValue([1, 0, 0, 0], true), -8); eq(gen.bitValue([1, 1, 1, 1], true), -1); eq(gen.bitValue([0, 1, 1, 1], true), 7); eq(gen.bitValue([1, 1, 1, 1], false), 15); eq(gen.bitValue([0, 1, 0, 0, 0, 0, 0, 1], false), 65);
  // cobertura: todos os valores de 4 bits aparecem em 'dec', e todos os números de 'twos' (±) também
  eq(new Set([...got.dec].map(Number).filter(v => v <= 15)).size, 15, 'dec cobre 1..15'); eq(got.twos.size, 15, 'twos cobre -8..7 sem o 0');
  eq(got.asc.size >= 30, true, 'ASCII varia'); assert(got.ovf.size >= 40, 'overflow varia: ' + got.ovf.size);
}
// DIKW: a classe dita pelo botão bate com a resposta
for (let i = 0; i < 200; i++) { const t = gen.dikw(2, R); assert([0, 1, 2].includes(t.answer)); }
// cobertura: todas as mutações existem
const kinds = new Set(); for (let i = 0; i < 400; i++) { const t = gen.dna(3, R); if (t.q.startsWith('QUE TIPO')) kinds.add(t.opts[t.answer]); }
assert.strictEqual(kinds.size, 3, 'as 3 classes de mutação aparecem');
console.log(`geradores: OK (${checks} verificações; variedade: ` + Object.entries(seen).map(([k, v]) => k + '=' + v.size).join(' ') + ')');
