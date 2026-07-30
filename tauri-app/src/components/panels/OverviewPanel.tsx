import { Project, TableExportFilter } from "../../types";
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import ActivityPieChart from "../charts/PieChart";
import TimeSeriesChart from "../charts/TimeSeriesChart";
import ChartLegend from "../charts/ChartLegend";
import { ActivitiesTable } from "../shared/ActivitiesTable";
import {
  DailyReportView,
  WeeklyReportView,
} from "../../reports/PeriodReportView";
import type { ReportExportApi } from "../../reports/ReportBody";
import { buildChartLegendEntries } from "../../utils/chartLegend";
import { formatBucketLabel } from "../../utils/timeSeriesBuckets";
import { FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { AppIcon } from "../shared/AppIcon";
import { ExportMenu } from "../shared/ExportMenu";
import {
  PROJECT_CHART_BUCKET_SECONDS,
  PROJECT_CHART_VISIBLE_HOURS,
  useProjectCharts,
} from "../../hooks/useProjectCharts";
import { useActivityExport } from "../../hooks/useActivityExport";
import { useProjectStats } from "../../hooks/useProjectStats";
import { ProjectInfoPanel } from "./ProjectInfoPanel";

type OverviewPanelProps = {
  isTracking: boolean;
  statusError?: string | null;
  activeProject: Project | null;
  tableRevision: number;
  dwellRevision: number;
};

type ChartView = "charts" | "daily" | "weekly";
type ChartMode = "pie" | "timeseries";

function OverviewPanel({
  isTracking,
  statusError,
  activeProject,
  tableRevision,
  dwellRevision,
}: OverviewPanelProps) {
  const [chartView, setChartView] = useState<ChartView>("charts");
  const [chartMode, setChartMode] = useState<ChartMode>("pie");
  const [exportFilter, setExportFilter] = useState<TableExportFilter>({
    projectId: null,
    fromTs: null,
    toTs: null,
    contextQuery: null,
  });
  const [reportExport, setReportExport] = useState<ReportExportApi | null>(
    null,
  );
  const handleExportFilterChange = useCallback((filter: TableExportFilter) => {
    setExportFilter(filter);
  }, []);
  const handleReportExportApiChange = useCallback(
    (api: ReportExportApi | null) => {
      setReportExport(api);
    },
    [],
  );
  const projectId = activeProject?.id ?? null;
  const charts = useProjectCharts(
    projectId,
    dwellRevision,
    chartView === "charts",
  );
  const projectStats = useProjectStats(projectId, dwellRevision);
  const activityExport = useActivityExport(exportFilter);
  const showReportExport = chartView === "daily" || chartView === "weekly";

  useEffect(() => {
    if (!showReportExport) setReportExport(null);
  }, [showReportExport]);

  const legendEntries = useMemo(() => {
    return buildChartLegendEntries(
      charts.categoryOrder,
      chartMode,
      charts.segments,
      charts.timeline,
    );
  }, [charts.categoryOrder, chartMode, charts.segments, charts.timeline]);

  const legendHint =
    chartMode === "pie"
      ? `Anteil an der Gesamtzeit (letzte ${PROJECT_CHART_VISIBLE_HOURS} Stunden)`
      : "Summe im sichtbaren Zeitraum";

  const chartEmptyHint =
    chartMode === "pie"
      ? `In den letzten ${PROJECT_CHART_VISIBLE_HOURS} Stunden wurden für dieses Projekt noch keine Zeiten erfasst.`
      : `Für dieses Projekt liegen in den letzten ${PROJECT_CHART_VISIBLE_HOURS} Stunden keine Verlaufsdaten vor.`;

  const tableProjectId = activeProject?.id ?? null;

  const noProjectHint =
    "Wähle links ein Projekt oder lege «Neues Projekt» an. Tracking startet beim Klick auf ein Projekt.";

  return (
    <section className="overviewPanel">
      {statusError ? (
        <header className="overviewHeader">
          <p className="overviewLoadError">{statusError}</p>
        </header>
      ) : null}

      <div className="overviewColumns">
        <div
          className={[
            "overviewColumn",
            "overviewColumnCharts",
            chartView === "charts" ? "overviewColumnChartsSeparated" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="overviewChartsHeading">
            <h3>Auswertung des aktiven Projekts</h3>
            {showReportExport && (
              <ExportMenu
                disabled={!activeProject || reportExport == null}
                busy={reportExport?.busy ?? false}
                items={[
                  {
                    id: "json",
                    label:
                      reportExport?.labels.exportJson ?? "Als JSON exportieren",
                    icon: <AppIcon icon={FileJson} size={16} />,
                    onSelect: () => reportExport?.exportJson(),
                  },
                  {
                    id: "csv",
                    label:
                      reportExport?.labels.exportCsv ?? "Als CSV exportieren",
                    icon: <AppIcon icon={FileSpreadsheet} size={16} />,
                    onSelect: () => reportExport?.exportCsv(),
                  },
                  {
                    id: "pdf",
                    label:
                      reportExport?.labels.exportPdf ?? "Als PDF exportieren",
                    icon: <AppIcon icon={FileText} size={16} />,
                    onSelect: () => reportExport?.exportPdf(),
                  },
                ]}
              />
            )}
          </div>

          <div
            className="chartViewSwitch"
            role="tablist"
            aria-label="Diagrammtyp"
          >
            <ChartViewButton
              active={chartView === "charts"}
              onClick={() => setChartView("charts")}
            >
              Zeitstatistik
            </ChartViewButton>
            <ChartViewButton
              active={chartView === "daily"}
              onClick={() => setChartView("daily")}
            >
              Tagesbericht
            </ChartViewButton>
            <ChartViewButton
              active={chartView === "weekly"}
              onClick={() => setChartView("weekly")}
            >
              Wochenbericht
            </ChartViewButton>
          </div>

          {!activeProject ? (
            <p className="overviewNoProjectHint">{noProjectHint}</p>
          ) : chartView === "daily" ? (
            <DailyReportView
              projectId={activeProject.id}
              projectName={activeProject.name}
              dwellRevision={dwellRevision}
              onExportApiChange={handleReportExportApiChange}
            />
          ) : chartView === "weekly" ? (
            <WeeklyReportView
              projectId={activeProject.id}
              projectName={activeProject.name}
              dwellRevision={dwellRevision}
              onExportApiChange={handleReportExportApiChange}
            />
          ) : charts.error ? (
            <p className="overviewLoadError">{charts.error}</p>
          ) : !charts.loaded ? (
            <ChartSkeleton />
          ) : (
            <>
              <div
                className="chartModeSwitch"
                role="group"
                aria-label="Darstellung der Zeitstatistik"
              >
                <button
                  type="button"
                  className={chartMode === "pie" ? "active" : ""}
                  aria-pressed={chartMode === "pie"}
                  onClick={() => setChartMode("pie")}
                >
                  Zeitverteilung
                </button>
                <button
                  type="button"
                  className={chartMode === "timeseries" ? "active" : ""}
                  aria-pressed={chartMode === "timeseries"}
                  onClick={() => setChartMode("timeseries")}
                >
                  Zeitverlauf
                </button>
              </div>

              <p className="overviewChartHint">
                {chartMode === "pie"
                  ? `Geschätzte Verweildauer je Anwendung im aktiven Projekt (letzte ${PROJECT_CHART_VISIBLE_HOURS} Stunden).`
                  : `Aktive Anwendungszeit pro ${formatBucketLabel(PROJECT_CHART_BUCKET_SECONDS)}-Fenster in den letzten ${PROJECT_CHART_VISIBLE_HOURS} Stunden.`}
              </p>

              <div className="chartSectionLayout">
                <ProjectInfoPanel
                  stats={projectStats.stats}
                  isTracking={isTracking}
                  loading={!projectStats.loaded}
                  error={projectStats.error || null}
                />

                <div className="chartWithSharedLegend">
                  <div
                    className={`chartPane${charts.refreshing ? " chartPaneRefreshing" : ""}`}
                  >
                    {chartMode === "pie" ? (
                      <ActivityPieChart
                        data={charts.segments}
                        categoryOrder={charts.categoryOrder}
                        emptyHint={chartEmptyHint}
                      />
                    ) : (
                      <TimeSeriesChart
                        data={charts.timeline}
                        categoryOrder={charts.categoryOrder}
                        bucketSeconds={PROJECT_CHART_BUCKET_SECONDS}
                        emptyHint={chartEmptyHint}
                      />
                    )}
                  </div>

                  <ChartLegend
                    entries={legendEntries}
                    viewLabel={legendHint}
                    variant="compact"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {chartView === "charts" && activeProject && (
          <div className="overviewColumn overviewColumnTable">
            <div className="overviewTableHeading">
              <h3>Erfasste Fenster</h3>
              <ExportMenu
                label="Export"
                directAction
                busy={activityExport.activeExport === "csv-download"}
                disabled={activityExport.activeExport !== null}
                items={[
                  {
                    id: "csv",
                    label: "CSV exportieren",
                    onSelect: () => void activityExport.exportCsv(),
                  },
                ]}
              />
            </div>

            <ActivitiesTable
              projectId={tableProjectId}
              projectName={activeProject.name}
              refreshKey={tableRevision}
              onExportFilterChange={handleExportFilterChange}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ChartSkeleton() {
  return (
    <div className="chartSkeleton" role="status" aria-label="Statistiken laden">
      <span className="chartSkeletonToggle" />
      <span className="chartSkeletonPlot" />
      <span className="chartSkeletonLegend" />
    </div>
  );
}

type ChartViewButtonProps = {
  active: boolean;

  onClick: () => void;

  children: ReactNode;
};

function ChartViewButton({ active, onClick, children }: ChartViewButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`chartViewBtn${active ? " chartViewBtnActive" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default OverviewPanel;
