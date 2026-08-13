import ActivityPieChart from "../charts/PieChart";
import TimeSeriesChart from "../charts/TimeSeriesChart";
import ChartLegend from "../charts/ChartLegend";
import type { ChartLegendEntry } from "../../utils/chartLegend";
import type {
  CategoryTimeSeriesPoint,
  DwellSegment,
  ProjectStats,
} from "../../types";
import { formatBucketLabel } from "../../utils/timeSeriesBuckets";
import {
  PROJECT_CHART_BUCKET_SECONDS,
  PROJECT_CHART_VISIBLE_HOURS,
} from "../../hooks/useProjectCharts";
import { ProjectInfoPanel } from "./ProjectInfoPanel";
import { InfoHint } from "../shared/InfoHint";

type ChartMode = "pie" | "timeseries";

type OverviewProjectChartsProps = {
  isTracking: boolean;
  chartMode: ChartMode;
  onChartModeChange: (mode: ChartMode) => void;
  segments: DwellSegment[];
  timeline: CategoryTimeSeriesPoint[];
  categoryOrder: readonly string[];
  refreshing: boolean;
  stats: ProjectStats | null;
  statsLoaded: boolean;
  statsError: string | null;
  legendEntries: ChartLegendEntry[];
  legendHint: string;
  chartEmptyHint: string;
  focusedTimelineCategory: string | null;
  onFocusedTimelineCategoryChange: (category: string | null) => void;
};

/** Zeigt Pie oder Zeitverlauf mit Legende und Projekt KPIs. */
export function OverviewProjectCharts({
  isTracking,
  chartMode,
  onChartModeChange,
  segments,
  timeline,
  categoryOrder,
  refreshing,
  stats,
  statsLoaded,
  statsError,
  legendEntries,
  legendHint,
  chartEmptyHint,
  focusedTimelineCategory,
  onFocusedTimelineCategoryChange,
}: OverviewProjectChartsProps) {
  return (
    <>
      <div className="chartModeSwitchRow">
        <div
          className="chartModeSwitch"
          role="group"
          aria-label="Darstellung der Zeitstatistik"
        >
          <button
            type="button"
            className={chartMode === "pie" ? "active" : ""}
            aria-pressed={chartMode === "pie"}
            onClick={() => onChartModeChange("pie")}
          >
            Zeitverteilung
          </button>
          <button
            type="button"
            className={chartMode === "timeseries" ? "active" : ""}
            aria-pressed={chartMode === "timeseries"}
            onClick={() => onChartModeChange("timeseries")}
          >
            Zeitverlauf
          </button>
        </div>
        <InfoHint
          label={
            chartMode === "pie"
              ? "Hilfe zur Zeitverteilung"
              : "Hilfe zum Zeitverlauf"
          }
        >
          {chartMode === "pie"
            ? `Zeigt die geschätzte Verweildauer je Anwendung im aktiven Projekt (letzte ${PROJECT_CHART_VISIBLE_HOURS} Stunden).`
            : `Zeigt die aktive Zeit pro ${formatBucketLabel(PROJECT_CHART_BUCKET_SECONDS)} Fenster in den letzten ${PROJECT_CHART_VISIBLE_HOURS} Stunden.`}
        </InfoHint>
      </div>

      <div className="chartSectionLayout">
        <ProjectInfoPanel
          stats={stats}
          isTracking={isTracking}
          loading={!statsLoaded}
          error={statsError}
        />

        <div className="chartWithSharedLegend">
          <div
            className={`chartPane${refreshing ? " chartPaneRefreshing" : ""}`}
          >
            {chartMode === "pie" ? (
              <ActivityPieChart
                data={segments}
                categoryOrder={categoryOrder}
                emptyHint={chartEmptyHint}
              />
            ) : (
              <TimeSeriesChart
                data={timeline}
                categoryOrder={categoryOrder}
                bucketSeconds={PROJECT_CHART_BUCKET_SECONDS}
                emptyHint={chartEmptyHint}
                focusedCategory={focusedTimelineCategory}
              />
            )}
          </div>

          <ChartLegend
            entries={legendEntries}
            viewLabel={legendHint}
            variant="compact"
            selectedEntry={
              chartMode === "timeseries" ? focusedTimelineCategory : undefined
            }
            onEntrySelect={
              chartMode === "timeseries"
                ? onFocusedTimelineCategoryChange
                : undefined
            }
          />
        </div>
      </div>
    </>
  );
}
