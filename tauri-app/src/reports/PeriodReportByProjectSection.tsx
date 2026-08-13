import { useEffect, useState } from "react";
import { getByProjectForRange } from "../api/stats";
import type { DwellSegment } from "../types";
import ProjectBarChart from "../components/charts/ProjectBarChart";
import { REPORT_DWELL_OPTS } from "./reportConfig";

type PeriodReportByProjectSectionProps = {
  fromTs: number;
  toTs: number;
  title: string;
  hint: string;
  projectColorByName: ReadonlyMap<string, string>;
  projectIds: number[];
};

/** Lädt und zeigt die Projektzeit für den gewählten Zeitraum. */
export function PeriodReportByProjectSection({
  fromTs,
  toTs,
  title,
  hint,
  projectColorByName,
  projectIds,
}: PeriodReportByProjectSectionProps) {
  const [data, setData] = useState<DwellSegment[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getByProjectForRange({
      fromTs,
      toTs,
      projectIds,
      ...REPORT_DWELL_OPTS,
    })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e) => {
        console.error("get_by_project_for_range failed", e);
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromTs, projectIds, toTs]);

  if (loading) {
    return (
      <div className="periodReportProjects">
        <h4 className="periodReportChartTitle">{title}</h4>
        <p className="periodReportMuted">Lade Projektdaten…</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="periodReportProjects">
      <h4 className="periodReportChartTitle">{title}</h4>
      <p className="periodReportChartHint">{hint}</p>
      <div className="periodReportBarChart">
        <ProjectBarChart
          items={data}
          colorByName={projectColorByName}
          yAxisWidth={168}
          emptyHint="Keine Projektzeit für diesen Zeitraum."
        />
      </div>
    </div>
  );
}
