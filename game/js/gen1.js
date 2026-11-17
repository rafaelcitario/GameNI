/* Geradores de perguntas (1/2): DIKW, bases numéricas, entropia, compressão/redundância.
   Cada gerador devolve um alvo: { text|lines, q, opts[], answer, concept, hint, type, ... }  (puro: testável em Node) */
(function (root) {
  'use strict';
  const NI = root.NI = root.NI || {};
  const L = NI.logic || require('./logic.js');
  const U = NI.U;
  const gen = NI.gen = NI.gen || {};

  gen.names = {
    dikw: 'Dado, informação, conhecimento', bases: 'Bases numéricas', bits: 'Bits e pesos', asc: 'Código ASCII',
    add: 'Soma binária', twos: 'Complemento de dois', cut: 'Bit = pergunta sim/não', info: 'Quantidade de informação',
    entropy: 'Entropia', huff: 'Código de Huffman', compress: 'Compressão', rle: 'RLE', prefix: 'Código livre de prefixo',
    redund: 'Redundância', channel: 'Modelo de comunicação', parity: 'Paridade', hamming: 'Código de Hamming',
    logic: 'Álgebra booleana', nyq: 'Amostragem e Nyquist', dna: 'Bases do DNA', codon: 'Código genético',
    mut: 'Mutações', neuro: 'Codificação neural', semio: 'Semiótica'
  };

  /* ---------- ajudantes ---------- */
  const H = gen._h = {
    // monta n opções únicas (strings) com a correta + erradas plausíveis, embaralhadas
    pack(R, correct, wrongs, n, maxLen) {
      correct = String(correct);
      const seen = new Set([correct]), w = [];
      R.shuffle(wrongs.map(String)).forEach(x => { if (!seen.has(x) && x.length <= (maxLen || 99)) { seen.add(x); w.push(x); } });
      const opts = R.shuffle([correct].concat(w.slice(0, n - 1)));
      return { opts, answer: opts.indexOf(correct) };
    },
    near(R, v, n, fmt, lo, hi, steps) {
      fmt = fmt || String; lo = lo === undefined ? -Infinity : lo; hi = hi === undefined ? Infinity : hi;
      const c = []; (steps || [1, 2, 3]).forEach(s => { [v + s, v - s].forEach(x => { if (x >= lo && x <= hi && x !== v) c.push(fmt(x)); }); });
      return H.pack(R, fmt(v), c, n);
    },
    tf(R, list, concept) { // lista de [texto, verdadeiro, dica]
      const [t, v, h] = R.pick(list);
      return { type: 'text', q: 'VERDADE OU FALSO?', text: t, opts: ['VERDADE', 'FALSO'], answer: v ? 0 : 1, concept, hint: h };
    },
    bitsLabel: (n) => n + (n === 1 ? ' BIT' : ' BITS')
  };

  /* ---------- 1-1 Dado, informação, conhecimento ---------- */
  const POOL = {
    D: ['37', 'AZUL', '1,75', 'R$ 12', 'SÃO PAULO', '0110', '20', 'ABC', '42', '2026', '7 8 3 9', 'PRETO', '15:30', '-5', '100', '8848', 'XYZ', '3,14'],
    I: ['TEMPERATURA DO PACIENTE: 37°C', 'O CÉU ESTÁ AZUL HOJE', 'ALTURA DE MARIA: 1,75 M', 'O PÃO CUSTA R$ 12 NO MERCADO', 'SÃO PAULO TEM 12 MILHÕES DE HABITANTES', 'NA PROVA TIREI NOTA 8', 'O ÔNIBUS CHEGA ÀS 15:30', 'O EVEREST TEM 8848 M', 'HOJE FAZ -5°C EM MOSCOU', 'ESTE ARQUIVO TEM 100 KB'],
    K: ['37°C É NORMAL: O PACIENTE NÃO TEM FEBRE', 'CÉU AZUL SEM NUVENS: NÃO VAI CHOVER, DEIXE O GUARDA-CHUVA', 'PÃO CARO: COMPARE PREÇOS ANTES DE COMPRAR', 'NOTA 8 ESTÁ ACIMA DA MÉDIA: REVISE SÓ O QUE ERREI', 'ÔNIBUS ÀS 15:30: SAIA DE CASA ÀS 15:15', 'A -5°C A ÁGUA CONGELA: PROTEJA OS CANOS', 'ARQUIVO DE 100 KB CABE NO E-MAIL: ANEXE', 'VENDAS CAINDO HÁ 3 MESES: FAÇA UMA PROMOÇÃO']
  };
  const TRIPLES = [
    ['37', 'PACIENTE COM 37°C', '37°C: SEM FEBRE, DISPENSE O REMÉDIO'],
    ['1,75', 'ALTURA DE JOÃO: 1,75 M', '1,75 M NÃO ALCANÇA A PRATELEIRA: USE O BANCO'],
    ['R$ 12', 'O PÃO CUSTA R$ 12', 'PÃO A R$ 12 ESTÁ CARO: COMPARE PREÇOS'],
    ['15:30', 'O ÔNIBUS PASSA ÀS 15:30', 'ÔNIBUS ÀS 15:30: SAIA DE CASA ÀS 15:15'],
    ['-5', 'HOJE FAZ -5°C NA CIDADE', '-5°C CONGELA A ÁGUA: PROTEJA OS CANOS'],
    ['8', 'NOTA DA PROVA: 8', 'NOTA 8 ESTÁ ACIMA DA MÉDIA: REVISE SÓ O ERRO'],
    ['100', 'ARQUIVO DE 100 KB', '100 KB CABE NO E-MAIL: ANEXE O ARQUIVO'],
    ['7 8 3 9', 'VENDAS DA SEMANA: 7 8 3 9', 'VENDA CAIU NO 3º DIA: FAÇA PROMOÇÃO'],
    ['0110', 'REGISTRO BINÁRIO: 0110 = 6', '0110 = 6 É PAR: TERMINA EM ZERO']
  ];
  const DIKW_HINT = [
    'DADO: valor bruto, sem contexto. Sozinho não diz nada.',
    'INFORMAÇÃO: dado + contexto. Responde "o quê / quanto / onde".',
    'CONHECIMENTO: informação interpretada que orienta uma decisão.'
  ];
  gen.dikw = function (tier, R) {
    const cls = R.int(0, 2);
    let text;
    if (tier <= 1) text = R.pick(POOL['DIK'[cls]]); else text = R.pick(TRIPLES)[cls];
    return { type: 'text', text, opts: ['DADO', 'INFORM.', 'CONHEC.'], answer: cls, concept: 'dikw', hint: DIKW_HINT[cls], fixedOpts: true };
  };

  /* ---------- 1-2 Bases numéricas ---------- */
  const hx = (n, d) => L.toBase(n, 16, d);
  gen.bases = function (tier, R) {
    const kinds = tier <= 1 ? ['b2d', 'd2b', 'b2d'] : tier === 2 ? ['h2d', 'd2h', 'b2h', 'h2b', 'b2d'] : ['o2d', 'b2o', 'bits', 'range', 'need', 'h2d', 'd2b'];
    const k = R.pick(kinds);
    let q, r, hint;
    switch (k) {
      case 'b2d': { const v = R.int(3, tier <= 1 ? 15 : 31), b = L.toBin(v, tier <= 1 ? 4 : 5);
        q = b + ' (BIN) = ? (DEC)'; r = H.near(R, v, 4, String, 0, 40, [1, 2, 4, 8]);
        const w = []; b.split('').forEach((c, i) => { if (c === '1') w.push(1 << (b.length - 1 - i)); }); hint = b + ' = ' + w.join('+') + ' = ' + v; break; }
      case 'd2b': { const v = R.int(3, 15), b = L.toBin(v, 4);
        q = v + ' (DEC) = ? (BIN)'; const ws = []; for (let i = 0; i < 4; i++) ws.push(b.slice(0, i) + (b[i] === '1' ? '0' : '1') + b.slice(i + 1));
        r = H.pack(R, b, ws, 4); hint = v + ' = ' + b + ' (pesos 8 4 2 1)'; break; }
      case 'h2d': { const v = R.int(17, 255); q = L.hex(v) + ' (HEX) = ? (DEC)';
        r = H.near(R, v, 4, String, 0, 255, [1, 16, 15, 17]); hint = L.hex(v) + ' = ' + (v >> 4) + '×16 + ' + (v & 15) + ' = ' + v; break; }
      case 'd2h': { const v = R.int(17, 255), s = hx(v, 2); q = v + ' (DEC) = ? (HEX)';
        const sw = s[1] + s[0]; r = H.pack(R, s, [sw, hx(v + 1, 2), hx(v - 1, 2), hx(Math.min(255, v + 16), 2), hx(Math.max(0, v - 16), 2)], 4);
        hint = v + ' = ' + (v >> 4) + '×16 + ' + (v & 15) + ' = ' + s + ' em hex'; break; }
      case 'b2h': { const v = R.int(16, 255), b = L.group(L.toBin(v, 8), 4); q = b + ' (BIN) = ? (HEX)';
        const s = hx(v, 2); r = H.pack(R, s, [s[1] + s[0], hx(v ^ 1, 2), hx(v ^ 16, 2), hx(v ^ 8, 2), hx((v + 17) & 255, 2)], 4);
        hint = b.split(' ').map(g => g + '=' + parseInt(g, 2).toString(16).toUpperCase()).join('  ') + ' → ' + s; break; }
      case 'h2b': { const v = R.int(2, 15); q = '0x' + hx(v, 1) + ' = ? (BIN)'; const b = L.toBin(v, 4);
        r = H.pack(R, b, [0, 1, 2, 3].map(i => b.slice(0, i) + (b[i] === '1' ? '0' : '1') + b.slice(i + 1)), 4); hint = hx(v, 1) + ' = ' + v + ' = ' + b; break; }
      case 'o2d': { const v = R.int(8, 63); q = L.oct(v, 2) + ' (OCT) = ? (DEC)'; r = H.near(R, v, 4, String, 0, 70, [1, 7, 8, 9]);
        hint = (v >> 3) + '×8 + ' + (v & 7) + ' = ' + v; break; }
      case 'b2o': { const v = R.int(8, 63), b = L.group(L.toBin(v, 6), 3); q = b + ' (BIN) = ? (OCT)'; const s = L.toBase(v, 8, 2);
        r = H.pack(R, s, [s[1] + s[0], L.toBase(v ^ 1, 8, 2), L.toBase(v ^ 8, 8, 2), L.toBase((v + 9) & 63, 8, 2)], 4);
        hint = b.split(' ').map(g => g + '=' + parseInt(g, 2)).join('  ') + ' → ' + s; break; }
      case 'bits': { const n = R.int(3, 8); q = 'COM ' + n + ' BITS, QUANTOS VALORES?'; r = H.pack(R, 1 << n, [2 * n, n * n, 1 << (n + 1), 1 << (n - 1), n + 8], 4);
        hint = '2^' + n + ' = ' + (1 << n) + ' valores diferentes'; break; }
      case 'range': { const n = R.int(4, 8); q = 'MAIOR VALOR SEM SINAL EM ' + n + ' BITS?'; r = H.pack(R, (1 << n) - 1, [1 << n, n * n, (1 << (n - 1)) - 1, 2 * n], 4);
        hint = 'valores 0 a 2^' + n + ' − 1 = ' + ((1 << n) - 1); break; }
      default: { const N = R.pick([16, 20, 50, 100, 200, 300, 1000]), b = Math.ceil(Math.log2(N)); q = 'PARA ' + N + ' VALORES, QUANTOS BITS?';
        r = H.near(R, b, 4, String, 1, 12, [1, 2, 3]); hint = '2^' + b + ' = ' + (1 << b) + ' ≥ ' + N + ' (com ' + (b - 1) + ' bits: ' + (1 << (b - 1)) + ')'; }
    }
    return { type: 'text', text: q, big: false, opts: r.opts, answer: r.answer, concept: 'bases', hint };
  };

  /* ---------- 2-2 Entropia ---------- */
  const SOURCES = [[.25, .25, .25, .25], [.7, .1, .1, .1], [.45, .45, .05, .05], [.4, .3, .2, .1], [.97, .01, .01, .01], [.5, .25, .125, .125], [.34, .33, .33, 0], [.6, .2, .1, .1], [.9, .05, .03, .02]];
  const TF_ENTROPY = [
    ['MOEDA JUSTA TEM ENTROPIA DE 1 BIT', true, 'H = 2 × (1/2 × 1) = 1 bit'],
    ['MOEDA QUASE SEMPRE CARA (99%) TEM MAIS ENTROPIA QUE A JUSTA', false, 'Quase certa = pouca surpresa = entropia baixa'],
    ['UM EVENTO CERTO (p = 1) CARREGA 0 BIT', true, 'I = −log2 1 = 0'],
    ['ENTROPIA É MÁXIMA QUANDO OS SÍMBOLOS SÃO EQUIPROVÁVEIS', true, 'Máxima incerteza: H = log2 N'],
    ['DADO JUSTO DE 6 FACES TEM H = 6 BITS', false, 'H = log2 6 ≈ 2,58 bits'],
    ['UM SÍMBOLO RARO TRAZ MAIS INFORMAÇÃO QUE UM COMUM', true, 'I = −log2 p: p menor, mais bits'],
    ['A ENTROPIA PODE SER NEGATIVA', false, 'H ≥ 0 sempre (p ≤ 1 → −log2 p ≥ 0)'],
    ['8 SÍMBOLOS EQUIPROVÁVEIS TÊM H = 3 BITS', true, 'log2 8 = 3'],
    ['TROCAR A ORDEM DAS PROBABILIDADES MUDA A ENTROPIA', false, 'H depende só dos valores de p, não da ordem'],
    ['QUANTO MAIOR A INCERTEZA, MAIOR A ENTROPIA', true, 'Entropia mede a incerteza média da fonte'],
    ['1 BIT É A INFORMAÇÃO DE UMA ESCOLHA ENTRE 2 OPÇÕES IGUAIS', true, 'p = 1/2 → I = 1 bit']
  ];
  const f2 = x => U.num(x, 2);
  gen.entropy = function (tier, R) {
    if (tier <= 1) {
      const k = R.int(1, 4);
      if (R.chance(0.7)) {
        const r = H.near(R, k, 4, String, 0, 8, [1, 2, 3]);
        return { type: 'text', q: 'INFORMAÇÃO DO EVENTO (BITS)?', text: 'p = 1/' + (1 << k), big: true, opts: r.opts, answer: r.answer, concept: 'info', hint: 'I = −log2(1/' + (1 << k) + ') = ' + k + ' bits' };
      }
      const fr = [1, 2, 3, 4].map(i => '1/' + (1 << i)), r = H.pack(R, '1/' + (1 << k), fr, 4);
      return { type: 'text', q: 'EVENTO DE ' + H.bitsLabel(k) + ': p = ?', text: '2^-' + k + ' ?', big: true, opts: r.opts, answer: r.answer, concept: 'info', hint: 'p = 2^−' + k + ' = 1/' + (1 << k) };
    }
    if (tier === 2) {
      if (R.chance(0.25)) return Object.assign(H.tf(R, TF_ENTROPY, 'entropy'));
      let A = R.pick(SOURCES).slice(), B = R.pick(SOURCES).slice(); R.shuffle(A);
      if (R.chance(0.2)) { B = R.shuffle(A.slice()); }
      const ha = L.entropy(A), hb = L.entropy(B), most = R.chance(0.65);
      let ans = Math.abs(ha - hb) < 1e-9 ? 1 : (ha > hb ? 0 : 2);
      if (!most && ans !== 1) ans = 2 - ans;
      return { type: 'bars', q: most ? 'QUEM TEM MAIOR ENTROPIA?' : 'QUEM É MAIS PREVISÍVEL (MENOR H)?', bars: [A, B], opts: ['A', 'IGUAL', 'B'], answer: ans, concept: 'entropy', hint: 'H(A) = ' + f2(ha) + ' bits   H(B) = ' + f2(hb) + ' bits. Mais uniforme = mais entropia.' };
    }
    if (R.chance(0.3)) return H.tf(R, TF_ENTROPY, 'entropy');
    const n = R.int(2, 5), ps = L.dyadic(R, n), h = L.entropy(ps), fr = x => '1/' + Math.round(1 / x);
    const r = H.near(R, h, 4, f2, 0, 4, [0.25, 0.5, 0.75]);
    return { type: 'text', q: 'ENTROPIA H (BITS)?', text: 'p = ' + ps.map(fr).join(', '), opts: r.opts, answer: r.answer, concept: 'entropy', hint: 'H = ' + ps.map(p => f2(p) + '×' + f2(L.info(p))).join(' + ') + ' = ' + f2(h) + ' bits' };
  };

  /* ---------- 2-4 Compressão e redundância ---------- */
  const LOSSLESS = ['ARQUIVO .ZIP', 'IMAGEM PNG', 'ÁUDIO FLAC', 'ARQUIVO .7Z', 'COMPACTAR COM GZIP', 'LEMPEL-ZIV (LZ77)', 'CÓDIGO DE HUFFMAN', 'RLE'];
  const LOSSY = ['FOTO JPEG', 'MÚSICA MP3', 'VÍDEO MP4 (H.264)', 'ÁUDIO AAC', 'ÁUDIO OGG VORBIS', 'JPEG COM QUALIDADE 30%'];
  const CODES = [
    [{ A: '0', B: '10', C: '110', D: '111' }, ''], [{ A: '00', B: '01', C: '10', D: '11' }, ''], [{ A: '0', B: '10', C: '11' }, ''], [{ A: '1', B: '01', C: '001', D: '000' }, ''],
    [{ A: '0', B: '01', C: '11' }, '0 é prefixo de 01'], [{ A: '1', B: '10', C: '11' }, '1 é prefixo de 10'], [{ A: '0', B: '1', C: '01' }, '0 é prefixo de 01'], [{ A: '00', B: '0', C: '11' }, '0 é prefixo de 00']
  ];
  const TF_COMP = [
    ['O SÍMBOLO MAIS FREQUENTE RECEBE O CÓDIGO MAIS CURTO NO HUFFMAN', true, 'Frequente → curto: reduz o tamanho médio'],
    ['HUFFMAN PODE DAR O MESMO CÓDIGO A DOIS SÍMBOLOS', false, 'Seria ambíguo: cada símbolo tem código único'],
    ['COMPRESSÃO SEM PERDAS RECUPERA EXATAMENTE O ORIGINAL', true, 'Sem perdas = reversível'],
    ['COMPRIMIR DE NOVO UM .ZIP RENDE GRANDE GANHO', false, 'A redundância já foi removida'],
    ['UMA SEQUÊNCIA TOTALMENTE ALEATÓRIA COMPRIME MUITO BEM', false, 'Sem redundância, nada a remover (H = Hmax)'],
    ['TEXTO EM PORTUGUÊS TEM REDUNDÂNCIA', true, 'Letras e palavras seguem padrões previsíveis'],
    ['RLE É ÓTIMO PARA IMAGENS COM GRANDES ÁREAS UNIFORMES', true, 'Muitas repetições → contagens curtas'],
    ['JPEG É UM FORMATO SEM PERDAS', false, 'JPEG descarta detalhes: com perdas'],
    ['O LIMITE DA COMPRESSÃO SEM PERDAS É A ENTROPIA DA FONTE', true, 'Teorema de codificação de fonte de Shannon']
  ];
  gen.redundancy = function (tier, R) {
    const kinds = tier <= 1 ? ['loss', 'rle', 'loss'] : tier === 2 ? ['rle', 'unrle', 'prefix', 'ratio', 'who', 'loss'] : ['redund', 'prefix', 'ratio', 'tf', 'who', 'rle', 'unrle'];
    const k = R.pick(kinds);
    switch (k) {
      case 'loss': { const lossy = R.chance(0.5), t = R.pick(lossy ? LOSSY : LOSSLESS);
        return { type: 'text', q: 'ESTA COMPRESSÃO É...', text: t, opts: ['SEM PERDA', 'COM PERDA'], answer: lossy ? 1 : 0, concept: 'compress', hint: lossy ? 'Descarta detalhes pouco perceptíveis: COM perdas' : 'Reversível: recupera o original exato (SEM perdas)' }; }
      case 'rle': { const n = R.int(2, 3), ch = R.sample(['A', 'B', 'C', 'D', 'X', 'Z'], n); let s = '', prev = -1;
        const runs = ch.map(c => { const m = R.int(1, n === 2 ? 5 : 3); s += c.repeat(m); return [m, c]; });
        const good = L.rle(s), wrongs = [runs.map(r => r[1] + r[0]).join(''), runs.map(r => (r[0] > 1 ? r[0] : '') + r[1]).join(''), runs.map(r => (r[0] + 1) + r[1]).join(''), runs.map(r => r[0] + r[1]).reverse().join('')];
        const r = H.pack(R, good, wrongs, 4, 6);
        return { type: 'text', q: 'RLE DA SEQUÊNCIA:', text: s, big: true, opts: r.opts, answer: r.answer, concept: 'rle', hint: 'RLE = (contagem)(símbolo) por sequência: ' + good }; }
      case 'unrle': { const n = R.int(2, 3), ch = R.sample(['A', 'B', 'C', 'X', 'Y', 'Z'], n); let total = 0;
        const runs = ch.map(c => { const m = R.int(1, n === 2 ? 3 : 2); total += m; return [m, c]; });
        const code = runs.map(r => r[0] + r[1]).join(''), good = L.unrle(code);
        const sw = runs.map(r => r[1].repeat(r[0] === 1 ? 2 : r[0] - 1)).join(''), sw2 = runs.map(r => r[1]).join(''), sw3 = runs.slice().reverse().map(r => r[1].repeat(r[0])).join('');
        const r = H.pack(R, good, [sw, sw2, sw3, runs.map(r => r[1].repeat(r[0] + 1)).join('')], 4, 6);
        return { type: 'text', q: 'DESCOMPRIMA (RLE):', text: code, big: true, opts: r.opts, answer: r.answer, concept: 'rle', hint: code + ' → ' + good }; }
      case 'prefix': { const [codes, why] = R.pick(CODES), free = L.isPrefixFree(codes);
        return { type: 'text', q: 'CÓDIGO LIVRE DE PREFIXO?', lines: Object.keys(codes).map(s => s + ' = ' + codes[s]).reduce((a, x, i) => { if (i % 2 === 0) a.push(x); else a[a.length - 1] += '   ' + x; return a; }, []), opts: ['SIM', 'NÃO'], answer: free ? 0 : 1, concept: 'prefix', hint: free ? 'Nenhum código começa outro: decodificação única' : why + ': ambíguo!' }; }
      case 'ratio': { const c = R.pick([100, 200, 250]), f = R.pick([2, 4, 5, 8]), o = c * f; const r = H.pack(R, f + ':1', ['2:1', '4:1', '5:1', '8:1', '1:' + f, '10:1'], 4);
        return { type: 'text', q: 'RAZÃO DE COMPRESSÃO?', text: o + ' BITS → ' + c + ' BITS', big: false, opts: r.opts, answer: r.answer, concept: 'compress', hint: 'Razão = original / comprimido = ' + o + '/' + c + ' = ' + f + ':1' }; }
      case 'who': { const w = R.pick([['SUBSTITUI REPETIÇÕES POR UMA CONTAGEM', 0, 'RLE: conta repetições seguidas'], ['USA AS FREQUÊNCIAS EM UMA ÁRVORE BINÁRIA', 1, 'Huffman: árvore a partir das frequências'], ['MONTA UM DICIONÁRIO DE TRECHOS JÁ VISTOS', 2, 'Lempel-Ziv: dicionário adaptativo (ZIP, PNG)']]);
        return { type: 'text', q: 'QUAL ALGORITMO?', text: w[0], opts: ['RLE', 'HUFFMAN', 'LZ'], answer: w[1], concept: 'compress', hint: w[2] }; }
      case 'redund': { const [h, m] = R.pick([[1, 2], [1.5, 2], [2, 2], [0.5, 2], [3, 4], [2, 4], [1, 4]]), red = Math.round((1 - h / m) * 100);
        const r = H.pack(R, red + '%', ['0%', '25%', '50%', '75%', '12%'], 4);
        return { type: 'text', q: 'REDUNDÂNCIA R = 1 − H/Hmax', text: 'H = ' + U.num(h, 1) + '   Hmax = ' + m, opts: r.opts, answer: r.answer, concept: 'redund', hint: 'R = 1 − ' + U.num(h, 1) + '/' + m + ' = ' + red + '%' }; }
      default: return H.tf(R, TF_COMP, 'compress');
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = gen;
})(typeof window !== 'undefined' ? window : globalThis);
