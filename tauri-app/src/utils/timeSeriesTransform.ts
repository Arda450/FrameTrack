import type { CategoryTimeSeriesPoint } from "../types";

export const MAX_DISPLAY_CATEGORIES = 8;
export const OTHER_CATEGORY = "Sonstige";

/** Ermittelt alle Kategorienamen in stabiler Reihenfolge. */
export function resolveCategoryNames(
  data: readonly CategoryTimeSeriesPoint[],
  preferredOrder: readonly string[] = [],
): string[] {
  const extra = new Set<string>();
  for (const point of data) {
    for (const cat of point.categories) {
      if (!preferredOrder.includes(cat.name)) {
        extra.add(cat.name);
      }
    }
  }
  return [...preferredOrder, ...[...extra].sort()];
}

/** Entfernt führende Buckets ohne Aktivität vor dem ersten Treffer. */
export function trimLeadingEmptyBuckets(
  data: CategoryTimeSeriesPoint[],
): CategoryTimeSeriesPoint[] {
  const firstWithActivity = data.findIndex((point) =>
    point.categories.some((c) => c.value > 0),
  );
  if (firstWithActivity <= 0) {
    return data;
  }
  return data.slice(firstWithActivity);
}

/** Summiert Sekunden je Kategorie über alle Zeitpunkte. */
function aggregateCategoryTotals(
  data: readonly CategoryTimeSeriesPoint[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const point of data) {
    for (const cat of point.categories) {
      totals.set(cat.name, (totals.get(cat.name) ?? 0) + cat.value);
    }
  }
  return totals;
}

/** Wählt die wichtigsten Kategorien und fasst den Rest als Sonstige zusammen. */
export function pickDisplayCategories(
  data: readonly CategoryTimeSeriesPoint[],
  preferredOrder: readonly string[] = [],
): string[] {
  const allNames = resolveCategoryNames(data, preferredOrder);
  if (allNames.length <= MAX_DISPLAY_CATEGORIES) {
    return allNames;
  }

  const totals = aggregateCategoryTotals(data);
  const sorted = [...allNames].sort(
    (a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0),
  );
  const top = sorted.slice(0, MAX_DISPLAY_CATEGORIES - 1);
  const hasOtherBucket =
    sorted.slice(MAX_DISPLAY_CATEGORIES - 1).length > 0 ||
    top.includes(OTHER_CATEGORY);

  return hasOtherBucket ? [...top, OTHER_CATEGORY] : top;
}

/** Prüft ob mindestens eine Kategorie im Datensatz aktiv war. */
export function hasAnyTimeSeriesActivity(
  data: CategoryTimeSeriesPoint[],
  categoryNames: readonly string[],
): boolean {
  for (const point of data) {
    for (const cat of point.categories) {
      if (categoryNames.includes(cat.name) && cat.value > 0) {
        return true;
      }
    }
  }
  return false;
}

export type TimeSeriesChartRow = {
  ts: number;
  label: string;
  [category: string]: number | string;
};

/** Wandelt API Zeitpunkte in Tabellenzeilen für Recharts um. */
export function toTimeSeriesChartRows(
  data: CategoryTimeSeriesPoint[],
  categoryNames: readonly string[],
  bucketSeconds: number,
  formatLabel: (ts: number, bucketSeconds: number) => string,
  secondsToValue: (seconds: number) => number,
): TimeSeriesChartRow[] {
  return data.map((point) => {
    const byName = new Map(
      point.categories.map((c) => [c.name, c.value] as const),
    );
    const row: TimeSeriesChartRow = {
      ts: point.ts,
      label: formatLabel(point.ts, bucketSeconds),
    };
    for (const name of categoryNames) {
      row[name] = secondsToValue(byName.get(name) ?? 0);
    }
    return row;
  });
}

/** Reduziert Zeilen auf die sichtbaren Anzeige Kategorien inklusive Sonstige. */
export function collapseTimeSeriesRows(
  rows: TimeSeriesChartRow[],
  allCategoryNames: readonly string[],
  displayCategories: readonly string[],
): TimeSeriesChartRow[] {
  const visible = new Set(
    displayCategories.filter((name) => name !== OTHER_CATEGORY),
  );

  return rows.map((row) => {
    const collapsed: TimeSeriesChartRow = {
      ts: row.ts,
      label: row.label,
    };
    let otherSum = 0;

    for (const name of allCategoryNames) {
      const value = Number(row[name] ?? 0);
      if (visible.has(name)) {
        collapsed[name] = value;
      } else if (name !== OTHER_CATEGORY) {
        otherSum += value;
      }
    }

    if (displayCategories.includes(OTHER_CATEGORY)) {
      collapsed[OTHER_CATEGORY] = otherSum + Number(row[OTHER_CATEGORY] ?? 0);
    }

    for (const name of displayCategories) {
      if (collapsed[name] === undefined) {
        collapsed[name] = 0;
      }
    }

    return collapsed;
  });
}
