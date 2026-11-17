/* Painéis em DOM (texto longo fica legível): briefing da fase, resultado/revisão, Códex e ajustes. */
(function () {
  'use strict';
  const NI = window.NI, A = NI.audio;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const D = NI.dom = { current: null };
  let handlers = {}, onBack = null;

  function mount(html, h, back) {
    const root = NI.engine.ui();
    root.innerHTML = html; handlers = h || {}; onBack = back || null; D.current = true;
    const p = root.firstElementChild; if (p) p.scrollTop = 0;
    root.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      A.unlock(); A.sfx('tap'); const f = handlers[b.dataset.a]; if (f) f(b, e);
    };
    root.oninput = e => { const b = e.target.closest('[data-i]'); if (b && handlers[b.dataset.i]) handlers[b.dataset.i](b, e); };
  }
  D.hide = () => { const r = NI.engine.ui(); if (r) r.innerHTML = ''; handlers = {}; onBack = null; D.current = null; };
  D.isOpen = () => !!D.current;
  D.back = () => { if (!D.current) return false; const f = onBack; if (f) f(); else D.hide(); return true; };

  /* ---------- briefing ---------- */
  D.briefing = function (phase, onPlay, onClose) {
    const cards = NI.LESSONS[phase.id] || [], w = NI.WORLDS[phase.w]; let i = 0;
    const render = () => {
      const c = cards[i];
      mount(`<div class="panel" style="--c:${w.color}">
        <div class="hd"><span class="tag">FASE ${phase.id} · ${esc(w.name)}</span><h2>${esc(phase.title).replace('\n', '<br>')}</h2></div>
        <div class="obj">MISSÃO: ${esc(phase.obj)}</div>
        <div class="card"><h3>${esc(c.t)}</h3><p>${esc(c.b)}</p>${c.f ? `<div class="f">${esc(c.f)}</div>` : ''}</div>
        <div class="dots">${cards.map((_, k) => k === i ? '<b>●</b>' : '○').join(' ')}</div>
        ${cards.length > 1 ? '<div class="row"><button class="btn ghost" data-a="prev">◀ ANTERIOR</button><button class="btn" data-a="next">PRÓXIMA ▶</button></div>' : ''}
        <div class="row"><button class="btn go" data-a="play">JOGAR ▶</button></div>
        <div class="row"><button class="btn ghost" data-a="back">VOLTAR AO MAPA</button></div></div>`,
        { prev() { i = (i + cards.length - 1) % cards.length; render(); }, next() { i = (i + 1) % cards.length; render(); }, play() { D.hide(); onPlay(); }, back() { D.hide(); if (onClose) onClose(); } },
        () => { D.hide(); if (onClose) onClose(); });
    };
    render();
  };

  /* ---------- resultado ---------- */
  D.result = function (o) {
    const { phase, ctx, stars, acc } = o, w = NI.WORLDS[phase.w] || NI.WORLDS[1], win = ctx.win, next = NI.save.nextPhase(phase.id);
    const concepts = Object.keys(ctx.concepts).map(k => ({ k, r: ctx.concepts[k].r, w: ctx.concepts[k].w, n: NI.gen.names[k] || k }));
    const bars = concepts.map(c => { const t = c.r + c.w, p = t ? Math.round(c.r / t * 100) : 0; return `<div><div style="display:flex;justify-content:space-between"><span>${esc(c.n)}</span><span>${p}%</span></div><div class="bar ${p < 70 ? 'bad' : ''}"><i style="width:${p}%"></i></div></div>`; }).join('');
    const mist = ctx.mistakes.slice(0, 4).map(m => `<div class="mist"><small>${esc(NI.gen.names[m.concept] || m.concept)}</small>${esc(m.hint)}</div>`).join('');
    const acc100 = Math.round(acc * 100);
    mount(`<div class="panel" style="--c:${win ? '#06d6a0' : '#ff4d6d'}">
      <div class="res-title">${o.rush ? 'MODO PROVA' : win ? 'FASE COMPLETA!' : 'FALHA NO SISTEMA'}</div>
      ${o.rush ? '' : `<div class="stars">${[0, 1, 2].map(k => k < stars ? '★' : '<i>★</i>').join('')}</div>`}
      <div class="kv"><span>Pontos</span><span>${Math.round(ctx.score)}</span><span>Precisão</span><span>${acc100}%</span><span>Combo máximo</span><span>${ctx.maxCombo}</span><span>Acertos / erros / perdidos</span><span>${ctx.stats.right} / ${ctx.stats.wrong} / ${ctx.stats.leak}</span></div>
      ${bars ? `<div class="sep">DESEMPENHO POR CONCEITO</div>${bars}` : ''}
      ${mist ? `<div class="sep">REVISÃO: O QUE REVER</div>${mist}` : (win ? '<div class="small">Sem erros para revisar. Excelente!</div>' : '')}
      ${!win && !o.rush ? '<div class="small">Dica: releia a aula-relâmpago antes de tentar de novo. O jogo ajusta a velocidade ao seu desempenho.</div>' : ''}
      <div class="row">${win && next && !o.rush && NI.save.unlocked(next.id) ? '<button class="btn go" data-a="next">PRÓXIMA FASE ▶</button>' : ''}</div>
      <div class="row"><button class="btn" data-a="again">${o.rush ? 'JOGAR DE NOVO' : 'REPETIR'}</button><button class="btn ghost" data-a="map">MAPA</button></div>
      ${o.rush ? '' : '<div class="row"><button class="btn ghost" data-a="lesson">REVER A AULA</button><button class="btn ghost" data-a="codex">CÓDEX</button></div>'}</div>`,
      {
        next() { D.hide(); NI.engine.go('map', { open: next.id }); },
        again() { D.hide(); NI.engine.go('play', { id: phase.id, rush: o.rush }); },
        map() { D.hide(); NI.engine.go('map', { focus: phase.id }); },
        lesson() { D.briefing(phase, () => NI.engine.go('play', { id: phase.id }), () => D.result(o)); },
        codex() { D.codex(() => D.result(o)); }
      }, () => { D.hide(); NI.engine.go('map', { focus: phase.id }); });
  };

  /* ---------- códex ---------- */
  D.codex = function (onClose) {
    let html = '<div class="panel"><div class="hd"><span class="tag">ESTUDO</span><h2>CÓDEX DA INFOSFERA</h2></div><div class="small">Todas as aulas-relâmpago em um só lugar. Toque para abrir.</div>';
    NI.PHASES.forEach(p => {
      const w = NI.WORLDS[p.w]; html += `<div class="sep" style="--c:${w.color}">FASE ${p.id} · ${esc(p.title.replace('\n', ' '))}</div>`;
      (NI.LESSONS[p.id] || []).forEach(c => { html += `<details><summary>${esc(c.t)}</summary><div class="in"><p>${esc(c.b)}</p>${c.f ? `<div class="f">${esc(c.f)}</div>` : ''}</div></details>`; });
    });
    html += '<div class="sep">EXTRAS DA EMENTA</div>';
    NI.CODEX_EXTRA.forEach(c => { html += `<details><summary>${esc(c.t)}</summary><div class="in"><p>${esc(c.b)}</p>${c.f ? `<div class="f">${esc(c.f)}</div>` : ''}</div></details>`; });
    html += '<div class="sep">LEITURAS</div>' + NI.READINGS.map(r => `<div class="small">• ${esc(r)}</div>`).join('');
    html += '<button class="btn ghost" data-a="close">FECHAR</button></div>';
    const close = () => { D.hide(); if (onClose) onClose(); };
    mount(html, { close }, close);
  };

  /* ---------- ajustes ---------- */
  D.settings = function (onClose) {
    const v = A.vol, S = NI.save.data;
    const close = () => { D.hide(); if (onClose) onClose(); };
    mount(`<div class="panel"><div class="hd"><span class="tag">OPÇÕES</span><h2>AJUSTES</h2></div>
      <label class="set"><span>Música</span><input type="range" min="0" max="100" value="${Math.round(v.music * 100)}" data-i="music"></label>
      <label class="set"><span>Efeitos</span><input type="range" min="0" max="100" value="${Math.round(v.sfx * 100)}" data-i="sfx"></label>
      <label class="set"><span>Vibração</span><input type="checkbox" ${v.vib ? 'checked' : ''} data-i="vib"></label>
      <label class="set"><span>Modo estudo<br><small class="small">libera todas as fases</small></span><input type="checkbox" ${S.unlockAll ? 'checked' : ''} data-i="all"></label>
      <div class="sep">SOBRE</div>
      <div class="small">Jogo de estudo não oficial, criado a partir da ementa de Natureza da Informação (BC&amp;T, UFABC). Pixel art e sons originais gerados em código (CC0).</div>
      <button class="btn warn" data-a="reset">APAGAR PROGRESSO</button>
      <button class="btn ghost" data-a="close">FECHAR</button></div>`,
      {
        music(b) { A.setVol('music', b.value / 100); }, sfx(b) { A.setVol('sfx', b.value / 100); A.sfx('ok', { combo: 0 }); },
        vib(b) { A.setVol('vib', b.checked); if (b.checked) A.vibrate(40); }, all(b) { NI.save.setUnlockAll(b.checked); },
        reset(b) { if (b.dataset.sure) { NI.save.reset(); b.textContent = 'PROGRESSO APAGADO'; } else { b.dataset.sure = 1; b.textContent = 'TOQUE DE NOVO PARA CONFIRMAR'; } },
        close
      }, close);
  };
})();
