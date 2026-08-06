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
  type TimeSeriesValueUnit,
} from "../../utils/timeSeriesBuckets";
import { type TimeSeriesTooltipBodyProps } from "./ChartTooltip";
import { TimeSeriesTooltipPortal } from "./TimeSeriesTooltipPortal";
import { InfoHint } from "../shared/InfoHint";

type Props = {
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

type ChartRow = {
  ts: number;
  label: string;
  [category: string]: number | string;
};

/** Mindestbreite pro Bucket für horizontalen Scroll (Detailansicht). */
const PX_PER_BUCKET = 28;
const CHART_HEIGHT = 420;
const MAX_DISPLAY_CATEGORIES = 8;
const OTHER_CATEGORY = "Sonstige";
const Y_AXIS_TICK_WIDTH = 46;
const Y_AXIS_LABEL_OFFSET = 0;

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

export function resolveCategoryNames(
  data: readonly CategoryTimeSeriesPoint[],
  preferredOrder: readonly string[] = [],
): string[] {
  const extra = new Set<string>();
  for (const point of data) {
    for (const cat of point.categories) {
      if (!preferredOrder.includes(cat.name)) {
        extra.add(cat.name);
      }
    }
  }
  return [...preferredOrder, ...[...extra].sort()];
}

export function trimLeadingEmptyBuckets(
  data: CategoryTimeSeriesPoint[],
): CategoryTimeSeriesPoint[] {
  const firstWithActivity = data.findIndex((point) =>
    point.categories.some((c) => c.value > 0),
  );
  if (firstWithActivity <= 0) {
    return data;
  }
  return data.slice(firstWithActivity);
}

/**
 * Hängt einen leeren Abschluss-Bucket an (Grenze nach dem letzten Fenster).
 * Nötig, weil `stepAfter` die Stufe bis zum Folgepunkt zeichnet,sonst
 * bekommt der letzte Tag/das letzte Fenster (z. B. Sonntag) keine volle Spalte.
 */
export function appendTrailingBoundary(
  data: CategoryTimeSeriesPoint[],
  bucketSeconds: number,
): CategoryTimeSeriesPoint[] {
  if (data.length === 0) {
    return data;
  }
  const last = data[data.length - 1];
  return [...data, { ts: last.ts + bucketSeconds, categories: [] }];
}

function aggregateCategoryTotals(
  data: readonly CategoryTimeSeriesPoint[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const point of data) {
    for (const cat of point.categories) {
      totals.set(cat.name, (totals.get(cat.name) ?? 0) + cat.value);
    }
  }
  return totals;
}

/** Zeigt die wichtigsten Kategorien; Rest wird zu Sonstige zusammengefasst. */
export function pickDisplayCategories(
  data: readonly CategoryTimeSeriesPoint[],
  preferredOrder: readonly string[] = [],
): string[] {
  const allNames = resolveCategoryNames(data, preferredOrder);
  if (allNames.length <= MAX_DISPLAY_CATEGORIES) {
    return allNames;
  }

  const totals = aggregateCategoryTotals(data);
  const sorted = [...allNames].sort(
    (a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0),
  );
  const top = sorted.slice(0, MAX_DISPLAY_CATEGORIES - 1);
  const hasOtherBucket =
    sorted.slice(MAX_DISPLAY_CATEGORIES - 1).length > 0 ||
    top.includes(OTHER_CATEGORY);

  return hasOtherBucket ? [...top, OTHER_CATEGORY] : top;
}

function collapseRowsToDisplayCategories(
  rows: ChartRow[],
  allCategoryNames: readonly string[],
  displayCategories: readonly string[],
): ChartRow[] {
  const visible = new Set(
    displayCategories.filter((name) => name !== OTHER_CATEGORY),
  );

  return rows.map((row) => {
    const collapsed: ChartRow = {
      ts: row.ts,
      label: row.label,
    };
    let otherSum = 0;

    for (const name of allCategoryNames) {
      const value = Number(row[name] ?? 0);
      if (visible.has(name)) {
        collapsed[name] = value;
      } else if (name !== OTHER_CATEGORY) {
        otherSum += value;
      }
    }

    if (displayCategories.includes(OTHER_CATEGORY)) {
      collapsed[OTHER_CATEGORY] = otherSum + Number(row[OTHER_CATEGORY] ?? 0);
    }

    for (const name of displayCategories) {
      if (collapsed[name] === undefined) {
        collapsed[name] = 0;
      }
    }

    return collapsed;
  });
}

function toChartData(
  data: CategoryTimeSeriesPoint[],
  categoryNames: readonly string[],
  bucketSeconds: number,
  unit: TimeSeriesValueUnit,
): ChartRow[] {
  return data.map((point) => {
    const byName = new Map(
      point.categories.map((c) => [c.name, c.value] as const),
    );
    const row: ChartRow = {
      ts: point.ts,
      label: formatTimeSeriesAxisLabel(point.ts, bucketSeconds),
    };
    for (const name of categoryNames) {
      row[name] = unit.secondsToValue(byName.get(name) ?? 0);
    }
    return row;
  });
}

function hasAnyActivity(
  data: CategoryTimeSeriesPoint[],
  categoryNames: readonly string[],
): boolean {
  for (const point of data) {
    for (const cat of point.categories) {
      if (categoryNames.includes(cat.name) && cat.value > 0) {
        return true;
      }
    }
  }
  return false;
}

function TimeSeriesChartInner({
  data,
  categoryOrder = [],
  bucketSeconds = 120,
  emptyHint = "Keine Zeitverlaufsdaten für den gewählten Zeitraum.",
  trimLeadingEmptyBuckets: shouldTrimLeading = true,
  plotCaptureRef,
  focusedCategory = null,
}: Props) {
  const plotInnerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Verfügbare Breite des (stabilen) Scroll-Containers. Wird per ResizeObserver
  // gemessen, damit der Chart die Breite füllt statt Whitespace zu lassen.
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Der Scroll-Container ändert seine Breite NICHT, wenn der innere Chart
    // wächst (overflow-x: auto), daher keine ResizeObserver-Feedbackschleife.
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      // Puffer, damit ein exakt passender Chart keine Scrollbar auslöst.
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

  // Memoize: Trimmen und Kategorien extrahieren
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
    const totals = aggregateCategoryTotals(trimmed);
    return [...displayCategories].sort(
      (a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0),
    );
  }, [isFocused, focusedCategory, trimmed, displayCategories]);

  // Memoize: Einheit und Chart-Daten
  const unit = useMemo(
    () => timeSeriesValueUnit(bucketSeconds),
    [bucketSeconds],
  );

  const chartData = useMemo(() => {
    if (trimmed.length === 0 || allCategoryNames.length === 0) {
      return [];
    }
    const rows = toChartData(trimmed, allCategoryNames, bucketSeconds, unit);
    if (isFocused) {
      return rows.map((row) => ({
        ts: row.ts,
        label: row.label,
        [focusedCategory]: Number(row[focusedCategory] ?? 0),
      }));
    }
    return collapseRowsToDisplayCategories(
      rows,
      allCategoryNames,
      displayCategories,
    );
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

  // Memoize: Layout-Werte
  const { chartWidth, denseAxis, bucketLabel } = useMemo(() => {
    // Natürliche Breite (Detailansicht): mind. PX_PER_BUCKET pro Datenpunkt.
    const naturalWidth = chartData.length * PX_PER_BUCKET;
    // Container füllen, wenn wenige Punkte (Wochenbericht) → kein Whitespace.
    // Bei vielen Punkten (Tagesbericht) bleibt die natürliche Breite → Scroll.
    const width = Math.max(naturalWidth, containerWidth || 480);
    return {
      chartWidth: width,
      denseAxis: chartData.length > 40,
      bucketLabel: formatBucketLabel(bucketSeconds),
    };
  }, [chartData.length, bucketSeconds, containerWidth]);

  // Memoize: Prüfung ob Aktivität vorhanden
  const hasActivity = useMemo(
    () => hasAnyActivity(trimmed, allCategoryNames),
    [trimmed, allCategoryNames],
  );

  // Memoize: Tooltip-Renderer (vermeidet neue Funktionsreferenz bei jedem Render)
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

  // Early returns nach allen Hooks
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

// Memoized Export: Verhindert unnötige Re-Renders bei gleichen Props
const TimeSeriesChart = memo(TimeSeriesChartInner);
export default TimeSeriesChart;
