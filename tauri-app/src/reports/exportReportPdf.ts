import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import type { DwellSegment } from "../types";
import { formatDurationSeconds } from "../utils/formatDuration";
import type { ReportKpi } from "./ReportBody";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const FOOTER_Y = 282;

const COLOR = {
  text: [28, 28, 28] as [number, number, number],
  muted: [100, 100, 100] as [number, number, number],
  border: [218, 218, 218] as [number, number, number],
  headerBg: [244, 244, 244] as [number, number, number],
  zebra: [250, 250, 250] as [number, number, number],
};

export type ReportPdfChartSection = {
  title: string;
  captureEl: HTMLElement | null;
};

export type ReportPdfTableSection = {
  title: string;
  hint?: string;
  items: DwellSegment[];
  totalSeconds: number;
  formatName?: (name: string) => string;
};

export type BuildReportPdfOptions = {
  reportType: "daily" | "weekly";
  projectName: string;
  periodLabel: string;
  narrative: string | null;
  kpis: ReportKpi[];
  estimationHint: string;
  pieSections: ReportPdfChartSection[];
  tables: ReportPdfTableSection[];
};

function surfaceBackgroundColor(): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--surface")
    .trim();
  return raw || "#ffffff";
}

async function waitForPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function captureElement(el: HTMLElement): Promise<string> {
  await waitForPaint();
  return toPng(el, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: surfaceBackgroundColor(),
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Chart-Bild konnte nicht geladen werden."));
    img.src = dataUrl;
  });
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > FOOTER_Y) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function setTextColor(doc: jsPDF, color: [number, number, number]): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

function drawRule(doc: jsPDF, y: number): number {
  doc.setDrawColor(...COLOR.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 4;
}

function formatExportTimestamp(date: Date): string {
  return date.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function addFooters(doc: jsPDF, estimationHint: string): void {
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

function addHeader(
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
    `Projektname: ${options.projectName}`,
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

function addKpiGrid(doc: jsPDF, y: number, kpis: ReportKpi[]): number {
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

function addNarrative(doc: jsPDF, y: number, narrative: string): number {
  y = ensureSpace(doc, y, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, COLOR.text);
  const lines = doc.splitTextToSize(narrative, CONTENT_W);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 3.8 + 4;
}

async function addPieRow(
  doc: jsPDF,
  y: number,
  sections: ReportPdfChartSection[],
): Promise<number> {
  const valid = sections.filter((section) => section.captureEl);
  if (valid.length === 0) {
    return y;
  }

  const gap = 4;
  const colW = (CONTENT_W - gap * (valid.length - 1)) / valid.length;
  const maxPieH = 38;
  let rowH = 0;

  y = ensureSpace(doc, y, maxPieH + 14);

  for (let i = 0; i < valid.length; i += 1) {
    const section = valid[i];
    const el = section.captureEl;
    if (!el) continue;

    const x = MARGIN + i * (colW + gap);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setTextColor(doc, COLOR.text);
    const titleLines = doc.splitTextToSize(section.title, colW);
    doc.text(titleLines, x + colW / 2, y, { align: "center" });

    try {
      const png = await captureElement(el);
      const img = await loadImage(png);
      let displayW = colW;
      let displayH = (img.height / img.width) * displayW;
      if (displayH > maxPieH) {
        displayH = maxPieH;
        displayW = (img.width / img.height) * displayH;
      }
      const imgX = x + (colW - displayW) / 2;
      const imgY = y + 4;
      doc.addImage(png, "PNG", imgX, imgY, displayW, displayH);
      rowH = Math.max(rowH, 4 + displayH);
    } catch (error) {
      console.warn("PDF pie capture failed:", section.title, error);
      rowH = Math.max(rowH, 8);
    }
  }

  return y + rowH + 5;
}

function addTableSection(
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

  const colNameW = CONTENT_W * 0.52;
  const colDurW = CONTENT_W * 0.24;
  const rowH = 5.5;
  const headerH = 6;

  y = ensureSpace(doc, y, headerH + rowH);

  doc.setFillColor(...COLOR.headerBg);
  doc.rect(MARGIN, y - 3.5, CONTENT_W, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setTextColor(doc, COLOR.muted);
  doc.text("Eintrag", MARGIN + 2, y);
  doc.text("Dauer", MARGIN + colNameW + 2, y);
  doc.text("Anteil", MARGIN + colNameW + colDurW + 2, y, { align: "left" });
  y += headerH - 1;

  const formatName = section.formatName ?? ((name: string) => name);
  const sorted = [...section.items].sort((a, b) => b.value - a.value);

  sorted.forEach((item, index) => {
    y = ensureSpace(doc, y, rowH);
    if (index % 2 === 1) {
      doc.setFillColor(...COLOR.zebra);
      doc.rect(MARGIN, y - 3.2, CONTENT_W, rowH, "F");
    }

    const pct =
      section.totalSeconds > 0
        ? Math.round((item.value / section.totalSeconds) * 100)
        : 0;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setTextColor(doc, COLOR.text);
    const name = formatName(item.name);
    const nameLines = doc.splitTextToSize(name, colNameW - 4);
    doc.text(nameLines[0] ?? name, MARGIN + 2, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setTextColor(doc, COLOR.text);
    doc.text(formatDurationSeconds(item.value), MARGIN + colNameW + 2, y);

    setTextColor(doc, COLOR.muted);
    doc.text(`${pct} %`, MARGIN + colNameW + colDurW + 2, y);

    y += rowH;
  });

  return y + 3;
}

export async function buildReportPdf(
  options: BuildReportPdfOptions,
): Promise<Uint8Array> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const exportedAt = new Date();
  let y = MARGIN;

  y = addHeader(doc, y, options, exportedAt);
  y = addKpiGrid(doc, y, options.kpis);

  if (options.narrative) {
    y = addNarrative(doc, y, options.narrative);
  }

  y = await addPieRow(doc, y, options.pieSections);

  for (const table of options.tables) {
    y = addTableSection(doc, y, table);
  }

  addFooters(doc, options.estimationHint);
  return new Uint8Array(doc.output("arraybuffer"));
}
