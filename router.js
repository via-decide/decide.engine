(function () {
  if (window.__DECIDE_ENGINE_ROUTER__) return;
  window.__DECIDE_ENGINE_ROUTER__ = true;

  function canonicalRoute(route) {
    return route === 'research' ? 'researchers' : route;
  }

  function getRouteFromHash() {
    return canonicalRoute((window.location.hash || '#hero').slice(1));
  }

  function applyRoute(route) {
    const target = canonicalRoute(route || 'hero');

    document.querySelectorAll('[data-route]').forEach((node) => {
      node.classList.toggle('is-active', node.dataset.route === target);
    });

    document.querySelectorAll('[data-s]').forEach((node) => {
      node.classList.toggle('is-active', node.dataset.s === target);
    });
  }

  function goToRoute(route, { replace = false } = {}) {
    const target = canonicalRoute(route || 'hero');
    if (replace) {
      window.history.replaceState(null, '', `#${target}`);
    } else {
      window.location.hash = target;
    }
    applyRoute(target);
  }

  function syncFromHash() {
    applyRoute(getRouteFromHash());
  }

  function bindNavigation() {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-s]');
      if (!trigger) return;
      event.preventDefault();
      goToRoute(trigger.dataset.s);
    });
  }

  function init() {
    bindNavigation();
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
