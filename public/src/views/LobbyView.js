import { el } from "../utils/dom.js";
import { navigate } from "../router.js";

export function LobbyView(state) {
  return el("div", {},
    el("div", { class: "slide-header" },
      el("span", { class: "header-title" }, "DECIDE OS (D1)", el("div", { class: "status-dot" }))
    ),
    el("div", { class: "lobby-grid" },
      el("div", { class: "grid-btn", onclick: () => navigate("#/smartphones") },
        el("div", { class: "grid-icon" }, "📱"),
        "DECIDE: PHONES",
        el("div", { class: "grid-status" }, "D1 LIVE")
      ),
      el("div", { class: "grid-btn", onclick: () => navigate("#/earbuds") },
        el("div", { class: "grid-icon" }, "🎧"),
        "DECIDE: AUDIO",
        el("div", { class: "grid-status" }, "D1 LIVE")
      ),
      el("div", { class: "grid-btn", onclick: () => navigate("#/laptops") },
        el("div", { class: "grid-icon" }, "💻"),
        "DECIDE: LAPTOPS",
        el("div", { class: "grid-status" }, "D1 LIVE")
      ),
      el("div", { class: "grid-btn", onclick: () => alert("TRACK: add later") },
        el("div", { class: "grid-icon" }, "📦"),
        "TRACK",
        el("div", { class: "grid-status" }, "NEXT")
      ),
      el("div", { class: "grid-btn", onclick: () => alert("BUY: add later") },
        el("div", { class: "grid-icon" }, "🧾"),
        "BUY",
        el("div", { class: "grid-status" }, "NEXT")
      ),
      el("div", { class: "grid-btn", onclick: () => window.open("/admin.html", "_blank") },
        el("div", { class: "grid-icon" }, "🧰"),
        "ADMIN",
        el("div", { class: "grid-status" }, "UPLOAD")
      ),
      el("div", { class: "grid-btn full-width-btn", onclick: () => window.open("https://youtube.com", "_blank") },
        "▶ WATCH REVIEW"
      ),
      el("div", {
        style: {
          gridColumn: "span 2",
          textAlign: "center",
          opacity: "0.3",
          fontSize: "0.6rem",
          marginTop: "20px"
        }
      }, `ID: ${state.sessionID}`)
    )
  );
}
