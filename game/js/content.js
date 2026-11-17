/* Conteúdo pedagógico: mundos, fases, aulas-relâmpago e Códex.
   Baseado na ementa de BCM0504-15 (Natureza da Informação, UFABC) e nos planos de ensino da disciplina.
   Textos originais; referências no README (Seife, Pierce, Floyd, Roederer, Epstein). */
(function () {
  'use strict';
  const NI = window.NI, P = NI.PAL;

  NI.WORLDS = [
    null,
    { n: 1, name: 'ZONA BIT', sub: 'Dados, bits e números', color: P.G, music: 'w1' },
    { n: 2, name: 'ESPAÇO SHANNON', sub: 'Entropia e compressão', color: P.C, music: 'w2' },
    { n: 3, name: 'PLACA DE CIRCUITO', sub: 'Canais, erros e lógica', color: P.O, music: 'w3' },
    { n: 4, name: 'BIOESFERA', sub: 'Sinais, DNA e cérebro', color: P.M, music: 'w4' }
  ];

  // engine: nome do motor; cfg: configuração (terminal) ; obj: missão de uma linha
  NI.PHASES = [
    { id: '1-1', w: 1, title: 'DADO, INFORMAÇÃO\nE CONHECIMENTO', short: 'DIKW', engine: 'terminal', cfg: 'dikw', obj: 'Escolha a arma certa: DADO, INFORMAÇÃO ou CONHECIMENTO.', topics: ['Dado × informação × conhecimento'] },
    { id: '1-2', w: 1, title: 'BASES NUMÉRICAS', short: 'BASES', engine: 'terminal', cfg: 'bases', obj: 'Converta entre binário, decimal, octal e hexadecimal sob pressão.', topics: ['Bit', 'Binário, octal, hexadecimal', 'Conversões'] },
    { id: '1-3', w: 1, title: 'CANHÃO DE BITS', short: 'BITS', engine: 'bitcannon', cfg: 'bits', obj: 'Ligue os bits certos para montar o número do alvo. ASCII incluso!', topics: ['Peso dos bits', 'Hexadecimal e octal', 'Codificação ASCII'] },
    { id: '1-4', w: 1, title: 'CHEFE: OVERFLOW', short: 'BOSS', engine: 'bitcannon', cfg: 'overflow', boss: true, obj: 'Some em binário, domine o complemento de dois e resista ao ruído.', topics: ['Aritmética binária', 'Overflow', 'Complemento de dois'] },
    { id: '2-1', w: 2, title: '20 PERGUNTAS', short: 'CORTE', engine: 'cut', cfg: 'cut', obj: 'Ache o glitch com o mínimo de perguntas sim/não: divida a probabilidade ao meio.', topics: ['Informação como incerteza', 'Bit = pergunta sim/não', 'Codificação de fonte'] },
    { id: '2-2', w: 2, title: 'ENTROPIA', short: 'ENTROP', engine: 'terminal', cfg: 'entropy', obj: 'Calcule surpresa e entropia: I = −log₂ p, H = −Σ p·log₂ p.', topics: ['Quantidade de informação', 'Entropia de Shannon'] },
    { id: '2-3', w: 2, title: 'FORJA DE HUFFMAN', short: 'HUFF', engine: 'huffman', cfg: 'huffman', obj: 'Junte sempre os dois símbolos MENORES para forjar o código ótimo.', topics: ['Códigos de Huffman', 'Código livre de prefixo'] },
    { id: '2-4', w: 2, title: 'CHEFE: REI REDUNDÂNCIA', short: 'BOSS', engine: 'terminal', cfg: 'redundancy', boss: true, obj: 'Compressão com e sem perdas, RLE, Lempel-Ziv e redundância.', topics: ['Redundância', 'Compressão', 'RLE e Lempel-Ziv'] },
    { id: '3-1', w: 3, title: 'CANAL E PARIDADE', short: 'CANAL', engine: 'terminal', cfg: 'channel', obj: 'Reconheça o modelo de comunicação e detecte erros com paridade.', topics: ['Modelo fonte–canal–destino', 'Ruído e atenuação', 'Bit de paridade'] },
    { id: '3-2', w: 3, title: 'CÓDIGO DE HAMMING', short: 'HAMM', engine: 'hamming', cfg: 'hamming', obj: 'Leia os círculos de paridade e conserte o bit corrompido.', topics: ['Distância de Hamming', 'Hamming (7,4)', 'Síndrome de erro'] },
    { id: '3-3', w: 3, title: 'PORTAS LÓGICAS', short: 'LÓGICA', engine: 'logic', cfg: 'logic', obj: 'Ajuste as entradas do circuito para abrir a porta de saída.', topics: ['Álgebra booleana', 'AND, OR, NOT, XOR, NAND, NOR', 'Meio somador e somador completo'] },
    { id: '3-4', w: 3, title: 'CHEFE: DR. RUÍDO', short: 'BOSS', engine: 'terminal', cfg: 'noise', boss: true, obj: 'Paridade, Hamming e lógica booleana — tudo ao mesmo tempo.', topics: ['Revisão: erros e lógica'] },
    { id: '4-1', w: 4, title: 'AMOSTRADOR A/D', short: 'A/D', engine: 'sampler', cfg: 'sampler', obj: 'Ajuste Fs e bits: Fs > 2f e dentro do orçamento de dados.', topics: ['Analógico × digital', 'Amostragem e quantização', 'Nyquist e aliasing', 'Conversão D/A'] },
    { id: '4-2', w: 4, title: 'CÓDIGO DO DNA', short: 'DNA', engine: 'terminal', cfg: 'dna', obj: 'Pareie bases, transcreva e traduza códons em aminoácidos.', topics: ['Bases e pareamento', 'Códon e código genético', 'Redundância e mutações'] },
    { id: '4-3', w: 4, title: 'NEURÔNIOS', short: 'NEURO', engine: 'neural', cfg: 'neural', obj: 'Decifre o alvo pelos disparos: taxa e população de neurônios.', topics: ['Potencial de ação', 'Codificação por taxa', 'Codificação populacional'] },
    { id: '4-4', w: 4, title: 'SEMIÓTICA', short: 'SEMIO', engine: 'terminal', cfg: 'semiotics', obj: 'Classifique signos: ÍCONE, ÍNDICE ou SÍMBOLO.', topics: ['Signo', 'Peirce', 'Significante e significado'] },
    { id: '4-5', w: 4, title: 'CHEFE FINAL: ENTROPIA', short: 'FINAL', engine: 'terminal', cfg: 'final', boss: true, obj: 'A prova final: toda a matéria contra a própria Entropia.', topics: ['Revisão geral'] }
  ];
  // "Modo Prova": fase extra (não entra no mapa linear nem no progresso por estrelas)
  NI.RUSH = { id: 'R', w: 4, title: 'MODO PROVA', short: 'PROVA', engine: 'terminal', cfg: 'rush', obj: 'Toda a matéria, sem dicas. Quantos pontos você faz?', topics: ['Revisão geral'] };
  NI.phaseById = id => id === 'R' ? NI.RUSH : NI.PHASES.find(p => p.id === id);

  /* ---------- aulas-relâmpago: {t,b,f} por fase ---------- */
  NI.LESSONS = {
    '1-1': [
      { t: 'Dado', b: 'Dado é o registro bruto, sem contexto: 37, azul, 0110. Sozinho, não diz nada a ninguém.', f: '37' },
      { t: 'Informação', b: 'Informação é o dado com contexto e significado: "temperatura do paciente: 37 °C". Ela reduz a incerteza de quem recebe.', f: 'dado + contexto = informação' },
      { t: 'Conhecimento', b: 'Conhecimento é a informação interpretada e ligada a outras ideias, capaz de orientar uma decisão: "37 °C é normal, não precisa de remédio".', f: 'dado → informação → conhecimento' }
    ],
    '1-2': [
      { t: 'O bit', b: 'Bit (binary digit) é a menor unidade de informação: 0 ou 1. Com n bits representamos 2^n valores diferentes. Um byte tem 8 bits (256 valores).', f: 'n bits → 2^n valores' },
      { t: 'Bases numéricas', b: 'Cada posição vale uma potência da base. Em binário, 1011 = 8+0+2+1 = 11. Hexadecimal usa 16 símbolos (0–9, A–F); octal usa 8 (0–7).', f: '1011(2) = 11(10) = B(16) = 13(8)' },
      { t: 'Truque dos grupos', b: 'Cada dígito hexadecimal vale exatamente 4 bits; cada dígito octal, 3 bits. Separe os bits da direita para a esquerda.', f: '1010 1111 = A F = 0xAF = 175' }
    ],
    '1-3': [
      { t: 'Pesos dos bits', b: 'Em 8 bits os pesos são 128, 64, 32, 16, 8, 4, 2, 1. O valor é a soma dos pesos dos bits ligados.', f: '37 = 32 + 4 + 1 = 00100101' },
      { t: 'Método guloso', b: 'Para montar um número: pegue o maior peso que cabe, subtraia e repita. 37−32 = 5, 5−4 = 1, 1−1 = 0.', f: '37 → 32 → 5 → 4 → 1 → 1' },
      { t: 'Texto também é número', b: 'Letras são códigos numéricos. No ASCII, "A" = 65 e "a" = 97. O Unicode (UTF-8) estende a ideia a todos os alfabetos e emojis.', f: '"K" = 65+10 = 75 = 0100 1011' }
    ],
    '1-4': [
      { t: 'Soma binária', b: 'Regras: 0+0=0, 0+1=1, 1+1=10 (escreve 0, vai 1). Some coluna a coluna, da direita para a esquerda, levando o "vai-um".', f: '0110 + 0111 = 1101' },
      { t: 'Overflow', b: 'Quando o resultado não cabe nos bits do registrador, ele estoura: em 4 bits, 1111 + 0001 = 10000 e o bit extra (carry) se perde.', f: '1111 + 0001 = (1)0000' },
      { t: 'Complemento de dois', b: 'Para representar −n: inverta todos os bits de n e some 1. O bit mais à esquerda passa a indicar o sinal. Assim a soma funciona igual para positivos e negativos.', f: '−5 = ~00000101 + 1 = 11111011' }
    ],
    '2-1': [
      { t: 'Informação = incerteza removida', b: 'Com 8 suspeitos igualmente prováveis, cada pergunta sim/não pode eliminar metade. Em 3 perguntas você acha o culpado: 1 bit = 1 pergunta sim/não.', f: 'N possibilidades → log2 N bits' },
      { t: 'Divida a probabilidade', b: 'Se os suspeitos não são igualmente prováveis, a melhor pergunta divide a PROBABILIDADE (e não a quantidade) ao meio. Uma pergunta 50/50 rende 1 bit inteiro.', f: 'ganho = −p·log2 p − (1−p)·log2(1−p)' },
      { t: 'Limite de Shannon', b: 'Em média, você nunca usa menos perguntas do que a entropia da fonte. É a ideia do teorema da codificação de fonte (Shannon, 1948).', f: 'perguntas médias ≥ H' }
    ],
    '2-2': [
      { t: 'Surpresa', b: 'A informação de um evento é a sua surpresa: quanto mais raro, mais bits. Um evento certo (p = 1) carrega 0 bit.', f: 'I(x) = −log2 p(x)    p = 1/8 → 3 bits' },
      { t: 'Entropia', b: 'Entropia é a informação média de uma fonte. É máxima quando todos os símbolos são equiprováveis e vale 0 quando só um símbolo é possível.', f: 'H = −Σ p·log2 p      máx = log2 N' },
      { t: 'Contas fáceis', b: 'Moeda justa: H = 1 bit. Dado justo: log2 6 ≈ 2,58 bits. Probabilidades (1/2, 1/4, 1/8, 1/8): H = 0,5 + 0,5 + 0,375 + 0,375 = 1,75 bit.', f: '(1/2,1/4,1/8,1/8) → 1,75 bit' }
    ],
    '2-3': [
      { t: 'Tamanho variável', b: 'Símbolos frequentes ganham códigos curtos; raros, códigos longos — como no código Morse. A mensagem fica menor, em média.', f: 'E → .   Q → --.-' },
      { t: 'Algoritmo de Huffman', b: '1) Liste símbolos e frequências. 2) Junte os DOIS MENORES em um nó cuja frequência é a soma. 3) Repita até sobrar a raiz. 4) Leia 0 e 1 nos ramos.', f: 'sempre os dois menores' },
      { t: 'Sem ambiguidade', b: 'O código de Huffman é livre de prefixo (nenhum código começa outro), logo a decodificação é única. O comprimento médio L fica entre H e H+1.', f: 'H ≤ L < H + 1' }
    ],
    '2-4': [
      { t: 'Redundância', b: 'Redundância é a parte da mensagem que não traz informação nova: R = 1 − H/Hmax. A compressão remove redundância; a correção de erros a reintroduz de propósito.', f: 'R = 1 − H / Hmax' },
      { t: 'Sem perdas × com perdas', b: 'Sem perdas (ZIP, PNG, FLAC) recupera o original exato. Com perdas (JPEG, MP3, MP4) descarta detalhes pouco perceptíveis para comprimir mais.', f: 'ZIP/PNG/FLAC  ×  JPEG/MP3/MP4' },
      { t: 'RLE e Lempel-Ziv', b: 'RLE troca repetições por contagem. Lempel-Ziv (base do ZIP e do PNG) monta um dicionário de trechos repetidos e os substitui por referências. Huffman usa frequências.', f: 'AAAABBC → 4A2B1C' }
    ],
    '3-1': [
      { t: 'Modelo de comunicação', b: 'FONTE → CODIFICADOR → CANAL (+ RUÍDO) → DECODIFICADOR → DESTINO. Ruído é toda perturbação que altera o sinal; atenuação é o enfraquecimento do sinal com a distância.', f: 'fonte → codif. → canal → decod. → destino' },
      { t: 'Bit de paridade', b: 'Acrescente 1 bit para que o total de 1s seja par (paridade par). Se chegar ímpar, houve erro. Detecta número ímpar de erros, mas não corrige e não percebe 2 erros.', f: '1011 → 1011 1 (paridade par)' },
      { t: 'Capacidade do canal', b: 'Shannon provou que todo canal tem uma taxa máxima de bits sem erro. Abaixo dela, com redundância adequada, o erro pode ser tão pequeno quanto se queira.', f: 'C = B · log2(1 + S/N)' }
    ],
    '3-2': [
      { t: 'Distância de Hamming', b: 'É o número de bits em que duas palavras diferem. Para detectar d erros precisa-se de distância mínima d+1; para corrigir t erros, 2t+1.', f: '10110 × 10011 → distância 2' },
      { t: 'Hamming (7,4)', b: '4 bits de dados + 3 de paridade nas posições 1, 2 e 4. Cada paridade cobre um grupo: p1 (1,3,5,7), p2 (2,3,6,7), p3 (4,5,6,7). Cada círculo deve ter paridade par.', f: 'p1: 1,3,5,7  p2: 2,3,6,7  p3: 4,5,6,7' },
      { t: 'A síndrome', b: 'Se um bit inverte, os círculos ímpares formam um número binário (p3 p2 p1) que APONTA a posição do erro. Inverta esse bit e o erro some.', f: 'p1 e p3 errados → 101(2) = posição 5' }
    ],
    '3-3': [
      { t: 'Álgebra booleana', b: 'Variáveis 0/1 e operações AND (E), OR (OU), NOT (NÃO). Todo computador é feito dessas portas ligadas entre si.', f: 'AND = 1 só se A=1 e B=1' },
      { t: 'XOR, NAND, NOR e De Morgan', b: 'XOR vale 1 quando as entradas são diferentes. NAND e NOR são AND e OR negadas. De Morgan: NOT(A AND B) = (NOT A) OR (NOT B).', f: '¬(A·B) = ¬A + ¬B' },
      { t: 'Somar com portas', b: 'Meio somador: soma = A XOR B; vai-um = A AND B. Dois meios somadores + OR formam o somador completo (com carry-in).', f: 'S = A XOR B     C = A AND B' }
    ],
    '3-4': [
      { t: 'Revisão relâmpago', b: 'Paridade detecta; Hamming corrige 1 erro; portas lógicas implementam tudo isso em hardware. O Dr. Ruído mistura os três — mantenha o combo!', f: 'detectar < corrigir < prevenir' }
    ],
    '4-1': [
      { t: 'Analógico × digital', b: 'Analógico: contínuo no tempo e no valor (onda sonora, tensão). Digital: sequência de números. Digitalizar = amostrar (tempo), quantizar (valor) e codificar (bits). D/A faz o caminho inverso.', f: 'A/D: amostrar → quantizar → codificar' },
      { t: 'Nyquist–Shannon', b: 'Para reconstruir um sinal de frequência máxima f é preciso amostrar a MAIS de 2f. Abaixo disso ocorre aliasing: a onda reconstruída parece ter outra frequência (como rodas "girando ao contrário" no vídeo).', f: 'Fs > 2·f      alias = |f − k·Fs|' },
      { t: 'Bits de quantização', b: 'Mais bits → degraus menores → menos erro (cada bit extra ≈ 6 dB de SNR). Mas a taxa de dados é Fs × bits: tudo tem custo de banda e armazenamento.', f: 'dados/s = Fs × bits' }
    ],
    '4-2': [
      { t: 'Quatro letras', b: 'O DNA usa 4 bases — A, T, G, C —, ou seja, 2 bits por base. Elas se pareiam A–T e G–C (no RNA, T vira U). A informação está na ORDEM das bases.', f: 'A–T   G–C   (RNA: A–U)' },
      { t: 'Códon', b: 'Três bases formam um códon: 4³ = 64 códons (6 bits). Eles codificam 20 aminoácidos e sinais de parada. AUG = início (Met); UAA, UAG e UGA = parada.', f: '64 códons → 20 aminoácidos + PARE' },
      { t: 'Redundância e mutações', b: 'Vários códons dão o mesmo aminoácido (degenerescência): a terceira base costuma "balançar". Por isso muitas mutações são silenciosas — um código corretor de erros da natureza.', f: 'GAA → GAG : Glu → Glu (silenciosa)' }
    ],
    '4-3': [
      { t: 'Neurônio = pulso', b: 'Neurônios se comunicam por potenciais de ação: pulsos tudo-ou-nada de cerca de 1 ms. A informação não está na altura do pulso, e sim em QUANDO e QUANTOS pulsos ocorrem.', f: 'spike = 0 ou 1' },
      { t: 'Codificação por taxa', b: 'Em muitos neurônios, estímulo mais intenso significa mais pulsos por segundo (taxa de disparo). Para ler, conte os pulsos numa janela de tempo.', f: 'intensidade ↑  →  spikes/s ↑' },
      { t: 'Codificação populacional', b: 'Cada neurônio tem uma direção preferida e dispara mais quando o estímulo se aproxima dela. A direção real sai do conjunto: o vetor populacional. É redundante e resistente a ruído.', f: 'direção ≈ Σ (taxa_i × direção_i)' },
      { t: 'Memória', b: 'Memórias ficam na força das sinapses. Regra de Hebb: neurônios que disparam juntos se conectam mais forte. O cérebro guarda padrões distribuídos, não endereços como um HD.', f: 'disparam juntos → ligam juntos' }
    ],
    '4-4': [
      { t: 'Signo', b: 'Signo é algo que está no lugar de outra coisa, para alguém. Saussure: significante (a forma: a palavra "casa") + significado (o conceito de casa). O referente é a casa real.', f: 'significante + significado' },
      { t: 'Ícone, índice, símbolo', b: 'ÍCONE se parece com o objeto (foto, mapa, desenho). ÍNDICE tem ligação física ou causal (fumaça → fogo, pegada → alguém passou). SÍMBOLO depende de convenção (palavras, bandeiras, sinais).', f: 'semelhança · causa · convenção' },
      { t: 'Código compartilhado', b: 'Emissor e receptor precisam do mesmo código. Shannon mede QUANTA informação; a semiótica estuda o que ela SIGNIFICA. Sem código comum, a mensagem vira ruído.', f: 'quantidade × significado' }
    ],
    '4-5': [
      { t: 'Tudo se conecta', b: 'Informação é redução de incerteza (Shannon). Ela é codificada em bits, comprimida, protegida contra ruído, amostrada de sinais contínuos — e a vida a usa no DNA e nos neurônios. Seife (Decoding the Universe) trata a informação como conceito físico fundamental.', f: 'bit · entropia · código · canal · sinal · vida' }
    ]
  };

  /* ---------- Códex extra (tópicos além das fases) ---------- */
  NI.CODEX_EXTRA = [
    { t: 'Shannon–Fano e Lempel-Ziv', b: 'Shannon–Fano divide a lista ordenada de símbolos em dois grupos de probabilidade parecida, recursivamente. É quase ótimo, mas Huffman é sempre ótimo entre códigos de símbolo. Lempel-Ziv (LZ77/LZ78) é adaptativo: não precisa conhecer as frequências antes.', f: 'Huffman ≤ Shannon–Fano' },
    { t: 'Modulação e demodulação', b: 'Modular é impor a informação a uma portadora: AM varia a amplitude, FM a frequência, PM a fase. Demodular recupera a informação no receptor. Permite usar vários canais de rádio e transmitir bem a longas distâncias.', f: 'AM · FM · PM' },
    { t: 'Atenuação, distorção e ruído', b: 'Atenuação: perda de potência com a distância. Distorção: o canal altera o formato do sinal. Ruído: sinais aleatórios somados ao sinal. A relação sinal/ruído (SNR) mede a qualidade.', f: 'SNR(dB) = 10 log10(Ps/Pn)' },
    { t: 'Conversão D/A', b: 'O conversor D/A transforma números em níveis de tensão (degraus) e um filtro passa-baixas suaviza a escada, recuperando a onda analógica. Se a amostragem respeitou Nyquist, a reconstrução é fiel.', f: 'números → degraus → filtro → onda' },
    { t: 'Somador completo', b: 'Soma 3 bits (A, B, carry-in) e gera soma e carry-out: S = A XOR B XOR Cin; Cout = A·B + Cin·(A XOR B). Encadear N somadores soma números de N bits.', f: 'S = A XOR B XOR Cin' },
    { t: 'Unicode e UTF-8', b: 'ASCII usa 7 bits (128 caracteres). Unicode atribui um número a cada caractere de todos os idiomas; UTF-8 o codifica com 1 a 4 bytes, mantendo compatibilidade com ASCII.', f: '"ã" = U+00E3 = 2 bytes em UTF-8' },
    { t: 'Informação quântica', b: 'Um qubit pode estar numa superposição de 0 e 1; ao ser medido, resulta 0 ou 1 com certas probabilidades. N qubits descrevem 2^N amplitudes, mas a medição extrai só N bits clássicos.', f: '|ψ> = α|0> + β|1>' },
    { t: 'Demônio de Maxwell e Landauer', b: 'O demônio de Maxwell separaria moléculas rápidas e lentas, reduzindo entropia. Landauer mostrou que apagar 1 bit de memória dissipa pelo menos k·T·ln2 de energia: informação é física (tema central de Seife).', f: 'E ≥ k·T·ln 2 por bit apagado' }
  ];

  NI.READINGS = [
    'SEIFE, C. Decoding the Universe. Penguin, 2006 (bibliografia básica da disciplina).',
    'FLOYD, T. L. Sistemas Digitais. Bookman, 2007.',
    'PIERCE, J. R. An Introduction to Information Theory: Symbols, Signals and Noise. Dover.',
    'ROEDERER, J. G. Information and its Role in Nature. Springer, 2005.',
    'EPSTEIN, I. Teoria da Informação. Ática, 2. ed., 2006.'
  ];
})();
