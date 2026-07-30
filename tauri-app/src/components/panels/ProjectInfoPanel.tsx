import type { ProjectStats } from "../../types";
import { StatCardGrid } from "../shared/StatCardGrid";
import { formatDurationSeconds } from "../../utils/formatDuration";
import {
  formatTimestampDate,
  formatTimestampDateTime,
} from "../../utils/dateRange";
import { PROJECT_CHART_VISIBLE_HOURS } from "../../hooks/useProjectCharts";

type ProjectInfoPanelProps = {
  stats: ProjectStats | null;
  isTracking: boolean;
  loading?: boolean;
  error?: string | null;
};

type DetailRow = {
  label: string;
  value: string;
};

type DetailSection = {
  title: string;
  rows: DetailRow[];
};

function buildDetailSections(stats: ProjectStats): DetailSection[] {
  return [
    {
      title: "Projekt",
      rows: [
        {
          label: "Erstellt",
          value: formatTimestampDate(stats.created_at),
        },
        {
          label: "Aktive Tage",
          value: stats.active_days.toLocaleString("de-CH"),
        },
        {
          label: "Erfasste Fenster",
          value: stats.activity_count.toLocaleString("de-CH"),
        },
      ],
    },
    {
      title: "Aktivität",
      rows: [
        {
          label: "Erste Aktivität",
          value: stats.first_activity_ts
            ? formatTimestampDateTime(stats.first_activity_ts)
            : "–",
        },
        {
          label: "Letzte Aktivität",
          value: stats.last_activity_ts
            ? formatTimestampDateTime(stats.last_activity_ts)
            : "–",
        },
      ],
    },
  ];
}

function buildKpiItems(stats: ProjectStats) {
  return [
    {
      label: "Gesamt erfasst",
      value: formatDurationSeconds(stats.total_active_seconds),
    },
    {
      label: "Heute",
      value: formatDurationSeconds(stats.today_active_seconds),
    },
    {
      label: `Letzte ${PROJECT_CHART_VISIBLE_HOURS} Stunden`,
      value: formatDurationSeconds(stats.recent_active_seconds),
    },
  ];
}

export function ProjectInfoPanel({
  stats,
  isTracking,
  loading = false,
  error = null,
}: ProjectInfoPanelProps) {
  if (error) {
    return (
      <aside className="projectInfoPanel projectInfoPanelError" aria-label="Projektinformationen">
        <p className="overviewLoadError">{error}</p>
      </aside>
    );
  }

  if (loading || !stats) {
    return (
      <aside
        className="projectInfoPanel projectInfoPanelSkeleton"
        aria-label="Projektinformationen laden"
        role="status"
      >
        <span className="projectInfoSkeletonTitle" />
        <span className="projectInfoSkeletonBadge" />
        <div className="projectInfoSkeletonCards">
          <span className="projectInfoSkeletonCard" />
          <span className="projectInfoSkeletonCard" />
          <span className="projectInfoSkeletonCard" />
        </div>
        <span className="projectInfoSkeletonLine" />
        <span className="projectInfoSkeletonLine" />
        <span className="projectInfoSkeletonLine" />
      </aside>
    );
  }

  const sections = buildDetailSections(stats);

  return (
    <aside className="projectInfoPanel" aria-label="Projektinformationen">
      <div className="projectInfoHeader">
        <h4>{stats.name}</h4>
        <span
          className={`projectInfoStatusBadge${isTracking ? " projectInfoStatusBadgeActive" : ""}`}
          role="status"
        >
          <span className="projectInfoStatusDot" aria-hidden />
          {isTracking ? "Tracking läuft" : "Tracking gestoppt"}
        </span>
      </div>

      <div className="projectInfoBody">
        <StatCardGrid
          ariaLabel="Projekt-Kennzahlen"
          items={buildKpiItems(stats)}
        />

        {sections.map((section) => (
          <section key={section.title} className="projectInfoSection">
            <h5 className="projectInfoSectionTitle">{section.title}</h5>
            <dl className="projectInfoList">
              {section.rows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </aside>
  );
}
