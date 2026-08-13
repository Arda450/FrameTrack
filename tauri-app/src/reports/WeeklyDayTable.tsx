import type { WeeklyReport } from "../types";
import { formatIsoDateLong } from "../utils/dateRange";
import { buildDwellTableRows } from "./dwellTableRows";

type WeeklyDayTableProps = {
  items: WeeklyReport["by_day"];
  totalSeconds: number;
};

/** Zeigt die geschätzte aktive Zeit je Kalendertag in der Wochenansicht. */
export function WeeklyDayTable({ items, totalSeconds }: WeeklyDayTableProps) {
  const rows = buildDwellTableRows(items, totalSeconds, {
    formatName: formatIsoDateLong,
    sortByValue: false,
  });

  return (
    <section className="periodReportDayTableSection">
      <h4 className="periodReportChartTitle">Arbeitstage der Woche</h4>
      <p className="periodReportChartHint">
        Geschätzte aktive Zeit pro Kalendertag im gewählten Projektumfang.
      </p>
      <div className="periodReportDayTableWrap">
        <table className="periodReportDayTable">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Geschätzt aktiv</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((day) => (
              <tr key={day.name}>
                <td>{day.name}</td>
                <td>{day.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
