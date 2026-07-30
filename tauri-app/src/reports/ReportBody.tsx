import {
  exportActivitiesCsvToPaths,
  exportActivitiesJsonToPath,
  exportReportPdfToPath,
} from "../api/export";
import { getByProjectForRange } from "../api/stats";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ReportCore, WeeklyReport } from "../types";
import {
  formatIsoDateLong,
} from "../utils/dateRange";
import {
  buildChartLegendEntries,
  mergeCategoryOrder,
} from "../utils/chartLegend";
import ActivityPieChart from "../components/charts/PieChart";
import type { PieSegment } from "../components/charts/PieChart";
import TimeSeriesChart from "../components/charts/TimeSeriesChart";
import ChartLegend from "../components/charts/ChartLegend";
import { useToast } from "../components/toast/ToastContext";
import { formatExportSuccessDetail } from "../utils/exportPath";
import { fileNameFromPath } from "../utils/fileNameFromPath";
import {
  aggregatedCsvPathBeside,
  defaultExportFileName,
  pickExportSavePath,
} from "../utils/exportSaveDialog";
import { REPORT_DWELL_OPTS, REPORT_ESTIMATION_HINT } from "./reportConfig";
import {
  buildReportPdf,
  type ReportPdfTableSection,
} from "./exportReportPdf";
import type { PeriodReportMode } from "./periodReportKinds";

export type ReportKpi = {
  value: string;
  label: string;
};

export type ReportBodyLabels = {
  pieTitle: string;
  pieHint: string;
  pieLegend: string;
  pieEmpty: string;
  activityTypePieTitle: string;
  activityTypePieHint: string;
  activityTypePieLegend: string;
  activityTypePieEmpty: string;
  timelineTitle: string;
  timelineHint: string;
  timelineLegend: string;
  timelineEmpty: string;
  exportJson: string;
  exportCsv: string;
  exportPdf: string;
};

export type ReportExportApi = {
  exportJson: () => void;
  exportCsv: () => void;
  exportPdf: () => void;
  busy: boolean;
  labels: Pick<ReportBodyLabels, "exportJson" | "exportCsv" | "exportPdf">;
};

type Props = {
  report: ReportCore;
  isRefreshing: boolean;
  narrativeSummary: string | null;
  timelineBucketSeconds: number;
  trimLeadingEmptyBuckets?: boolean;
  kpis: ReportKpi[];
  labels: ReportBodyLabels;
  extraSections?: ReactNode;
  reportMode: PeriodReportMode;
  periodLabel: string;
  projectName: string;
  exportArgs: {
    projectId: number;
    fromTs: number;
    toTs: number;
    contextQuery: null;
  };
  onExportApiChange?: (api: ReportExportApi | null) => void;
};

