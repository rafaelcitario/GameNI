# Assets, créditos e como trocar a arte

## O que o jogo usa hoje

**Tudo é original e gerado em código — nenhum arquivo de terceiros.**

- **Pixel art:** cada sprite é uma grade de caracteres em `game/js/sprites.js` (uma letra = uma cor da paleta de 18 cores em `util.js`),
  pintada num canvas pequeno na inicialização e ampliada sem suavização (`image-rendering: pixelated`). Naves, drones, glitches, bugs, chefes, ícones de signos,
  corações, estrelas e bônus. Os sprites com “espelho” guardam só metade e são simetrizados.
- **Fontes:** fonte bitmap 5×7 própria (`font.js`), desenhada no canvas.
- **Fundos:** procedurais, com paralaxe (`bg.js`).
- **Som:** sintetizado em tempo real com WebAudio (`audio.js`); não há arquivos de áudio.
- **Ícone do app:** gerado por `tools/make-icons.py` (a mesma nave + bits “1 0 1”).

Licença de toda essa arte e som: **CC0 (domínio público)** — use, modifique e redistribua sem pedir.

### Por que não usei pacotes de pixel art prontos?

O pedido era buscar assets pixel gratuitos. Onde o projeto foi escrito, a busca na web funcionou, mas **o acesso à rede para baixar arquivos estava bloqueado**
(só dava para ler resultados de busca, não para baixar PNGs/ZIPs). Para não entregar um jogo com imagens faltando — nem com arquivos de licença incerta —,
os sprites foram desenhados em código. O sistema abaixo permite trocar qualquer sprite por um PNG de pacote livre em segundos.

## Como substituir sprites por PNGs (opcional)

1. Coloque um arquivo `NOME.png` em `game/assets/sprites/` (fundo transparente).
2. No próximo carregamento, o jogo usa esse PNG no lugar do sprite procedural de mesmo nome. Arquivos que não existem são ignorados em silêncio.
3. **Use o mesmo tamanho em pixels do sprite original**, ou ele aparecerá maior/menor (o jogo ampliará sua imagem pelo mesmo fator).
   Para sprites simétricos o PNG deve estar **inteiro** (já espelhado), no tamanho da tabela.

| Sprite | Tam. (px) | Sprite | Tam. (px) | Sprite | Tam. (px) |
|---|---|---|---|---|---|
| `ship` | 16×16 | `boss1` | 32×19 | `i_foto` | 12×11 |
| `drone` | 12×9 | `boss2` | 32×19 | `i_gato` | 12×11 |
| `glitch` | 12×9 | `boss3` | 32×17 | `i_mapa` | 12×11 |
| `bug` | 12×9 | `boss4` | 32×17 | `i_fumaca` | 12×11 |
| `heart` | 7×6 | `star` | 9×9 | `i_pegada` | 12×11 |
| `heart0` | 7×6 | `star0` | 9×9 | `i_termo` | 12×11 |
| `lock` | 7×7 | `pause` | 7×7 | `i_nuvem` | 12×11 |
| `pk_heal` | 7×7 | `pk_slow` | 7×7 | `i_bandeira` | 12×11 |
| `pk_bomb` | 7×7 | `flame1` | 3×3 | `i_semaforo` | 12×11 |
| `flame2` | 3×4 | `i_pare` | 12×10 | | |

Os sprites `boss1`–`boss4` são os chefes dos mundos 1–4; `i_*` são os exemplos da fase de Semiótica (ícone/índice/símbolo).
Depois de trocar arquivos, rode o jogo no navegador (`cd game && python3 -m http.server`) para conferir; o APK passa a incluí-los automaticamente.

## Onde buscar arte e som livres (sugestões — verifique a licença de cada pacote)

Não consegui baixar nem verificar estes links a partir do ambiente de criação; são pontos de partida conhecidos:

- **Kenney** (kenney.nl): pacotes de pixel art e de áudio em **CC0** (por exemplo, os de nave/“shoot ’em up” e interface em pixel).
- **OpenGameArt.org:** grande acervo; **cada arquivo tem a sua licença** (CC0, CC-BY, CC-BY-SA, GPL…). Com CC-BY é obrigatório dar crédito.
- **itch.io** (seção de assets gratuitos): licenças variam bastante; leia a página do autor.
- **Freesound.org** (sons): licenças variam (CC0, CC-BY…).

Se usar material de terceiros, registre aqui o autor, a fonte e a licença:

| Arquivo | Autor | Fonte | Licença |
|---|---|---|---|
| *(nenhum — todo o material atual é original do projeto, CC0)* | | | |
