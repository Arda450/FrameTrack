import { invoke } from "@tauri-apps/api/core";
import type {
  ActivitiesPage,
  CategoryTimeSeriesPoint,
  DwellSegment,
  OverviewStats,
  ProjectStats,
} from "../types";
import type { PieSegment } from "../components/charts/PieChart";

/** Lädt eine paginierte Seite gefilterter Aktivitäten. */
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

/** Liefert Verweildauer je Kategorie für ein Projekt und Zeitfenster. */
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

/** Liefert den Zeitverlauf je Kategorie in gleich grossen Buckets. */
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

/** Liefert App weite Übersichtsstatistiken aller Projekte. */
export function getOverviewStats(): Promise<OverviewStats> {
  return invoke<OverviewStats>("get_overview_stats");
}

/** Liefert Detailstatistiken für ein einzelnes Projekt. */
export function getProjectStats(projectId: number): Promise<ProjectStats> {
  return invoke<ProjectStats>("get_project_stats", { projectId });
}

/** Liefert aktive Zeit je Projekt für einen Zeitraum. */
export function getByProjectForRange(params: {
  fromTs: number;
  toTs: number;
  projectIds?: number[] | null;
  maxSegmentGapSeconds?: number;
  tailSeconds?: number;
}): Promise<DwellSegment[]> {
  return invoke<DwellSegment[]>("get_by_project_for_range", params);
}