function ReportBodyInner({
  report,
  isRefreshing,
  narrativeSummary,
  timelineBucketSeconds,
  trimLeadingEmptyBuckets = false,
  kpis,
  labels,
  extraSections,
  reportMode,
  periodLabel,
  projectName,
  exportArgs,
  onExportApiChange,
}: Props) {
  const toast = useToast();
  const [activeExport, setActiveExport] = useState<
    "json" | "csv" | "pdf" | null
  >(null);
  // Deferred Rendering: Charts erst nach dem ersten Frame rendern,
  // damit die UI sofort erscheint und nicht blockiert.
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    // requestAnimationFrame sorgt dafür, dass der erste Frame gezeichnet wird,
    // bevor die schweren Charts gerendert werden.
    const id = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const activityTypeChartRef = useRef<HTMLDivElement>(null);
  const pieChartRef = useRef<HTMLDivElement>(null);
  const timelinePlotRef = useRef<HTMLDivElement>(null);

  const pieSegments: PieSegment[] = useMemo(
    () =>
      report.by_category.map((s) => ({
        name: s.name,
        value: s.value,
      })),
    [report.by_category],
  );

  const activityTypePieSegments: PieSegment[] = useMemo(
    () =>
      report.by_activity_type.map((s) => ({
        name: s.name,
        value: s.value,
      })),
    [report.by_activity_type],
  );

  const activityTypeOrder = useMemo(
    () => activityTypePieSegments.map((s) => s.name),
    [activityTypePieSegments],
  );

  const activityTypeLegendEntries = useMemo(
    () =>
      buildChartLegendEntries(
        activityTypeOrder,
        "pie",
        activityTypePieSegments,
        [],
      ),
    [activityTypeOrder, activityTypePieSegments],
  );

  const timeline = report.timeline;

  const categoryOrder = useMemo(
    () =>
      mergeCategoryOrder(
        pieSegments.map((s) => s.name),
        pieSegments,
        timeline,
      ),
    [pieSegments, timeline],
  );

  const pieLegendEntries = useMemo(
    () => buildChartLegendEntries(categoryOrder, "pie", pieSegments, timeline),
    [categoryOrder, pieSegments, timeline],
  );

  const timelineLegendEntries = useMemo(
    () =>
      buildChartLegendEntries(
        categoryOrder,
        "timeseries",
        pieSegments,
        timeline,
      ),
    [categoryOrder, pieSegments, timeline],
  );

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

      const pieSections = [
        ...(activityTypePieSegments.length > 0
          ? [
              {
                title: labels.activityTypePieTitle,
                captureEl: activityTypeChartRef.current,
              },
            ]
          : []),
        ...(pieSegments.length > 0
          ? [
              {
                title: labels.pieTitle,
                captureEl: pieChartRef.current,
              },
            ]
          : []),
      ];

      const tables: ReportPdfTableSection[] = [
        {
          title: labels.pieTitle,
          hint: labels.pieHint,
          items: [...report.by_category],
          totalSeconds: report.total_active_seconds,
        },
      ];

      if (activityTypePieSegments.length > 0) {
        tables.push({
          title: labels.activityTypePieTitle,
          hint: labels.activityTypePieHint,
          items: [...report.by_activity_type],
          totalSeconds: report.total_active_seconds,
        });
      }

      if (reportMode === "weekly") {
        const weekly = report as WeeklyReport;
        if (weekly.by_day.length > 0) {
          tables.push({
            title: "Aktivität pro Tag",
            hint: "Geschätzte aktive Zeit je Kalendertag für dieses Projekt.",
            items: [...weekly.by_day],
            totalSeconds: report.total_active_seconds,
            formatName: (iso) => formatIsoDateLong(iso),
          });
        }
      }

      try {
        const byProject = await getByProjectForRange({
          fromTs: exportArgs.fromTs,
          toTs: exportArgs.toTs,
          ...REPORT_DWELL_OPTS,
        });
        if (byProject.length > 0) {
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

      const pdfBytes = await buildReportPdf({
        reportType: reportMode,
        projectName,
        periodLabel,
        narrative: narrativeSummary,
        kpis,
        estimationHint: REPORT_ESTIMATION_HINT,
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
    activityTypePieSegments.length,
    exportArgs.fromTs,
    exportArgs.toTs,
    kpis,
    labels.activityTypePieHint,
    labels.activityTypePieTitle,
    labels.pieHint,
    labels.pieTitle,
    narrativeSummary,
    periodLabel,
    pieSegments.length,
    projectName,
    report.by_activity_type,
    report.by_category,
    report.total_active_seconds,
    reportMode,
    toast,
  ]);

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
      const samplesPath = await pickExportSavePath({
        title: "CSV Zeiteinträge speichern",
        defaultFileName: defaultExportFileName("frametrack-samples", "csv"),
        extension: "csv",
        filterName: "CSV",
      });
      if (!samplesPath) return;

      setActiveExport("csv");
      const aggregatedPath = aggregatedCsvPathBeside(samplesPath);
      const result = await exportActivitiesCsvToPaths({
        ...exportArgs,
        samplesPath,
        aggregatedPath,
      });
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

  useEffect(() => {
    if (!onExportApiChange) return;
    onExportApiChange({
      exportJson: () => void exportJson(),
      exportCsv: () => void exportCsv(),
      exportPdf: () => void exportPdf(),
      busy: activeExport !== null,
      labels: {
        exportJson: labels.exportJson,
        exportCsv: labels.exportCsv,
        exportPdf: labels.exportPdf,
      },
    });
  }, [
    activeExport,
    exportCsv,
    exportJson,
    exportPdf,
    labels.exportCsv,
    labels.exportJson,
    labels.exportPdf,
    onExportApiChange,
  ]);

  useEffect(() => {
    return () => onExportApiChange?.(null);
  }, [onExportApiChange]);

  return (
    <div
      className={[
        "periodReportContent",
        isRefreshing ? "periodReportContentRefreshing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="periodReportSummary">
        <div className="periodReportSummaryHead">
          <h3 className="periodReportSummaryTitle">{periodLabel}</h3>
          <span className="periodReportProjectTag">{projectName}</span>
        </div>

        {narrativeSummary && (
          <p className="periodReportNarrative">{narrativeSummary}</p>
        )}

        <div className="periodReportKpis">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="periodReportKpi">
              <span className="periodReportKpiValue">{kpi.value}</span>
              <span className="periodReportKpiLabel">{kpi.label}</span>
            </div>
          ))}
        </div>

        <p className="periodReportEstimationHint">{REPORT_ESTIMATION_HINT}</p>
      </header>

      {extraSections}

      {/* Charts werden erst nach dem ersten Frame gerendert (deferred) */}
      {!chartsReady ? (
        <p className="periodReportMuted">Lade Diagramme…</p>
      ) : (
        <>
          {/* Beide Pie-Charts nebeneinander (weniger Whitespace) */}
          <div className="periodReportPieRow">
            {activityTypePieSegments.length > 0 && (
              <div className="periodReportChartBlock periodReportPieBlock">
                <h4 className="periodReportChartTitle">
                  {labels.activityTypePieTitle}
                </h4>
                <p className="periodReportChartHint">
                  {labels.activityTypePieHint}
                </p>
                <div className="periodReportChartPane periodReportChartPanePie">
                  <div
                    ref={activityTypeChartRef}
                    className="periodReportPdfCapture"
                  >
                    <ActivityPieChart
                      data={activityTypePieSegments}
                      categoryOrder={activityTypeOrder}
                      emptyHint={labels.activityTypePieEmpty}
                    />
                  </div>
                </div>
                <ChartLegend
                  entries={activityTypeLegendEntries}
                  viewLabel={labels.activityTypePieLegend}
                  variant="compact"
                />
              </div>
            )}

            <div className="periodReportChartBlock periodReportPieBlock">
              <h4 className="periodReportChartTitle">{labels.pieTitle}</h4>
              <p className="periodReportChartHint">{labels.pieHint}</p>
              <div className="periodReportChartPane periodReportChartPanePie">
                <div
                  ref={pieChartRef}
                  className="periodReportPdfCapture"
                >
                  <ActivityPieChart
                    data={pieSegments}
                    categoryOrder={categoryOrder}
                    emptyHint={labels.pieEmpty}
                  />
                </div>
              </div>
              <ChartLegend
                entries={pieLegendEntries}
                viewLabel={labels.pieLegend}
                variant="compact"
              />
            </div>
          </div>

          <div className="periodReportChartBlock">
            <h4 className="periodReportChartTitle">{labels.timelineTitle}</h4>
            <p className="periodReportChartHint">{labels.timelineHint}</p>
            <div className="periodReportChartPane periodReportChartPaneTimeline">
              <TimeSeriesChart
                data={timeline}
                categoryOrder={categoryOrder}
                bucketSeconds={timelineBucketSeconds}
                trimLeadingEmptyBuckets={trimLeadingEmptyBuckets}
                plotCaptureRef={timelinePlotRef}
                emptyHint={labels.timelineEmpty}
              />
            </div>
            <ChartLegend
              entries={timelineLegendEntries}
              viewLabel={labels.timelineLegend}
              variant="compact"
            />
          </div>
        </>
      )}

    </div>
  );
}

// Memoized Export: Verhindert unnötige Re-Renders bei gleichen Props
export const ReportBody = memo(ReportBodyInner);
