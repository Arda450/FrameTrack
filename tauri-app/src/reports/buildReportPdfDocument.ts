import { jsPDF } from "jspdf";
import { addPieRow } from "./reportPdfCapture";
import {
  MARGIN,
  addFooters,
  addHeader,
  addKpiGrid,
  addNarrative,
  addTableSection,
} from "./reportPdfLayout";
import type { BuildReportPdfOptions } from "./reportPdfTypes";

/** Erstellt das fertige PDF als Byte Array. */
export async function buildReportPdfDocument(
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
