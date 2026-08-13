/** Gemeinsame Dwell-Parameter für Tages- und Wochenberichte. */
export const REPORT_DWELL_OPTS = {
  maxSegmentGapSeconds: 120,
  tailSeconds: 60,
} as const;

export const DAILY_TIMELINE_BUCKET_SECONDS = 900;
export const WEEKLY_TIMELINE_BUCKET_SECONDS = 86_400;

/** Kurz: wie aktive Zeit in Charts und KPIs zustande kommt. */
export const ACTIVE_TIME_MEASUREMENT_HINT =
  "Messung alle 2 Sekunden; pro Minute zählt die überwiegend genutzte App.";

/** Länger: für Berichtskopf, PDF-Fusszeile und Untertitel. */
export const ACTIVE_TIME_MEASUREMENT_HINT_LONG =
  "Aktive Zeit aus 2-Sekunden-Messungen, pro Minute zusammengefasst (überwiegende App).";
