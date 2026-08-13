import { memo, useCallback } from "react";
import type { ChartLegendEntry } from "../../utils/chartLegend";
import { InfoHint } from "../shared/InfoHint";

type Props = {
  entries: ChartLegendEntry[];
  viewLabel?: string;
  /** Kompakte Darstellung ohne Rahmen, einspaltig - für Übersicht und Berichte. */
  variant?: "default" | "compact";
  /** Aktiver Filtereintrag (nur bei interaktiver Legende). */
  selectedEntry?: string | null;
  /** Klick filtert den Zeitverlauf auf einen Eintrag; erneuter Klick hebt den Filter auf. */
  onEntrySelect?: (name: string | null) => void;
};

/** Kürzt lange Legendenbeschriftungen mit Auslassungspunkten. */
function truncateLabel(name: string, maxLen = 36): string {
  if (name.length <= maxLen) return name;
  return `${name.slice(0, maxLen - 1)}…`;
}

/** Zeigt Kategorien mit Farbe, Anteil und optionalem Filter. */
function ChartLegendInner({
  entries,
  viewLabel,
  variant = "default",
  selectedEntry = null,
  onEntrySelect,
}: Props) {
  const interactive = onEntrySelect != null;

  const handleEntryClick = useCallback(
    (name: string) => {
      if (!onEntrySelect) return;
      onEntrySelect(selectedEntry === name ? null : name);
    },
    [onEntrySelect, selectedEntry],
  );

  if (entries.length === 0) {
    return null;
  }

  const hasFilter = interactive && selectedEntry != null;

  return (
    <aside
      className={[
        "chartLegend",
        variant === "compact" ? "chartLegendCompact" : "",
        interactive ? "chartLegendInteractive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Kategorien"
    >
      {(viewLabel || interactive) && (
        <div className="chartLegendHeader">
          {viewLabel && <p className="chartLegendHint">{viewLabel}</p>}
          {interactive && (
            <InfoHint label="Legende filtern">
              {hasFilter ? (
                <>
                  Aktuell nur <strong>{selectedEntry}</strong>. Nochmals tippen,
                  um alle Kontexte anzuzeigen.
                </>
              ) : (
                <>
                  Eintrag tippen, um nur diesen Kontext im Verlauf zu sehen.
                  Nochmals tippen hebt den Filter auf.
                </>
              )}
            </InfoHint>
          )}
        </div>
      )}
      <ul className="chartLegendList">
        {entries.map((entry) => {
          const selected = hasFilter && entry.name === selectedEntry;
          const dimmed = hasFilter && entry.name !== selectedEntry;
          const itemClassName = [
            "chartLegendItem",
            interactive ? "chartLegendItemInteractive" : "",
            selected ? "chartLegendItemSelected" : "",
            dimmed ? "chartLegendItemDimmed" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const content = (
            <>
              <span
                className="chartLegendDot"
                style={{ backgroundColor: entry.color }}
                aria-hidden
              />
              <span className="chartLegendLabel" title={entry.name}>
                {truncateLabel(entry.name)}
              </span>
              <span className="chartLegendMeta">{entry.meta}</span>
            </>
          );

          return (
            <li key={entry.name} className="chartLegendRow">
              {interactive ? (
                <button
                  type="button"
                  className={itemClassName}
                  onClick={() => handleEntryClick(entry.name)}
                  aria-pressed={selected}
                  title={entry.name}
                >
                  {content}
                </button>
              ) : (
                <div className={itemClassName}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

const ChartLegend = memo(ChartLegendInner);
export default ChartLegend;
