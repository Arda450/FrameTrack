import { exportActivitiesCsvToPaths } from "../api/export";
import { useState } from "react";
import type { TableExportFilter } from "../types";
import { useToast } from "../components/toast/ToastContext";
import { apiErrorMessage } from "../utils/apiError";
import {
  aggregatedCsvPathBeside,
  defaultExportFileName,
  pickExportSavePath,
} from "../utils/exportSaveDialog";
import { formatExportSuccessDetail } from "../utils/exportPath";
import { fileNameFromPath } from "../utils/fileNameFromPath";

export function useActivityExport(filter: TableExportFilter) {
  const toast = useToast();
  const [activeExport, setActiveExport] = useState<"csv-download" | null>(null);

  async function exportCsv() {
    try {
      const samplesPath = await pickExportSavePath({
        title: "CSV Zeiteinträge speichern",
        defaultFileName: defaultExportFileName("frametrack-samples", "csv"),
        extension: "csv",
        filterName: "CSV",
      });
      if (!samplesPath) return;

      setActiveExport("csv-download");
      const aggregatedPath = aggregatedCsvPathBeside(samplesPath);
      const result = await exportActivitiesCsvToPaths({
        projectId: filter.projectId,
        fromTs: filter.fromTs,
        toTs: filter.toTs,
        contextQuery: filter.contextQuery,
        samplesPath,
        aggregatedPath,
      });
      toast.success("CSV exportiert", {
        detail: formatExportSuccessDetail(result.samples_path, [
          fileNameFromPath(result.aggregated_path),
        ]),
      });
    } catch (error) {
      toast.error(
        `CSV-Export fehlgeschlagen: ${apiErrorMessage(error, "Export konnte nicht erstellt werden.")}`,
      );
    } finally {
      setActiveExport(null);
    }
  }

  return {
    activeExport,
    exportCsv,
  };
}
