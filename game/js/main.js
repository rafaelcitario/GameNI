/* Inicialização. Também expõe ganchos para o app Android (botão voltar, pausa/retomada). */
(function () {
  'use strict';
  const NI = window.NI, E = NI.engine;

  // Botão "voltar" do Android: painel DOM aberto -> fecha; senão, a cena decide. Retorna true se tratou o evento.
  NI.back = function () {
    try { if (NI.dom.isOpen()) return NI.dom.back(); const s = E.scene; return !!(s && s.onBack && s.onBack()); } catch (e) { return false; }
  };
  NI.onAppPause = () => E.onBlur();
  NI.onAppResume = () => E.onFocus();

  // Se algo quebrar no aparelho, mostra o erro na tela em vez de congelar em silêncio (ajuda a depurar no WebView).
  window.addEventListener('error', ev => {
    let d = document.getElementById('err');
    if (!d) { d = document.createElement('pre'); d.id = 'err'; d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;margin:0;padding:6px;background:#300;color:#fcc;font:11px monospace;white-space:pre-wrap;z-index:9;max-height:40%;overflow:auto'; document.body.appendChild(d); }
    d.textContent = 'ERRO: ' + ev.message + ' (' + String(ev.filename || '').split('/').pop() + ':' + ev.lineno + ')';
  });

  function boot() {
    E.init();
    NI.spr.loadOverrides();
    E.go('title', {}, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
