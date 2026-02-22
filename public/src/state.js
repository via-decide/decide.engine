export const AMZN_TAG = "decideos-21";

export const DNA = {
  smartphones: [
    { name: "Samsung Galaxy S26 Ultra", dominance: "Productivity King", tech_edge: "S-Pen + AI" },
    { name: "iPhone 17 Pro", dominance: "Video Standard", tech_edge: "A19 Pro" },
    { name: "OnePlus 14", dominance: "Battery King", tech_edge: "Si/C Battery" },
    { name: "Pixel 10 Pro", dominance: "Smartest Assistant", tech_edge: "Ambient AI" },
    { name: "iQOO 14 Legend", dominance: "Fastest Charge", tech_edge: "150W Flash" }
  ],
  earbuds: [
    { name: "Sony WF-1000XM6", dominance: "Silence King", tech_edge: "Dual V2 Processor" },
    { name: "AirPods Pro 3", dominance: "Ecosystem King", tech_edge: "H3 Chip" }
  ],
  laptops: [
    { name: "MacBook Air M3", dominance: "Student Default", tech_edge: "Apple Silicon" },
    { name: "Zephyrus G14", dominance: "Portable Gaming", tech_edge: "OLED Nebula" }
  ]
};

export const MODULES = {
  smartphones: {
    label: "PHONES",
    categories: [
      { label: "CAMERA", type: "cam", icon: "📸" },
      { label: "GAMING", type: "gam", icon: "🎮" },
      { label: "BATTERY", type: "bat", icon: "🔋" },
      { label: "VALUE", type: "val", icon: "⚡" }
    ],
    ecosystemGate: true
  },
  earbuds: {
    label: "AUDIO",
    categories: [
      { label: "SOUND", type: "snd", icon: "🎵" },
      { label: "SILENCE", type: "anc", icon: "🔇" },
      { label: "MIC", type: "mic", icon: "🎙️" }
    ],
    ecosystemGate: false
  },
  laptops: {
    label: "LAPTOPS",
    categories: [
      { label: "WORK", type: "perf", icon: "🧠" },
      { label: "TRAVEL", type: "port", icon: "🧳" },
      { label: "CREATOR", type: "scr", icon: "🎬" }
    ],
    ecosystemGate: false
  }
};

export function amazonProductLink(query) {
  return `https://www.amazon.in/s?k=${encodeURIComponent(query)}&tag=${AMZN_TAG}&linkCode=ll2`;
}
export function youtubeReviewLink(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " review")}`;
}
