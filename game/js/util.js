/* Utilitários: namespace NI, paleta, RNG, easing, formatação e armazenamento. */
(function (root) {
  'use strict';
  const NI = root.NI = root.NI || {};
  NI.W = 180; NI.H = 320;

  // Paleta única do jogo (semântica de cor = parte do level design: ciano=dado, amarelo=aviso, vermelho=erro, verde=acerto)
  NI.PAL = {
    K: '#0b0b1a', E: '#2a2a48', S: '#8d99ae', W: '#f4f4f8',
    R: '#ff4d6d', O: '#ff9f1c', Y: '#ffd166', G: '#06d6a0', L: '#9ef01a',
    C: '#4cc9f0', B: '#4361ee', D: '#242a6b', P: '#9d4edd', M: '#f72585',
    N: '#8b5e3c', T: '#e5b887', V: '#5a189a', F: '#3a0ca3'
  };

  const U = NI.U = {};
  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  U.pad = (s, n, ch = '0') => String(s).padStart(n, ch);
  U.num = (x, d = 2) => { // 1,75 (vírgula decimal) sem zeros à direita
    let s = (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toString();
    return s.replace('.', ',');
  };
  U.ease = {
    outQuad: t => 1 - (1 - t) * (1 - t),
    inQuad: t => t * t,
    inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    outElastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (U.TAU / 3)) + 1
  };

  // RNG com semente (mulberry32) — níveis reproduzíveis nos testes
  U.rng = function (seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    const f = function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (a, b) => a + Math.floor(f() * (b - a + 1));
    f.range = (a, b) => a + f() * (b - a);
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    f.chance = p => f() < p;
    f.shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    f.sample = (arr, n) => f.shuffle(arr.slice()).slice(0, n);
    return f;
  };
  U.R = U.rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);

  // Armazenamento resistente a falhas (localStorage pode lançar exceção)
  const mem = {};
  NI.store = {
    get(k, d) { try { const v = root.localStorage.getItem('ni.' + k); return v === null ? (k in mem ? mem[k] : d) : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
    set(k, v) { mem[k] = v; try { root.localStorage.setItem('ni.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
    del(k) { delete mem[k]; try { root.localStorage.removeItem('ni.' + k); } catch (e) { /* ignore */ } }
  };

  NI.debug = NI.debug || { god: false, bot: false };
})(typeof window !== 'undefined' ? window : globalThis);
