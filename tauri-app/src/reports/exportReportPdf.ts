import type { BuildReportPdfOptions } from "./reportPdfTypes";

export type {
  BuildReportPdfOptions,
  ReportPdfChartSection,
  ReportPdfTableSection,
} from "./reportPdfTypes";

/** Erstellt das fertige PDF per Lazy Load der schweren Export Bibliotheken. */
export async function buildReportPdf(
  options: BuildReportPdfOptions,
): Promise<Uint8Array> {
  const { buildReportPdfDocument } = await import("./buildReportPdfDocument");
  return buildReportPdfDocument(options);
}
