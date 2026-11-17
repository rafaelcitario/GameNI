/* Componentes de interface desenhados no canvas (estilo pixel). */
(function () {
  'use strict';
  const NI = window.NI, PAL = NI.PAL, F = NI.font, W = NI.W, H = NI.H;
  const UI = NI.ui = {};

  UI.hit = (r, p) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  UI.panel = (g, x, y, w, h, o) => {
    o = o || {};
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x + 2, y + 2, w, h);
    g.fillStyle = o.border || PAL.S; g.fillRect(x, y, w, h);
    g.fillStyle = o.fill || PAL.E; g.fillRect(x + 1, y + 1, w - 2, h - 2);
    if (o.top) { g.fillStyle = o.top; g.fillRect(x + 1, y + 1, w - 2, 1); }
  };
  UI.button = (g, r, label, o) => {
    o = o || {};
    const c = o.disabled ? '#3a3a58' : (o.color || PAL.C), dy = o.down ? 1 : 0, sc = o.scale || 1;
    g.fillStyle = PAL.K; g.fillRect(r.x, r.y + 1, r.w, r.h);
    g.fillStyle = c; g.fillRect(r.x, r.y + dy, r.w, r.h - 1);
    g.fillStyle = 'rgba(255,255,255,.38)'; g.fillRect(r.x + 1, r.y + dy, r.w - 2, 1);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(r.x, r.y + dy + r.h - 3, r.w, 2);
    if (o.glow) { g.strokeStyle = PAL.W; g.globalAlpha = 0.5 + 0.5 * Math.sin(NI.engine.time * 10); g.lineWidth = 1; g.strokeRect(r.x - 0.5, r.y - 0.5 + dy, r.w + 1, r.h); g.globalAlpha = 1; }
    if (label !== undefined && label !== '') {
      const lines = String(label).split('\n'), lh = 9 * sc, th = lines.length * lh - 2 * sc;
      lines.forEach((ln, i) => F.draw(g, ln, r.x + r.w / 2, r.y + dy + Math.round((r.h - 1 - th) / 2) + i * lh, o.disabled ? PAL.S : (o.textColor || PAL.K), sc, 'c'));
    }
  };
  UI.bar = (g, x, y, w, h, f, c, bg) => {
    g.fillStyle = bg || PAL.K; g.fillRect(x, y, w, h);
    g.fillStyle = c || PAL.G; g.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, f))), h);
  };
  UI.stars = (g, cx, y, n, max, gap) => {
    max = max || 3; gap = gap || 11; const x0 = cx - ((max - 1) * gap) / 2;
    for (let i = 0; i < max; i++) NI.spr.draw(g, i < n ? 'star' : 'star0', x0 + i * gap, y);
  };
  UI.hearts = (g, x, y, n, max) => {
    for (let i = 0; i < max; i++) NI.spr.draw(g, i < n ? 'heart' : 'heart0', x + i * 9, y, { tl: true });
  };
  // balão de dica (aula-relâmpago) com quebra de linha
  UI.tip = (g, text, y, color, alpha) => {
    const lines = F.wrap(text.toLocaleUpperCase('pt-BR'), 160), h = lines.length * 9 + 7;
    g.globalAlpha = alpha === undefined ? 1 : alpha;
    UI.panel(g, 8, y, 164, h, { fill: '#10142e', border: color || PAL.Y });
    lines.forEach((l, i) => F.draw(g, l, 12, y + 5 + i * 9, PAL.W, 1));
    g.globalAlpha = 1; return h;
  };
  UI.banner = (g, title, sub, y, color, t) => {
    const e = NI.U.ease.outBack(Math.min(1, t * 4)), sc = 2;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, y - 6, W, sub ? 40 : 28);
    F.draw(g, title, W / 2, y + (1 - e) * -10, color || PAL.Y, sc, 'c', PAL.K);
    if (sub) F.para(g, sub, 10, y + 20, 160, PAL.W, 1, 9, 'c');
  };
})();
