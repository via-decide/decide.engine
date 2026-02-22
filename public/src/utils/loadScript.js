const loaded = new Map();

export function loadScriptOnce(src) {
  if (loaded.has(src)) return loaded.get(src);

  const p = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });

  loaded.set(src, p);
  return p;
}
