import type { jsPDF } from "jspdf";
import type { ReportKpi } from "./reportTypes";
import { buildDwellTableRows } from "./dwellTableRows";
import { colorForCategory } from "../utils/chartColors";
import type {
  BuildReportPdfOptions,
  ReportPdfTableSection,
} from "./reportPdfTypes";

export const PAGE_W = 210;
export const PAGE_H = 297;
export const MARGIN = 12;
export const CONTENT_W = PAGE_W - 2 * MARGIN;
export const FOOTER_Y = 282;

export const COLOR = {
  text: [28, 28, 28] as [number, number, number],
  muted: [100, 100, 100] as [number, number, number],
  border: [218, 218, 218] as [number, number, number],
  headerBg: [244, 244, 244] as [number, number, number],
  zebra: [250, 250, 250] as [number, number, number],
};

/** Wandelt eine CSS-Hexfarbe in ein jsPDF-kompatibles RGB-Tupel um. */
function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.trim().replace(/^#/, "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character.repeat(2))
          .join("")
      : normalized;

  if (!/^[0-9a-f]{6}$/i.test(value)) {
    return [100, 100, 100];
  }

  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

/** Fügt bei Bedarf eine neue PDF Seite ein. */
export function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > FOOTER_Y) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

/** Setzt die Textfarbe im PDF Dokument. */
export function setTextColor(
  doc: jsPDF,
  color: [number, number, number],
): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

