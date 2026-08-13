import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PeriodDatePicker } from "../components/shared/PeriodDatePicker";
import { AppIcon } from "../components/shared/AppIcon";
import { ProjectScopePicker } from "./ProjectScopePicker";
import { ReportBody } from "./ReportBody";
import {
  periodEmptyMessage,
  type PeriodReportViewProps,
} from "./periodReportKinds";
import { usePeriodReportView } from "./usePeriodReportView";

type PeriodReportViewInternalProps = PeriodReportViewProps & {
  mode: import("./reportTypes").PeriodReportMode;
};

/** Steuert Navigation, Laden und Darstellung eines Periodenberichts. */
function PeriodReportView({
  mode,
  projectId,
  projectName,
  dwellRevision,
  onExportApiChange,
}: PeriodReportViewInternalProps) {
  const {
    kind,
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
  } = usePeriodReportView({
    mode,
    projectId,
    projectName,
    dwellRevision,
    onExportApiChange,
  });

  const { nav } = navState;
  const selectedProjectNames = projects
    .filter((project) => selectedProjectIds.includes(project.id))
    .map((project) => project.name);
  const pdfProjectName =
    selectedProjectNames.length <= 1
      ? (selectedProjectNames[0] ?? scopeLabel)
      : `${scopeLabel} (${selectedProjectNames.join(", ")})`;

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
          <PeriodDatePicker
            label={nav.dateFieldLabel}
            value={nav.dateValue}
            maxDate={nav.maxDate}
            onChange={setAnchor}
          />
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
          {projects.length > 0 ? (
            <ProjectScopePicker
              projects={projects}
              activeProjectId={projectId}
              selectedProjectIds={selectedProjectIds}
              onChange={setSelectedProjectIds}
            />
          ) : null}
        </div>
      </div>

      {loading && !report && (
        <p className="periodReportMuted">{kind.loadingMessage}</p>
      )}

      {error && !loading && <p className="periodReportError">{error}</p>}

      {!loading && !error && report && isEmpty && (
        <p className="periodReportMuted">
          {periodEmptyMessage(mode, scopeLabel)}
        </p>
      )}

      {report && !isEmpty && (
        <ReportBody
          report={report}
          isRefreshing={isRefreshing || loading}
          narrativeSummary={narrativeSummary}
          timelineBucketSeconds={kind.timelineBucketSeconds}
          kpis={kpis}
          reportMode={mode}
          periodLabel={navState.subtitle}
          projectName={scopeLabel}
          pdfProjectName={pdfProjectName}
          labels={kind.labels}
          extraSections={extraSections}
          exportArgs={exportArgs}
          onExportApiChange={onExportApiChange}
        />
      )}
    </div>
  );
}

/** Memoisierte Ansicht für den Tagesbericht. */
export const DailyReportView = memo(function DailyReportView(
  props: PeriodReportViewProps,
) {
  return <PeriodReportView mode="daily" {...props} />;
});

/** Memoisierte Ansicht für den Wochenbericht. */
export const WeeklyReportView = memo(function WeeklyReportView(
  props: PeriodReportViewProps,
) {
  return <PeriodReportView mode="weekly" {...props} />;
});
