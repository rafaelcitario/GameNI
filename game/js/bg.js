/* Fundos procedurais por mundo (paralaxe) — o cenário comunica o tema da matéria:
   1 = matriz de bits, 2 = espaço profundo (Shannon), 3 = placa de circuito, 4 = organismo (DNA/neurônios). */
(function () {
  'use strict';
  const NI = window.NI, W = NI.W, H = NI.H, PAL = NI.PAL, F = NI.font;
  const BG = NI.bg = {};
  const THEMES = {
    0: { base: '#0b0b1a', accent: PAL.C, dim: '#1b1f4a', name: 'Infosfera' },
    1: { base: '#03140e', accent: PAL.G, dim: '#0c4a34', name: 'Zona Bit' },
    2: { base: '#050725', accent: PAL.C, dim: '#16226e', name: 'Espaço Shannon' },
    3: { base: '#0c1214', accent: PAL.O, dim: '#35484a', name: 'Placa de Circuito' },
    4: { base: '#16082b', accent: PAL.M, dim: '#43186a', name: 'Bioesfera' }
  };
  BG.theme = w => THEMES[w] || THEMES[0];
  const cache = {};
  const rnd = NI.U.rng(99);

  function off(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function mkStars() {
    const layers = [];
    for (let l = 0; l < 3; l++) {
      const a = []; for (let i = 0; i < 26 - l * 6; i++) a.push({ x: rnd.int(0, W - 1), y: rnd.int(0, H - 1), c: l === 2 ? 0 : rnd.int(0, 2) });
      layers.push({ s: 10 + l * 14, a });
    }
    return layers;
  }
  function mkNebula() {
    const c = off(W, H), g = c.getContext('2d');
    for (let b = 0; b < 3; b++) {
      const cy = 60 + b * 100 + rnd.int(-20, 20), col = ['#101a66', '#1a1055', '#0c2a66'][b];
      for (let y = -40; y <= 40; y += 2) for (let x = 0; x < W; x += 2) {
        const d = Math.abs(y) / 40, n = Math.sin(x * 0.05 + b * 2) * 0.3 + 0.5;
        if (((x + y) & 2) === 0 && d < n * 0.9) { g.fillStyle = col; g.fillRect(x, cy + y, 2, 2); }
      }
    }
    return c;
  }
  function mkPCB() {
    const c = off(W, H), g = c.getContext('2d'), xs = [14, 46, 78, 110, 142, 166];
    g.fillStyle = '#16282a';
    xs.forEach(x => g.fillRect(x, 0, 2, H));
    for (let i = 0; i < xs.length - 1; i++) for (let k = 0; k < 4; k++) {
      const y = rnd.int(12, H - 12), x1 = xs[i], x2 = xs[i + 1];
      if (rnd() < 0.7) { g.fillStyle = '#1d3436'; g.fillRect(x1, y, x2 - x1 + 2, 2); g.fillStyle = '#2d5a5a'; g.fillRect(x1 - 1, y - 1, 4, 4); g.fillRect(x2 - 1, y - 1, 4, 4); }
    }
    for (let k = 0; k < 5; k++) { // chips
      const x = rnd.int(4, W - 30), y = rnd.int(20, H - 40), w = rnd.int(14, 24), h = rnd.int(10, 18);
      g.fillStyle = '#0a1012'; g.fillRect(x, y, w, h); g.fillStyle = '#1d3436'; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1);
      g.fillStyle = '#2d5a5a'; for (let p = 2; p < w - 2; p += 4) { g.fillRect(x + p, y - 2, 2, 2); g.fillRect(x + p, y + h, 2, 2); }
      g.fillStyle = '#4a3a1a'; g.fillRect(x + 2, y + 2, 2, 2);
    }
    return c;
  }

  BG.draw = function (g, world, t, o) {
    o = o || {};
    const th = THEMES[world] || THEMES[0], dim = o.dim === undefined ? 1 : o.dim;
    g.fillStyle = th.base; g.fillRect(0, 0, W, H);
    if (world === 1) {
      for (let i = 0; i < 13; i++) {
        const x = 5 + i * 13.5, v = 18 + (i * 7) % 23, len = 7 + (i * 5) % 6, cyc = H + len * 9, head = ((t * v + i * 61) % cyc) - 8;
        for (let k = 0; k < len; k++) {
          const y = head - k * 9; if (y < -8 || y > H) continue;
          const ch = ((Math.floor(t * 3 + i + k * 7) & 1) ? '1' : '0');
          F.draw(g, ch, x, y, k === 0 ? PAL.W : k < 3 ? th.accent : th.dim, 1);
        }
      }
    } else if (world === 2 || world === 0) {
      cache.neb = cache.neb || mkNebula(); cache.st = cache.st || mkStars();
      g.globalAlpha = 0.8; g.drawImage(cache.neb, 0, 0); g.globalAlpha = 1;
      const cols = ['#4a5aa8', '#8d99ae', '#f4f4f8'];
      cache.st.forEach((L, li) => L.a.forEach(s => { g.fillStyle = li === 2 ? '#ffffff' : cols[s.c]; g.fillRect(s.x, Math.floor((s.y + t * L.s * (o.speed || 1)) % H), li === 2 ? 2 : 1, li === 2 ? 2 : 1); }));
    } else if (world === 3) {
      cache.pcb = cache.pcb || mkPCB();
      const sy = Math.floor((t * 16 * (o.speed || 1)) % H);
      g.drawImage(cache.pcb, 0, sy); g.drawImage(cache.pcb, 0, sy - H);
      for (let i = 0; i < 7; i++) { // pulsos de sinal correndo pelas trilhas
        const x = [15, 47, 79, 111, 143, 167, 63][i], y = ((t * (40 + i * 9) + i * 53) % (H + 20)) - 10;
        g.fillStyle = th.accent; g.fillRect(x - 0, Math.floor(y), 2, 4); g.fillStyle = '#ffe0a0'; g.fillRect(x, Math.floor(y), 2, 1);
      }
    } else if (world === 4) {
      for (let k = 0; k < 2; k++) {
        const cx = k ? W - 16 : 16, amp = 11;
        for (let y = 0; y < H; y += 2) {
          const a = (y + t * 22 * (o.speed || 1)) * 0.07, x1 = cx + Math.sin(a) * amp, x2 = cx + Math.sin(a + Math.PI) * amp;
          g.fillStyle = PAL.M; g.fillRect(Math.round(x1), y, 2, 2); g.fillStyle = PAL.C; g.fillRect(Math.round(x2), y, 2, 2);
          if (((y / 2) | 0) % 7 === 0) { g.fillStyle = th.dim; g.fillRect(Math.min(x1, x2), y, Math.abs(x1 - x2), 1); }
        }
      }
      for (let i = 0; i < 9; i++) { // células/neurônios à deriva
        const x = 30 + ((i * 37) % 120) + Math.sin(t * 0.6 + i) * 6, y = (i * 53 + t * (8 + i)) % (H + 20) - 10;
        g.fillStyle = th.dim; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5); g.fillStyle = '#7a2ab0'; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        g.fillStyle = PAL.M; g.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    if (dim < 1) { g.globalAlpha = 1 - dim; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  };
})();
