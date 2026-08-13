import { exportActivitiesCsvToPaths } from "../api/export";
import type { ExportCsvResult } from "../types";
import {
  aggregatedCsvPathBeside,
  defaultExportFileName,
  pickExportSavePath,
} from "./exportSaveDialog";

export type ActivitiesCsvExportFilter = {
  projectId?: number | null;
  projectIds?: number[];
  fromTs?: number | null;
  toTs?: number | null;
  contextQuery?: string | null;
};

export type ActivitiesCsvExportPaths = {
  samplesPath: string;
  aggregatedPath: string;
};

/** Öffnet den Speicherdialog und liefert die Zielpfade für den CSV Export. */
export async function pickActivitiesCsvExportPaths(): Promise<ActivitiesCsvExportPaths | null> {
  const samplesPath = await pickExportSavePath({
    title: "CSV Zeiteinträge speichern",
    defaultFileName: defaultExportFileName("frametrack-samples", "csv"),
    extension: "csv",
    filterName: "CSV",
  });
  if (!samplesPath) {
    return null;
  }

  return {
    samplesPath,
    aggregatedPath: aggregatedCsvPathBeside(samplesPath),
  };
}

/** Schreibt Samples und Aggregat CSV für Filter und Zielpfade. */
export async function writeActivitiesCsvExport(
  filter: ActivitiesCsvExportFilter,
  paths: ActivitiesCsvExportPaths,
): Promise<ExportCsvResult> {
  return exportActivitiesCsvToPaths({
    projectId: filter.projectId ?? null,
    projectIds: filter.projectIds,
    fromTs: filter.fromTs ?? null,
    toTs: filter.toTs ?? null,
    contextQuery: filter.contextQuery ?? null,
    samplesPath: paths.samplesPath,
    aggregatedPath: paths.aggregatedPath,
  });
}

/** Öffnet den Speicherdialog und schreibt Samples sowie Aggregat CSV. */
export async function exportActivitiesCsvWithDialog(
  filter: ActivitiesCsvExportFilter,
): Promise<ExportCsvResult | null> {
  const paths = await pickActivitiesCsvExportPaths();
  if (!paths) {
    return null;
  }
  return writeActivitiesCsvExport(filter, paths);
}
