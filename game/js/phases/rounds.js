/* Base dos motores por rodadas (corte, forja, hamming, lógica, amostrador, neurônios):
   ondas -> rodadas, banners, resumo da onda, progresso, música e ganchos para o bot de testes.
   O motor filho implementa: startRound(), tick(dt), draw(g), onDown/onMove/onUp, bot(dt) e chama endRound(ok). */
(function () {
  'use strict';
  const NI = window.NI, PAL = NI.PAL, A = NI.audio, U = NI.U, F = NI.font, UI = NI.ui, W = NI.W;
  NI.tcfg = NI.tcfg || {};

  class Rounds {
    constructor(ctx, phase) {
      this.ctx = ctx; this.phase = phase; this.cfg = NI.tcfg[phase.cfg]; this.waves = this.cfg.waves; this.R = U.R;
      this.wi = -1; this.ri = 0; this.state = 'wait'; this.st = 0; this.wave = null; this.t = 0; this.done = 0; this.gapT = 1.2; this.botT = 0;
      this.total = this.waves.reduce((s, w) => s + w.n, 0);
    }
    get bgSpeed() { return 0.6; }
    get color() { return NI.WORLDS[this.ctx.world].color; }
    intensity() { return 0.32 + 0.08 * Math.max(0, this.wi) + Math.min(0.25, this.ctx.combo * 0.02); }
    get hint() { return !!(this.wave && this.wave.hint); }
    nextWave() {
      const ctx = this.ctx; this.wi++;
      if (this.wi >= this.waves.length) { this.state = 'done'; ctx.progress = 1; ctx.finish(true); return; }
      this.wave = this.waves[this.wi]; this.ri = 0; this.state = 'intro'; this.st = 0;
      ctx.showBanner(this.wave.title || 'ONDA ' + (this.wi + 1), this.wave.sub, this.color, 1.6); A.sfx('swoosh');
      if (this.onWave) this.onWave(this.wave);
    }
    update(dt, ended) {
      this.t += dt;
      if (ended) { if (this.tick && this.state === 'round') this.tick(dt, true); return; }
      const ctx = this.ctx; ctx.progress = Math.min(1, this.done / this.total);
      if (this.state === 'wait') { this.nextWave(); return; }
      this.st += dt;
      if (this.state === 'intro') { if (this.st >= 1.7) { this.state = 'round'; this.st = 0; this.startRound(); } }
      else if (this.state === 'round') { this.tick(dt, false); if (NI.debug.bot && this.state === 'round') this.bot(dt); }
      else if (this.state === 'between') { this.tick && this.tick(dt, false, true); if (this.st >= this.gapT) this.afterRound(); }
      else if (this.state === 'clear') { if (this.st >= 2.6) this.nextWave(); }
    }
    endRound(ok, gap) { this.done++; this.state = 'between'; this.st = 0; this.gapT = gap || (ok ? 1.2 : 1.8); }
    afterRound() {
      const ctx = this.ctx; this.ri++;
      if (this.ri >= this.wave.n) {
        if (this.wi >= this.waves.length - 1) { this.state = 'done'; ctx.progress = 1; ctx.finish(true); return; }
        this.state = 'clear'; this.st = 0; ctx.showBanner('ONDA COMPLETA!', '', PAL.G, 1.6); A.sfx('star', { i: 2 });
        if (this.wave.recap) ctx.tip('RESUMO: ' + this.wave.recap, PAL.G, 3.6);
      } else { this.state = 'round'; this.st = 0; this.startRound(); }
    }
    // cabeçalho comum: "RODADA 2/4" + barra de tempo (frac 0..1; vermelha quando acaba)
    header(g, frac, label) {
      F.draw(g, (label || 'RODADA') + ' ' + Math.min(this.wave ? this.wave.n : 0, this.ri + 1) + '/' + (this.wave ? this.wave.n : 0), W - 6, 22, PAL.S, 1, 'r', PAL.K);
      if (frac !== undefined && frac !== null) UI.bar(g, 6, 38, W - 12, 4, frac, frac < 0.25 ? PAL.R : frac < 0.5 ? PAL.O : this.color, '#10142e');
    }
    // dica pulsante (apenas nas ondas de treino)
    pulse(speed) { return 0.5 + 0.5 * Math.sin(NI.engine.time * (speed || 8)); }
  }
  NI.engines = NI.engines || {};
  NI.engines.Rounds = Rounds;
})();
