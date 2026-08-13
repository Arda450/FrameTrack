import type { DailyReport, WeeklyReport } from "../types";
import { PeriodReportByProjectSection } from "./PeriodReportByProjectSection";

type PeriodRangeContext = {
  fromTs: number;
  toTs: number;
};

/** Baut Zusatzabschnitte für den Tagesbericht. */
export function buildDailyExtraSections(
  _report: DailyReport,
  ctx: PeriodRangeContext,
  projectColorByName: ReadonlyMap<string, string>,
  projectIds: number[],
) {
  return (
    <PeriodReportByProjectSection
      fromTs={ctx.fromTs}
      toTs={ctx.toTs}
      title="Zeit pro Projekt (gesamter Tag)"
      hint="Ausgewählte Projekte an diesem Tag."
      projectColorByName={projectColorByName}
      projectIds={projectIds}
    />
  );
}

/** Baut Zusatzabschnitte für den Wochenbericht. */
export function buildWeeklyExtraSections(
  _report: WeeklyReport,
  ctx: PeriodRangeContext,
  projectColorByName: ReadonlyMap<string, string>,
  projectIds: number[],
) {
  return (
    <PeriodReportByProjectSection
      fromTs={ctx.fromTs}
      toTs={ctx.toTs}
      title="Zeit pro Projekt (gesamte Woche)"
      hint="Ausgewählte Projekte in dieser Woche."
      projectColorByName={projectColorByName}
      projectIds={projectIds}
    />
  );
}
