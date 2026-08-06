/** Anzahl der Theme-Farben (--chart-0 … in variables.css). */
export const CHART_COLOR_COUNT = 12;

/** Fallback, falls CSS-Variablen noch nicht verfügbar sind (z. B. Tests). */
const CHART_COLORS_FALLBACK = [
  "#4A9EFF",
  "#00C49F",
  "#FFBB28",
  "#FF6B6B",
  "#A78BFA",
  "#F472B6",
  "#34D399",
  "#FB923C",
  "#38BDF8",
  "#E879F9",
  "#FACC15",
  "#2DD4BF",
] as const;

function readChartCssColor(index: number): string | null {
  if (typeof document === "undefined") return null;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--chart-${index % CHART_COLOR_COUNT}`)
    .trim();
  return raw || null;
}

/** Farbe für Index - identisch zur Sidebar-Projektreihenfolge. */
export function colorForCategoryIndex(index: number): string {
  return (
    readChartCssColor(index) ??
    CHART_COLORS_FALLBACK[index % CHART_COLORS_FALLBACK.length]
  );
}

export function colorForCategory(
  name: string,
  orderedNames: readonly string[],
): string {
  const idx = orderedNames.indexOf(name);
  return colorForCategoryIndex(idx >= 0 ? idx : orderedNames.length);
}

/** Feste Projektfarben nach Sidebar-Reihenfolge (Name → Farbe). */
export function buildProjectColorMap(
  projects: readonly { name: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  projects.forEach((project, index) => {
    map.set(project.name, colorForCategoryIndex(index));
  });
  return map;
}

export function resolveBarColor(
  name: string,
  options: {
    colorByName?: ReadonlyMap<string, string>;
    orderedNamesForColor?: readonly string[];
  },
): string {
  const fromProject = options.colorByName?.get(name);
  if (fromProject) return fromProject;
  const order = options.orderedNamesForColor ?? [];
  return colorForCategory(name, order);
}

/** Recharts-Tooltip: kompakt, gut lesbar; hoher z-index für Portal-Rendering.
 * Text nutzt var(--text) statt der Serienfarbe (bessere Lesbarkeit, Dark/Light). */
export const chartTooltipStyle = {
  contentStyle: {
    background: "var(--surface-strong)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: "6px",
    padding: "6px 9px",
    fontSize: "0.78rem",
    lineHeight: 1.25,
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.22)",
  },
  wrapperStyle: {
    outline: "none",
    overflow: "visible",
    maxHeight: "none",
    zIndex: 10000,
    pointerEvents: "none",
  },
  itemStyle: {
    padding: "1px 0",
    fontSize: "0.78rem",
    color: "var(--text)",
  },
  labelStyle: {
    color: "var(--muted)",
    fontSize: "0.72rem",
    fontWeight: 700,
    marginBottom: "3px",
  },
} as const;

// Legacy-Export für bestehende Imports
export const CHART_COLORS = CHART_COLORS_FALLBACK;
