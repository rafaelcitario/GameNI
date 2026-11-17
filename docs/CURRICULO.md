# Matéria × fases

Este mapa mostra **o que cada fase ensina**, **qual é a mecânica** (o “ensinar na prática”) e **o que você deve sair sabendo**.
Os tópicos seguem a ementa e os planos de aula de *Natureza da Informação* (BC&T, UFABC) que estavam disponíveis publicamente.

> **Importante:** o livro-base da disciplina não pôde ser consultado. O conteúdo foi escrito a partir da ementa, de referências clássicas
> (Shannon, Pierce, Seife, Floyd, Peirce) e de conhecimento geral. Se o seu professor usar outra notação ou ênfase, **vale a notação dele**.
> Para ajustar perguntas e dicas, edite `game/js/gen1.js`, `gen2.js`, `gen3.js` (geradores) e `game/js/content.js` (aulas e Códex).

Cada fase tem uma **aula-relâmpago** antes de começar, **dicas** durante o TREINO e uma **revisão dos erros** no final.
O **Modo Prova** (menu inicial) sorteia perguntas de vários mundos (DIKW, bases, entropia, redundância, canal e paridade, Hamming, lógica booleana, Nyquist, DNA e semiótica), sem dicas; vale pontos e guarda o seu recorde.

---

## Mundo 1 — ZONA BIT · dados, bits e números

| Fase | Tópicos | Mecânica | Você sai sabendo |
|---|---|---|---|
| **1-1 Dado, informação e conhecimento** | DIKW | *Terminal:* pacotes caem e você escolhe a arma **DADO / INFORMAÇÃO / CONHECIMENTO** para cada situação. | Dado = registro bruto; informação = dado com contexto/significado; conhecimento = informação interpretada e aplicada. |
| **1-2 Bases numéricas** | Bit; binário, octal, hexadecimal; conversões | *Terminal:* pacotes com conversões (BIN↔DEC↔OCT↔HEX) e respostas em botões. | Valor posicional: `1011₂ = 8+2+1 = 11`; 1 dígito hex = 4 bits; 1 dígito octal = 3 bits. |
| **1-3 Canhão de bits** | Peso dos bits; hexadecimal e octal; ASCII | *Canhão:* ligue/desligue o registrador de 4 a 8 bits até igualar o número do alvo (decimal, `0x..`, `0o..` ou caractere ASCII). | Pesos `128 64 32 16 8 4 2 1`; `'A' = 65 = 01000001`; letras minúsculas diferem em 1 bit (32). |
| **1-4 Chefe: Overflow** | Soma binária; overflow; complemento de dois | *Canhão* com chefe: some números, descubra o que “estoura” e represente negativos. | Soma com vai-um; com *n* bits o máximo sem sinal é `2ⁿ−1`; complemento de dois: inverter e somar 1; faixa `−2ⁿ⁻¹ … 2ⁿ⁻¹−1`. |

## Mundo 2 — ESPAÇO SHANNON · entropia e compressão

| Fase | Tópicos | Mecânica | Você sai sabendo |
|---|---|---|---|
| **2-1 20 Perguntas** | Informação como incerteza; bit = pergunta sim/não; codificação de fonte | *Cortes:* um alvo escondido entre N blocos; cada pergunta sim/não corta a fila. O melhor corte divide a **probabilidade** (não a quantidade) ao meio. | 8 possibilidades equiprováveis = 3 perguntas = 3 bits; com probabilidades desiguais o número médio de perguntas cai (entropia). |
| **2-2 Entropia** | Quantidade de informação; entropia de Shannon | *Terminal:* cálculos de surpresa e entropia. | `I = −log₂ p`; `H = −Σ pᵢ·log₂ pᵢ`; entropia é máxima quando tudo é equiprovável; evento certo carrega 0 bit. |
| **2-3 Forja de Huffman** | Códigos de Huffman; código livre de prefixo | *Forja:* funda sempre os **dois menores** pesos, monte a árvore e leia os códigos (0 = esquerda, 1 = direita). Compare com o código de tamanho fixo. | Símbolos mais frequentes ganham códigos mais curtos; nenhum código é prefixo de outro; o comprimento médio fica entre `H` e `H+1`. |
| **2-4 Chefe: Rei Redundância** | Redundância; compressão com e sem perdas; RLE; Lempel-Ziv | *Terminal* com chefe e perguntas de compressão. | `AAAABBB → 4A3B` (RLE); LZ troca repetições por referências; sem perdas (ZIP, PNG) × com perdas (JPEG, MP3); redundância é o que a compressão remove. |

## Mundo 3 — PLACA DE CIRCUITO · canais, erros e lógica

