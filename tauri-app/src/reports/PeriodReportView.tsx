import { getDailyReport, getWeeklyReport } from "../api/reports";
import { getProjects } from "../api/projects";
import { getByProjectForRange } from "../api/stats";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DailyReport, DwellSegment, WeeklyReport } from "../types";
import {
  clampIsoDateToToday,
  dateInputToFromTs,
  dateInputToToTs,
  todayIsoDate,
} from "../utils/dateRange";
import { buildProjectColorMap } from "../utils/chartColors";
import { useReportLoad } from "../hooks/useReportLoad";
import { REPORT_DWELL_OPTS } from "./reportConfig";
import { ReportBody } from "./ReportBody";
import ProjectBarChart from "../components/charts/ProjectBarChart";
import { AppIcon } from "../components/shared/AppIcon";
import {
  PERIOD_KIND_CONFIG,
  buildDailyKpis,
  buildDailyNarrative,
  buildWeeklyKpis,
  buildWeeklyNarrative,
  createDailyNavState,
  createWeeklyNavState,
  periodEmptyMessage,
  type PeriodReportMode,
  type PeriodReportViewProps,
} from "./periodReportKinds";

/**
 * Lazy-Loading Komponente für "Zeit pro Projekt".
 * Lädt die Daten separat, damit der Hauptbericht schnell erscheint.
 */
function ByProjectSection({
  fromTs,
  toTs,
  title,
  hint,
  projectColorByName,
}: {
  fromTs: number;
  toTs: number;
  title: string;
  hint: string;
  projectColorByName: ReadonlyMap<string, string>;
}) {
  const [data, setData] = useState<DwellSegment[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getByProjectForRange({
      fromTs,
      toTs,
      ...REPORT_DWELL_OPTS,
    })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e) => {
        console.error("get_by_project_for_range failed", e);
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromTs, toTs]);

  if (loading) {
    return (
      <div className="periodReportProjects">
        <h4 className="periodReportChartTitle">{title}</h4>
        <p className="periodReportMuted">Lade Projektdaten…</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="periodReportProjects">
      <h4 className="periodReportChartTitle">{title}</h4>
      <p className="periodReportChartHint">{hint}</p>
      <div className="periodReportBarChart">
        <ProjectBarChart
          items={data}
          colorByName={projectColorByName}
          yAxisWidth={168}
          emptyHint="Keine Projektzeit für diesen Zeitraum."
        />
      </div>
    </div>
  );
}

function buildDailyExtraSections(
  _report: DailyReport,
  ctx: { fromTs: number; toTs: number },
  projectColorByName: ReadonlyMap<string, string>,
) {
  return (
    <ByProjectSection
      fromTs={ctx.fromTs}
      toTs={ctx.toTs}
      title="Zeit pro Projekt (gesamter Tag)"
      hint="Alle Projekte an diesem Tag."
      projectColorByName={projectColorByName}
    />
  );
}

function buildWeeklyExtraSections(
  _report: WeeklyReport,
  ctx: { fromTs: number; toTs: number },
  projectColorByName: ReadonlyMap<string, string>,
) {
  return (
    <ByProjectSection
      fromTs={ctx.fromTs}
      toTs={ctx.toTs}
      title="Zeit pro Projekt (gesamte Woche)"
      hint="Alle Projekte in dieser Woche."
      projectColorByName={projectColorByName}
    />
  );
}

type PeriodReportViewInternalProps = PeriodReportViewProps & {
  mode: PeriodReportMode;
};

