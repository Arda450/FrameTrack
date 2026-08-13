import { useMemo } from "react";
import { formatIsoDate } from "../../utils/dateRange";
import { describeActivitiesSortState } from "./activitiesTableTypes";

type FilterStatusItem = {
  label: string;
  value: string;
};

type ActivitiesTableFiltersProps = {
  sortDesc: boolean;
  dateFrom: string;
  dateTo: string;
  debouncedContext: string;
  projectId: number | null;
  projectName?: string | null;
  dateFromValue: string;
  dateToValue: string;
  contextQuery: string;
  hasActiveFilter: boolean;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onContextQueryChange: (value: string) => void;
  onClearFilters: () => void;
};

/** Zeigt Filtereingaben und den aktuellen Filterstatus der Aktivitätstabelle. */
export function ActivitiesTableFilters({
  sortDesc,
  dateFrom,
  dateTo,
  debouncedContext,
  projectId,
  projectName = null,
  dateFromValue,
  dateToValue,
  contextQuery,
  hasActiveFilter,
  onDateFromChange,
  onDateToChange,
  onContextQueryChange,
  onClearFilters,
}: ActivitiesTableFiltersProps) {
  const sortStatusText = useMemo(
    () => describeActivitiesSortState(sortDesc),
    [sortDesc],
  );

  const filterStatusItems = useMemo((): FilterStatusItem[] => {
    return [
      {
        label: "Von",
        value: dateFrom ? `ab ${formatIsoDate(dateFrom)}` : "kein Startdatum",
      },
      {
        label: "Bis",
        value: dateTo ? `bis ${formatIsoDate(dateTo)}` : "kein Enddatum",
      },
      {
        label: "Kontext",
        value: debouncedContext.trim()
          ? `enthält "${debouncedContext.trim()}"`
          : "alle Fenstertitel",
      },
      {
        label: "Projekt",
        value:
          projectId != null
            ? projectName
              ? projectName
              : "nur aktives Projekt"
            : "alle Projekte",
      },
    ];
  }, [dateFrom, dateTo, debouncedContext, projectId, projectName]);

  return (
    <div className="activitiesFilterSection">
      <p className="activitiesFilterIntro">
        <span>
          Filter und Sortierung gelten für alle Einträge in der Datenbank.
        </span>
        <span>
          Auf den Spaltenkopf Datum in der Tabelle tippen zum Umschalten.
        </span>
      </p>
      <p className="activitiesFilterStatus" aria-live="polite">
        <span className="activitiesFilterStatusItem activitiesFilterStatusSort">
          {sortStatusText}
        </span>
        {filterStatusItems.map((item) => (
          <span key={item.label} className="activitiesFilterStatusItem">
            <span className="activitiesFilterStatusLabel">{item.label}:</span>{" "}
            {item.value}
          </span>
        ))}
      </p>
      <div className="activitiesFilterBar">
        <label className="activitiesFilterField">
          <span className="activitiesFilterLabel">Von</span>
          <span className="activitiesFilterHint">Einträge ab diesem Tag</span>
          <input
            type="date"
            className="appDateInput"
            value={dateFromValue}
            onChange={(e) => onDateFromChange(e.target.value)}
          />
        </label>
        <label className="activitiesFilterField">
          <span className="activitiesFilterLabel">Bis</span>
          <span className="activitiesFilterHint">
            Einträge bis einschliesslich
          </span>
          <input
            type="date"
            className="appDateInput"
            value={dateToValue}
            onChange={(e) => onDateToChange(e.target.value)}
          />
        </label>
        <label className="activitiesFilterField activitiesFilterFieldGrow">
          <span className="activitiesFilterLabel">Kontext</span>
          <span className="activitiesFilterHint">Suche im Fenstertitel</span>
          <input
            type="search"
            placeholder="Fenstertitel suchen…"
            value={contextQuery}
            onChange={(e) => onContextQueryChange(e.target.value)}
          />
        </label>
        {hasActiveFilter && (
          <button
            type="button"
            className="activitiesFilterReset"
            onClick={onClearFilters}
          >
            Zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
}
