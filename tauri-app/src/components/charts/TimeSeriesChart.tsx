import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { CategoryTimeSeriesPoint } from "../../types";
import { colorForCategory } from "../../utils/chartColors";
import {
  formatBucketLabel,
  formatTimeSeriesAxisLabel,
  SECONDS_PER_DAY,
  timeSeriesValueUnit,
} from "../../utils/timeSeriesBuckets";
import {
  collapseTimeSeriesRows,
  hasAnyTimeSeriesActivity,
  MAX_DISPLAY_CATEGORIES,
  OTHER_CATEGORY,
  pickDisplayCategories,
  resolveCategoryNames,
  toTimeSeriesChartRows,
  trimLeadingEmptyBuckets,
} from "../../utils/timeSeriesTransform";
import { type TimeSeriesTooltipBodyProps } from "./ChartTooltip";
import { TimeSeriesTooltipPortal } from "./TimeSeriesTooltipPortal";
import { InfoHint } from "../shared/InfoHint";

type TimeSeriesChartProps = {
  data: CategoryTimeSeriesPoint[];
  categoryOrder?: readonly string[];
  bucketSeconds?: number;
  emptyHint?: string;
  /** Wenn false: leere Buckets am Tagesanfang behalten (Tagesbericht 00-24 Uhr). */
  trimLeadingEmptyBuckets?: boolean;
  /** Optional: Referenz auf den Plot-Container (z. B. für PDF-Export). */
  plotCaptureRef?: RefObject<HTMLDivElement | null>;
  /** Zeigt nur diesen Kontext (gesetzt per Legenden-Klick). */
  focusedCategory?: string | null;
};

const PX_PER_BUCKET = 28;
const CHART_HEIGHT = 420;
const Y_AXIS_TICK_WIDTH = 46;
const Y_AXIS_LABEL_OFFSET = 0;

/** Erzeugt die Y Achsen Beschriftung für den Zeitverlauf. */
function yAxisLabel(axisLabel: string) {
  return {
    value: axisLabel,
    angle: -90,
    position: "insideLeft" as const,
    offset: Y_AXIS_LABEL_OFFSET,
    fill: "var(--muted)",
    fontSize: 11,
    style: { textAnchor: "middle" as const },
  };
}

