/* Motor: canvas pixel-perfect, entrada multitoque, loop, cenas, transições e efeitos ("game feel"). */
(function () {
  'use strict';
  const NI = window.NI, W = NI.W, H = NI.H, PAL = NI.PAL, U = NI.U;

  /* ---------- efeitos: partículas, textos flutuantes, tremor, flash ---------- */
  const fx = NI.fx = {
    parts: [], texts: [], shakeT: 0, shakeMag: 0, flashT: 0, flashD: 1, flashCol: '#fff', hitstop: 0,
    burst(x, y, n, color, o) {
      o = o || {}; const sp = o.speed || 60;
      for (let i = 0; i < n; i++) {
        const a = U.R() * U.TAU, v = sp * (0.3 + U.R() * 0.9);
        fx.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + (o.up ? -sp * 0.5 : 0), life: (o.life || 0.6) * (0.5 + U.R() * 0.7), t: 0, c: Array.isArray(color) ? U.R.pick ? color[(U.R() * color.length) | 0] : color[0] : color, s: o.size || (U.R() < 0.3 ? 2 : 1), g: o.grav || 0 });
      }
    },
    text(x, y, str, color, o) { o = o || {}; fx.texts.push({ x, y, s: String(str), c: color || PAL.W, t: 0, life: o.life || 0.9, vy: o.vy === undefined ? -22 : o.vy, sc: o.scale || 1 }); },
    shake(mag, t) { fx.shakeMag = Math.max(fx.shakeMag, mag); fx.shakeT = Math.max(fx.shakeT, t || 0.25); },
    flash(color, d) { fx.flashCol = color || '#fff'; fx.flashT = fx.flashD = d || 0.15; },
    freeze(t) { fx.hitstop = Math.max(fx.hitstop, t); },
    clear() { fx.parts.length = 0; fx.texts.length = 0; fx.shakeT = 0; fx.flashT = 0; fx.hitstop = 0; },
    update(dt) {
      for (let i = fx.parts.length - 1; i >= 0; i--) {
        const p = fx.parts[i]; p.t += dt; if (p.t >= p.life) { fx.parts.splice(i, 1); continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985;
      }
      for (let i = fx.texts.length - 1; i >= 0; i--) { const t = fx.texts[i]; t.t += dt; t.y += t.vy * dt; if (t.t >= t.life) fx.texts.splice(i, 1); }
      if (fx.shakeT > 0) { fx.shakeT -= dt; if (fx.shakeT <= 0) fx.shakeMag = 0; }
      if (fx.flashT > 0) fx.flashT -= dt;
    },
    draw(g) {
      for (const p of fx.parts) { g.globalAlpha = Math.min(1, (1 - p.t / p.life) * 1.6); g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
      g.globalAlpha = 1;
      for (const t of fx.texts) { g.globalAlpha = Math.min(1, (1 - t.t / t.life) * 2); NI.font.draw(g, t.s, t.x, t.y, t.c, t.sc, 'c', PAL.K); }
      g.globalAlpha = 1;
    }
  };

  /* ---------- motor ---------- */
  const E = NI.engine = { time: 0, pointers: {}, scene: null, scenes: {}, paused: false };
  let canvas, g, stage, uiEl, last = 0, fade = null, keys = {};
  E.g = () => g;

  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight, dpr = window.devicePixelRatio || 1;
    let s = Math.min(vw / W, vh / H);
    const snapped = Math.floor(s * dpr) / dpr; if (snapped >= s * 0.94 && snapped > 0) s = snapped;
    const cw = Math.floor(W * s), ch = Math.floor(H * s);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    const r = canvas.getBoundingClientRect();
    uiEl.style.left = r.left + 'px'; uiEl.style.top = r.top + 'px'; uiEl.style.width = cw + 'px'; uiEl.style.height = ch + 'px';
    uiEl.style.setProperty('--u', (cw / W) + 'px');
    E.scale = cw / W;
  }

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  function bindInput() {
    const down = e => {
      if (e.target.closest && e.target.closest('#ui .panel')) return;
      NI.audio.unlock(); e.preventDefault();
      const q = toLogical(e), p = E.pointers[e.pointerId] = { id: e.pointerId, x: q.x, y: q.y, sx: q.x, sy: q.y, down: true, t0: E.time, moved: 0 };
      try { stage.setPointerCapture(e.pointerId); } catch (_) { /* */ }
      if (E.scene && E.scene.onDown && !fade) E.scene.onDown(p);
    };
    const move = e => {
      const p = E.pointers[e.pointerId]; if (!p) return;
      const q = toLogical(e); p.dx = q.x - p.x; p.dy = q.y - p.y; p.x = q.x; p.y = q.y; p.moved += Math.abs(p.dx) + Math.abs(p.dy);
      if (E.scene && E.scene.onMove && !fade) E.scene.onMove(p);
    };
    const up = e => {
      const p = E.pointers[e.pointerId]; if (!p) return; p.down = false; delete E.pointers[e.pointerId];
      const q = toLogical(e); p.x = q.x; p.y = q.y;
      if (E.scene && E.scene.onUp && !fade) E.scene.onUp(p);
    };
    stage.addEventListener('pointerdown', down); stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      if (e.repeat) return; NI.audio.unlock(); keys[e.key] = true;
      if (E.scene && E.scene.onKey && !fade) E.scene.onKey(e.key, e);
    });
    window.addEventListener('keyup', e => { keys[e.key] = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) E.onBlur(); });
    window.addEventListener('blur', () => E.onBlur());
  }
  E.key = k => !!keys[k];
  E.onBlur = () => { NI.audio.suspend(); if (E.scene && E.scene.onBlur) E.scene.onBlur(); };
  E.onFocus = () => { NI.audio.resume(); };
  window.addEventListener('focus', () => E.onFocus());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) E.onFocus(); });

  E.register = (name, scene) => { E.scenes[name] = scene; scene.name = name; };
  E.go = function (name, params, instant) {
    const doit = () => {
      if (E.scene && E.scene.exit) E.scene.exit();
      E.scene = E.scenes[name]; fx.clear();
      if (E.scene.enter) E.scene.enter(params || {});
    };
    if (instant || !E.scene) { doit(); return; }
    fade = { t: 0, phase: 0, cb: doit };
  };

  E.step = function (dt) {
    E.time += dt;
    if (fade) { // transição: escurece (0.14s) -> troca -> clareia
      fade.t += dt; if (fade.phase === 0 && fade.t >= 0.14) { fade.cb(); fade.phase = 1; fade.t = 0; } else if (fade.phase === 1 && fade.t >= 0.16) fade = null;
    }
    let sdt = dt;
    if (fx.hitstop > 0) { fx.hitstop -= dt; sdt = 0; }
    if (E.scene && E.scene.update) E.scene.update(sdt);
    fx.update(dt);
    draw();
  };
  function draw() {
    g.save();
    if (fx.shakeT > 0) g.translate(Math.round((U.R() - 0.5) * 2 * fx.shakeMag), Math.round((U.R() - 0.5) * 2 * fx.shakeMag));
    g.fillStyle = PAL.K; g.fillRect(-4, -4, W + 8, H + 8);
    if (E.scene && E.scene.draw) E.scene.draw(g);
    g.restore();
    if (fx.flashT > 0) { g.globalAlpha = Math.max(0, fx.flashT / fx.flashD) * 0.55; g.fillStyle = fx.flashCol; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (fade) { const a = fade.phase === 0 ? fade.t / 0.14 : 1 - fade.t / 0.16; g.globalAlpha = U.clamp(a, 0, 1); g.fillStyle = PAL.K; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }

  E.init = function () {
    stage = document.getElementById('stage'); canvas = document.getElementById('game'); uiEl = document.getElementById('ui');
    canvas.width = W; canvas.height = H; g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
    resize(); window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 120));
    bindInput();
    const frame = ts => {
      requestAnimationFrame(frame);
      if (E.manual) return; // testes controlam o tempo
      const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000)); last = ts; E.step(dt);
    };
    requestAnimationFrame(ts => { last = ts; frame(ts); });
  };
  E.ui = () => uiEl;
  E.resize = resize;
})();
