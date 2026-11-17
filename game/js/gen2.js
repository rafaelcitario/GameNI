/* Geradores de perguntas (2/2): canal/paridade, DNA, semiótica, booleana, Hamming, Nyquist e misturas. */
(function (root) {
  'use strict';
  const NI = root.NI = root.NI || {};
  const L = NI.logic || require('./logic.js');
  const U = NI.U;
  const gen = NI.gen = NI.gen || {};
  const H = gen._h;

  /* ---------- 3-1 Canal e paridade ---------- */
  const MODEL = [
    ['ALGUÉM FALA AO MICROFONE', 'FONTE', 'A fonte origina a mensagem'],
    ['O CODEC CONVERTE A VOZ EM BITS', 'CODIF.', 'O codificador transforma a mensagem em sinal/código'],
    ['O CABO, O AR OU O WI-FI', 'CANAL', 'O canal é o meio que transporta o sinal'],
    ['CHIADO, ECO E INTERFERÊNCIA', 'RUÍDO', 'Ruído: perturbação que altera o sinal no canal'],
    ['O ALTO-FALANTE RECONSTRÓI O SOM A PARTIR DOS BITS', 'DECOD.', 'O decodificador inverte a codificação'],
    ['A PESSOA QUE OUVE O ÁUDIO', 'DEST.', 'O destino é quem recebe a mensagem']
  ];
  const TF_CHANNEL = [
    ['AUMENTAR A LARGURA DE BANDA AUMENTA A CAPACIDADE DO CANAL', true, 'C = B·log2(1 + S/N): C cresce com B'],
    ['MAIS RUÍDO AUMENTA A CAPACIDADE DO CANAL', false, 'Mais ruído → menor S/N → menor C'],
    ['O BIT DE PARIDADE CORRIGE ERROS', false, 'Paridade só detecta (e só número ímpar de erros)'],
    ['A ATENUAÇÃO ENFRAQUECE O SINAL COM A DISTÂNCIA', true, 'Atenuação = perda de potência no meio'],
    ['COM REDUNDÂNCIA CERTA, PODE-SE TRANSMITIR SEM ERRO ABAIXO DA CAPACIDADE', true, 'Teorema da codificação de canal de Shannon'],
    ['DOIS BITS INVERTIDOS SÃO SEMPRE DETECTADOS PELA PARIDADE', false, 'Dois erros devolvem a paridade original']
  ];
  const g4 = a => L.group(a.join(''), 4);
  gen.channel = function (tier, R) {
    const kinds = tier <= 1 ? ['model', 'parity'] : tier === 2 ? ['model', 'parity', 'atten', 'parity'] : ['parity', 'parity', 'tf', 'model', 'atten'];
    const k = R.pick(kinds);
    if (k === 'model') {
      const it = R.pick(MODEL), all = MODEL.map(m => m[1]), r = H.pack(R, it[1], all.filter(x => x !== it[1]), 4);
      return { type: 'text', q: 'QUAL PAPEL NO MODELO DE COMUNICAÇÃO?', text: it[0], opts: r.opts, answer: r.answer, concept: 'channel', hint: it[2] };
    }
    if (k === 'atten') {
      const it = R.pick([['O SINAL FICA MAIS FRACO COM A DISTÂNCIA', 'ATENUAÇÃO', 'Atenuação = perda de potência'], ['SINAIS ALEATÓRIOS SOMADOS AO SINAL', 'RUÍDO', 'Ruído = perturbação aleatória'], ['IMPOR A MENSAGEM A UMA ONDA PORTADORA', 'MODULAÇÃO', 'Modulação: AM, FM, PM']]);
      const r = H.pack(R, it[1], ['ATENUAÇÃO', 'RUÍDO', 'MODULAÇÃO'], 3);
      return { type: 'text', q: 'QUAL FENÔMENO?', text: it[0], opts: r.opts, answer: r.answer, concept: 'channel', hint: it[2] };
    }
    if (k === 'tf') return H.tf(R, TF_CHANNEL, 'channel');
    // paridade
    const even = tier < 2 ? true : R.chance(0.6), data = []; for (let i = 0; i < 7; i++) data.push(R.int(0, 1));
    const ones = data.reduce((a, b) => a + b, 0), pb = even ? ones % 2 : (ones + 1) % 2, sent = data.concat([pb]), recv = sent.slice();
    const flips = tier < 3 ? (R.chance(0.5) ? 1 : 0) : R.pick([0, 1, 1, 2]), idx = R.shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, flips);
    idx.forEach(i => { recv[i] ^= 1; });
    const total = recv.reduce((a, b) => a + b, 0), detects = (total % 2) !== (even ? 0 : 1);
    const kind = even ? 'PAR' : 'ÍMPAR';
    if (tier < 3) {
      return { type: 'text', q: 'PARIDADE ' + kind + ': PASSA NO TESTE?', text: 'RECEBIDO: ' + g4(recv), big: false, opts: ['OK', 'ERRO'], answer: detects ? 1 : 0, concept: 'parity',
        hint: 'Há ' + total + ' uns (' + (total % 2 ? 'ímpar' : 'par') + '). Paridade ' + kind.toLowerCase() + ' exige total ' + (even ? 'par' : 'ímpar') + ': ' + (detects ? 'ERRO' : 'OK') };
    }
    return { type: 'text', q: 'PARIDADE ' + kind + ': ACUSA ERRO?', lines: ['ENVIADO:  ' + g4(sent), 'RECEBIDO: ' + g4(recv)], opts: ['SIM', 'NÃO'], answer: detects ? 0 : 1, concept: 'parity',
      hint: flips === 2 ? '2 bits invertidos: a paridade volta a ficar certa — NÃO detecta!' : flips === 1 ? '1 bit invertido muda a paridade: detecta' : 'Nada mudou: sem erro' };
  };

  /* ---------- 4-2 DNA ---------- */
  const FAM = [['GC', 'A'], ['GG', 'G'], ['GU', 'V'], ['CC', 'P'], ['AC', 'T'], ['UC', 'S'], ['CU', 'L'], ['CG', 'R']];
  let mutCache = null;
  function mutations() {
    if (mutCache) return mutCache; mutCache = { silenciosa: [], troca: [], parada: [] };
    Object.keys(L.codonTable).forEach(c => { if (L.codonTable[c] === '*') return; for (let p = 0; p < 3; p++) 'UCAG'.split('').forEach(b => { if (b === c[p]) return; const n = c.slice(0, p) + b + c.slice(p + 1); mutCache[L.mutKind(c, n)].push([c, n, p]); }); });
    return mutCache;
  }
  const TXT_AA = c => L.aaName(c);
  gen.dna = function (tier, R) {
    const kinds = tier <= 1 ? ['pair', 'pair', 'transc'] : tier === 2 ? ['fam', 'fam', 'transc', 'pair'] : tier === 3 ? ['codon', 'codon', 'mut', 'count'] : ['codon', 'mut', 'mut', 'count', 'fam'];
    const k = R.pick(kinds);
    if (k === 'pair') {
      const b = R.pick(['A', 'T', 'G', 'C']);
      return { type: 'dna', q: 'BASE COMPLEMENTAR NO DNA?', seq: b, opts: ['A', 'T', 'G', 'C'], answer: ['A', 'T', 'G', 'C'].indexOf(L.pairDNA(b)), concept: 'dna', hint: 'Pareamento: A–T e G–C (' + b + ' pareia com ' + L.pairDNA(b) + ')', fixedOpts: true };
    }
    if (k === 'transc') {
      const tpl = [0, 0, 0].map(() => R.pick(['A', 'T', 'G', 'C'])).join(''), good = L.transcribe(tpl), dnaC = [...tpl].map(L.pairDNA).join('');
      const r = H.pack(R, good, [dnaC, tpl.replace(/T/g, 'U'), [...good].reverse().join(''), good.replace(/U/g, 'T').split('').map(x => x).join('')], 4);
      return { type: 'dna', q: 'TRANSCREVA O MOLDE EM mRNA', seq: tpl, opts: r.opts, answer: r.answer, concept: 'dna', hint: 'mRNA é complementar ao molde, com U no lugar de T: ' + tpl + ' → ' + good };
    }
    if (k === 'fam') {
      const f = R.pick(FAM), c = f[0] + R.pick(['U', 'C', 'A', 'G']), good = L.AA[f[1]][0], others = FAM.filter(x => x !== f).map(x => L.AA[x[1]][0]);
      const r = H.pack(R, good, others, 4);
      return { type: 'dna', q: 'TRADUZA O CÓDON', seq: c, opts: r.opts, answer: r.answer, concept: 'codon', legend: true, hint: f[0] + '_ → ' + good + ': a 3ª base não muda o aminoácido' };
    }
    if (k === 'codon') {
      const cs = Object.keys(L.codonTable), c = R.chance(0.15) ? R.pick(['AUG', 'UGG', 'UAA', 'UAG', 'UGA']) : R.pick(cs), good = TXT_AA(c);
      const neigh = []; for (let p = 0; p < 3; p++) 'UCAG'.split('').forEach(b => { if (b !== c[p]) neigh.push(TXT_AA(c.slice(0, p) + b + c.slice(p + 1))); });
      const r = H.pack(R, good, neigh.concat(Object.keys(L.AA).map(a => L.AA[a][0])), 4);
      return { type: 'dna', q: c === 'AUG' ? 'TRADUZA (CÓDON DE INÍCIO)' : 'TRADUZA O CÓDON', seq: c, opts: r.opts, answer: r.answer, concept: 'codon', hint: c + ' → ' + good + (good === 'PARE' ? ' (códon de parada)' : c === 'AUG' ? ' (início da tradução)' : '') };
    }
    if (k === 'mut') {
      const m = mutations(), kind = R.pick(['silenciosa', 'silenciosa', 'troca', 'troca', 'parada']), [a, b] = R.pick(m[kind]);
      const names = { silenciosa: 0, troca: 1, parada: 2 };
      return { type: 'dna', q: 'QUE TIPO DE MUTAÇÃO?', seq: a + '>' + b, opts: ['SILENC.', 'TROCA', 'PARADA'], answer: names[kind], concept: 'mut', hint: a + '→' + TXT_AA(a) + ' / ' + b + '→' + TXT_AA(b) + (kind === 'silenciosa' ? ': mesmo aminoácido, silenciosa' : kind === 'troca' ? ': aminoácido diferente' : ': surgiu códon de parada') };
    }
    const it = R.pick([['BITS PARA CODIFICAR 1 BASE?', 2, [1, 2, 3, 4], '4 bases = 2² → 2 bits'], ['BITS POR CÓDON (3 BASES)?', 6, [3, 4, 6, 8], '3 bases × 2 bits = 6 bits'], ['CÓDONS POSSÍVEIS (4³)?', 64, [16, 20, 64, 256], '4 × 4 × 4 = 64'], ['AMINOÁCIDOS DO CÓDIGO PADRÃO?', 20, [4, 20, 21, 64], '20 aminoácidos (64 códons: há redundância)']]);
    const r = H.pack(R, it[1], it[2], 4);
    return { type: 'text', q: 'INFORMAÇÃO GENÉTICA', text: it[0], opts: r.opts, answer: r.answer, concept: 'dna', hint: it[3] };
  };

  /* ---------- 4-4 Semiótica ---------- */
  const SEMIO = [ // [ícone|texto, legenda, resposta 0=ÍCONE 1=ÍNDICE 2=SÍMBOLO, dica]
    ['i_foto', 'FOTO DE UMA PAISAGEM', 0, 'Parece com o objeto: ÍCONE'], ['i_gato', 'SILHUETA DE UM GATO', 0, 'Semelhança de forma: ÍCONE'], ['i_mapa', 'MAPA DE UM PAÍS', 0, 'Representa por semelhança: ÍCONE'],
    ['i_fumaca', 'FUMAÇA NO HORIZONTE', 1, 'Fumaça é efeito do fogo: ÍNDICE (causa)'], ['i_pegada', 'PEGADAS NA AREIA', 1, 'Marca física de quem passou: ÍNDICE'], ['i_termo', 'TERMÔMETRO MARCA 39°C', 1, 'Aponta causalmente a febre: ÍNDICE'],
    ['i_nuvem', 'NUVENS NEGRAS NO CÉU', 1, 'Indicam chuva: ÍNDICE'], ['i_bandeira', 'BANDEIRA DE UM PAÍS', 2, 'Significa por convenção: SÍMBOLO'], ['i_semaforo', 'SEMÁFORO VERMELHO', 2, 'Vermelho = pare só por convenção: SÍMBOLO'],
    ['i_pare', 'PLACA DE PROIBIDO', 2, 'Sinal convencional: SÍMBOLO'],
    ['T:CASA', 'A PALAVRA ESCRITA', 2, 'Palavras são convenção: SÍMBOLO'], ['T:$', 'O SINAL DE DINHEIRO', 2, 'Convenção cultural: SÍMBOLO'], ['T:7', 'O NÚMERO ESCRITO', 2, 'Números são símbolos convencionais'],
    ['T:RACHADURA', 'RACHADURA NA PAREDE', 1, 'Sinal de infiltração/recalque: ÍNDICE'], ['T:RETRATO', 'RETRATO PINTADO DE ALGUÉM', 0, 'Retrata por semelhança: ÍCONE'], ['T:TOSSE', 'TOSSE E FEBRE', 1, 'Sintomas apontam a doença: ÍNDICE']
  ];
  const TRIAD = [
    ['A PALAVRA ESCRITA "GATO" (LETRAS G-A-T-O)', 0, 'Significante = a forma (letras/som)'], ['A IDEIA DE GATO NA SUA MENTE', 1, 'Significado = o conceito'], ['O GATO DE VERDADE NO SOFÁ', 2, 'Referente = a coisa real'],
    ['O SOM "CA-SA" FALADO', 0, 'Significante: imagem acústica'], ['O CONCEITO DE MORADIA', 1, 'Significado: conceito'], ['A CASA REAL DA RUA 5', 2, 'Referente: objeto do mundo']
  ];
  const TF_SEMIO = [
    ['UMA FOTO É ÍCONE E ÍNDICE AO MESMO TEMPO', true, 'Semelhante (ícone) e causada pela luz do objeto (índice)'],
    ['SÍMBOLOS TÊM LIGAÇÃO NATURAL COM O OBJETO', false, 'A ligação do símbolo é convencional'],
    ['EMISSOR E RECEPTOR PRECISAM COMPARTILHAR O CÓDIGO', true, 'Sem código comum, a mensagem vira ruído'],
    ['SHANNON MEDE O SIGNIFICADO DA MENSAGEM', false, 'Shannon mede quantidade, não significado'],
    ['O MESMO SIGNO PODE TER SENTIDOS DIFERENTES EM CULTURAS DIFERENTES', true, 'Convenção varia: o símbolo é arbitrário'],
    ['FUMAÇA É UM ÍNDICE DE FOGO', true, 'Relação causal: índice']
  ];
  gen.semiotics = function (tier, R) {
    if (tier >= 2 && R.chance(0.3)) { const t = R.pick(TRIAD), o = ['FORMA', 'CONCEITO', 'COISA']; return { type: 'text', q: 'SIGNIFICANTE, SIGNIFICADO OU REFERENTE?', text: t[0], opts: o, answer: t[1] === 0 ? 0 : t[1] === 1 ? 1 : 2, concept: 'semio', hint: t[2] }; }
    if (tier >= 3 && R.chance(0.3)) return H.tf(R, TF_SEMIO, 'semio');
    const it = R.pick(SEMIO), isText = it[0].startsWith('T:');
    return { type: 'icon', icon: isText ? null : it[0], big: isText ? it[0].slice(2) : null, text: it[1], opts: ['ÍCONE', 'ÍNDICE', 'SÍMBOLO'], answer: it[2], concept: 'semio', hint: it[3] };
  };

  /* ---------- lógica booleana (chefes) ---------- */
  gen.boolean = function (tier, R) {
    const kind = tier <= 1 ? 'one' : tier === 2 ? R.pick(['one', 'two', 'two']) : R.pick(['two', 'dem', 'dem', 'xor']);
    if (kind === 'one') {
      const g = R.pick(['AND', 'OR', 'XOR', 'NAND', 'NOR']), a = R.int(0, 1), b = R.int(0, 1), y = L.gate(g, a, b);
      return { type: 'text', q: 'AVALIE:', text: a + ' ' + g + ' ' + b + ' = ?', big: true, opts: ['0', '1'], answer: y, concept: 'logic', hint: g + '(' + a + ',' + b + ') = ' + y };
    }
    if (kind === 'two') {
      const g1 = R.pick(['AND', 'OR', 'XOR']), g2 = R.pick(['AND', 'OR', 'XOR']), a = R.int(0, 1), b = R.int(0, 1), c = R.int(0, 1), neg = R.chance(0.5);
      const m = L.gate(g1, a, b), y = L.gate(g2, neg ? m ^ 1 : m, c);
      return { type: 'text', q: 'AVALIE:', text: (neg ? 'NOT ' : '') + '(' + a + ' ' + g1 + ' ' + b + ') ' + g2 + ' ' + c, opts: ['0', '1'], answer: y, concept: 'logic', hint: 'Dentro dos parênteses: ' + m + (neg ? ', NOT → ' + (m ^ 1) : '') + '; depois ' + g2 + ' com ' + c + ' = ' + y };
    }
    if (kind === 'xor') {
      const it = R.pick([['A XOR B = 1 QUANDO...', 'A≠B', ['A=B', 'A≠B', 'A=1', 'A=B=1']], ['A AND B = 1 QUANDO...', 'A=B=1', ['A=B', 'A≠B', 'A=1', 'A=B=1']], ['A NOR B = 1 QUANDO...', 'A=B=0', ['A=B=0', 'A=B=1', 'A≠B', 'A=1']]]);
      const r = H.pack(R, it[1], it[2], 4);
      return { type: 'text', q: 'TABELA-VERDADE', text: it[0], opts: r.opts, answer: r.answer, concept: 'logic', hint: 'Veja a tabela-verdade da porta' };
    }
    const it = R.pick([['!(A&B)', '!A|!B', 'De Morgan: NOT(A AND B) = NOT A OR NOT B'], ['!(A|B)', '!A&!B', 'De Morgan: NOT(A OR B) = NOT A AND NOT B']]);
    const r = H.pack(R, it[1], ['!A|!B', '!A&!B', 'A|B', 'A&B', 'A|!B'], 4);
    return { type: 'text', q: 'EQUIVALENTE (DE MORGAN)?', text: it[0] + ' = ?', big: true, opts: r.opts, answer: r.answer, concept: 'logic', hint: it[2] };
  };

  /* ---------- síndrome de Hamming e Nyquist ---------- */
  gen.hamq = function (tier, R) {
    const k = R.pick(['syn', 'syn', 'dist', 'fact']);
    if (k === 'syn') {
      const pos = R.int(1, 7), wrong = ['P1', 'P2', 'P3'].filter((_, i) => (pos >> i) & 1), r = H.near(R, pos, 4, String, 1, 7, [1, 2, 3]);
      return { type: 'text', q: 'CÍRCULOS ERRADOS → POSIÇÃO DO ERRO?', text: wrong.join(' + '), big: true, opts: r.opts, answer: r.answer, concept: 'hamming', hint: 'P1=1, P2=2, P3=4: soma = ' + pos };
    }
    if (k === 'dist') {
      const n = 5, a = [], b = []; for (let i = 0; i < n; i++) { a.push(R.int(0, 1)); b.push(R.int(0, 1)); }
      const d = L.hamDist(a, b), r = H.near(R, d, 4, String, 0, 5, [1, 2, 3]);
      return { type: 'text', q: 'DISTÂNCIA DE HAMMING?', lines: [a.join(''), b.join('')], big: true, opts: r.opts, answer: r.answer, concept: 'hamming', hint: 'Conte as posições diferentes: ' + d };
    }
    const it = R.pick([['QUANTOS ERROS O HAMMING (7,4) CORRIGE?', 1, [0, 1, 2, 3], 'Distância mínima 3: corrige 1 e detecta 2'], ['BITS DE DADOS NO HAMMING (7,4)?', 4, [3, 4, 5, 7], '7 bits = 4 de dados + 3 de paridade'], ['BITS DE PARIDADE NO HAMMING (7,4)?', 3, [1, 2, 3, 4], 'Posições 1, 2 e 4']]);
    const r = H.pack(R, it[1], it[2], 4);
    return { type: 'text', q: 'HAMMING (7,4)', text: it[0], opts: r.opts, answer: r.answer, concept: 'hamming', hint: it[3] };
  };
  gen.nyquist = function (tier, R) {
    const k = R.pick(['rate', 'rate', 'cd', 'alias', 'bits']);
    if (k === 'rate') { const f = R.pick([1, 2, 3, 4, 5, 8]), fm = x => U.num(x, 1);
      const r = H.pack(R, fm(2 * f), [f, 4 * f, f / 2, 2 * f + 1, 3 * f].map(fm), 4);
      return { type: 'text', q: 'TAXA MÍNIMA DE NYQUIST (KHZ)?', text: 'SINAL DE ' + f + ' KHZ', opts: r.opts, answer: r.answer, concept: 'nyq', hint: 'Fs > 2f = ' + 2 * f + ' kHz' }; }
    if (k === 'cd') { const r = H.pack(R, '22,05', ['22,05', '44,1', '88,2', '11,02'], 4);
      return { type: 'text', q: 'CD: AMOSTRAGEM A 44,1 KHZ. MAIOR FREQUÊNCIA (KHZ)?', text: 'Fs = 44,1 KHZ', opts: r.opts, answer: r.answer, concept: 'nyq', hint: 'f < Fs/2 = 22,05 kHz (acima da audição humana)' }; }
    if (k === 'alias') { const fs = R.pick([10, 20, 40]), f = R.int(Math.floor(fs / 2) + 1, fs - 2), a = L.alias(f, fs), r = H.near(R, a, 4, String, 1, fs, [1, 2, 3, 5]);
      return { type: 'text', q: 'ALIASING: FREQUÊNCIA APARENTE?', text: 'f = ' + f + '  Fs = ' + fs, opts: r.opts, answer: r.answer, concept: 'nyq', hint: 'Alias = |f − Fs| = |' + f + ' − ' + fs + '| = ' + a }; }
    const b = R.int(2, 7), r = H.pack(R, 1 << b, [b, 2 * b, 1 << (b + 1), b * b, 1 << (b - 1)], 4);
    return { type: 'text', q: 'NÍVEIS DE QUANTIZAÇÃO', text: b + ' BITS → QUANTOS NÍVEIS?', opts: r.opts, answer: r.answer, concept: 'nyq', hint: '2^' + b + ' = ' + (1 << b) + ' níveis' };
  };

  /* ---------- misturas para chefes e modo prova ---------- */
  gen.mix = function (list, tierLo, tierHi) {
    return function (tier, R) { const g = gen[R.pick(list)]; return g(Math.max(tierLo || 1, Math.min(tierHi || 3, tier)), R); };
  };
  gen.noise = gen.mix(['channel', 'channel', 'boolean', 'hamq'], 2, 3);
  gen.final = gen.mix(['dikw', 'bases', 'entropy', 'redundancy', 'channel', 'boolean', 'hamq', 'nyquist', 'dna', 'semiotics'], 2, 3);
  gen.rush = gen.final;
  if (typeof module !== 'undefined' && module.exports) module.exports = gen;
})(typeof window !== 'undefined' ? window : globalThis);
