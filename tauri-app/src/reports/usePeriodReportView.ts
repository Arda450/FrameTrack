import { getDailyReport, getWeeklyReport } from "../api/reports";
import { getProjects } from "../api/projects";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DailyReport, Project, WeeklyReport } from "../types";
import {
  dateInputToFromTs,
  dateInputToToTs,
  todayIsoDate,
} from "../utils/dateRange";
import { buildProjectColorMap } from "../utils/chartColors";
import { useReportLoad } from "../hooks/useReportLoad";
import { REPORT_DWELL_OPTS } from "./reportConfig";
import { projectScopeLabel } from "./ProjectScopePicker";
import {
  PERIOD_KIND_CONFIG,
  buildDailyKpis,
  buildDailyNarrative,
  buildWeeklyKpis,
  buildWeeklyNarrative,
  createDailyNavState,
  createWeeklyNavState,
  type PeriodReportMode,
} from "./periodReportKinds";
import type { ReportKpi } from "./reportTypes";
import {
  buildDailyExtraSections,
  buildWeeklyExtraSections,
} from "./periodReportExtraSections";

type UsePeriodReportViewOptions = {
  mode: PeriodReportMode;
  projectId: number;
  projectName: string;
  dwellRevision: number;
  onExportApiChange?: (
    api: import("./reportTypes").ReportExportApi | null,
  ) => void;
};

/** Bündelt Zustand, Laden und abgeleitete Werte für Periodenberichte. */
export function usePeriodReportView({
  mode,
  projectId,
  projectName,
  dwellRevision,
  onExportApiChange,
}: UsePeriodReportViewOptions) {
  const kind = PERIOD_KIND_CONFIG[mode];
  const [anchor, setAnchor] = useState(todayIsoDate());
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([
    projectId,
  ]);
  const [projectColorByName, setProjectColorByName] = useState(
    () => new Map<string, string>(),
  );

  useEffect(() => {
    setSelectedProjectIds([projectId]);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    getProjects()
      .then((projects) => {
        if (!cancelled) {
          setProjects(projects);
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

  const selectedProjectKey = useMemo(
    () => [...selectedProjectIds].sort((a, b) => a - b).join(","),
    [selectedProjectIds],
  );
  const scopeLabel =
    projects.length > 0
      ? projectScopeLabel(projects, selectedProjectIds)
      : projectName;

  const navState =
    mode === "daily"
      ? createDailyNavState(anchor)
      : createWeeklyNavState(anchor);

  const queryKey = `${selectedProjectKey}|${navState.queryKeySuffix}|${dwellRevision}`;

  const load = useCallback(async () => {
    if (mode === "daily") {
      const daily = createDailyNavState(anchor);
      return getDailyReport({
        ...daily.invokeArgs(selectedProjectIds, anchor),
        ...REPORT_DWELL_OPTS,
      });
    }
    const weekly = createWeeklyNavState(anchor);
    return getWeeklyReport({
      ...weekly.invokeArgs(
        selectedProjectIds,
        anchor,
        weekly.rangeStart,
        weekly.rangeEnd,
      ),
      ...REPORT_DWELL_OPTS,
    });
  }, [mode, selectedProjectIds, anchor]);

  const {
    data: report,
    loading,
    isRefreshing,
    error,
  } = useReportLoad({
    queryKey,
    load,
    deps: [selectedProjectKey, navState.queryKeySuffix, dwellRevision],
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
      projectId: null,
      projectIds: selectedProjectIds,
      fromTs: dateInputToFromTs(navState.rangeStart),
      toTs: dateInputToToTs(navState.rangeEnd),
      contextQuery: null,
    }),
    [selectedProjectIds, navState.rangeStart, navState.rangeEnd],
  );

  const kpis: ReportKpi[] = useMemo(() => {
    if (!report) return [];
    return mode === "daily"
      ? buildDailyKpis(report as DailyReport)
      : buildWeeklyKpis(report as WeeklyReport);
  }, [report, mode]);

  const extraSections: ReactNode = useMemo(() => {
    if (!report || isEmpty) return null;
    const fromTs = dateInputToFromTs(navState.rangeStart);
    const toTs = dateInputToToTs(navState.rangeEnd);
    const ctx = { fromTs, toTs };
    if (mode === "daily") {
      return buildDailyExtraSections(
        report as DailyReport,
        ctx,
        projectColorByName,
        selectedProjectIds,
      );
    }
    return buildWeeklyExtraSections(
      report as WeeklyReport,
      ctx,
      projectColorByName,
      selectedProjectIds,
    );
  }, [
    report,
    mode,
    isEmpty,
    navState.rangeStart,
    navState.rangeEnd,
    projectColorByName,
    selectedProjectIds,
  ]);

  return {
    kind,
    anchor,
    setAnchor,
    projects,
    selectedProjectIds,
    setSelectedProjectIds,
    scopeLabel,
    navState,
    report,
    loading,
    isRefreshing,
    error,
    isEmpty,
    narrativeSummary,
    exportArgs,
    kpis,
    extraSections,
  };
}