/** Stacked Balkendiagramm für aktive Zeit je Zeitfenster. */
function TimeSeriesChartInner({
  data,
  categoryOrder = [],
  bucketSeconds = 120,
  emptyHint = "Keine Zeitverlaufsdaten für den gewählten Zeitraum.",
  trimLeadingEmptyBuckets: shouldTrimLeading = true,
  plotCaptureRef,
  focusedCategory = null,
}: TimeSeriesChartProps) {
  const plotInnerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(Math.max(0, Math.floor(width) - 2));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const assignPlotRef = useCallback(
    (el: HTMLDivElement | null) => {
      plotInnerRef.current = el;
      if (plotCaptureRef) {
        plotCaptureRef.current = el;
      }
    },
    [plotCaptureRef],
  );

  const trimmed = useMemo(
    () => (shouldTrimLeading ? trimLeadingEmptyBuckets(data) : data),
    [data, shouldTrimLeading],
  );

  const allCategoryNames = useMemo(
    () => resolveCategoryNames(trimmed, categoryOrder),
    [trimmed, categoryOrder],
  );

  const isFocused =
    focusedCategory != null && allCategoryNames.includes(focusedCategory);

  const displayCategories = useMemo(() => {
    if (isFocused) {
      return [focusedCategory];
    }
    return pickDisplayCategories(trimmed, categoryOrder);
  }, [isFocused, focusedCategory, trimmed, categoryOrder]);

  const stackOrder = useMemo(() => {
    if (isFocused) {
      return [focusedCategory];
    }
    const totals = new Map<string, number>();
    for (const point of trimmed) {
      for (const cat of point.categories) {
        totals.set(cat.name, (totals.get(cat.name) ?? 0) + cat.value);
      }
    }
    return [...displayCategories].sort(
      (a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0),
    );
  }, [isFocused, focusedCategory, trimmed, displayCategories]);

  const unit = useMemo(
    () => timeSeriesValueUnit(bucketSeconds),
    [bucketSeconds],
  );

  const chartData = useMemo(() => {
    if (trimmed.length === 0 || allCategoryNames.length === 0) {
      return [];
    }
    const rows = toTimeSeriesChartRows(
      trimmed,
      allCategoryNames,
      bucketSeconds,
      formatTimeSeriesAxisLabel,
      unit.secondsToValue,
    );
    if (isFocused) {
      return rows.map((row) => ({
        ts: row.ts,
        label: row.label,
        [focusedCategory]: Number(row[focusedCategory] ?? 0),
      }));
    }
    return collapseTimeSeriesRows(rows, allCategoryNames, displayCategories);
  }, [
    trimmed,
    allCategoryNames,
    displayCategories,
    bucketSeconds,
    unit,
    isFocused,
    focusedCategory,
  ]);

  const bucketCapacity = useMemo(
    () => unit.secondsToValue(bucketSeconds),
    [unit, bucketSeconds],
  );

  const yAxisMax = useMemo(() => {
    let dataMax = 0;
    for (const row of chartData) {
      let bucketTotal = 0;
      for (const name of displayCategories) {
        bucketTotal += Number(row[name] ?? 0);
      }
      dataMax = Math.max(dataMax, bucketTotal);
    }
    return Math.max(bucketCapacity, dataMax * 1.05);
  }, [chartData, displayCategories, bucketCapacity]);

  const { chartWidth, denseAxis, bucketLabel } = useMemo(() => {
    const naturalWidth = chartData.length * PX_PER_BUCKET;
    const width = Math.max(naturalWidth, containerWidth || 480);
    return {
      chartWidth: width,
      denseAxis: chartData.length > 40,
      bucketLabel: formatBucketLabel(bucketSeconds),
    };
  }, [chartData.length, bucketSeconds, containerWidth]);

  const hasActivity = useMemo(
    () => hasAnyTimeSeriesActivity(trimmed, allCategoryNames),
    [trimmed, allCategoryNames],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = useCallback(
    (props: any) => (
      <TimeSeriesTooltipPortal
        active={props.active}
        payload={props.payload as TimeSeriesTooltipBodyProps["payload"]}
        label={props.label}
        coordinate={props.coordinate}
        chartRootRef={plotInnerRef}
        bucketSeconds={bucketSeconds}
      />
    ),
    [bucketSeconds],
  );

  if (trimmed.length === 0 || allCategoryNames.length === 0 || !hasActivity) {
    return (
      <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 8 }}>
        {emptyHint}
      </p>
    );
  }

  return (
    <div className="timeSeriesChartWrap">
      <div className="timeSeriesChartToolbar">
        <InfoHint label="Hilfe zum Zeitverlauf">
          {isFocused ? (
            <>
              Es wird nur <strong>{focusedCategory}</strong> angezeigt. In der
              Legende erneut tippen, um alle Kontexte zu sehen.
            </>
          ) : (
            <>
              Jeder Balken steht für ein {bucketLabel}-Fenster. Höhe = aktive
              Zeit, Farbe = Kontext. Selten genutzte Kontexte werden zu{" "}
              {OTHER_CATEGORY} zusammengefasst (max. {MAX_DISPLAY_CATEGORIES}).
              Horizontal scrollen für mehr Detail.
            </>
          )}
        </InfoHint>
      </div>
      <div
        ref={scrollRef}
        className="timeSeriesChartPlot timeSeriesChartPlotScroll"
      >
        <div
          ref={assignPlotRef}
          className="timeSeriesChartPlotInner"
          style={{ width: chartWidth, height: CHART_HEIGHT }}
        >
          <BarChart
            width={chartWidth}
            height={CHART_HEIGHT}
            data={chartData}
            margin={{ top: 8, right: 12, left: 30, bottom: denseAxis ? 20 : 4 }}
            barCategoryGap={denseAxis ? "12%" : "22%"}
            barGap={1}
          >
            <Tooltip
              shared
              allowEscapeViewBox={{ x: true, y: true }}
              reverseDirection={{ x: true, y: true }}
              content={renderTooltip}
              cursor={{ fill: "var(--border)", opacity: 0.25 }}
            />
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              minTickGap={4}
              interval={denseAxis ? 0 : "preserveStartEnd"}
              angle={denseAxis ? -35 : 0}
              textAnchor={denseAxis ? "end" : "middle"}
              height={denseAxis ? 48 : 30}
            />
            <YAxis
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              width={Y_AXIS_TICK_WIDTH}
              tickMargin={8}
              domain={[0, yAxisMax]}
              tickFormatter={(v) =>
                typeof v === "number" ? v.toFixed(1) : String(v)
              }
              label={yAxisLabel(unit.axisLabel)}
            />
            {bucketSeconds < SECONDS_PER_DAY ? (
              <ReferenceLine
                y={bucketCapacity}
                stroke="var(--muted)"
                strokeDasharray="4 4"
                strokeOpacity={0.45}
                ifOverflow="extendDomain"
              />
            ) : null}
            {stackOrder.map((name) => (
              <Bar
                key={name}
                stackId="activity"
                dataKey={name}
                name={name}
                fill={colorForCategory(name, categoryOrder)}
                maxBarSize={denseAxis ? 10 : 18}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </div>
      </div>
    </div>
  );
}

/** Memoisiertes Zeitverlaufsdiagramm für Berichte und Übersicht. */
const TimeSeriesChart = memo(TimeSeriesChartInner);
export default TimeSeriesChart;
