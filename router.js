/**
 * router.js
 * Clean, standard navigation router for viadecide.com
 * Replaces the old SPA router that hijacked links and broke form submissions.
 */
(function(){
  "use strict";

  /* All real .html subpages in this project */
  var REAL_SUBPAGES = [
    "StudentResearch.html",
    "SwipeOS.html",
    "Brief.html",
    "DecisionBrief.html",
    "PromptAlchemy.html",
    "alchemist.html",
    "ONDC-demo.html",
    "engine-license.html",
    "index.html"
  ];

  /* Normalise any href to just the filename part */
  function baseFile(href){
    try {
      var u = new URL(href, location.href);
      var parts = u.pathname.split("/");
      return parts[parts.length - 1] || "";
    } catch(e) {
      var s = String(href || "").split("?")[0].split("#")[0];
      var p = s.split("/");
      return p[p.length - 1] || "";
    }
  }

  window.__router = {
    subpages: REAL_SUBPAGES,

    /** Returns true when href resolves to a known real subpage file */
    isRealSubpage: function(href){
      if (!href) return false;
      var file = baseFile(href);
      return REAL_SUBPAGES.some(function(sp){
        return sp.toLowerCase() === file.toLowerCase();
      });
    },

    /**
     * Navigate to a subpage the safe way:
     * • appends ?tag= affiliate param
     * • uses location.href (real navigation, no SPA hijack)
     */
    go: function(href, affiliateTag){
      if (!href) return;
      try {
        var u = new URL(href, location.href);
        if (affiliateTag && !u.searchParams.get("tag")){
          u.searchParams.set("tag", affiliateTag);
        }
        location.href = u.href;
      } catch(e) {
        location.href = href;
      }
    }
  };

  /* Safety net aliases: prevents older scripts calling .navigate or .push from crashing */
  window.__router.navigate = window.__router.go;
  window.__router.push     = window.__router.go;

  /* Global helper to securely fetch the current affiliate tag */
  function getTag() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get("tag") || localStorage.getItem("affiliateTag") || "viadecide";
    } catch(e) {
      return "viadecide";
    }
  }

  /* Automatically handle '?go=' redirects universally across the site */
  function handleGoRedirect() {
    try {
      var params = new URLSearchParams(window.location.search);
      var go = params.get("go");
      if (go && window.__router.isRealSubpage(go)) {
        window.__router.go(go, getTag());
      }
    } catch(e) {}
  }

  // Execute redirect check immediately
  handleGoRedirect();

})();
