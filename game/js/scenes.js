/* Cenas de navegação: título e mapa de fases (rolagem com inércia, desbloqueio linear, estrelas). */
(function () {
  'use strict';
  const NI = window.NI, W = NI.W, H = NI.H, PAL = NI.PAL, F = NI.font, UI = NI.ui, A = NI.audio, U = NI.U, fx = NI.fx, E = NI.engine, S = NI.save;
  let started = false;
  const disc = (g, cx, cy, r, col) => { g.fillStyle = col; for (let y = -r; y <= r; y++) { const hw = Math.round(Math.sqrt(r * r - y * y + 0.25)); g.fillRect(cx - hw, cy + y, hw * 2 + 1, 1); } };
  const DARK = '#3a3a58';

  /* ---------------------------------------------------------------- título */
  const Title = {
    enter() {
      this.t = 0; this.down = null; this.exitT = 0; this.state = started ? 'menu' : 'tap';
      A.music('title'); A.intensity(0.45); A.danger(false);
    },
    buttons() {
      const cont = Object.keys(S.data.done).length > 0;
      return [
        { id: 'play', x: 30, y: 168, w: 120, h: 28, label: cont ? 'CONTINUAR' : 'JOGAR', color: PAL.G, scale: 2 },
        { id: 'rush', x: 30, y: 202, w: 120, h: 20, label: 'MODO PROVA', color: PAL.Y },
        { id: 'codex', x: 30, y: 228, w: 57, h: 20, label: 'CÓDEX', color: PAL.C },
        { id: 'opt', x: 93, y: 228, w: 57, h: 20, label: 'AJUSTES', color: PAL.M }
      ];
    },
    fire(id) {
      if (id === 'play') E.go('map', { focus: S.first() });
      else if (id === 'rush') E.go('play', { phase: NI.RUSH, rush: true });
      else if (id === 'codex') NI.dom.codex(() => { });
      else if (id === 'opt') NI.dom.settings(() => { });
    },
    update(dt) { this.t += dt; if (this.exitT > 0) this.exitT -= dt; },
    draw(g) {
      const t = this.t; NI.bg.draw(g, 0, t, { speed: 1 });
      const s = 'INFOSFERA', cols = [PAL.C, PAL.G, PAL.Y, PAL.O, PAL.M, PAL.P, PAL.C, PAL.G, PAL.Y], x0 = Math.round((W - (s.length * 6 - 1) * 3) / 2);
      for (let i = 0; i < s.length; i++) F.draw(g, s[i], x0 + i * 18, 40 + Math.round(Math.sin(t * 3 + i * 0.7) * 2), cols[i], 3, 'l', PAL.K);
      F.draw(g, 'NATUREZA DA INFORMAÇÃO', W / 2, 72, PAL.W, 1, 'c', PAL.K);
      F.draw(g, 'BC&T · UFABC', W / 2, 83, PAL.S, 1, 'c', PAL.K);
      const hy = 126 + Math.sin(t * 2) * 3, fl = ((t * 14) | 0) % 2;
      for (let i = 0; i < 6; i++) { const a = t * 1.1 + i * Math.PI / 3, r = 38 + Math.sin(t * 2 + i) * 4; F.draw(g, i % 2 ? '1' : '0', W / 2 + Math.cos(a) * r * 1.25, hy + Math.sin(a) * r * 0.55 - 3, i % 2 ? PAL.G : PAL.C, 1, 'c'); }
      NI.spr.draw(g, 'ship', W / 2, hy, { scale: 3 });
      NI.spr.draw(g, fl ? 'flame1' : 'flame2', W / 2 - 9, hy + 31, { scale: 3 }); NI.spr.draw(g, fl ? 'flame2' : 'flame1', W / 2 + 9, hy + 31, { scale: 3 });
      if (this.state === 'tap') {
        if (((t * 2) | 0) % 2 === 0) F.draw(g, 'TOQUE PARA COMEÇAR', W / 2, 196, PAL.Y, 1, 'c', PAL.K);
      } else this.buttons().forEach(b => UI.button(g, b, b.label, { color: b.color, scale: b.scale, down: this.down && this.down.id === b.id }));
      const stars = S.totalStars();
      if (stars > 0) { NI.spr.draw(g, 'star', 70, 266); F.draw(g, stars + '/' + NI.PHASES.length * 3, 78, 263, PAL.Y, 1, 'l', PAL.K); }
      F.draw(g, 'ARTE E SOM ORIGINAIS · CC0', W / 2, 300, '#6d7aa8', 1, 'c');
      if (this.exitT > 0) UI.tip(g, 'TOQUE VOLTAR DE NOVO PARA SAIR', 280, PAL.R, Math.min(1, this.exitT * 2));
    },
    onDown(p) {
      if (this.state === 'tap') { started = true; this.state = 'menu'; A.unlock(); A.music('title', true); A.sfx('swoosh'); return; }
      this.down = this.buttons().find(b => UI.hit(b, p)) || null;
    },
    onUp(p) {
      const b = this.state === 'menu' && this.buttons().find(b => UI.hit(b, p));
      if (b && this.down && b.id === this.down.id) { A.sfx('tap'); this.fire(b.id); }
      this.down = null;
    },
    onKey(k) { if (this.state === 'tap') { this.onDown({ x: 0, y: 0 }); return; } if (k === 'Enter' || k === ' ') this.fire('play'); },
    onBack() { if (this.exitT > 0) return false; this.exitT = 2; return true; } // 2º toque em 2 s deixa o Android fechar o app
  };
  E.register('title', Title);

  /* ------------------------------------------------------------------ mapa */
  const TOP = 20, BOT = 296, VIEW = BOT - TOP;
  const MapScene = {
    enter(p) {
      p = p || {}; this.t = 0; this.build(); this.drag = null; this.down = null; this.toast = null; this.vy = 0;
      this.cur = (NI.PHASES.find(x => !S.stars(x.id) && S.unlocked(x.id)) || {}).id;
      const f = p.focus || p.open || this.cur || NI.PHASES[0].id, n = this.nodes.find(n => n.p.id === f) || this.nodes[0];
      this.sy = U.clamp(n.y - VIEW * 0.45, 0, this.max);
      this.pendingOpen = p.open || null; this.openT = 0.4;
      A.music(NI.WORLDS[n.p.w].music); A.intensity(0.35); A.danger(false);
    },
    build() {
      const nodes = [], heads = [], xs = [46, 90, 134, 90]; let y = 8, k = 0, cw = 0;
      NI.PHASES.forEach(p => { if (p.w !== cw) { cw = p.w; heads.push({ w: cw, y }); y += 46; k = 0; } nodes.push({ p, x: xs[k++ % 4], y: y + 14 }); y += 56; });
      this.nodes = nodes; this.heads = heads; this.h = y + 12; this.max = Math.max(0, this.h - VIEW);
    },
    bars() {
      return [{ id: 'back', x: 2, y: 2, w: 20, h: 16 }, { id: 'codex', x: 4, y: 299, w: 54, h: 19, label: 'CÓDEX', color: PAL.C },
        { id: 'rush', x: 63, y: 299, w: 54, h: 19, label: 'PROVA', color: PAL.Y }, { id: 'opt', x: 122, y: 299, w: 54, h: 19, label: 'AJUSTES', color: PAL.M }];
    },
    fireBar(id) {
      if (id === 'back') E.go('title');
      else if (id === 'codex') NI.dom.codex(() => { });
      else if (id === 'rush') E.go('play', { phase: NI.RUSH, rush: true });
      else NI.dom.settings(() => { });
    },
    open(p) {
      if (!S.unlocked(p.id)) { A.sfx('no'); fx.shake(1, 0.1); this.toast = { text: 'COMPLETE A FASE ANTERIOR (OU ATIVE O MODO ESTUDO NOS AJUSTES)', t: 2.4 }; return; }
      A.sfx('swoosh'); NI.dom.briefing(p, () => E.go('play', { id: p.id }), () => { });
    },
    update(dt) {
      this.t += dt; const d = this.drag;
      if (d) { this.vy = U.lerp(this.vy, -d.acc / Math.max(dt, 0.001), 0.35); d.acc = 0; }
      else { this.sy += this.vy * dt; this.vy *= Math.pow(0.04, dt); if (Math.abs(this.vy) < 4) this.vy = 0; }
      if (!d || true) { // "mola" nas bordas
        if (this.sy < 0) { this.sy += -this.sy * Math.min(1, 12 * dt); if (!d) this.vy = 0; } else if (this.sy > this.max) { this.sy += (this.max - this.sy) * Math.min(1, 12 * dt); if (!d) this.vy = 0; }
      }
      if (this.toast && (this.toast.t -= dt) <= 0) this.toast = null;
      if (this.pendingOpen && (this.openT -= dt) <= 0) { const ph = NI.phaseById(this.pendingOpen); this.pendingOpen = null; if (ph) this.open(ph); }
    },
    onDown(p) {
      if (p.y < TOP || p.y > BOT) { this.down = this.bars().find(b => UI.hit(b, p)) || null; return; }
      this.drag = { id: p.id, moved: 0, t0: E.time, acc: 0 }; this.vy = 0;
    },
    onMove(p) {
      const d = this.drag; if (!d || d.id !== p.id || !p.dy) return;
      this.sy -= p.dy * (this.sy < 0 || this.sy > this.max ? 0.4 : 1); d.acc += p.dy; d.moved += Math.abs(p.dy);
    },
    onUp(p) {
      if (this.down) { const b = this.bars().find(b => UI.hit(b, p)); const id = this.down.id; this.down = null; if (b && b.id === id) { A.sfx('tap'); this.fireBar(id); } return; }
      const d = this.drag; if (!d || d.id !== p.id) return; this.drag = null;
      if (d.moved < 7 && E.time - d.t0 < 0.45) {
        const wy = p.y - TOP + this.sy, n = this.nodes.find(n => Math.hypot(p.x - n.x, wy - n.y) <= 19);
        if (n) this.open(n.p);
      }
    },
    onKey(k) {
      if (k === 'ArrowDown') this.sy = Math.min(this.max, this.sy + 40); else if (k === 'ArrowUp') this.sy = Math.max(0, this.sy - 40);
      else if (k === 'Enter' && this.cur) this.open(NI.phaseById(this.cur)); else if (k === 'Escape') E.go('title');
    },
    onBack() { E.go('title'); return true; },

    node(g, n) {
      const p = n.p, w = NI.WORLDS[p.w], done = S.stars(p.id) > 0, open = S.unlocked(p.id), cur = p.id === this.cur, boss = !!p.boss, r = boss ? 15 : 13, col = open ? w.color : DARK;
      if (cur) { g.globalAlpha = 0.3 + 0.25 * Math.sin(this.t * 5); disc(g, n.x, n.y, r + 5, col); g.globalAlpha = 1; }
      if (boss) { g.fillStyle = open ? PAL.R : DARK; [[0, -1], [0, 1], [-1, 0], [1, 0], [-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]].forEach(([a, b]) => g.fillRect(Math.round(n.x + a * (r + 3)) - 1, Math.round(n.y + b * (r + 3)) - 1, 3, 3)); }
      disc(g, n.x, n.y + 1, r + 1, PAL.K); disc(g, n.x, n.y, r + 1, PAL.K); disc(g, n.x, n.y, r, col); disc(g, n.x, n.y, r - 3, done ? '#14304a' : '#10142e');
      if (!open) NI.spr.draw(g, 'lock', n.x, n.y); else F.draw(g, p.id, n.x, n.y - 3, PAL.W, 1, 'c');
      F.draw(g, p.short, n.x, n.y + r + 4, open ? (boss ? PAL.R : PAL.W) : PAL.S, 1, 'c', PAL.K);
      if (open) { const st = S.stars(p.id); for (let i = 0; i < 3; i++) NI.spr.draw(g, i < st ? 'star' : 'star0', n.x - 11 + i * 11, n.y + r + 18); }
      if (cur) F.draw(g, '↓', n.x, n.y - r - 15 + Math.round(Math.sin(this.t * 6) * 2), PAL.Y, 2, 'c', PAL.K);
    },
    head(g, h) {
      const w = NI.WORLDS[h.w], ids = NI.PHASES.filter(p => p.w === h.w), got = ids.reduce((a, p) => a + S.stars(p.id), 0);
      UI.panel(g, 10, h.y, 160, 32, { border: w.color, fill: '#0b0b1a' });
      F.draw(g, 'MUNDO ' + w.n, 16, h.y + 5, w.color, 1); F.draw(g, w.name, 16, h.y + 14, PAL.W, 1); F.draw(g, w.sub, 16, h.y + 23, PAL.S, 1);
      F.draw(g, got + '/' + ids.length * 3, 164, h.y + 5, PAL.Y, 1, 'r');
    },
    draw(g) {
      const mid = this.sy + VIEW / 2; let wc = 1; for (const h of this.heads) if (mid >= h.y) wc = h.w;
      NI.bg.draw(g, wc, this.t, { speed: 0.5, dim: 0.75 });
      g.save(); g.beginPath(); g.rect(0, TOP, W, VIEW); g.clip(); g.translate(0, TOP - Math.round(this.sy));
      this.heads.forEach(h => this.head(g, h));
      this.nodes.forEach((n, i) => { // trilha pontilhada
        if (i === 0 || n.p.w !== this.nodes[i - 1].p.w) return; const a = this.nodes[i - 1], on = S.stars(a.p.id) > 0 || S.data.unlockAll;
        g.fillStyle = on ? NI.WORLDS[n.p.w].color : '#2a2a48'; const len = Math.hypot(n.x - a.x, n.y - a.y);
        for (let d = 16; d < len - 16; d += 6) g.fillRect(Math.round(a.x + (n.x - a.x) * d / len), Math.round(a.y + (n.y - a.y) * d / len), 2, 2);
      });
      this.nodes.forEach(n => { if (n.y - this.sy > -40 && n.y - this.sy < VIEW + 40) this.node(g, n); });
      g.restore();
      g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(0, 0, W, TOP); g.fillRect(0, BOT, W, H - BOT);
      const bk = this.bars()[0]; UI.button(g, bk, '←', { color: DARK, textColor: PAL.W, down: this.down && this.down.id === 'back' });
      F.draw(g, 'MAPA DE FASES', W / 2, 7, PAL.C, 1, 'c'); NI.spr.draw(g, 'star', 140, 9); F.draw(g, S.totalStars() + '/' + NI.PHASES.length * 3, 176, 7, PAL.Y, 1, 'r');
      this.bars().slice(1).forEach(b => UI.button(g, b, b.label, { color: b.color, down: this.down && this.down.id === b.id }));
      if (this.max > 0) { g.fillStyle = 'rgba(255,255,255,.25)'; const hh = Math.max(14, VIEW * VIEW / this.h); g.fillRect(W - 2, TOP + (VIEW - hh) * U.clamp(this.sy / this.max, 0, 1), 1, hh); }
      if (this.toast) UI.tip(g, this.toast.text, 262, PAL.R, Math.min(1, this.toast.t * 2));
    }
  };
  E.register('map', MapScene);
})();
