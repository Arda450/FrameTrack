import {
  exportActivitiesJsonToPath,
  exportReportPdfToPath,
} from "../api/export";
import { useCallback, useState, type RefObject } from "react";
import type { ReportCore } from "../types";
import { useToast } from "../components/toast/ToastContext";
import {
  formatExportSuccessDetail,
  fileNameFromPath,
} from "../utils/exportPath";
import {
  pickActivitiesCsvExportPaths,
  writeActivitiesCsvExport,
} from "../utils/exportActivitiesCsv";
import {
  defaultExportFileName,
  pickExportSavePath,
} from "../utils/exportSaveDialog";
import { ACTIVE_TIME_MEASUREMENT_HINT } from "./reportConfig";
import { buildReportPdfTables } from "./buildReportPdfTables";
import type { ReportPdfChartSection } from "./reportPdfTypes";
import { buildReportPdf } from "./exportReportPdf";
import type {
  PeriodReportMode,
  ReportActivitiesExportArgs,
  ReportBodyLabels,
  ReportKpi,
} from "./reportTypes";

export type UseReportExportOptions = {
  exportArgs: ReportActivitiesExportArgs;
  labels: ReportBodyLabels;
  report: ReportCore;
  reportMode: PeriodReportMode;
  kpis: ReportKpi[];
  narrativeSummary: string | null;
  periodLabel: string;
  projectName: string;
  activityTypeChartRef: RefObject<HTMLDivElement | null>;
  pieChartRef: RefObject<HTMLDivElement | null>;
  hasActivityTypeData: boolean;
  hasCategoryData: boolean;
};

/** Sammelt die Pie Chart DOM Knoten für den PDF Export. */
function buildReportPdfPieSections(
  labels: Pick<ReportBodyLabels, "pieTitle" | "activityTypePieTitle">,
  activityTypeChartRef: RefObject<HTMLDivElement | null>,
  pieChartRef: RefObject<HTMLDivElement | null>,
  hasActivityTypeData: boolean,
  hasCategoryData: boolean,
): ReportPdfChartSection[] {
  const sections: ReportPdfChartSection[] = [];

  if (hasCategoryData) {
    sections.push({
      title: labels.pieTitle,
      captureEl: pieChartRef.current,
    });
  }

  if (hasActivityTypeData) {
    sections.push({
      title: labels.activityTypePieTitle,
      captureEl: activityTypeChartRef.current,
    });
  }

  return sections;
}

/** Stellt JSON, CSV und PDF Export für Periodenberichte bereit. */
export function useReportExport({
  exportArgs,
  labels,
  report,
  reportMode,
  kpis,
  narrativeSummary,
  periodLabel,
  projectName,
  activityTypeChartRef,
  pieChartRef,
  hasActivityTypeData,
  hasCategoryData,
}: UseReportExportOptions) {
  const toast = useToast();
  const [activeExport, setActiveExport] = useState<
    "json" | "csv" | "pdf" | null
  >(null);

  const exportJson = useCallback(async () => {
    try {
      const targetPath = await pickExportSavePath({
        title: "JSON speichern",
        defaultFileName: defaultExportFileName("frametrack-export", "json"),
        extension: "json",
        filterName: "JSON",
      });
      if (!targetPath) return;

      setActiveExport("json");
      const path = await exportActivitiesJsonToPath({
        ...exportArgs,
        targetPath,
      });
      toast.success("JSON exportiert", {
        detail: formatExportSuccessDetail(path),
      });
    } catch (e) {
      console.error("report export json failed", e);
      toast.error("JSON-Export fehlgeschlagen.");
    } finally {
      setActiveExport(null);
    }
  }, [exportArgs, toast]);

  const exportCsv = useCallback(async () => {
    try {
      const paths = await pickActivitiesCsvExportPaths();
      if (!paths) return;

      setActiveExport("csv");
      const result = await writeActivitiesCsvExport(exportArgs, paths);
      toast.success("CSV exportiert", {
        detail: formatExportSuccessDetail(result.samples_path, [
          fileNameFromPath(result.aggregated_path),
        ]),
      });
    } catch (e) {
      console.error("report export csv failed", e);
      toast.error("CSV-Export fehlgeschlagen.");
    } finally {
      setActiveExport(null);
    }
  }, [exportArgs, toast]);

  const exportPdf = useCallback(async () => {
    try {
      const targetPath = await pickExportSavePath({
        title: "PDF speichern",
        defaultFileName: defaultExportFileName("frametrack-bericht", "pdf"),
        extension: "pdf",
        filterName: "PDF",
      });
      if (!targetPath) return;

      setActiveExport("pdf");

      const pieSections = buildReportPdfPieSections(
        labels,
        activityTypeChartRef,
        pieChartRef,
        hasActivityTypeData,
        hasCategoryData,
      );

      const { tables, activeProjectNames } = await buildReportPdfTables({
        report,
        reportMode,
        labels,
        exportArgs,
        hasActivityTypeData,
      });
      const activeProjectScope =
        activeProjectNames.length > 0
          ? activeProjectNames.join(", ")
          : projectName;

      const pdfBytes = await buildReportPdf({
        reportType: reportMode,
        projectName: activeProjectScope,
        periodLabel,
        narrative: narrativeSummary,
        kpis,
        estimationHint: ACTIVE_TIME_MEASUREMENT_HINT,
        pieSections,
        tables,
      });

      const path = await exportReportPdfToPath({
        pdfBytes: Array.from(pdfBytes),
        targetPath,
      });
      toast.success("PDF exportiert", {
        detail: formatExportSuccessDetail(path),
      });
    } catch (e) {
      console.error("report export pdf failed", e);
      toast.error("PDF-Export fehlgeschlagen.");
    } finally {
      setActiveExport(null);
    }
  }, [
    activityTypeChartRef,
    pieChartRef,
    exportArgs,
    hasActivityTypeData,
    hasCategoryData,
    kpis,
    labels,
    narrativeSummary,
    periodLabel,
    projectName,
    report,
    reportMode,
    toast,
  ]);

  return {
    activeExport,
    exportJson,
    exportCsv,
    exportPdf,
  };
}
