/** Platzhalter während Chartdaten geladen werden. */
export function OverviewChartSkeleton() {
  return (
    <div className="chartSkeleton" role="status" aria-label="Statistiken laden">
      <span className="chartSkeletonToggle" />
      <span className="chartSkeletonPlot" />
      <span className="chartSkeletonLegend" />
    </div>
  );
}
