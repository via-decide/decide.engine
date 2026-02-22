import { apiFetch } from "./api.js";
import { store } from "../store.js";

const TTL_MS = 1000 * 60 * 10;

export async function loadCategory(category) {
  const now = Date.now();
  const last = store.state.lastLoadedAt?.[category] || 0;
  const cacheKey = `decide_products_${category}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached && (!store.state.products?.[category]?.length)) {
      const parsed = JSON.parse(cached);
      if (parsed?.items) {
        store.set({
          products: { ...store.state.products, [category]: parsed.items },
          lastLoadedAt: { ...store.state.lastLoadedAt, [category]: now }
        });
      }
    }
  } catch {}

  if (now - last < TTL_MS && store.state.products?.[category]?.length) return;

  const data = await apiFetch(`/api/products?category=${encodeURIComponent(category)}`);

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ items: data.items, ts: now }));
  } catch {}

  store.set({
    products: { ...store.state.products, [category]: data.items },
    lastLoadedAt: { ...store.state.lastLoadedAt, [category]: now }
  });
}
