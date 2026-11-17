/* Progresso e ajustes do jogador (localStorage com fallback em memória). */
(function () {
  'use strict';
  const NI = window.NI;
  const S = NI.save = {
    data: NI.store.get('save', { done: {}, seen: {}, unlockAll: false, rush: 0 }),
    persist() { NI.store.set('save', S.data); },
    get(id) { return S.data.done[id] || null; },
    stars(id) { const d = S.data.done[id]; return d ? d.stars : 0; },
    record(id, stars, score, acc) {
      const d = S.data.done[id] || { stars: 0, score: 0, acc: 0, plays: 0 };
      d.stars = Math.max(d.stars, stars); d.score = Math.max(d.score, score); d.acc = Math.max(d.acc, acc); d.plays++;
      S.data.done[id] = d; S.persist();
    },
    // desbloqueio linear: concluir a fase anterior; "modo estudo" libera tudo
    unlocked(id) {
      if (S.data.unlockAll) return true;
      const i = NI.PHASES.findIndex(p => p.id === id); if (i <= 0) return true;
      return S.stars(NI.PHASES[i - 1].id) > 0;
    },
    nextPhase(id) { const i = NI.PHASES.findIndex(p => p.id === id); return NI.PHASES[i + 1] || null; },
    totalStars() { return Object.values(S.data.done).reduce((a, d) => a + d.stars, 0); },
    markSeen(id) { S.data.seen[id] = true; S.persist(); },
    setUnlockAll(v) { S.data.unlockAll = !!v; S.persist(); },
    reset() { S.data = { done: {}, seen: {}, unlockAll: false, rush: 0 }; S.persist(); },
    first() { const p = NI.PHASES.find(x => !S.stars(x.id)); return p ? p.id : NI.PHASES[0].id; }
  };
})();
