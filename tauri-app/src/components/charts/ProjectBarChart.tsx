import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { memo, useCallback, useMemo } from "react";
import type { DwellSegment } from "../../types";
import { resolveBarColor } from "../../utils/chartColors";
import { formatDurationSeconds } from "../../utils/formatDuration";

type ChartRow = {
  name: string;
  label: string;
  value: number;
};

type Props = {
  items: DwellSegment[];
  formatLabel?: (name: string) => string;
  emptyHint?: string;
  className?: string;
  yAxisWidth?: number;
  /** Feste Farben je Name (z. B. Projekte aus der Sidebar). */
  colorByName?: ReadonlyMap<string, string>;
  /** Fallback-Reihenfolge, wenn kein Eintrag in colorByName (z. B. Tage). */
  orderedNamesForColor?: readonly string[];
};

const ROW_HEIGHT_PX = 36;
const CHART_PAD_PX = 16;
const DEFAULT_Y_AXIS_WIDTH = 140;

function toChartRows(
  items: DwellSegment[],
  formatLabel: (name: string) => string,
): ChartRow[] {
  return [...items]
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((item) => ({
      name: item.name,
      label: formatLabel(item.name),
      value: item.value,
    }));
}

function ProjectBarChartInner({
  items,
  formatLabel = (name: string) => name,
  emptyHint = "Keine Projektzeit für diesen Zeitraum.",
  className,
  yAxisWidth = DEFAULT_Y_AXIS_WIDTH,
  colorByName,
  orderedNamesForColor,
}: Props) {
  const data = useMemo(
    () => toChartRows(items, formatLabel),
    [items, formatLabel],
  );

  const categoryOrder = useMemo(() => data.map((row) => row.name), [data]);
  const colorOptions = useMemo(
    () => ({
      colorByName,
      orderedNamesForColor: orderedNamesForColor ?? categoryOrder,
    }),
    [colorByName, orderedNamesForColor, categoryOrder],
  );
  const chartHeight = Math.max(56, data.length * ROW_HEIGHT_PX + CHART_PAD_PX);
  const maxValue = data[0]?.value ?? 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const durationFormatter = useCallback(
    (value: any) => formatDurationSeconds(Number(value ?? 0)),
    [],
  );

  if (data.length === 0) {
    return <p className="projectBarChartEmpty">{emptyHint}</p>;
  }

  const plotClassName = ["projectBarChartPlot", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={plotClassName}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 80, left: 0, bottom: 0 }}
          barCategoryGap="24%"
        >
          <XAxis type="number" domain={[0, maxValue]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={yAxisWidth}
            tick={{ fill: "var(--text)", fontSize: 12, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Bar
            dataKey="value"
            name="Zeit"
            radius={[0, 5, 5, 0]}
            isAnimationActive={false}
            maxBarSize={20}
          >
            {data.map((row) => (
              <Cell
                key={row.name}
                fill={resolveBarColor(row.name, colorOptions)}
              />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              fill="var(--muted)"
              fontSize={11}
              formatter={durationFormatter}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const ProjectBarChart = memo(ProjectBarChartInner);
export default ProjectBarChart;
