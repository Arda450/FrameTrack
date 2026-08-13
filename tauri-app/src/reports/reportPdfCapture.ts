import type { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import {
  CONTENT_W,
  MARGIN,
  ensureSpace,
  setTextColor,
  COLOR,
} from "./reportPdfLayout";
import type { ReportPdfChartSection } from "./reportPdfTypes";

/** Liest die Oberflächen Hintergrundfarbe aus CSS Variablen. */
function surfaceBackgroundColor(): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--surface")
    .trim();
  return raw || "#ffffff";
}

/** Wartet zwei Animationsframes für stabile DOM Screenshots. */
async function waitForPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Erzeugt ein PNG aus einem HTML Element. */
async function captureElement(el: HTMLElement): Promise<string> {
  await waitForPaint();
  return toPng(el, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: surfaceBackgroundColor(),
  });
}

/** Lädt ein Data URL Bild für jsPDF. */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Chart-Bild konnte nicht geladen werden."));
    img.src = dataUrl;
  });
}

/** Rendert eine Zeile mit Pie Chart Screenshots. */
export async function addPieRow(
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
