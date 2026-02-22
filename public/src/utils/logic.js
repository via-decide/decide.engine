import { MODULES, DNA } from "../state.js";

function attachDNA(category, name) {
  const list = DNA[category] || [];
  return list.find(d => name.includes(d.name)) || null;
}

export function normalizeItems(category, items) {
  return (items || []).map(it => ({
    name: String(it.name || "Unknown"),
    price: Number(it.price || 0),
    attr: it.attr && typeof it.attr === "object" ? it.attr : {},
    dna: it.dna && typeof it.dna === "object" ? it.dna : attachDNA(category, String(it.name || ""))
  }));
}

export function calculateVerdict(category, items, activeFilterLabels) {
  const mod = MODULES[category];
  const list = items || [];
  if (!list.length) return null;

  const activeKeys = mod.categories
    .filter(c => (activeFilterLabels || []).includes(c.label))
    .map(c => c.type);

  const keys = activeKeys.length ? activeKeys : ["val"];

  const scored = list.map(p => {
    let score = 0;
    for (const k of keys) score += Number(p.attr?.[k] || 0);
    return { ...p, score };
  });

  scored.sort((a, b) => (b.score - a.score) || (a.price - b.price));
  return scored[0];
}

export function buildPriorityDeck(category, items, activeFilterLabels) {
  const mod = MODULES[category];
  const filters = (activeFilterLabels || []).length
    ? mod.categories.filter(c => activeFilterLabels.includes(c.label))
    : [{ label: "GENERAL", type: "val", icon: "⚡" }];

  return filters.map(f => {
    const top = [...items]
      .sort((a, b) => (Number(b.attr?.[f.type] || 0) - Number(a.attr?.[f.type] || 0)))
      .slice(0, 3);
    return { filter: f, options: top };
  });
}
