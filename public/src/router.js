import { store } from "./store.js";

function parseHash() {
  const raw = (location.hash || "#/").slice(1);
  const [pathPart, queryPart] = raw.split("?");
  const path = (pathPart || "/").trim() || "/";
  const params = new URLSearchParams(queryPart || "");
  return { path, params };
}

export function navigate(hash) {
  if (!hash.startsWith("#")) hash = "#" + hash;
  location.hash = hash;
}

export function initRouter() {
  function onRoute() {
    const { path, params } = parseHash();
    store.set({ route: path, routeParams: params });
  }
  window.addEventListener("hashchange", onRoute);
  onRoute();
}
