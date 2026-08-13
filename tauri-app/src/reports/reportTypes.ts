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

export type PeriodReportMode = "daily" | "weekly";

export type PeriodReportViewProps = {
  projectId: number;
  projectName: string;
  dwellRevision: number;
  onExportApiChange?: (api: ReportExportApi | null) => void;
};

export type ReportActivitiesExportArgs = {
  projectId: number | null;
  projectIds: number[];
  fromTs: number;
  toTs: number;
  contextQuery: null;
};
