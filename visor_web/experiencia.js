/*
 * Copaifera 4.1: microinteracciones accesibles y aparición gradual.
 * No altera mapas, datos, gráficos ni selección.
 * IntersectionObserver respeta la visibilidad incluso al desplazar
 * la página exterior que contiene el iframe de Streamlit.
 */
'use strict';
(function () {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const tabList = document.querySelector('[role="tablist"]');
  const root = document.documentElement;
  let io = null;
  let refreshScheduled = false;

  function visiblePanelTargets() {
    const selectors = [
      '.kpis .kpi',
      '.panel:not([hidden]) > .section-head',
      '.panel:not([hidden]) > .card',
      '.panel:not([hidden]) > .grid2 > .card',
      '.panel:not([hidden]) > .tree-grid > .card',
      '.panel:not([hidden]) > .climate-grid > .card',
      '.footer'
    ];
    return document.querySelectorAll(selectors.join(','));
  }

  function refreshReveal() {
    refreshScheduled = false;
    // El observador tiene en cuenta la intersección con la ventana padre del iframe,
    // aunque el desplazamiento ocurra fuera del visor.
    const animate = !reducedMotion.matches && ('IntersectionObserver' in window);
    if (!animate) {
      root.classList.remove('has-scroll-reveal');
      if (io) { io.disconnect(); io = null; }
      document.querySelectorAll('.reveal-target').forEach(el => el.classList.add('is-visible'));
      return;
    }
    if (!io) {
      io = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }, { threshold: 0.05, rootMargin: '0px 0px -12px 0px' });
    }
    for (const el of visiblePanelTargets()) {
      if (el.classList.contains('reveal-target')) continue;
      el.classList.add('reveal-target');
      io.observe(el);
    }
    // Evita la revelación retardada de contenido cercano al primer pantallazo.
    root.classList.add('has-scroll-reveal');
  }
  function scheduleReveal() {
    if (refreshScheduled) return;
    refreshScheduled = true;
    requestAnimationFrame(refreshReveal);
  }

  if (tabList) {
    const tabs = [...tabList.querySelectorAll('[role="tab"]')];
    function updateTabOrder() {
      for (const tab of tabs) tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
      scheduleReveal();
    }
    tabList.addEventListener('click', () => requestAnimationFrame(updateTabOrder));
    tabList.addEventListener('keydown', event => {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (!keys.includes(event.key) || !tabs.includes(document.activeElement)) return;
      event.preventDefault();
      const index = tabs.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0
        : event.key === 'End' ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    });
    updateTabOrder();

    const panelObserver = new MutationObserver(scheduleReveal);
    document.querySelectorAll('.panel').forEach(panel => {
      panelObserver.observe(panel, { attributes:true, attributeFilter:['hidden'] });
    });
  }

  if (typeof reducedMotion.addEventListener === 'function')
    reducedMotion.addEventListener('change', scheduleReveal);
  window.addEventListener('resize', scheduleReveal, {passive:true});
  document.addEventListener('scroll', scheduleReveal, {passive:true});
  scheduleReveal();
})();
