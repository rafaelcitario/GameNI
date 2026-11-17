/* Sound design procedural (WebAudio): SFX sintetizados, música chiptune em camadas guiada por "intensidade"
   e sons ligados aos conceitos (bits, portas lógicas, amostras do conversor A/D, disparos de neurônios). Sem arquivos de áudio. */
(function () {
  'use strict';
  const NI = window.NI;
  const A = NI.audio = {};
  let ctx = null, master, musicG, sfxG, comp, lp, noiseBuf, droneO = null, droneG = null;
  const vol = Object.assign({ music: 0.7, sfx: 0.9, vib: true }, NI.store.get('vol', {}));
  A.vol = vol;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const safe = fn => (...a) => { try { return fn(...a); } catch (e) { /* áudio nunca derruba o jogo */ } };

  A.init = safe(function () {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    master = ctx.createGain(); musicG = ctx.createGain(); sfxG = ctx.createGain();
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000;
    musicG.connect(lp); lp.connect(master); sfxG.connect(master); master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    A.applyVol();
  });
  A.unlock = safe(function () { A.init(); if (ctx && ctx.state === 'suspended') ctx.resume(); });
  A.applyVol = safe(function () {
    if (!ctx) return;
    musicG.gain.value = vol.music * 0.5; sfxG.gain.value = vol.sfx * 0.9;
  });
  A.setVol = (k, v) => { vol[k] = v; NI.store.set('vol', vol); A.applyVol(); };
  A.vibrate = ms => { if (!vol.vib) return; try { if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* */ } };
  A.muffle = safe(on => { if (ctx) lp.frequency.setTargetAtTime(on ? 600 : 18000, ctx.currentTime, 0.05); });
  A.suspend = safe(() => { if (ctx && ctx.state === 'running') ctx.suspend(); });
  A.resume = safe(() => { if (ctx && ctx.state === 'suspended') ctx.resume(); });

  /* ---------- síntese básica ---------- */
  function tone(o) {
    if (!ctx) return;
    const t0 = o.at !== undefined ? o.at : ctx.currentTime + (o.t || 0), dur = o.dur || 0.1, v = (o.vol === undefined ? 0.2 : o.vol);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square'; osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + dur);
    if (o.detune) osc.detune.value = o.detune;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + (o.a || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let out = g; osc.connect(g);
    if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); g.connect(p); out = p; }
    out.connect(o.bus || sfxG); osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  function noise(o) {
    if (!ctx) return;
    const t0 = o.at !== undefined ? o.at : ctx.currentTime + (o.t || 0), dur = o.dur || 0.1;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.ftype || 'lowpass'; f.Q.value = o.q || 0.7;
    f.frequency.setValueAtTime(o.f1 || 2000, t0); if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(o.vol === undefined ? 0.2 : o.vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g);
    let out = g; if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p; }
    out.connect(o.bus || sfxG); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.03);
  }
  A.note = safe((midi, dur = 0.2, type = 'triangle', v = 0.2, pan = 0, t = 0) => tone({ f: mtof(midi), dur, type, vol: v, pan, t }));
  A.blip = safe((f, dur = 0.06, type = 'square', v = 0.12) => tone({ f, dur, type, vol: v }));
  const PENTA = [0, 2, 4, 7, 9];
  const panOf = x => (x === undefined ? 0 : (x / NI.W) * 2 - 1) * 0.7;

  /* ---------- catálogo de efeitos ---------- */
  const SFX = {
    tap: () => tone({ f: 880, f2: 1320, dur: 0.05, vol: 0.12 }),
    back: () => tone({ f: 660, f2: 330, dur: 0.07, vol: 0.12 }),
    laser: o => { tone({ f: 1500, f2: 260, dur: 0.12, vol: 0.12, pan: panOf(o.x) }); },
    ok: o => { // altura sobe com o combo (pentatônica) — feedback musical de maestria
      const c = o.combo || 0, deg = PENTA[c % 5] + 12 * Math.min(2, Math.floor(c / 5)), f = 523.25 * Math.pow(2, deg / 12);
      tone({ f, dur: 0.12, vol: 0.16, pan: panOf(o.x) }); tone({ f: f * 1.5, dur: 0.16, vol: 0.1, t: 0.05, type: 'triangle', pan: panOf(o.x) });
    },
    wrong: o => { tone({ f: 200, f2: 80, dur: 0.22, type: 'sawtooth', vol: 0.16 }); noise({ dur: 0.12, f1: 600, vol: 0.12 }); },
    boom: o => { noise({ dur: 0.38, f1: 3000, f2: 70, vol: 0.28, pan: panOf(o.x) }); tone({ f: 120, f2: 38, dur: 0.3, type: 'sine', vol: 0.3 }); },
    hurt: () => { noise({ dur: 0.35, f1: 4000, f2: 120, vol: 0.34, ftype: 'highpass' }); tone({ f: 90, f2: 30, dur: 0.35, type: 'sine', vol: 0.4 }); A.duck(0.5); A.vibrate(60); },
    pickup: () => [0, 4, 7, 12].forEach((s, i) => tone({ f: mtof(72 + s), dur: 0.1, vol: 0.14, t: i * 0.05, type: 'triangle' })),
    heal: () => tone({ f: 400, f2: 1200, dur: 0.3, vol: 0.14, type: 'triangle' }),
    slow: () => { tone({ f: 900, f2: 120, dur: 0.5, vol: 0.14, type: 'sine' }); },
    warn: () => { for (let i = 0; i < 4; i++) tone({ f: i % 2 ? 330 : 494, dur: 0.16, vol: 0.14, t: i * 0.18, type: 'square' }); A.vibrate(40); },
    tick: () => tone({ f: 1800, dur: 0.02, vol: 0.06 }),
    star: o => tone({ f: mtof(76 + (o.i || 0) * 4), dur: 0.35, vol: 0.18, type: 'triangle' }),
    win: () => { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone({ f: mtof(67 + s), dur: 0.2, vol: 0.18, t: i * 0.11, type: 'square' })); tone({ f: mtof(55), dur: 0.9, vol: 0.18, type: 'triangle', t: 0.5 }); },
    lose: () => [0, -3, -5, -8, -12].forEach((s, i) => tone({ f: mtof(64 + s), dur: 0.28, vol: 0.18, t: i * 0.2, type: 'sawtooth' })),
    bit: o => tone({ f: 220 * Math.pow(2, (o.i || 0) / 6) * (o.on ? 2 : 1), dur: 0.05, vol: 0.12, type: 'square' }),
    merge: () => { tone({ f: 300, f2: 700, dur: 0.18, vol: 0.14, type: 'sawtooth' }); tone({ f: 900, f2: 700, dur: 0.18, vol: 0.12, type: 'square' }); },
    zap: o => noise({ dur: 0.02, f1: 5000, ftype: 'highpass', vol: 0.12, pan: panOf(o.x) }),
    sample: o => tone({ f: 2400, dur: 0.012, vol: 0.05, pan: panOf(o.x) }),
    flip: () => { tone({ f: 740, dur: 0.12, vol: 0.14, type: 'square' }); tone({ f: 523, dur: 0.12, vol: 0.14, type: 'square' }); }, // trítono: "bit corrompido"
    gate: o => { const base = { AND: 60, OR: 64, XOR: 67, NAND: 58, NOR: 62, XNOR: 65, NOT: 55 }[o.g] || 60; tone({ f: mtof(base), dur: 0.14, vol: 0.14, type: 'triangle' }); tone({ f: mtof(base + 7), dur: 0.14, vol: 0.1, type: 'triangle' }); },
    cut: () => { noise({ dur: 0.22, f1: 8000, f2: 500, ftype: 'bandpass', q: 3, vol: 0.2 }); },
    ask: () => tone({ f: 330, f2: 990, dur: 0.25, vol: 0.14, type: 'sine' }),
    yes: () => { tone({ f: 660, dur: 0.1, vol: 0.14 }); tone({ f: 990, dur: 0.16, vol: 0.14, t: 0.09 }); },
    no: () => { tone({ f: 330, dur: 0.1, vol: 0.14 }); tone({ f: 247, dur: 0.18, vol: 0.14, t: 0.09 }); },
    combo: o => { [0, 7, 12].forEach((s, i) => tone({ f: mtof(79 + s + (o.i || 0)), dur: 0.12, vol: 0.14, t: i * 0.06, type: 'triangle' })); },
    swoosh: () => noise({ dur: 0.3, f1: 400, f2: 6000, ftype: 'bandpass', q: 1.5, vol: 0.12 }),
    fire: () => { noise({ dur: 0.4, f1: 1500, f2: 100, vol: 0.2 }); tone({ f: 200, f2: 1400, dur: 0.35, vol: 0.14, type: 'sawtooth' }); }
  };
  A.sfx = safe((name, o) => { if (!ctx || ctx.state !== 'running') return; (SFX[name] || (() => { }))(o || {}); });

  A.duck = safe(amt => { if (!ctx) return; const t = ctx.currentTime, g = musicG.gain; g.cancelScheduledValues(t); g.setValueAtTime(vol.music * 0.5 * (1 - amt), t); g.linearRampToValueAtTime(vol.music * 0.5, t + 0.45); });

  /* ---------- sonificação contínua (aliasing, taxa) ---------- */
  A.drone = safe((f, v = 0.06) => {
    if (!ctx || ctx.state !== 'running') return;
    if (!droneO) { droneO = ctx.createOscillator(); droneG = ctx.createGain(); droneO.type = 'triangle'; droneG.gain.value = 0; droneO.connect(droneG); droneG.connect(sfxG); droneO.start(); }
    droneO.frequency.setTargetAtTime(f, ctx.currentTime, 0.04); droneG.gain.setTargetAtTime(v, ctx.currentTime, 0.04);
  });
  A.droneOff = safe(() => { if (droneG) droneG.gain.setTargetAtTime(0, ctx.currentTime, 0.05); });
  A.baseNote = safe((ch, t = 0) => A.note({ A: 69, C: 73, G: 76, T: 80, U: 80 }[ch] || 69, 0.14, 'square', 0.1, 0, t)); // 4 bases = 4 notas

  /* ---------- música ---------- */
  // cada tema: tempo, tônica (MIDI), escala, progressão (graus da escala), semente da melodia
  const THEMES = {
    title: { bpm: 92, root: 45, scale: [0, 3, 5, 7, 10], prog: [0, 3, 2, 4], seed: 3 },
    w1: { bpm: 116, root: 45, scale: [0, 2, 3, 5, 7, 9, 10], prog: [0, 5, 3, 4], seed: 11 },     // dórico — matriz de bits
    w2: { bpm: 104, root: 50, scale: [0, 2, 4, 6, 7, 9, 11], prog: [0, 1, 4, 3], seed: 23 },     // lídio — espaço profundo (Shannon)
    w3: { bpm: 134, root: 40, scale: [0, 1, 3, 5, 7, 8, 10], prog: [0, 1, 0, 6], seed: 37 },     // frígio — placa de circuito
    w4: { bpm: 90, root: 43, scale: [0, 2, 3, 5, 7, 9, 10], prog: [0, 3, 5, 4], seed: 51 },      // dórico lento — vida e mente
    boss: { bpm: 148, root: 38, scale: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 6, 4], seed: 77 }    // menor natural — chefe
  };
  let timer = null, theme = null, curName = '', step = 0, nextT = 0, inten = 0.3, danger = false, rngM = null, lead = [];
  const deg = (th, d, oct = 0) => th.root + th.scale[((d % th.scale.length) + th.scale.length) % th.scale.length] + 12 * (Math.floor(d / th.scale.length) + oct);

  function mkLead(th) { // melodia de 16 passos determinística por tema
    const r = NI.U.rng(th.seed), m = []; let d = 7;
    for (let i = 0; i < 16; i++) { if (r() < 0.45) { m.push(null); continue; } d = Math.max(4, Math.min(11, d + r.pick([-2, -1, -1, 0, 1, 1, 2]))); m.push(d); }
    return m;
  }
  function playStep(s, t) {
    const th = theme, bar = Math.floor(s / 16) % 4, k = s % 16, root = th.prog[bar], sd = 60 / th.bpm / 4, I = inten;
    const chord = [root, root + 2, root + 4];
    // pad (sempre)
    if (k === 0) chord.forEach(d => tone({ at: t, f: mtof(deg(th, d, 1)), dur: sd * 16, vol: 0.05, type: 'triangle', a: 0.2, bus: musicG }));
    // baixo
    if (k % 2 === 0) tone({ at: t, f: mtof(deg(th, root, -1) + (k % 8 === 6 ? 7 : 0)), dur: sd * 1.8, vol: 0.2 + I * 0.06, type: 'triangle', bus: musicG });
    // bateria
    if (I > 0.12 && (k === 0 || k === 8 || (I > 0.5 && (k === 4 || k === 12) && curName === 'boss')))
      { tone({ at: t, f: 150, f2: 40, dur: 0.14, vol: 0.34, type: 'sine', bus: musicG }); }
    if (I > 0.4 && (k === 4 || k === 12)) noise({ at: t, dur: 0.12, f1: 1800, ftype: 'bandpass', q: 0.8, vol: 0.16, bus: musicG });
    if (I > 0.3 && (k % 2 === 0 || I > 0.75)) noise({ at: t, dur: 0.03, f1: 9000, ftype: 'highpass', vol: k % 4 === 2 ? 0.07 : 0.04, bus: musicG });
    // arpejo
    if (I > 0.35) tone({ at: t, f: mtof(deg(th, chord[k % 3], 2)), dur: sd * 0.9, vol: 0.045 + I * 0.03, type: 'square', bus: musicG });
    // melodia
    if (I > 0.62 && lead[k] != null) tone({ at: t, f: mtof(deg(th, lead[k] + root * 0, 1)), dur: sd * 1.6, vol: 0.06, type: 'square', detune: 6, bus: musicG });
    // alerta de perigo: coração batendo
    if (danger && (k === 0 || k === 3 || k === 8 || k === 11)) tone({ at: t, f: 70, f2: 38, dur: 0.12, vol: 0.4, type: 'sine', bus: musicG });
  }
  function tick() {
    if (!ctx || !theme || ctx.state !== 'running') return;
    const sd = 60 / theme.bpm / 4;
    if (nextT < ctx.currentTime - 0.5) nextT = ctx.currentTime + 0.05; // recupera após suspensão
    while (nextT < ctx.currentTime + 0.14) { playStep(step, nextT); nextT += sd; step++; }
  }
  A.music = safe((name, force) => {
    A.unlock(); if (!ctx) return;
    if (name === curName && !force) return;
    curName = name; theme = THEMES[name] || THEMES.title; step = 0; lead = mkLead(theme);
    nextT = ctx.currentTime + 0.06; if (!timer) timer = setInterval(tick, 30);
  });
  A.stopMusic = () => { curName = ''; theme = null; };
  A.intensity = v => { inten = Math.max(0, Math.min(1, v)); };
  A.danger = on => { danger = !!on; };
  A.theme = () => curName;
})();
