import { invoke } from "@tauri-apps/api/core";
import type { ExportCsvResult } from "../types";

type ActivityExportFilter = {
  projectId: number | null;
  projectIds?: number[] | null;
  fromTs: number | null;
  toTs: number | null;
  contextQuery: string | null;
};

/** Schreibt ein generiertes PDF an den gewählten Pfad. */
export function exportReportPdfToPath(params: {
  pdfBytes: number[];
  targetPath: string;
}): Promise<string> {
  return invoke<string>("export_report_pdf_to_path", params);
}

/** Exportiert gefilterte Aktivitäten als JSON Datei. */
export function exportActivitiesJsonToPath(
  filter: ActivityExportFilter & { targetPath: string },
): Promise<string> {
  return invoke<string>("export_activities_json_to_path", filter);
}

/** Exportiert Samples und Aggregat CSV an die Zielpfade. */
export function exportActivitiesCsvToPaths(
  filter: ActivityExportFilter & {
    samplesPath: string;
    aggregatedPath: string;
  },
): Promise<ExportCsvResult> {
  return invoke<ExportCsvResult>("export_activities_csv_to_paths", filter);
}

/** Liefert den zuletzt verwendeten Exportordner. */
export function getExportDirectory(): Promise<string> {
  return invoke<string>("get_export_directory");
}
