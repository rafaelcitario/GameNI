# Level design e sound design

Este documento explica **por que o jogo é como é** (decisões de design) e **onde mexer** para ajustar ou ampliar.

## 1. Pilares

1. **Aprender fazendo.** Cada conceito vira uma ação de jogo: escolher a arma certa, ligar bits, cortar a fila de possibilidades, fundir símbolos,
   consertar um bit, fechar um circuito, travar o sinal, ler disparos. A pergunta nunca é uma tela de teste: ela está *dentro* da ação.
2. **Erro é informação.** Errar mostra na hora o **gabarito + a conta** (“9 = 8+1 → 1001”) e o conceito entra na lista de **revisão** no fim da fase.
3. **Ensinar → testar → complicar.** Cada fase abre com dicas (TREINO), mede sem dicas (TESTE), depois soma pressão (DESAFIO, ruído, tempo) e fecha com uma ONDA FINAL.
4. **Um polegar, retrato.** Tudo cabe numa tela 180×320 (pixel art ampliada), com botões de resposta grandes na metade de baixo, sem gestos complicados.
5. **Dificuldade que respeita o jogador.** O jogo mede você em tempo real e ajusta a velocidade; ninguém fica preso nem entediado.

## 2. Anatomia de uma fase

```
Mapa ─► Aula-relâmpago (cartões) ─► ONDA 1 TREINO ─► ONDA 2 TESTE ─► ONDA 3 DESAFIO ─► ONDA FINAL / CHEFE ─► Resultado + revisão
                                         dicas ligadas    sem dicas       ação + ruído        tudo junto            estrelas, erros por conceito
```

- **Aula-relâmpago:** de 1 a 4 cartões curtos antes de jogar (em geral 3: título, explicação e uma fórmula ou frase-resumo). Dá para rever pelo botão *REVER A AULA* ou no **Códex**.
- **Ondas:** a transição mostra um banner e um resumo de uma linha do que acabou de ser praticado (“respiro” de ~2,5 s). A primeira onda tem **tempo relaxado (ou nenhum) e dicas**.
- **Fim de fase:** estrelas (★ concluir, ★★ ≥ 75% de acerto, ★★★ ≥ 90%), pontuação, e uma lista **“o que revisar”** com os conceitos mais errados.
- **Progressão:** liberação linear (terminar a fase libera a próxima) + **Modo estudo** nos Ajustes (tudo liberado). 17 fases × 3 estrelas = 51.

## 3. Curva de dificuldade

| Camada | Como funciona | Onde ajustar |
|---|---|---|
| **Por mundo** | Os 4 mundos introduzem ideias novas em ordem de dependência (bits → informação → erros/lógica → sinais/vida) e cada um fecha com um **chefe** que revisa o mundo. | `game/js/content.js` (`NI.PHASES`) |
| **Por onda** | Cada onda define tempo por rodada, nº de alvos, dicas, ruído, tamanho dos blocos etc. | `NI.tcfg.*` (`phases/tcfg.js`, `bitcannon.js`) ou fim de cada motor |
| **Adaptativa (DDA)** | `skill` vai de 0,7 a 1,35: **+0,035** a cada acerto, **−0,09** a cada erro ou vazamento. Temporizadores e velocidades são divididos por `1 + (skill−1)·0,6`. | `game/js/play.js` |
| **Combo** | Multiplicador `1 + min(4, ⌊combo/4⌋)` (×1 a ×5); a cada 5 acertos seguidos: som, flash e texto “COMBO ×n!”. Errar zera. | `play.js` |
| **Escudo** | 5 pontos; ao ser atingido há **1 s de invulnerabilidade**; com 1 ponto o jogo toca o “coração batendo” (alarme). Alvos dourados soltam bônus: +1 escudo, câmera lenta (5 s) ou limpeza dos tiros inimigos. | `play.js`, `terminal.js` |
| **Chefes** | Padrões de tiro por tipo; **fúria** com menos de 66% de vida (“O CHEFE SE ENFURECE!”) e **última fase** com menos de 33%; o intervalo entre ataques cai de 3,1 s para 2,0 s. Deixar pacotes vazarem cura o chefe. | `terminal.js`, `bitcannon.js` |

**Calibração feita com robôs.** Um jogador automático (`tools/smoke.js`) joga cada fase com perfis diferentes (rápido/lento, preciso/descuidado, reflexo humano de ~0,3 s).
A meta de cada fase: o perfil “paciente e preciso” vence quase sempre; os impacientes/descuidados perdem escudo e às vezes a fase; os chefes pedem
um desempenho médio-bom. Isso tira o grosso do “chute”, mas **não substitui testar com pessoas de verdade** — ajuste as ondas conforme o seu público.

## 4. Ritmo e “game feel”

