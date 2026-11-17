/* Pixel art original em código (CC0). Cada letra = cor da paleta NI.PAL; '.' = transparente.
   Se existir assets/sprites/<nome>.png, ele substitui o sprite procedural (veja ASSETS.md). */
(function () {
  'use strict';
  const NI = window.NI, PAL = NI.PAL;
  const defs = {}, cv = {};

  function def(name, rows, mirror) {
    const w = Math.max(...rows.map(r => r.length));
    rows = rows.map(r => r.padEnd(w, '.'));
    if (mirror) rows = rows.map(r => r + r.split('').reverse().join(''));
    defs[name] = rows;
  }
  function build(name) {
    const rows = defs[name]; if (!rows) throw new Error('sprite ausente: ' + name);
    const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const k = r[x]; if (k !== '.') { g.fillStyle = PAL[k] || '#f0f'; g.fillRect(x, y, 1, 1); } } });
    return c;
  }
  function silhouette(src, color) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in';
    g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); return c;
  }

  /* ---- nave do jogador (16x16) ---- */
  def('ship', [
    '.......W', '.......W', '......CW', '......CW', '......CY', '.....CBY', '.....CBW', '....CCBW',
    'S...CCBB', 'SC.CCBBC', 'SCCCBBDC', 'SCCBBDDC', 'CCBDDEDS', 'C.BD.EES', '..D...ES', '......R.'
  ], true);
  /* ---- inimigos ---- */
  def('drone', ['....PP', '..PPPP', '.PPPPP', 'PPMWPP', 'PPMMPP', 'PPPPPP', '.PEPEP', 'PP.PP.', 'P....P'], true);
  def('glitch', ['...OO.', '..OOOO', '.OORRO', 'OORWRO', 'OORRRO', 'OOOOOO', '.O.OO.', 'O..O.O', '.O..O.'], true);
  def('bug', ['..GG..', '.GGGGG', 'GGLWGG', 'GGLLGG', 'GGGGGG', '.GGEGG', 'G.GGG.', '.G..G.', 'G....G'], true);
  /* ---- chefes (32x~24) ---- */
  def('boss1', [ // OVERFLOW: chip com olho
    '.S.S.S.S.S.S.S.S', '.S.S.S.S.S.S.S.S', 'EEEEEEEEEEEEEEEE', 'EDDDDDDDDDDDDDDD', 'EDEEEEEEEEEEEEEE', 'EDEBBBBBBBBBBBBB',
    'EDEBBBBBBBBBBBBB', 'EDEBBBBBBBBRRRRR', 'EDEBBBBBBBRRWWRR', 'EDEBBBBBBBRRWKRR', 'EDEBBBBBBBRRRRRR', 'EDEBBBBBBBBRRRRR',
    'EDEBBBBBBBBBBBBB', 'EDEBBBBBBBBBBBBB', 'EDEEEEEEEEEEEEEE', 'EDDDDDDDDDDDDDDD', 'EEEEEEEEEEEEEEEE', '.S.S.S.S.S.S.S.S', '.S.S.S.S.S.S.S.S'
  ], true);
  def('boss2', [ // REI REDUNDÂNCIA: coroa + rosto repetido
    '......Y.Y.Y.Y.Y', '......YYYYYYYYYY', '......YYRYYBYYGY', '......YYYYYYYYYY', '.....TTTTTTTTTTT', '....TTTTTTTTTTTT', '...TTTTTTTTTTTTT',
    '...TTTKKKTTTKKKT', '..TTTTKWKTTTKWKT', '..TTTTKKKTTTKKKT', '..TTTTTTTTTTTTTT', '..TTTTTTTTNNNNNN', '..TTTTTTTTNTTTTT',
    '...TTTTTTTTTNNNN', '...MMMMMMMMMMMMM', '..MMMMMMMMMMMMMM', '.MMMYMMMYMMMYMMM', '.MMMMMMMMMMMMMMM', '.MMMMMMMMMMMMMMM'
  ], true);
  def('boss3', [ // DR. RUÍDO: estática
    '....S.....S..S..', '...SWS...SWS.SW.', '..EEEEEEEEEEEEEE', '.EESEEWEESEEWEEE', '.EEEEEEEEEEEEEEE', 'EEWEERRREEEESEEE',
    'EEEERRWRREEEEWEE', 'ESEEERRRREEESEEE', 'EEEEEEEEEEEEEEEE', 'EEWEEEESEEEEEWEE', '.EEEEEEEEEEEEEEE', '.EESKKKKKKKKKKEE',
    '..EEKSKSKSKSKSKS', '..EEEKKKKKKKKKKK', '...EEEEEEEEEEEEE', '....EEEEEEEEEEEE', '.....S..S..S..S.'
  ], true);
  def('boss4', [ // ENTROPIA: orbe caótica
    '.......MMMMMMMMM', '.....MMPPPPPPPPP', '....MPPPPPPPPPVV', '...MPPPPWWPPPPPV', '..MPPPPWKKWPPPPV', '..MPPPPWKRKWPPPV',
    '.MPPPPPPWWPPPPVV', '.MPPPPPPPPPPPVVF', 'MPPPPYPPPPPPPVFF', 'MPPPPPPPPPPVVVFF', 'MPPPPPPPPPVVFFFF', '.MPPPPPPPVVFFFFF',
    '.MPPPYPPPVVFFFFF', '..MPPPPPVVFFFFFF', '..MMPPPVVFFFFFFF', '...MMMVVFFFFFFFF', '.....MMVVFFFFFFF'
  ], true);
  /* ---- ícones de semiótica (12x12) ---- */
  def('i_foto', ['WWWWWWWWWWWW', 'WCCCCCCCCCCW', 'WCCCCCYYCCCW', 'WCCCCCYYCCCW', 'WCCCCCCCCCCW', 'WCCCGGCCCCCW', 'WCCGGGGCCGCW', 'WCGGGGGGGGGW', 'WGGGGGGGGGGW', 'WGGGGGGGGGGW', 'WWWWWWWWWWWW']);
  def('i_gato', ['............', '.K........K.', '.KK......KK.', '.KKKKKKKKKK.', '.KKKKKKKKKK.', '.KGKKKKKKGK.', '.KKKKMMKKKK.', '..KKKKKKKK..', '...KKKKKK...', '..KKKKKKKK..', '.KKKKKKKKKK.']);
  def('i_mapa', ['............', '.GGGBBBBBBB.', '.GGGGBBBBBB.', '.GGGGGBBBGG.', '.BGGGGGGGGG.', '.BBGGRGGGGG.', '.BBBGGGGGGB.', '.BBBBGGGGBB.', '.BBBBBGGBBB.', '.BBBBBBBBBB.', '............']);
  def('i_fumaca', ['...SSS..SS..', '..SWWWSSWWS.', '..SWWWWWWWS.', '...SSWWWSS..', '....SWWWS...', '.....SWS....', '....SWWS....', '...SWWWS....', '....SWS.....', '.....SS.....', '............']);
  def('i_pegada', ['............', '..NN........', '.NNNN.......', '.NNNN.......', '.NNNN...NN..', '..NN...NNNN.', '.......NNNN.', '........NN..', '..NN........', '..NN...NN...', '.......NN...']);
  def('i_termo', ['.....WW.....', '....WSSW....', '....WSRW....', '....WSRW....', '....WSRW....', '....WSRW....', '....WSRW....', '...WSRRRW...', '..WSRRRRRW..', '...WSRRRW...', '....WWWW....']);
  def('i_nuvem', ['............', '....EEE.....', '...EEEEEE...', '.EEEEEEEEEE.', 'EEEEEEEEEEEE', '.EEEEEEEEEE.', '............', '..C..C..C...', '.....C..C.C.', '..C..C......', '.C.....C....']);
  def('i_bandeira', ['N...........', 'NGGGGGGGGGGG', 'NGGGGYYGGGGG', 'NGGGYYYYGGGG', 'NGGYYBBYYGGG', 'NGGYYBBYYGGG', 'NGGGYYYYGGGG', 'NGGGGYYGGGGG', 'NGGGGGGGGGGG', 'N...........', 'N...........']);
  def('i_semaforo', ['...EEEEEE...', '...ERRRRE...', '...ERRRRE...', '...EEEEEE...', '...EKKKKE...', '...EKKKKE...', '...EEEEEE...', '...EKKKKE...', '...EKKKKE...', '...EEEEEE...', '.....EE.....']);
  def('i_pare', ['...RRRRRR...', '..RRRRRRRR..', '.RRRRRRRRRR.', 'RRRRRRRRRRRR', 'RWWWWWWWWWWR', 'RWWWWWWWWWWR', 'RRRRRRRRRRRR', '.RRRRRRRRRR.', '..RRRRRRRR..', '...RRRRRR...']);
  /* ---- ícones de interface ---- */
  def('heart', ['.RR.RR.', 'RRRRRRR', 'RRWRRRR', '.RRRRR.', '..RRR..', '...R...']);
  def('heart0', ['.EE.EE.', 'EEEEEEE', 'EEEEEEE', '.EEEEE.', '..EEE..', '...E...']);
  def('star', ['....Y....', '....Y....', '...YYY...', 'YYYYYYYYY', '.YYYYYYY.', '..YYYYY..', '..YYYYY..', '.YYY.YYY.', '.YY...YY.']);
  def('star0', ['....E....', '....E....', '...EEE...', 'EEEEEEEEE', '.EEEEEEE.', '..EEEEE..', '..EEEEE..', '.EEE.EEE.', '.EE...EE.']);
  def('lock', ['..SSS..', '.S...S.', '.S...S.', 'SSSSSSS', 'SSSKSSS', 'SSSKSSS', 'SSSSSSS']);
  def('pause', ['.KK.KK.', '.WW.WW.', '.WW.WW.', '.WW.WW.', '.WW.WW.', '.WW.WW.', '.KK.KK.']);
  def('pk_heal', ['..GGG..', '.GWWWG.', 'GWWGWWG', 'GWGGGWG', 'GWWGWWG', '.GWWWG.', '..GGG..']);
  def('pk_slow', ['..CCC..', '.CWWWC.', 'CWWKWWC', 'CWWKKWC', 'CWWWWWC', '.CWWWC.', '..CCC..']);
  def('pk_bomb', ['..YYY..', '.YWYWY.', 'YYWYWYY', 'YWYYYWY', 'YYWYWYY', '.YWYWY.', '..YYY..']);
  def('flame1', ['.O.', 'OYO', '.R.']);
  def('flame2', ['.R.', 'OYO', 'OYO', '.O.']);

  const S = NI.spr = {
    names: () => Object.keys(defs),
    get(name) { return cv[name] || (cv[name] = build(name)); },
    size(name) { const c = S.get(name); return [c.width, c.height]; },
    // (x,y) = centro (padrão) ou canto superior esquerdo (opts.tl)
    draw(g, name, x, y, o) {
      o = o || {};
      let c = S.get(name);
      if (o.flash) { const k = name + ':f' + (o.flash === true ? '' : o.flash); c = cv[k] || (cv[k] = silhouette(c, o.flash === true ? '#ffffff' : o.flash)); }
      const sc = o.scale || 1, w = c.width * sc, h = c.height * sc;
      const px = Math.round(o.tl ? x : x - w / 2), py = Math.round(o.tl ? y : y - h / 2);
      const prev = g.globalAlpha; if (o.alpha !== undefined) g.globalAlpha = o.alpha;
      if (o.flip) { g.save(); g.translate(px + w, py); g.scale(-1, 1); g.drawImage(c, 0, 0, w, h); g.restore(); }
      else g.drawImage(c, px, py, w, h);
      g.globalAlpha = prev;
    },
    // carrega PNGs opcionais (assets/sprites/<nome>.png) — silencioso se não existirem
    loadOverrides(names) {
      (names || Object.keys(defs)).forEach(n => {
        const im = new Image();
        im.onload = () => { cv[n] = im; Object.keys(cv).forEach(k => { if (k.startsWith(n + ':')) delete cv[k]; }); };
        im.onerror = () => { };
        im.src = 'assets/sprites/' + n + '.png';
      });
    },
    // Base de DNA/RNA: quadradinho colorido com a letra
    base(g, ch, x, y, s = 14) {
      const col = { A: PAL.R, T: PAL.C, U: PAL.P, G: PAL.G, C: PAL.Y }[ch] || PAL.S;
      g.fillStyle = PAL.K; g.fillRect(x - s / 2 - 1, y - s / 2 - 1, s + 2, s + 2);
      g.fillStyle = col; g.fillRect(x - s / 2, y - s / 2, s, s);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - s / 2, y - s / 2, s, 2);
      NI.font.draw(g, ch, x, y - 3, PAL.K, 1, 'c');
    }
  };
})();