| Fase | Tópicos | Mecânica | Você sai sabendo |
|---|---|---|---|
| **3-1 Canal e paridade** | Modelo fonte–canal–destino; ruído e atenuação; bit de paridade | *Terminal:* identifique os elementos do modelo de comunicação e calcule o bit de paridade. | Fonte → codificador → canal (+ ruído) → decodificador → destino; paridade par/ímpar **detecta** um erro, mas não o localiza nem corrige. |
| **3-2 Código de Hamming** | Distância de Hamming; Hamming (7,4); síndrome | *Hamming:* 3 círculos de paridade (C1, C2, C3). Os que ficam vermelhos formam a **síndrome** e apontam o bit errado; depois codifique 4 bits de dados e meça distâncias. | `d_H` = nº de posições diferentes; para corrigir `t` erros é preciso `d_min ≥ 2t+1`; Hamming (7,4) corrige 1 erro (4 dados + 3 paridades). |
| **3-3 Portas lógicas** | Álgebra booleana; AND, OR, NOT, XOR, NAND, NOR; meio somador e somador completo | *Circuito:* altere as chaves de entrada para que a saída iguale o alvo; fios acesos mostram o sinal e a tabela-verdade acompanha. | Tabelas-verdade; XOR = “entradas diferentes” (soma sem vai-um); meio somador = XOR + AND; somador completo encadeia dois deles. |
| **3-4 Chefe: Dr. Ruído** | Revisão: erros e lógica | *Terminal* com chefe misturando paridade, Hamming e portas. | Integra o mundo 3 sob pressão. |

## Mundo 4 — BIOESFERA · sinais, DNA e cérebro

| Fase | Tópicos | Mecânica | Você sai sabendo |
|---|---|---|---|
| **4-1 Amostrador A/D** | Analógico × digital; amostragem e quantização; Nyquist e aliasing; D/A | *Amostrador:* o sinal original (tom de *f* Hz) é amostrado; ajuste a taxa **Fs** e os **bits** até a reconstrução “travar”. Fs baixa gera aliasing visível. | Nyquist: `Fs > 2·f_max`; *n* bits dão `2ⁿ` níveis; taxa de dados = `Fs × bits`; abaixo de Nyquist o sinal se “disfarça” de outra frequência (aliasing). |
| **4-2 Código do DNA** | Bases e pareamento; códon e código genético; redundância e mutações | *Terminal:* pareie A-T / C-G, transcreva DNA → RNA (T→U) e traduza códons em aminoácidos. | 4 bases = 2 bits por base; códon = 3 bases = 64 combinações para 20 aminoácidos + paradas (**redundância** do código); mutação silenciosa × troca de aminoácido. |
| **4-3 Neurônios** | Potencial de ação; codificação por taxa; codificação populacional | *Neurônios:* cada neurônio dispara (Poisson) mais quando o alvo está na sua direção preferida. Descubra a **direção** (população de neurônios) e a **distância** (taxa de disparos: mais disparos por segundo = mais perto), arraste, mire e solte. | Disparos são “tudo ou nada”; a informação está na **taxa** e na **população** que dispara; o ruído (disparos aleatórios) exige integrar ao longo do tempo. |
| **4-4 Semiótica** | Signo; Peirce; significante e significado | *Terminal:* classifique exemplos em **ÍCONE** (semelhança), **ÍNDICE** (relação causal/física) ou **SÍMBOLO** (convenção). | Fumaça → índice de fogo; foto/mapa → ícone; palavra, bandeira, emoji → símbolo; significante × significado (Saussure). |
| **4-5 Chefe final: Entropia** | Revisão geral | *Terminal* com chefe final: mistura DIKW, bases, entropia, redundância, canal e paridade, Hamming, lógica booleana, Nyquist, DNA e semiótica. | Prova de fogo de toda a matéria. |

---

## Como os números do jogo foram escolhidos (para quem quiser ajustar)

- **Geradores de perguntas** (`gen1/2/3.js`) são funções puras: dado um nível (`tier`) e uma semente, devolvem pergunta, opções, gabarito e **dica**
  (a dica mostra a conta, por exemplo `9 = 8+1 → 1001`). `tools/test-gen.js` roda dezenas de milhares de perguntas e confere: gabarito único,
  opções distintas, textos que cabem na tela, dica coerente com a resposta.
- **Lógica matemática** (`logic.js`): bases, entropia, árvore de Huffman, Hamming, tabelas-verdade, reconstrução de Nyquist. Testada por `tools/test-logic.js`.
- **Ondas** de cada fase ficam em `NI.tcfg` (Terminal e Canhão, em `phases/tcfg.js` e `phases/bitcannon.js`) ou no fim de cada arquivo de motor
  (Cortes, Huffman, Hamming, Circuito, Amostrador, Neurônios): tempo por rodada, quantidade de alvos, dicas ligadas/desligadas, ruído.

## Leituras de apoio

Veja a lista no [README](../README.md#7-leituras-de-apoio) e **sempre confirme com a bibliografia oficial da disciplina**.
