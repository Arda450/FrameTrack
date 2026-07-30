import { memo } from "react";
import type { ChartLegendEntry } from "../../utils/chartLegend";

type Props = {
  entries: ChartLegendEntry[];
  viewLabel?: string;
  /** Kompakte Darstellung ohne Rahmen, einspaltig – für Übersicht und Berichte. */
  variant?: "default" | "compact";
};

function truncateLabel(name: string, maxLen = 36): string {
  if (name.length <= maxLen) return name;
  return `${name.slice(0, maxLen - 1)}…`;
}

function ChartLegendInner({ entries, viewLabel, variant = "default" }: Props) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <aside
      className={[
        "chartLegend",
        variant === "compact" ? "chartLegendCompact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Kategorien"
    >
      {viewLabel && <p className="chartLegendHint">{viewLabel}</p>}
      <ul className="chartLegendList">
        {entries.map((entry) => (
          <li key={entry.name} className="chartLegendItem">
            <span
              className="chartLegendDot"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="chartLegendLabel" title={entry.name}>
              {truncateLabel(entry.name)}
            </span>
            <span className="chartLegendMeta">{entry.meta}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

const ChartLegend = memo(ChartLegendInner);
export default ChartLegend;