function PeriodReportView({
  mode,
  projectId,
  projectName,
  dwellRevision,
  onExportApiChange,
}: PeriodReportViewInternalProps) {
  const kind = PERIOD_KIND_CONFIG[mode];
  const [anchor, setAnchor] = useState(todayIsoDate());
  const [projectColorByName, setProjectColorByName] = useState(
    () => new Map<string, string>(),
  );

  useEffect(() => {
    let cancelled = false;
    getProjects()
      .then((projects) => {
        if (!cancelled) {
          setProjectColorByName(buildProjectColorMap(projects));
        }
      })
      .catch((e) => {
        console.error("get_projects failed in PeriodReportView", e);
      });
    return () => {
      cancelled = true;
    };
  }, [dwellRevision, projectId]);

  const navState =
    mode === "daily"
      ? createDailyNavState(anchor)
      : createWeeklyNavState(anchor);

  const queryKey = `${projectId}|${navState.queryKeySuffix}|${dwellRevision}`;

  const load = useCallback(async () => {
    if (mode === "daily") {
      const daily = createDailyNavState(anchor);
      return getDailyReport({
        ...daily.invokeArgs(projectId, anchor),
        ...REPORT_DWELL_OPTS,
      });
    }
    const weekly = createWeeklyNavState(anchor);
    return getWeeklyReport({
      ...weekly.invokeArgs(
        projectId,
        anchor,
        weekly.rangeStart,
        weekly.rangeEnd,
      ),
      ...REPORT_DWELL_OPTS,
    });
  }, [mode, projectId, anchor]);

  const {
    data: report,
    loading,
    isRefreshing,
    error,
  } = useReportLoad({
    queryKey,
    load,
    deps: [projectId, navState.queryKeySuffix, dwellRevision],
    loadErrorMessage: kind.loadErrorMessage,
  });

  const isEmpty = report != null && report.first_activity_ts == null;

  useEffect(() => {
    if (!report || isEmpty) {
      onExportApiChange?.(null);
    }
  }, [report, isEmpty, onExportApiChange]);

  const narrativeSummary = useMemo(() => {
    if (!report) return null;
    if (mode === "daily") {
      return buildDailyNarrative(report as DailyReport, navState.rangeStart);
    }
    return buildWeeklyNarrative(
      report as WeeklyReport,
      navState.rangeStart,
      navState.rangeEnd,
    );
  }, [report, mode, navState.rangeStart, navState.rangeEnd]);

  const exportArgs = useMemo(
    () => ({
      projectId,
      fromTs: dateInputToFromTs(navState.rangeStart),
      toTs: dateInputToToTs(navState.rangeEnd),
      contextQuery: null,
    }),
    [projectId, navState.rangeStart, navState.rangeEnd],
  );

  const kpis = useMemo(() => {
    if (!report) return [];
    return mode === "daily"
      ? buildDailyKpis(report as DailyReport)
      : buildWeeklyKpis(report as WeeklyReport);
  }, [report, mode]);

  const extraSections = useMemo(() => {
    if (!report || isEmpty) return null;
    const fromTs = dateInputToFromTs(navState.rangeStart);
    const toTs = dateInputToToTs(navState.rangeEnd);
    const ctx = { fromTs, toTs };
    if (mode === "daily") {
      return buildDailyExtraSections(
        report as DailyReport,
        ctx,
        projectColorByName,
      );
    }
    return buildWeeklyExtraSections(
      report as WeeklyReport,
      ctx,
      projectColorByName,
    );
  }, [
    report,
    mode,
    isEmpty,
    navState.rangeStart,
    navState.rangeEnd,
    projectColorByName,
  ]);

  const { nav } = navState;

  return (
    <div className="periodReport">
      <div className="periodReportToolbar">
        <div className="periodReportToolbarNav">
          <button
            type="button"
            className="periodReportNavBtn"
            onClick={() => setAnchor((d) => nav.stepPrev(d))}
            aria-label={nav.prevAria}
          >
            <AppIcon icon={ChevronLeft} size={18} />
          </button>
          <label className="periodReportDateField">
            <span className="periodReportDateLabel">{nav.dateFieldLabel}</span>
            <input
              type="date"
              className="appDateInput"
              value={nav.dateValue}
              max={nav.maxDate}
              onChange={(e) => setAnchor(clampIsoDateToToday(e.target.value))}
            />
          </label>
          <button
            type="button"
            className="periodReportNavBtn"
            onClick={() => setAnchor((d) => nav.stepNext(d))}
            disabled={!nav.canGoForward}
            aria-label={nav.nextAria}
          >
            <AppIcon icon={ChevronRight} size={18} />
          </button>
          <button
            type="button"
            className="periodReportTodayBtn"
            onClick={() => setAnchor(nav.jumpToCurrent())}
            disabled={nav.atCurrentPeriod}
          >
            {nav.currentPeriodLabel}
          </button>
        </div>
      </div>

      {loading && !report && (
        <p className="periodReportMuted">{kind.loadingMessage}</p>
      )}

      {error && !loading && <p className="periodReportError">{error}</p>}

      {!loading && !error && report && isEmpty && (
        <p className="periodReportMuted">
          {periodEmptyMessage(mode, projectName)}
        </p>
      )}

      {report && !isEmpty && (
        <ReportBody
          report={report}
          isRefreshing={isRefreshing}
          narrativeSummary={narrativeSummary}
          timelineBucketSeconds={kind.timelineBucketSeconds}
          trimLeadingEmptyBuckets={kind.trimLeadingEmptyBuckets}
          kpis={kpis}
          reportMode={mode}
          periodLabel={navState.subtitle}
          projectName={projectName}
          labels={kind.labels}
          extraSections={extraSections}
          exportArgs={exportArgs}
          onExportApiChange={onExportApiChange}
        />
      )}
    </div>
  );
}

export const DailyReportView = memo(function DailyReportView(
  props: PeriodReportViewProps,
) {
  return <PeriodReportView mode="daily" {...props} />;
});

export const WeeklyReportView = memo(function WeeklyReportView(
  props: PeriodReportViewProps,
) {
  return <PeriodReportView mode="weekly" {...props} />;
});
