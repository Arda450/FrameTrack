import { invoke } from "@tauri-apps/api/core";
import type {
  ActivitiesPage,
  CategoryTimeSeriesPoint,
  DwellSegment,
  OverviewStats,
  ProjectStats,
} from "../types";
import type { PieSegment } from "../components/charts/PieChart";

export function getActivitiesPage(params: {
  projectId: number | null;
  page: number;
  pageSize: number;
  fromTs: number | null;
  toTs: number | null;
  contextQuery: string | null;
  sortBy: string;
  sortOrder: "asc" | "desc";
}): Promise<ActivitiesPage> {
  return invoke<ActivitiesPage>("get_activities_page", params);
}

export function getDwellByCategory(params: {
  projectId: number;
  fromTs: number;
  toTs: number;
  maxSegmentGapSeconds?: number;
  tailSeconds?: number;
  topN?: number;
}): Promise<PieSegment[]> {
  return invoke<PieSegment[]>("get_dwell_by_category", params);
}

export function getTimeSeriesByCategory(params: {
  projectId: number;
  fromTs: number;
  toTs: number;
  bucketSeconds: number;
  maxSegmentGapSeconds?: number;
  tailSeconds?: number;
}): Promise<CategoryTimeSeriesPoint[]> {
  return invoke<CategoryTimeSeriesPoint[]>(
    "get_time_series_by_category",
    params,
  );
}

export function getOverviewStats(): Promise<OverviewStats> {
  return invoke<OverviewStats>("get_overview_stats");
}

export function getProjectStats(projectId: number): Promise<ProjectStats> {
  return invoke<ProjectStats>("get_project_stats", { projectId });
}

export function getByProjectForRange(params: {
  fromTs: number;
  toTs: number;
  maxSegmentGapSeconds?: number;
  tailSeconds?: number;
}): Promise<DwellSegment[]> {
  return invoke<DwellSegment[]>("get_by_project_for_range", params);
}
