import { el } from "../utils/dom.js";
import { MODULES, amazonProductLink, youtubeReviewLink } from "../state.js";
import { normalizeItems, buildPriorityDeck, calculateVerdict } from "../utils/logic.js";
import { store } from "../store.js";
import { navigate } from "../router.js";
import { loadCategory } from "../services/products.js";
import { generateDecisionReport } from "../services/pdf.js";

function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = String(msg || "");
  t.classList.add("visible");
  setTimeout(() => t.classList.remove("visible"), 2000);
}

function setDecideState(patch) {
  const prev = store.state.decide || {};
  store.set({ decide: { ...prev, ...patch } });
}

function ensureDecideState(category) {
  const mod = MODULES[category];
  const decide = store.state.decide || {};
  if (decide.category !== category) {
    setDecideState({
      category,
      step: mod.ecosystemGate ? "gate" : "filters",
      ecosystem: null,
      activeFilters: [],
      deck: [],
      deckIndex: 0,
      optIndex: 0,
      winner: null
    });
  }
}

function Header(title) {
  return el("div", { class: "slide-header" },
    el("span", { class: "header-title" }, title, el("div", { class: "status-dot" }))
  );
}

function ExitButton() {
  return el("button", {
    class: "skip-btn-clickable",
    style: {
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: 5000,
      background: "rgba(0,0,0,0.5)",
      color: "#fff",
      borderColor: "rgba(255,255,255,0.2)",
      textTransform: "uppercase"
    },
    onclick: () => navigate("#/")
  }, "EXIT");
}

function GateStep() {
  return el("div", { class: "lobby-container" },
    el("h1", { style: { textAlign: "center", marginTop: "20px" } }, "DRIVER?"),
    el("div", { class: "selection-grid" },
      el("button", { class: "cuisine-btn", onclick: () => setDecideState({ ecosystem: "specs", step: "filters" }) },
        el("span", { style: { fontSize: "2rem" } }, "🚀"), "SPECS"
      ),
      el("button", { class: "cuisine-btn", onclick: () => setDecideState({ ecosystem: "peace", step: "filters" }) },
        el("span", { style: { fontSize: "2rem" } }, "🛡️"), "PEACE"
      )
    ),
    el("div", { class: "action-area" },
      el("button", { class: "btn", onclick: () => navigate("#/") }, "← BACK")
    )
  );
}

function FiltersStep(category) {
  const mod = MODULES[category];
  const decide = store.state.decide;
  const selected = new Set(decide.activeFilters || []);

  return el("div", { class: "lobby-container" },
    el("h1", { style: { textAlign: "center", marginTop: "20px" } }, "PRIORITY"),
    el("div", { class: "selection-grid" },
      mod.categories.map(c =>
        el("button", {
          class: "cuisine-btn" + (selected.has(c.label) ? " selected" : ""),
          onclick: () => {
            const cur = new Set(store.state.decide.activeFilters || []);
            cur.has(c.label) ? cur.delete(c.label) : cur.add(c.label);
            setDecideState({ activeFilters: [...cur] });
          }
        }, el("span", {}, c.icon), c.label)
      )
    ),
    el("div", { class: "action-area" },
      el("button", {
        class: "btn btn-primary",
        onclick: async () => {
          try {
            if (!(store.state.products?.[category]?.length)) {
              toast("LOADING DB…");
              await loadCategory(category);
            }
          } catch (e) {
            console.error(e);
            return toast("DB ERROR");
          }

          const items = normalizeItems(category, store.state.products?.[category] || []);
          if (!items.length) return toast("DB EMPTY");

          const deck = buildPriorityDeck(category, items, store.state.decide.activeFilters || []);
          const winner = calculateVerdict(category, items, store.state.decide.activeFilters || []);

          setDecideState({ step: "deck", deck, deckIndex: 0, optIndex: 0, winner });
        }
      }, "START HUNT →")
    )
  );
}

function DeckStep() {
  const decide = store.state.decide;
  const deck = decide.deck || [];
  const slide = deck[decide.deckIndex];

  if (!slide) {
    setDecideState({ step: "winner" });
    return el("div", { class: "lobby-container" }, el("h1", {}, "…"));
  }

  const options = slide.options || [];
  const activeIdx = Math.max(0, Math.min(decide.optIndex || 0, options.length - 1));

  const topBar = el("div", {
    style: { display: "flex", gap: "10px", alignItems: "center", justifyContent: "space-between", margin: "0 auto", maxWidth: "560px", padding: "0 6px" }
  },
    el("div", { style: { fontFamily: "'Courier New',monospace", fontSize: ".7rem", color: "#888", letterSpacing: "1px" } },
      `${decide.deckIndex + 1}/${deck.length} • ${slide.filter.label}`
    ),
    el("div", { style: { display: "flex", gap: "10px" } },
      el("span", { class: "skip-btn-clickable", onclick: () => setDecideState({ step: "filters", deck: [], deckIndex: 0, optIndex: 0 }) }, "FILTERS"),
      el("span", { class: "skip-btn-clickable", onclick: () => navigate("#/") }, "HOME")
    )
  );

  const cards = el("div", { class: "carousel-viewport" },
    options.map((p, idx) => el("div", { class: "sub-slide " + (idx === activeIdx ? "opt-active" : "opt-hidden") },
      el("div", { class: "role-label" }, `${slide.filter.label} #${idx + 1}`),
      el("h1", {}, p.name),
      el("div", { class: "dna-badge" }, p.dna?.tech_edge || "High Performance"),
      el("div", { class: "price-text" }, `₹${p.price}`),
      el("div", { class: "nav-hint" },
        el("span", { class: "skip-btn-clickable", onclick: () => setDecideState({ optIndex: (activeIdx + 1) % options.length }) }, "NEXT"),
        el("span", { style: "color:var(--accent-go)" }, "SELECT ↑")
      )
    ))
  );

  const controls = el("div", { class: "action-area", style: { display: "grid", gap: "10px", maxWidth: "560px", margin: "0 auto" } },
    el("button", {
      class: "btn btn-primary",
      onclick: () => {
        const nextDeck = decide.deckIndex + 1;
        if (nextDeck >= deck.length) setDecideState({ step: "winner" });
        else setDecideState({ deckIndex: nextDeck, optIndex: 0 });
      }
    }, "SELECT ↑"),
    el("button", {
      class: "btn",
      onclick: () => {
        const prevDeck = decide.deckIndex - 1;
        if (prevDeck < 0) return;
        setDecideState({ deckIndex: prevDeck, optIndex: 0 });
      }
    }, "BACK ↓")
  );

  return el("div", { class: "lobby-container" }, topBar, cards, controls);
}