- **Ação em camadas:** além de responder, o jogador *se move* (desviar do ruído, pegar bônus) ou *mira* (neurônios, amostrador), então há sempre algo acontecendo.
- **Feedback em 3 sentidos:** partículas e textos flutuantes (visão), efeito sonoro posicional (audição) e vibração curta no Android (tato); acertos e erros têm formas e sons distintos.
- **Impacto:** tremor de tela, flash de cor e um breve *hit-stop* (a ação congela por centésimos de segundo) ao tomar dano e ao derrotar um chefe.
- **Cenário que ensina:** os fundos em paralaxe mudam de tema com o mundo — matriz de bits (1), espaço profundo de Shannon (2), placa de circuito (3), organismo com DNA e neurônios (4).
- **Texto legível:** fonte própria 5×7 desenhada no canvas, sempre em maiúsculas; nada de parágrafo longo durante a ação (as explicações ficam nas aulas e nas dicas).

## 5. Sound design

Todo o áudio é **sintetizado em tempo real** (WebAudio): não há arquivos de som, o APK fica pequeno e dá para ajustar tudo no código (`game/js/audio.js`).

**Música (chiptune procedural, em camadas).** Cada mundo tem um tema com escala, andamento e progressão próprios:

| Tema | Andamento | Escala | Clima |
|---|---|---|---|
| Título | 92 bpm | pentatônica menor | convidativo |
| Mundo 1 | 116 bpm | dórico | matriz de bits, ritmo constante |
| Mundo 2 | 104 bpm | lídio | espaço profundo, “aberto” |
| Mundo 3 | 134 bpm | frígio | placa de circuito, tenso e mecânico |
| Mundo 4 | 90 bpm | dórico lento | vida e mente, orgânico |
| Chefe | 148 bpm | menor natural | urgência |

As camadas (base/pad, baixo, bateria, arpejo, melodia) **entram e saem conforme a intensidade** da ação — `intensity()` de cada motor ou, na falta dela,
`0,3 + combo·0,03 + progresso·0,2`. Resultado: a música “respira” com o jogador, fica mais cheia no combo e nos chefes e cai no respiro entre as ondas.

**Efeitos.** Catálogo em `SFX` (audio.js): `tap`, `laser`, `ok`, `wrong`, `boom`, `hurt`, `pickup`, `heal`, `slow`, `warn`, `tick`, `star`, `win`, `lose`, `bit`, `merge`, `zap`, `sample`, `flip`, `gate`, `cut`, `ask`, `yes`, `no`, `combo`, `swoosh`, `fire`.

- **Posicionais:** laser, explosão, *zap* e amostra usam **pan estéreo** pela posição X na tela.
- **Semânticos:** o som carrega a ideia — `bit` muda de tom conforme a posição do bit (e sobe de oitava quando liga), cada porta lógica `gate` tem sua nota
  (AND, OR, XOR, NAND…), `merge` do Huffman é um “fundir”, `sample` é um clique a cada amostra (você *ouve* a taxa de amostragem), `zap` é um estalo por disparo de neurônio.
- **Hierarquia:** sons de acerto/erro são curtos para cortar a música, e a música abaixa por um instante (*ducking*) quando você toma dano.
- **Alarme de perigo:** com o escudo em 1 ponto entra um pulso grave (“coração”).
- **Ajustes:** controles separados de música e efeitos e liga/desliga da vibração; o áudio só inicia depois do primeiro toque (regra dos navegadores) e é suspenso quando o app vai para segundo plano.

## 6. Como estender

**Nova pergunta em um tópico existente** — edite o gerador em `game/js/gen1.js`/`gen2.js`/`gen3.js` (devolva `{ text, opts, answer, hint, concept }`) e rode `node tools/test-gen.js`.

**Nova fase** (use um motor existente):
1. Gere perguntas em um `gen.<nome>` (ou ondas novas em `NI.tcfg.<nome>`).
2. Acrescente a fase em `NI.PHASES` (`content.js`) com `engine`, `cfg`, `obj` e `topics`; escreva a aula-relâmpago e entradas do Códex.
3. Rode `node tools/smoke.js run <id> --acc=1` e depois `batch` com robôs lentos/descuidados para calibrar.

**Novo motor** — crie `game/js/phases/<nome>.js` herdando de `NI.engines.Rounds` (rodadas com cronômetro e ondas) ou de `NI.engines.terminal`, implemente
`constructor(ctx, phase)`, `update(dt)`, `draw(g)`, `onDown/onMove/onUp` e registre em `NI.engines`; inclua o `<script>` em `game/index.html`.
A API de jogo (`ctx.right / wrong / leak / hurt / addScore / tip / showBanner / finish`) cuida de pontuação, combo, escudo, revisão e dificuldade adaptativa.

**Sprites** — veja [ASSETS.md](../ASSETS.md).
