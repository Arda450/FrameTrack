import type { DwellSegment } from "../types";
import { formatDurationSeconds } from "../utils/formatDuration";

export type DwellTableRow = {
  sourceName: string;
  name: string;
  duration: string;
  percentage: number;
  value: number;
};

type Options = {
  formatName?: (name: string) => string;
  sortByValue?: boolean;
};

/** Gemeinsame Tabellenzeilen für Berichts-UI und PDF-Export. */
export function buildDwellTableRows(
  items: DwellSegment[],
  totalSeconds: number,
  options: Options = {},
): DwellTableRow[] {
  const formatName = options.formatName ?? ((name: string) => name);
  const ordered =
    options.sortByValue === false
      ? [...items]
      : [...items].sort((a, b) => b.value - a.value);

  return ordered.map((item) => ({
    sourceName: item.name,
    name: formatName(item.name),
    duration: formatDurationSeconds(item.value),
    percentage:
      totalSeconds > 0 ? Math.round((item.value / totalSeconds) * 100) : 0,
    value: item.value,
  }));
}
