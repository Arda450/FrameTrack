import type { DwellSegment } from "../types";
import type { ReportKpi } from "./reportTypes";

export type ReportPdfChartSection = {
  title: string;
  captureEl: HTMLElement | null;
};

export type ReportPdfTableSection = {
  title: string;
  hint?: string;
  items: DwellSegment[];
  totalSeconds: number;
  formatName?: (name: string) => string;
  sortByValue?: boolean;
  colorOrder?: readonly string[];
};

export type BuildReportPdfOptions = {
  reportType: "daily" | "weekly";
  projectName: string;
  periodLabel: string;
  narrative: string | null;
  kpis: ReportKpi[];
  estimationHint: string;
  pieSections: ReportPdfChartSection[];
  tables: ReportPdfTableSection[];
};
