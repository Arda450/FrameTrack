import { useState } from "react";
import type { TableExportFilter } from "../types";
import { useToast } from "../components/toast/ToastContext";
import { apiErrorMessage } from "../utils/apiError";
import {
  formatExportSuccessDetail,
  fileNameFromPath,
} from "../utils/exportPath";
import {
  pickActivitiesCsvExportPaths,
  writeActivitiesCsvExport,
} from "../utils/exportActivitiesCsv";

/** Stellt CSV Export für die Aktivitätstabelle bereit. */
export function useActivityExport(filter: TableExportFilter) {
  const toast = useToast();
  const [activeExport, setActiveExport] = useState<"csv-download" | null>(null);

  /** Startet den CSV Export mit aktuellem Tabellenfilter. */
  async function exportCsv() {
    try {
      const paths = await pickActivitiesCsvExportPaths();
      if (!paths) return;

      setActiveExport("csv-download");
      const result = await writeActivitiesCsvExport(filter, paths);
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
