import { Calendar } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AppIcon } from "./AppIcon";
import {
  clampIsoDateToToday,
  formatIsoDate,
  todayIsoDate,
} from "../../utils/dateRange";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

type IsoParts = { year: number; month: number; day: number };

/** Zerlegt ein ISO Datum in Jahr, Monat und Tag. */
function parseIsoDate(iso: string): IsoParts {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/** Baut ein ISO Datum aus Jahr, Monat und Tag. */
function toIsoDate(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Ermittelt die Anzahl Tage in einem Monat. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Montag = 0 … Sonntag = 6 */
function mondayBasedOffset(year: number, month: number): number {
  const weekday = new Date(year, month - 1, 1).getDay();
  return weekday === 0 ? 6 : weekday - 1;
}

/** Erstellt die Monatszellen für den Kalender inklusive Leerfelder. */
function buildMonthGrid(year: number, month: number): (string | null)[] {
  const offset = mondayBasedOffset(year, month);
  const totalDays = daysInMonth(year, month);
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(toIsoDate(year, month, day));
  }
  return cells;
}

/** Formatiert Monat und Jahr für die Kalenderkopfzeile. */
function formatMonthTitle(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("de-CH", {
    month: "long",
    year: "numeric",
  });
}

type PeriodDatePickerProps = {
  label: string;
  value: string;
  maxDate?: string;
  onChange: (isoDate: string) => void;
};

/** Kalender Popup zur Auswahl eines ISO Datums. */
export function PeriodDatePicker({
  label,
  value,
  maxDate = todayIsoDate(),
  onChange,
}: PeriodDatePickerProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value);
  const [viewYear, setViewYear] = useState(selected.year);
  const [viewMonth, setViewMonth] = useState(selected.month);

  useEffect(() => {
    if (!open) return;
    setViewYear(selected.year);
    setViewMonth(selected.month);
  }, [open, selected.year, selected.month]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const monthCells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  function shiftMonth(delta: number) {
    const date = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth() + 1);
  }

  function selectDay(isoDate: string) {
    onChange(clampIsoDateToToday(isoDate));
    setOpen(false);
  }

  return (
    <div className="periodDatePicker" ref={rootRef}>
      <span className="periodReportDateLabel">{label}</span>
      <button
        type="button"
        className="periodDatePickerTrigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{formatIsoDate(value)}</span>
        <AppIcon icon={Calendar} size={16} />
      </button>
      {open ? (
        <div
          id={listboxId}
          className="periodDatePickerPopover"
          role="dialog"
          aria-label={`${label} ${formatIsoDate(value)}`}
        >
          <div className="periodDatePickerHeader">
            <button
              type="button"
              className="periodDatePickerNavBtn"
              aria-label="Vorheriger Monat"
              onClick={() => shiftMonth(-1)}
            >
              ‹
            </button>
            <span className="periodDatePickerMonth">
              {formatMonthTitle(viewYear, viewMonth)}
            </span>
            <button
              type="button"
              className="periodDatePickerNavBtn"
              aria-label="Nächster Monat"
              onClick={() => shiftMonth(1)}
              disabled={
                viewYear > parseIsoDate(maxDate).year ||
                (viewYear === parseIsoDate(maxDate).year &&
                  viewMonth >= parseIsoDate(maxDate).month)
              }
            >
              ›
            </button>
          </div>
          <div className="periodDatePickerWeekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((weekday) => (
              <span key={weekday} className="periodDatePickerWeekday">
                {weekday}
              </span>
            ))}
          </div>
          <div className="periodDatePickerGrid" role="grid">
            {monthCells.map((isoDate, index) =>
              isoDate ? (
                <button
                  key={isoDate}
                  type="button"
                  role="gridcell"
                  className={[
                    "periodDatePickerDay",
                    isoDate === value ? "periodDatePickerDaySelected" : "",
                    isoDate > maxDate ? "periodDatePickerDayDisabled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={isoDate > maxDate}
                  onClick={() => selectDay(isoDate)}
                >
                  {parseIsoDate(isoDate).day}
                </button>
              ) : (
                <span
                  key={`empty-${index}`}
                  className="periodDatePickerDay periodDatePickerDayEmpty"
                  aria-hidden="true"
                />
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