function WinnerStep(category) {
  const decide = store.state.decide;
  const w = decide.winner;

  const title = w?.name || "Selection";
  const reason = w?.dna?.dominance || "Optimized based on your priorities.";
  const price = w ? `₹${w.price}` : "—";

  const amzn = amazonProductLink(title);
  const yt = youtubeReviewLink(title);

  return el("div", { class: "winner-container" },
    el("div", { class: "role-label", style: { color: "var(--accent-go)" } }, "VERDICT SECURED"),
    el("div", { class: "winner-title" }, title),
    el("div", { class: "winner-reason" }, reason),
    el("div", { class: "winner-price" }, price),
    el("div", { style: { display: "grid", gap: "10px", width: "100%" } },
      el("button", { class: "btn btn-primary", onclick: () => window.open(amzn, "_blank") }, "CHECK PRICE ↗"),
      el("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" } },
        el("button", { class: "btn", onclick: () => window.open(yt, "_blank") }, "▶ REVIEW"),
        el("button", {
          class: "btn",
          onclick: async () => {
            try {
              toast("BUILDING REPORT…");
              await generateDecisionReport({ sessionID: store.state.sessionID, category, winner: w, filters: decide.activeFilters || [] });
              toast("DOWNLOADING…");
            } catch (e) {
              console.error(e);
              toast("REPORT ERR");
            }
          }
        }, "📄 REPORT")
      ),
      el("button", { class: "skip-btn-clickable", style: "margin-top:10px;text-align:center;", onclick: () => navigate("#/") }, "HOME")
    )
  );
}

function bindControls(root) {
  const onKey = (e) => {
    const decide = store.state.decide;
    if (!decide || decide.step !== "deck") return;

    const slide = decide.deck?.[decide.deckIndex];
    const len = slide?.options?.length || 0;

    if (e.key === "ArrowRight" && len) setDecideState({ optIndex: (decide.optIndex + 1) % len });
    if (e.key === "ArrowLeft" && len) setDecideState({ optIndex: (decide.optIndex - 1 + len) % len });

    if (e.key === "ArrowUp") {
      const nextDeck = decide.deckIndex + 1;
      if (nextDeck >= (decide.deck?.length || 0)) setDecideState({ step: "winner" });
      else setDecideState({ deckIndex: nextDeck, optIndex: 0 });
    }

    if (e.key === "ArrowDown") {
      const prevDeck = decide.deckIndex - 1;
      if (prevDeck >= 0) setDecideState({ deckIndex: prevDeck, optIndex: 0 });
    }
  };

  let sx = 0, sy = 0;
  const onTS = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    sx = t.clientX; sy = t.clientY;
  };
  const onTE = (e) => {
    const decide = store.state.decide;
    if (!decide || decide.step !== "deck") return;
    const t = e.changedTouches?.[0];
    if (!t) return;

    const dx = t.clientX - sx;
    const dy = t.clientY - sy;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const slide = decide.deck?.[decide.deckIndex];
    const len = slide?.options?.length || 0;

    if (absX > 60 && absX > absY && len) {
      if (dx < 0) setDecideState({ optIndex: (decide.optIndex + 1) % len });
      else setDecideState({ optIndex: (decide.optIndex - 1 + len) % len });
      return;
    }

    if (absY > 60 && absY > absX) {
      if (dy < 0) {
        const nextDeck = decide.deckIndex + 1;
        if (nextDeck >= (decide.deck?.length || 0)) setDecideState({ step: "winner" });
        else setDecideState({ deckIndex: nextDeck, optIndex: 0 });
      } else {
        const prevDeck = decide.deckIndex - 1;
        if (prevDeck >= 0) setDecideState({ deckIndex: prevDeck, optIndex: 0 });
      }
    }
  };

  window.addEventListener("keydown", onKey);
  root.addEventListener("touchstart", onTS, { passive: true });
  root.addEventListener("touchend", onTE, { passive: true });

  return () => {
    window.removeEventListener("keydown", onKey);
    root.removeEventListener("touchstart", onTS);
    root.removeEventListener("touchend", onTE);
  };
}

export function DecideFlowView(state, category) {
  ensureDecideState(category);

  if (!(state.products?.[category]?.length)) loadCategory(category).catch(() => {});

  const mod = MODULES[category];
  const decide = store.state.decide;

  const root = el("div", {}, Header(`DECIDE: ${mod.label}`), ExitButton());

  let body = null;
  if (decide.step === "gate") body = GateStep();
  else if (decide.step === "filters") body = FiltersStep(category);
  else if (decide.step === "deck") body = DeckStep();
  else body = WinnerStep(category);

  root.appendChild(body);

  const unbind = bindControls(root);
  root.__cleanup = unbind;

  return root;
}
