import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ReportCore, WeeklyReport } from "../types";
import {
  buildChartLegendEntries,
  mergeCategoryOrder,
} from "../utils/chartLegend";
import ActivityPieChart from "../components/charts/PieChart";
import type { PieSegment } from "../components/charts/PieChart";
import TimeSeriesChart from "../components/charts/TimeSeriesChart";
import ChartLegend from "../components/charts/ChartLegend";
import { ACTIVE_TIME_MEASUREMENT_HINT_LONG } from "./reportConfig";
import type {
  PeriodReportMode,
  ReportActivitiesExportArgs,
  ReportBodyLabels,
  ReportExportApi,
  ReportKpi,
} from "./reportTypes";
import { useReportExport } from "./useReportExport";
import { WeeklyDayTable } from "./WeeklyDayTable";

export type {
  ReportBodyLabels,
  ReportExportApi,
  ReportKpi,
} from "./reportTypes";

type Props = {
  report: ReportCore;
  isRefreshing: boolean;
  narrativeSummary: string | null;
  timelineBucketSeconds: number;
  kpis: ReportKpi[];
  labels: ReportBodyLabels;
  extraSections?: ReactNode;
  reportMode: PeriodReportMode;
  periodLabel: string;
  projectName: string;
  pdfProjectName: string;
  exportArgs: ReportActivitiesExportArgs;
  onExportApiChange?: (api: ReportExportApi | null) => void;
};

/** Rendert KPIs, Charts und Export Anbindung für Periodenberichte. */
function ReportBodyInner({
  report,
  isRefreshing,
  narrativeSummary,
  timelineBucketSeconds,
  kpis,
  labels,
  extraSections,
  reportMode,
  periodLabel,
  projectName,
  pdfProjectName,
  exportArgs,
  onExportApiChange,
}: Props) {
  const [focusedTimelineCategory, setFocusedTimelineCategory] = useState<
    string | null
  >(null);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setFocusedTimelineCategory(null);
  }, [report.total_active_seconds, exportArgs.fromTs, exportArgs.toTs]);

  const activityTypeChartRef = useRef<HTMLDivElement>(null);
  const pieChartRef = useRef<HTMLDivElement>(null);

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

  const { activeExport, exportJson, exportCsv, exportPdf } = useReportExport({
    exportArgs,
    labels,
    report,
    reportMode,
    kpis,
    narrativeSummary,
    periodLabel,
    projectName: pdfProjectName,
    activityTypeChartRef,
    pieChartRef,
    hasActivityTypeData: activityTypePieSegments.length > 0,
    hasCategoryData: pieSegments.length > 0,
  });

  useEffect(() => {
    if (!onExportApiChange) return;
    onExportApiChange({
      exportJson: () => void exportJson(),
      exportCsv: () => void exportCsv(),
      exportPdf: () => void exportPdf(),
      busy: activeExport !== null || isRefreshing,
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
    isRefreshing,
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

        <p className="periodReportEstimationHint">
          {ACTIVE_TIME_MEASUREMENT_HINT_LONG}
        </p>
      </header>

      {extraSections}

      {reportMode === "weekly" ? (
        <WeeklyDayTable
          items={(report as WeeklyReport).by_day}
          totalSeconds={report.total_active_seconds}
        />
      ) : null}

      {!chartsReady ? (
        <p className="periodReportMuted">Lade Diagramme…</p>
      ) : (
        <>
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
                <div ref={pieChartRef} className="periodReportPdfCapture">
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
                trimLeadingEmptyBuckets={false}
                emptyHint={labels.timelineEmpty}
                focusedCategory={focusedTimelineCategory}
              />
            </div>
            <ChartLegend
              entries={timelineLegendEntries}
              viewLabel={labels.timelineLegend}
              variant="compact"
              selectedEntry={focusedTimelineCategory}
              onEntrySelect={setFocusedTimelineCategory}
            />
          </div>
        </>
      )}
    </div>
  );
}

/** Memoisierte Berichtsansicht für Tages und Wochenberichte. */
export const ReportBody = memo(ReportBodyInner);
