import { getByProjectForRange } from "../api/stats";
import type { ReportCore, WeeklyReport } from "../types";
import { formatIsoDateLong } from "../utils/dateRange";
import {
  ACTIVE_TIME_MEASUREMENT_HINT,
  REPORT_DWELL_OPTS,
} from "./reportConfig";
import type { ReportPdfTableSection } from "./reportPdfTypes";
import type {
  PeriodReportMode,
  ReportActivitiesExportArgs,
  ReportBodyLabels,
} from "./reportTypes";

export type BuildReportPdfTablesInput = {
  report: ReportCore;
  reportMode: PeriodReportMode;
  labels: ReportBodyLabels;
  exportArgs: ReportActivitiesExportArgs;
  hasActivityTypeData: boolean;
};

export type BuildReportPdfTablesResult = {
  tables: ReportPdfTableSection[];
  activeProjectNames: string[];
};

/** Erstellt die Tabellensektionen für den PDF Berichtsexport. */
export async function buildReportPdfTables(
  input: BuildReportPdfTablesInput,
): Promise<BuildReportPdfTablesResult> {
  const { report, reportMode, labels, exportArgs, hasActivityTypeData } = input;
  let activeProjectNames: string[] = [];

  const tables: ReportPdfTableSection[] = [
    {
      title: labels.pieTitle,
      hint: labels.pieHint,
      items: [...report.by_category],
      totalSeconds: report.total_active_seconds,
      colorOrder: report.by_category.map((item) => item.name),
    },
  ];

  if (hasActivityTypeData) {
    tables.push({
      title: labels.activityTypePieTitle,
      hint: labels.activityTypePieHint,
      items: [...report.by_activity_type],
      totalSeconds: report.total_active_seconds,
      colorOrder: report.by_activity_type.map((item) => item.name),
    });
  }

  if (reportMode === "weekly") {
    const weekly = report as WeeklyReport;
    if (weekly.by_day.length > 0) {
      tables.push({
        title: "Aktivität pro Tag",
        hint: `Aktive Zeit je Kalendertag für dieses Projekt. ${ACTIVE_TIME_MEASUREMENT_HINT}`,
        items: [...weekly.by_day],
        totalSeconds: report.total_active_seconds,
        formatName: (iso) => formatIsoDateLong(iso),
        sortByValue: false,
      });
    }
  }

  try {
    const byProject = await getByProjectForRange({
      fromTs: exportArgs.fromTs,
      toTs: exportArgs.toTs,
      projectIds: exportArgs.projectIds,
      ...REPORT_DWELL_OPTS,
    });
    if (byProject.length > 0) {
      activeProjectNames = byProject
        .filter((item) => item.value > 0)
        .map((item) => item.name);
      const projectTotal = byProject.reduce((sum, item) => sum + item.value, 0);
      tables.push({
        title:
          reportMode === "daily"
            ? "Zeit pro Projekt (gesamter Tag)"
            : "Zeit pro Projekt (gesamte Woche)",
        hint:
          reportMode === "daily"
            ? "Alle Projekte an diesem Tag."
            : "Alle Projekte in dieser Woche.",
        items: byProject,
        totalSeconds: projectTotal,
      });
    }
  } catch (error) {
    console.warn("PDF: Projektdaten für Export nicht geladen", error);
  }

  return { tables, activeProjectNames };
}
