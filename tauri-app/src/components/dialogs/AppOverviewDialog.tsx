import { getOverviewStats } from "../../api/stats";
import { getProjects } from "../../api/projects";
import { useEffect, useMemo, useState } from "react";
import type { OverviewStats } from "../../types";
import { buildProjectColorMap } from "../../utils/chartColors";
import {
  buildChartLegendEntries,
  mergeCategoryOrder,
} from "../../utils/chartLegend";
import { formatDurationSeconds } from "../../utils/formatDuration";
import { formatBucketLabel } from "../../utils/timeSeriesBuckets";
import { apiErrorMessage } from "../../utils/apiError";
import ProjectBarChart from "../charts/ProjectBarChart";
import ChartLegend from "../charts/ChartLegend";
import TimeSeriesChart from "../charts/TimeSeriesChart";
import { StatCardGrid } from "../shared/StatCardGrid";
import { InfoHint } from "../shared/InfoHint";
import {
  ACTIVE_TIME_MEASUREMENT_HINT,
  ACTIVE_TIME_MEASUREMENT_HINT_LONG,
} from "../../reports/reportConfig";
import { PanelDialog } from "./PanelDialog";

type AppOverviewDialogProps = {
  open: boolean;
  dwellRevision: number;
  onOpenChange: (open: boolean) => void;
};

type ChartMode = "bar" | "timeseries";
const BUCKET_SECONDS = 15 * 60;

export function AppOverviewDialog({
  open,
  dwellRevision,
  onOpenChange,
}: AppOverviewDialogProps) {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [projectColorByName, setProjectColorByName] = useState(
    () => new Map<string, string>(),
  );
  const [chartMode, setChartMode] = useState<ChartMode>("bar");
  const [focusedTimelineCategory, setFocusedTimelineCategory] = useState<
    string | null
  >(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError("");

    Promise.all([getOverviewStats(), getProjects()])
      .then(([overview, projects]) => {
        if (!cancelled) {
          setStats(overview);
          setProjectColorByName(buildProjectColorMap(projects));
        }
      })
      .catch((reason) => {
        console.error("overview stats load failed", reason);
        if (!cancelled) {
          setError(
            apiErrorMessage(
              reason,
              "Die App-Statistiken konnten nicht geladen werden.",
            ),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, dwellRevision]);

  useEffect(() => {
    setFocusedTimelineCategory(null);
  }, [chartMode, stats?.timeline]);

  const categoryOrder = useMemo(
    () =>
      stats
        ? mergeCategoryOrder(
            stats.by_project.map((project) => project.name),
            stats.by_project,
            stats.timeline,
          )
        : [],
    [stats],
  );
  const legendEntries = useMemo(
    () =>
      stats && chartMode === "timeseries"
        ? buildChartLegendEntries(
            categoryOrder,
            "timeseries",
            stats.by_project,
            stats.timeline,
          )
        : [],
    [categoryOrder, chartMode, stats],
  );
  const mostActiveProject = stats?.by_project.find(
    (project) => project.name !== "Sonstige",
  );

  return (
    <PanelDialog open={open} title="App-Übersicht" onOpenChange={onOpenChange}>
      <section className="appOverview">
        <div>
          <h2>App-Statistik aller Projekte</h2>
          <p className="appOverviewSubtitle">
            {ACTIVE_TIME_MEASUREMENT_HINT_LONG}
          </p>
        </div>

        {error ? (
          <p className="overviewLoadError">{error}</p>
        ) : !stats ? (
          <OverviewSkeleton />
        ) : (
          <>
            <StatCardGrid
              ariaLabel="App-Statistiken"
              items={[
                {
                  label: "Insgesamt gearbeitet",
                  value: formatDurationSeconds(stats.total_active_seconds),
                },
                {
                  label: "Heute gearbeitet",
                  value: formatDurationSeconds(stats.today_active_seconds),
                },
                {
                  label: "Projekte",
                  value: stats.project_count.toLocaleString("de-CH"),
                },
                {
                  label: "Aktive Tage",
                  value: stats.active_days.toLocaleString("de-CH"),
                },
              ]}
            />

            {stats.activity_count > 0 && (
              <div className="overviewInsights">
                <span>
                  Aktivstes Projekt:{" "}
                  <strong>{mostActiveProject?.name ?? "-"}</strong>
                </span>
                <span>
                  Erfasst seit:{" "}
                  <strong>
                    {stats.first_activity_ts
                      ? new Date(
                          stats.first_activity_ts * 1000,
                        ).toLocaleDateString("de-CH")
                      : "-"}
                  </strong>
                </span>
                <span>
                  Gespeicherte Einträge:{" "}
                  <strong>
                    {stats.activity_count.toLocaleString("de-CH")}
                  </strong>
                </span>
              </div>
            )}

            <div className="chartModeSwitchRow">
              <div
                className="chartModeSwitch"
                role="group"
                aria-label="Darstellung der Gesamtstatistik"
              >
                <button
                  type="button"
                  className={chartMode === "bar" ? "active" : ""}
                  aria-pressed={chartMode === "bar"}
                  onClick={() => setChartMode("bar")}
                >
                  Projektvergleich
                </button>
                <button
                  type="button"
                  className={chartMode === "timeseries" ? "active" : ""}
                  aria-pressed={chartMode === "timeseries"}
                  onClick={() => setChartMode("timeseries")}
                >
                  Verlauf (24 Stunden)
                </button>
              </div>
              <InfoHint
                label={
                  chartMode === "bar"
                    ? "Hilfe zum Projektvergleich"
                    : "Hilfe zum Verlauf"
                }
              >
                {chartMode === "bar"
                  ? `Erfasste Arbeitszeit je Projekt, sortiert nach Dauer. ${ACTIVE_TIME_MEASUREMENT_HINT}`
                  : `Aktive Projektzeit pro ${formatBucketLabel(BUCKET_SECONDS)}-Fenster (letzte 24 Stunden). ${ACTIVE_TIME_MEASUREMENT_HINT}`}
              </InfoHint>
            </div>

            <div
              className={
                chartMode === "timeseries"
                  ? "chartWithSharedLegend"
                  : "appOverviewChartSection"
              }
            >
              <div
                className={[
                  "chartPane",
                  chartMode === "bar" ? "chartPaneBar" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {chartMode === "bar" ? (
                  <div className="appOverviewBarChart">
                    <ProjectBarChart
                      items={stats.by_project}
                      colorByName={projectColorByName}
                      yAxisWidth={168}
                      emptyHint="Es wurden noch keine Projektzeiten erfasst."
                    />
                  </div>
                ) : (
                  <TimeSeriesChart
                    data={stats.timeline}
                    categoryOrder={categoryOrder}
                    bucketSeconds={BUCKET_SECONDS}
                    emptyHint="In den letzten 24 Stunden liegen keine Daten vor."
                    focusedCategory={focusedTimelineCategory}
                  />
                )}
              </div>
              {chartMode === "timeseries" && (
                <ChartLegend
                  entries={legendEntries}
                  viewLabel="Projektzeiten der letzten 24 Stunden"
                  variant="compact"
                  selectedEntry={focusedTimelineCategory}
                  onEntrySelect={setFocusedTimelineCategory}
                />
              )}
            </div>
          </>
        )}
      </section>
    </PanelDialog>
  );
}

function OverviewSkeleton() {
  return (
    <div className="chartSkeleton" role="status" aria-label="Übersicht laden">
      <span className="chartSkeletonToggle" />
      <span className="chartSkeletonPlot" />
      <span className="chartSkeletonLegend" />
    </div>
  );
}
