import { loadScriptOnce } from "../utils/loadScript.js";

const JSPDF = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const AUTOTABLE = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js";

export async function generateDecisionReport({ sessionID, category, winner, filters }) {
  if (!winner) throw new Error("No winner");

  await loadScriptOnce(JSPDF);
  await loadScriptOnce(AUTOTABLE);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, 210, 297, "F");

  doc.setTextColor(255, 103, 31);
  doc.setFontSize(22);
  doc.text("DECIDE ENGINE AUDIT", 14, 20);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`SESSION ID: ${sessionID}`, 14, 28);
  doc.text(`CATEGORY: ${String(category).toUpperCase()}`, 14, 34);
  doc.text(`FILTERS: ${(filters?.length ? filters.join(", ") : "GENERAL")}`, 14, 40);
  doc.line(14, 44, 196, 44);

  doc.setFontSize(14);
  doc.setTextColor(0, 230, 118);
  doc.text("1. THE VERDICT", 14, 58);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(`Winner: ${winner.name}`, 14, 68);
  doc.text(`Price: Rs. ${winner.price}`, 14, 76);

  let y = 88;
  if (winner.dna) {
    doc.text(`Logic: ${winner.dna.dominance || "Optimized"}`, 14, y);
    y += 10;
    doc.text(`Edge: ${winner.dna.tech_edge || "High Performance"}`, 14, y);
    y += 10;
  }

  const rows = [];
  const attrs = winner.attr || {};
  for (const k of Object.keys(attrs)) rows.push([k.toUpperCase(), `${attrs[k]}/10`]);

  doc.autoTable({
    startY: y + 6,
    head: [["Attribute", "Score"]],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [255, 103, 31] },
    styles: { textColor: 255, fillColor: [30, 30, 30] }
  });

  doc.save(`Audit_${sessionID}.pdf`);
}
