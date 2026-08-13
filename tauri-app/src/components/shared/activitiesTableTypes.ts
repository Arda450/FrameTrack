import type { Activity } from "../../types";

export type ActivityRow = {
  id: string;
  context: string;
  date: string;
  time: string;
  project: string;
};

export const DEFAULT_PAGE_SIZE = 20;

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 75, 100] as const;

/** Mappt Backend Aktivitäten auf Tabellenzeilen. */
export function toActivityRows(items: Activity[]): ActivityRow[] {
  return items.map((a, index) => {
    const d = new Date(a.timestamp * 1000);
    return {
      id: `${a.timestamp}-${index}`,
      context: a.context_label,
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString(),
      project: a.project_name ?? "—",
    };
  });
}

/** Beschreibt die aktuelle Datumssortierung für Screenreader. */
export function describeActivitiesSortState(desc: boolean): string {
  return desc ? "Sortierung: neueste zuerst" : "Sortierung: älteste zuerst";
}
