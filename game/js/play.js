/* Cena de jogo: contexto da fase (escudo, combo, adaptação de dificuldade, revisão), HUD, pausa e fim de fase. */
(function () {
  'use strict';
  const NI = window.NI, W = NI.W, H = NI.H, PAL = NI.PAL, F = NI.font, UI = NI.ui, A = NI.audio, fx = NI.fx, U = NI.U;
  NI.engines = NI.engines || {};

  class Ctx {
    constructor(phase, opts) {
      opts = opts || {};
      this.phase = phase; this.world = phase.w; this.shieldMax = opts.shieldMax || 5; this.shield = this.shieldMax;
      this.score = 0; this.combo = 0; this.maxCombo = 0; this.time = 0; this.invuln = 0; this.skill = 1;
      this.stats = { right: 0, wrong: 0, leak: 0 }; this.hits = {}; this.concepts = {}; this.mistakes = []; this.ended = false; this.win = false;
      this.tipT = 0; this.tipText = ''; this.bannerT = 0; this.banner = null; this.progress = 0; this.scorePop = 0;
    }
    mult() { return 1 + Math.min(4, Math.floor(this.combo / 4)); }
    _c(id) { return this.concepts[id] || (this.concepts[id] = { r: 0, w: 0 }); }
    _mistake(id, hint) {
      if (hint && !this.mistakes.some(m => m.hint === hint) && this.mistakes.length < 12) this.mistakes.push({ concept: id, hint });
    }
    addScore(base, x, y, color) {
      const pts = Math.round(base * this.mult()); this.score += pts; this.scorePop = 0.25;
      if (x !== undefined) fx.text(x, y, '+' + pts, color || PAL.Y);
      return pts;
    }
    right(concept, x, y, o) {
      o = o || {}; this.stats.right++; this._c(concept).r++; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.addScore(o.pts || 100, x, y - 6, o.color);
      A.sfx('ok', { combo: this.combo, x }); this.skill = U.clamp(this.skill + 0.035, 0.7, 1.35);
      if (this.combo > 0 && this.combo % 5 === 0) { A.sfx('combo', { i: Math.min(6, this.combo / 5) }); fx.text(W / 2, 60, 'COMBO X' + this.combo + '!', PAL.Y, { scale: 2, life: 1.1 }); fx.flash(PAL.Y, 0.1); }
    }
    wrong(concept, hint, x, y, o) {
      o = o || {}; this.stats.wrong++; this._c(concept).w++; this.combo = 0; this.skill = U.clamp(this.skill - 0.09, 0.7, 1.35);
      this._mistake(concept, hint); A.sfx('wrong'); fx.shake(2, 0.2); fx.flash(PAL.R, 0.1);
      if (x !== undefined) fx.text(x, y, 'ERROU!', PAL.R);
      if (o.damage) this.hurt(o.damage, x, y);
      if (hint && !o.silent) this.tip(hint, PAL.R);
    }
    leak(concept, hint, x, y) {
      this.stats.leak++; this._c(concept).w++; this.combo = 0; this.skill = U.clamp(this.skill - 0.09, 0.7, 1.35);
      this._mistake(concept, hint); if (hint) this.tip(hint, PAL.R); this.hurt(1, x, y, 'vazou');
    }
    hurt(n, x, y, cause) {
      if (this.ended || NI.debug.god || this.invuln > 0) return false;
      this.shield = Math.max(0, this.shield - n); this.invuln = 1.0; this.hits[cause || '?'] = (this.hits[cause || '?'] || 0) + 1;
      A.sfx('hurt'); fx.shake(4, 0.35); fx.flash(PAL.R, 0.25); fx.freeze(0.05);
      if (x !== undefined) fx.burst(x, y, 14, [PAL.R, PAL.O, PAL.W], { speed: 70 });
      if (this.shield <= 0) this.finish(false);
      return true;
    }
    heal(n) { this.shield = Math.min(this.shieldMax, this.shield + n); A.sfx('heal'); fx.text(24, 22, '+ESCUDO', PAL.G); }
    tip(text, color, dur) { this.tipText = text; this.tipColor = color || PAL.Y; this.tipT = dur || (2.2 + text.length * 0.035); this.tipDur = this.tipT; }
    showBanner(title, sub, color, dur) { this.banner = { title, sub, color }; this.bannerT = dur || 1.8; this.bannerDur = this.bannerT; }
    finish(win) {
      if (this.ended) return; this.ended = true; this.win = !!win; this.endT = 0;
      if (win) { A.sfx('win'); fx.flash(PAL.W, 0.3); } else { A.sfx('lose'); }
      A.danger(false); A.droneOff();
    }
    accuracy() { const n = this.stats.right + this.stats.wrong + this.stats.leak; return n ? this.stats.right / n : 1; }
    stars() { if (!this.win) return 0; const a = this.accuracy(); return 1 + (a >= 0.75 ? 1 : 0) + (a >= 0.9 ? 1 : 0); }
  }
  NI.Ctx = Ctx;

  /* ---------- cena ---------- */
  const Play = {
    enter(p) {
      this.phase = p.phase || NI.phaseById(p.id); this.rush = !!p.rush;
      this.ctx = new Ctx(this.phase, p.opts); this.state = 'ready'; this.t = 0; this.paused = false; this.bgT = 0;
      const Eng = NI.engines[this.phase.engine]; if (!Eng) throw new Error('motor ausente: ' + this.phase.engine);
      this.engine = new Eng(this.ctx, this.phase);
      this.pauseBtns = null; this.down = null; this.shown = false;
      A.music(this.phase.boss && !this.engine.bossLate ? 'boss' : NI.WORLDS[this.phase.w].music, true); A.intensity(0.18); A.danger(false);
      NI.save.markSeen(this.phase.id); NI.dom.hide();
      fx.clear();
    },
    exit() { A.danger(false); A.droneOff(); if (this.engine && this.engine.destroy) this.engine.destroy(); },
    pause(on) {
      if (this.state !== 'play' || this.ctx.ended) return;
      this.paused = on === undefined ? !this.paused : on; A.muffle(this.paused); A.sfx('tap');
      if (this.paused) A.droneOff();
    },
    onBlur() { this.pause(true); },
    onBack() { if (this.state === 'play') { this.pause(); return true; } NI.engine.go('map'); return true; },
    update(dt) {
      const c = this.ctx; this.bgT += dt * (this.paused ? 0 : 1);
      if (c.scorePop > 0) c.scorePop -= dt;
      if (c.tipT > 0) c.tipT -= dt;
      if (c.bannerT > 0) c.bannerT -= dt;
      if (this.state === 'ready') { this.t += dt; if (this.t > 2.0) { this.state = 'play'; A.intensity(0.3); } return; }
      if (c.ended) {
        c.endT += dt; if (this.engine.update) this.engine.update(dt * (c.win ? 0.3 : 0.1), true);
        if (!this.shown && c.endT > (c.win ? 2.2 : 1.6)) { this.shown = true; this.showResult(); }
        return;
      }
      if (this.paused) return;
      c.time += dt; if (c.invuln > 0) c.invuln -= dt;
      this.engine.update(dt);
      const base = this.engine.intensity ? this.engine.intensity() : 0.3 + Math.min(0.35, c.combo * 0.03) + c.progress * 0.2;
      A.intensity(U.clamp(base + (this.phase.boss ? 0.15 : 0), 0, 1));
      A.danger(c.shield <= 1 && !c.ended);
    },
    draw(g) {
      const c = this.ctx;
      NI.bg.draw(g, this.phase.w, this.bgT, { speed: this.engine.bgSpeed || 1, dim: this.paused ? 0.5 : 1 });
      this.engine.draw(g);
      fx.draw(g);
      this.hud(g);
      if (c.tipT > 0 && this.state === 'play') UI.tip(g, c.tipText, 30, c.tipColor, Math.min(1, c.tipT * 2));
      if (c.bannerT > 0 && c.banner) UI.banner(g, c.banner.title, c.banner.sub, 110, c.banner.color, c.bannerDur - c.bannerT);
      if (this.state === 'ready') this.drawReady(g);
      if (c.ended) this.drawEnd(g);
      if (this.paused) this.drawPause(g);
    },
    hud(g) {
      const c = this.ctx, w = NI.WORLDS[this.phase.w];
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, 17);
      UI.hearts(g, 3, 5, c.shield, c.shieldMax);
      if (c.invuln > 0 && ((NI.engine.time * 12) | 0) % 2) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, 0, W, 17); }
      F.draw(g, U.pad(Math.round(c.score), 6), 112, 5, c.scorePop > 0 ? PAL.Y : PAL.W, 1, 'c');
      NI.spr.draw(g, 'pause', 168, 8);
      UI.bar(g, 0, 17, W, 2, c.progress, w.color, '#10142e');
      if (c.combo >= 2) { const s = 'COMBO ' + c.combo; F.draw(g, s, 3, 22, PAL.Y, 1, 'l', PAL.K); F.draw(g, 'X' + c.mult(), 3 + 6 * (s.length + 1), 22, c.mult() > 1 ? PAL.G : PAL.S, 1, 'l', PAL.K); }
    },
    drawReady(g) {
      const e = this.t, p = this.phase, w = NI.WORLDS[p.w];
      g.fillStyle = 'rgba(0,0,0,' + Math.min(0.7, 1.4 - e * 0.7) + ')'; g.fillRect(0, 0, W, H);
      const a = Math.min(1, e * 3) * (e > 1.7 ? Math.max(0, (2.0 - e) * 3.3) : 1);
      g.globalAlpha = a;
      F.draw(g, 'FASE ' + p.id, W / 2, 90, w.color, 2, 'c', PAL.K);
      p.title.split('\n').forEach((l, i) => F.draw(g, l, W / 2, 112 + i * 11, PAL.W, 1, 'c', PAL.K));
      F.para(g, p.obj, 14, 150, 152, PAL.Y, 1, 9, 'c');
      if (e > 0.5) F.draw(g, e < 1.2 ? 'PREPARAR...' : e < 1.7 ? 'APONTAR!' : 'JÁ!', W / 2, 205, PAL.G, 2, 'c', PAL.K);
      g.globalAlpha = 1;
    },
    drawEnd(g) {
      const c = this.ctx, t = c.endT;
      g.fillStyle = 'rgba(0,0,0,' + Math.min(0.55, t * 0.5) + ')'; g.fillRect(0, 0, W, H);
      F.draw(g, c.win ? 'FASE COMPLETA!' : 'FALHA NO SISTEMA', W / 2, 130, c.win ? PAL.G : PAL.R, 2, 'c', PAL.K);
    },
    pauseLayout() {
      return [['CONTINUAR', PAL.G, () => this.pause(false)], ['REINICIAR', PAL.Y, () => NI.engine.go('play', { id: this.phase.id, rush: this.rush })],
        ['CÓDEX', PAL.C, () => { NI.dom.codex(() => { }); }], ['SAIR PARA O MAPA', PAL.R, () => NI.engine.go('map')]]
        .map((b, i) => ({ x: 30, y: 98 + i * 26, w: 120, h: 20, label: b[0], color: b[1], fn: b[2] }));
    },
    drawPause(g) {
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, H);
      UI.panel(g, 20, 70, 140, 140, { border: PAL.C });
      F.draw(g, 'PAUSA', W / 2, 78, PAL.C, 2, 'c');
      this.pauseBtns = this.pauseLayout();
      this.pauseBtns.forEach(b => UI.button(g, b, b.label, { color: b.color, down: this.down === b }));
    },
    onDown(p) {
      if (this.state === 'ready') { this.t = Math.max(this.t, 1.7); return; }
      if (this.ctx.ended) { if (this.ctx.endT > 0.8 && !this.shown) { this.shown = true; this.showResult(); } return; }
      if (this.paused) { this.down = (this.pauseBtns || []).find(b => UI.hit(b, p)) || null; return; }
      if (p.x > 156 && p.y < 18) { this.pause(true); return; }
      if (this.engine.onDown) this.engine.onDown(p);
    },
    onMove(p) { if (!this.paused && this.state === 'play' && !this.ctx.ended && this.engine.onMove) this.engine.onMove(p); },
    onUp(p) {
      if (this.paused) { const b = (this.pauseBtns || []).find(b => UI.hit(b, p)); if (b && b === this.down) { A.sfx('tap'); b.fn(); } this.down = null; return; }
      if (!this.ctx.ended && this.state === 'play' && this.engine.onUp) this.engine.onUp(p);
    },
    onKey(k) {
      if (k === 'Escape' || k === 'p' || k === 'P') { this.pause(); return; }
      if (!this.paused && this.state === 'play' && !this.ctx.ended && this.engine.onKey) this.engine.onKey(k);
    },
    showResult() {
      const c = this.ctx, stars = c.stars(), acc = c.accuracy();
      if (!this.rush) NI.save.record(this.phase.id, stars, Math.round(c.score), acc);
      else if (c.score > NI.save.data.rush) { NI.save.data.rush = Math.round(c.score); NI.save.persist(); }
      NI.dom.result({ phase: this.phase, ctx: c, stars, acc, rush: this.rush });
    }
  };
  NI.engine.register('play', Play);
  NI.play = Play;
})();