/** Zeichnet eine horizontale Trennlinie im PDF. */
export function drawRule(doc: jsPDF, y: number): number {
  doc.setDrawColor(...COLOR.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 4;
}

/** Formatiert den PDF Export Zeitstempel. */
function formatExportTimestamp(date: Date): string {
  return date.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Schreibt Fusszeilen mit Hinweis und Seitennummer. */
export function addFooters(doc: jsPDF, estimationHint: string): void {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    setTextColor(doc, COLOR.muted);
    const footerLines = doc.splitTextToSize(estimationHint, CONTENT_W - 28);
    doc.text(footerLines, MARGIN, PAGE_H - 7);
    doc.text(`Seite ${page} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 7, {
      align: "right",
    });
  }
}

/** Rendert Kopfzeile mit Titel, Projektumfang und Zeitraum. */
export function addHeader(
  doc: jsPDF,
  y: number,
  options: BuildReportPdfOptions,
  exportedAt: Date,
): number {
  const reportTitle =
    options.reportType === "daily" ? "Tagesbericht" : "Wochenbericht";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setTextColor(doc, COLOR.text);
  doc.text(reportTitle, MARGIN, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  const projectLines = doc.splitTextToSize(
    `Projektumfang: ${options.projectName}`,
    CONTENT_W,
  );
  doc.text(projectLines, MARGIN, y);
  y += projectLines.length * 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, COLOR.muted);
  doc.text(options.periodLabel, MARGIN, y);
  y += 4;

  doc.setFontSize(7.5);
  doc.text(`Exportiert am ${formatExportTimestamp(exportedAt)}`, MARGIN, y);
  y += 5;

  return drawRule(doc, y);
}

/** Rendert das KPI Raster im PDF. */
export function addKpiGrid(doc: jsPDF, y: number, kpis: ReportKpi[]): number {
  if (kpis.length === 0) {
    return y;
  }

  const cols = Math.min(kpis.length, 4);
  const gap = 2.5;
  const cellW = (CONTENT_W - gap * (cols - 1)) / cols;
  const cellH = 13;
  const rows = Math.ceil(kpis.length / cols);
  const blockH = rows * cellH + (rows - 1) * gap;

  y = ensureSpace(doc, y, blockH + 2);

  kpis.forEach((kpi, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = MARGIN + col * (cellW + gap);
    const cellY = y + row * (cellH + gap);

    doc.setDrawColor(...COLOR.border);
    doc.setFillColor(...COLOR.headerBg);
    doc.roundedRect(x, cellY, cellW, cellH, 1.2, 1.2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setTextColor(doc, COLOR.text);
    const valueLines = doc.splitTextToSize(kpi.value, cellW - 4);
    doc.text(valueLines[0] ?? kpi.value, x + cellW / 2, cellY + 5.5, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setTextColor(doc, COLOR.muted);
    const labelLines = doc.splitTextToSize(kpi.label, cellW - 4);
    doc.text(labelLines[0] ?? kpi.label, x + cellW / 2, cellY + 10, {
      align: "center",
    });
  });

  return y + blockH + 5;
}

/** Rendert den Narrativ Text im PDF. */
export function addNarrative(doc: jsPDF, y: number, narrative: string): number {
  y = ensureSpace(doc, y, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, COLOR.text);
  const lines = doc.splitTextToSize(narrative, CONTENT_W);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 3.8 + 4;
}

/** Rendert eine Tabellensektion mit Verweildauer und Anteil. */
export function addTableSection(
  doc: jsPDF,
  y: number,
  section: ReportPdfTableSection,
): number {
  if (section.items.length === 0) {
    return y;
  }

  y = ensureSpace(doc, y, 14);
  y += 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setTextColor(doc, COLOR.text);
  doc.text(section.title, MARGIN, y);
  y += 4;

  if (section.hint) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setTextColor(doc, COLOR.muted);
    const hintLines = doc.splitTextToSize(section.hint, CONTENT_W);
    doc.text(hintLines, MARGIN, y);
    y += hintLines.length * 3.2 + 2;
  }

  const hasColorKey = Boolean(section.colorOrder?.length);
  const colNameW = CONTENT_W * 0.62;
  const colDurW = CONTENT_W * 0.22;
  const rowH = 6;
  const headerH = 6.5;

  y = ensureSpace(doc, y, headerH + rowH);

  doc.setFillColor(...COLOR.headerBg);
  doc.roundedRect(MARGIN, y - 3.8, CONTENT_W, headerH, 0.8, 0.8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setTextColor(doc, COLOR.muted);
  doc.text("Eintrag", MARGIN + (hasColorKey ? 7 : 2), y);
  doc.text("Dauer", MARGIN + colNameW + colDurW - 2, y, {
    align: "right",
  });
  doc.text("Anteil", MARGIN + CONTENT_W - 2, y, { align: "right" });
  y += headerH - 1;

  const rows = buildDwellTableRows(section.items, section.totalSeconds, {
    formatName: section.formatName,
    sortByValue: section.sortByValue,
  });

  rows.forEach((item, index) => {
    y = ensureSpace(doc, y, rowH);
    if (index % 2 === 1) {
      doc.setFillColor(...COLOR.zebra);
      doc.rect(MARGIN, y - 3.5, CONTENT_W, rowH, "F");
    }

    if (section.colorOrder) {
      const swatchColor = colorForCategory(item.sourceName, section.colorOrder);
      doc.setFillColor(...hexToRgb(swatchColor));
      doc.roundedRect(MARGIN + 2, y - 2.7, 3, 3, 0.6, 0.6, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setTextColor(doc, COLOR.text);
    const nameX = MARGIN + (hasColorKey ? 7 : 2);
    const nameLines = doc.splitTextToSize(
      item.name,
      colNameW - (hasColorKey ? 9 : 4),
    );
    doc.text(nameLines[0] ?? item.name, nameX, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setTextColor(doc, COLOR.text);
    doc.text(item.duration, MARGIN + colNameW + colDurW - 2, y, {
      align: "right",
    });

    setTextColor(doc, COLOR.muted);
    doc.text(`${item.percentage} %`, MARGIN + CONTENT_W - 2, y, {
      align: "right",
    });

    doc.setDrawColor(...COLOR.border);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, y + 2.2, MARGIN + CONTENT_W, y + 2.2);

    y += rowH;
  });

  return y + 3;
}
