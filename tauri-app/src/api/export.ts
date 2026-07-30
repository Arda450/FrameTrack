import { invoke } from "@tauri-apps/api/core";
import type { ExportCsvResult } from "../types";

type ActivityExportFilter = {
  projectId: number | null;
  fromTs: number | null;
  toTs: number | null;
  contextQuery: string | null;
};

export function exportReportPdfToPath(params: {
  pdfBytes: number[];
  targetPath: string;
}): Promise<string> {
  return invoke<string>("export_report_pdf_to_path", params);
}

export function exportActivitiesJsonToPath(
  filter: ActivityExportFilter & { targetPath: string },
): Promise<string> {
  return invoke<string>("export_activities_json_to_path", filter);
}

export function exportActivitiesCsvToPaths(
  filter: ActivityExportFilter & {
    samplesPath: string;
    aggregatedPath: string;
  },
): Promise<ExportCsvResult> {
  return invoke<ExportCsvResult>("export_activities_csv_to_paths", filter);
}

export function getExportDirectory(): Promise<string> {
  return invoke<string>("get_export_directory");
}
