/* Configurações das fases do motor Terminal: cada fase = gerador de perguntas + ondas.
   Estrutura de level design de cada fase: TREINO (dicas ligadas, ensina) -> TESTE (sem dicas, mede) -> DESAFIO (ruído/ação) -> FINAL ou CHEFE.
   Onda: n cartões | speed px/s | gap s entre cartões | tier de dificuldade do gerador | hazard 0-4 (tiros de ruído) | hint (dica dentro do cartão). */
(function () {
  'use strict';
  const NI = window.NI, G = n => (t, R) => NI.gen[n](t, R);
  const w = (n, speed, gap, tier, hazard, o) => Object.assign({ n, speed, gap, tier, hazard: hazard || 0 }, o);
  const boss = (name, sprite, hp, speed, gap, tier, hazard, o) => Object.assign({ boss: { name, sprite, hp }, speed, gap, tier, hazard }, o);

  NI.tcfg.dikw = {
    gen: G('dikw'), waves: [
      w(5, 12, 5.0, 1, 0, { hint: true, title: 'TREINO', sub: 'leia as dicas nos cartões', recap: 'DADO = fato bruto. INFORMAÇÃO = dado com contexto. CONHECIMENTO = saber usar.' }),
      w(8, 17, 3.8, 1, 0, { title: 'TESTE', sub: 'agora sem dicas!', recap: 'Se responde uma pergunta, é informação. Se guia uma decisão, é conhecimento.' }),
      w(8, 20, 3.4, 2, 1, { title: 'DESAFIO', sub: 'ruído no canal: desvie!', recap: 'Pirâmide DIKW: dado, informação, conhecimento e sabedoria.' }),
      w(10, 23, 3.0, 2, 2, { title: 'ONDA FINAL', sub: 'tudo ou nada!' })
    ]
  };
  NI.tcfg.bases = {
    gen: G('bases'), waves: [
      w(5, 12, 5.5, 1, 0, { hint: true, title: 'TREINO', sub: 'cada bit vale uma potência de 2', recap: 'Pesos dos bits: 1, 2, 4, 8, 16, 32... Some os pesos dos bits ligados.' }),
      w(8, 15, 4.6, 1, 0, { title: 'TESTE', sub: 'sem dicas', recap: 'Hexadecimal: 4 bits por dígito (0-9 e A-F, com A = 10 e F = 15).' }),
      w(8, 17, 4.4, 2, 1, { title: 'HEXADECIMAL', sub: 'e o ruído começa', recap: 'Octal: 3 bits por dígito. Agrupe o binário de 3 em 3 (octal) ou de 4 em 4 (hex).' }),
      w(9, 19, 4.2, 3, 1, { title: 'ONDA FINAL', sub: 'octal, faixas e mais' })
    ]
  };
  NI.tcfg.entropy = {
    gen: G('entropy'), waves: [
      w(5, 12, 5.5, 1, 0, { hint: true, title: 'TREINO', sub: 'quanto mais raro, mais informa', recap: 'I = -log2(p) bits. Evento raro surpreende e carrega mais informação.' }),
      w(7, 15, 4.4, 1, 0, { title: 'TESTE', sub: 'sem dicas', recap: 'Entropia é máxima quando todos os símbolos são equiprováveis: H = log2(N).' }),
      w(8, 16, 4.8, 2, 1, { title: 'DESAFIO', sub: 'compare as fontes', recap: 'H = soma de p x log2(1/p). Fonte previsível tem entropia baixa.' }),
      w(8, 17, 5.4, 3, 1, { title: 'ONDA FINAL', sub: 'calcule a entropia' })
    ]
  };
  NI.tcfg.redundancy = {
    gen: G('redundancy'), waves: [
      w(6, 14, 4.8, 1, 0, { hint: true, title: 'AQUECIMENTO', sub: 'compressão: com ou sem perda?', recap: 'SEM perda recupera tudo (ZIP, PNG). COM perda descarta detalhes (JPEG, MP3).' }),
      w(7, 17, 4.4, 2, 1, { title: 'REVISÃO', sub: 'RLE e razão de compressão', recap: 'RLE troca repetições por (contagem, símbolo). Razão = original / comprimido.' }),
      boss('REI REDUNDÂNCIA', 'boss2', 12, 18, 4.8, 3, 2, { sub: 'Redundância R = 1 - H/Hmax' })
    ]
  };
  NI.tcfg.channel = {
    gen: G('channel'), waves: [
      w(5, 12, 5.0, 1, 0, { hint: true, title: 'TREINO', sub: 'fonte, canal, destino', recap: 'Fonte, codificador, canal (com ruído), decodificador, destino.' }),
      w(7, 15, 4.2, 1, 0, { title: 'TESTE', sub: 'sem dicas', recap: 'Ruído corrompe bits. Atenuação enfraquece o sinal com a distância.' }),
      w(8, 17, 4.2, 2, 1, { title: 'RUÍDO NO CANAL', sub: 'desvie dos bits corrompidos', recap: 'Paridade par: o total de bits 1 (com o bit extra) deve ser par. Detecta 1 erro; não corrige.' }),
      w(9, 19, 4.0, 3, 2, { title: 'ONDA FINAL', sub: 'paridade sob pressão' })
    ]
  };
  NI.tcfg.noise = {
    gen: G('noise'), waves: [
      w(6, 16, 4.4, 2, 1, { title: 'REVISÃO', sub: 'canal, paridade e lógica', recap: 'Paridade detecta; Hamming detecta e corrige 1 bit (distância mínima 3).' }),
      w(7, 18, 4.2, 3, 2, { title: 'ESTÁTICA', sub: 'o ruído aumenta', recap: 'AND só vale 1 se tudo for 1. OR só vale 0 se tudo for 0. XOR: entradas diferentes.' }),
      boss('DR. RUÍDO', 'boss3', 14, 18, 4.4, 3, 2, { sub: 'ele corrompe tudo!' })
    ]
  };
  NI.tcfg.dna = {
    gen: G('dna'), waves: [
      w(5, 12, 5.0, 1, 0, { hint: true, title: 'TREINO', sub: 'pareamento e transcrição', recap: 'DNA: A-T e C-G. No RNA, a base U substitui a T.' }),
      w(7, 15, 4.6, 2, 0, { title: 'FAMÍLIAS', sub: 'a 3ª base quase não importa', recap: 'O código genético tem 64 códons para 20 aminoácidos e 3 paradas: é redundante.' }),
      w(8, 17, 4.4, 3, 1, { title: 'TRADUÇÃO', sub: 'códons e mutações', recap: 'Silenciosa: mesmo aminoácido. Troca: aminoácido diferente. Parada: surge um códon de parada.' }),
      w(9, 19, 4.2, 4, 2, { title: 'ONDA FINAL', sub: 'da base ao aminoácido' })
    ]
  };
  NI.tcfg.semiotics = {
    gen: G('semiotics'), waves: [
      w(5, 12, 4.5, 1, 0, { hint: true, title: 'TREINO', sub: 'ícone, índice ou símbolo?', recap: 'Ícone: semelhança. Índice: causa ou vestígio. Símbolo: convenção.' }),
      w(8, 16, 3.6, 1, 0, { title: 'TESTE', sub: 'sem dicas', recap: 'Signo = significante (forma) + significado (conceito). Referente = a coisa real.' }),
      w(8, 19, 3.6, 2, 1, { title: 'DESAFIO', sub: 'a tríade do signo', recap: 'O símbolo é arbitrário: o sentido depende de um código compartilhado.' }),
      w(9, 21, 3.4, 3, 2, { title: 'ONDA FINAL', sub: 'Shannon x significado' })
    ]
  };
  NI.tcfg.final = {
    gen: G('final'), waves: [
      w(7, 17, 4.4, 2, 1, { title: 'REVISÃO 1', sub: 'toda a matéria', recap: 'Informação mede surpresa; entropia é a incerteza média da fonte.' }),
      w(8, 19, 4.2, 3, 2, { title: 'REVISÃO 2', sub: 'a matéria aperta', recap: 'Um bom código comprime (tira redundância) e protege (acrescenta redundância útil).' }),
      boss('ENTROPIA', 'boss4', 18, 20, 4.0, 3, 2, { sub: 'a desordem do universo!' })
    ]
  };
  NI.tcfg.rush = { // Modo Prova: toda a matéria, sem dicas, dificuldade crescente
    gen: G('rush'), waves: [
      w(10, 18, 3.6, 2, 1, { title: 'PROVA 1' }), w(10, 21, 3.3, 2, 2, { title: 'PROVA 2' }),
      w(12, 24, 3.0, 3, 2, { title: 'PROVA 3' }), w(12, 27, 2.8, 3, 3, { title: 'PROVA FINAL' })
    ]
  };
})();
