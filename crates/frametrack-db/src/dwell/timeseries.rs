//! Zeitverlauf Aggregation über feste Buckets.

use std::collections::{BTreeMap, HashMap};

use super::segments::{build_project_segments, build_segments, Segment};
use super::{CategoryTimeSeriesPoint, TimeSeriesOptions, SECONDS_PER_DAY};
use crate::activity_repo::ActivityWithProject;

/// Linker Rand des Charts ab erstem Aktivitäts Bucket, aber nicht vor from_ts.
pub(super) fn effective_from_ts(options: TimeSeriesOptions, rows: &[ActivityWithProject]) -> u64 {
    if options.align_to_range_start {
        return options.from_ts;
    }
    if rows.is_empty() {
        return options.from_ts;
    }
    let first_bucket = (rows[0].timestamp / options.bucket_seconds) * options.bucket_seconds;
    first_bucket.max(options.from_ts)
}

/// Prüft, ob die Zeitverlauf Optionen gültig sind.
pub(super) fn is_valid_timeseries_options(options: TimeSeriesOptions) -> bool {
    options.to_ts > options.from_ts
        && options.bucket_seconds > 0
        && options.max_segment_gap_seconds > 0
}

/// Erkennt Kalendertag Buckets anhand der Optionen.
pub(super) fn uses_calendar_day_buckets(options: TimeSeriesOptions) -> bool {
    options.align_to_range_start && options.bucket_seconds >= SECONDS_PER_DAY
}

/// Berechnet Bucket Start bei Kalendertagen ab range_start.
pub(super) fn calendar_bucket_start(ts: u64, range_start: u64, bucket_seconds: u64) -> u64 {
    if ts < range_start {
        return range_start;
    }
    let index = (ts - range_start) / bucket_seconds;
    range_start.saturating_add(index.saturating_mul(bucket_seconds))
}

/// Legt leere Bucket Startpunkte für den sichtbaren Bereich an.
pub(super) fn prefill_buckets(
    from_ts: u64,
    to_ts: u64,
    bucket_seconds: u64,
    calendar_buckets: bool,
) -> BTreeMap<u64, u64> {
    let mut out = BTreeMap::new();
    if to_ts <= from_ts || bucket_seconds == 0 {
        return out;
    }

    let first = if calendar_buckets {
        from_ts
    } else {
        (from_ts / bucket_seconds) * bucket_seconds
    };
    let mut cur = first;
    while cur < to_ts {
        out.insert(cur, 0);
        cur = cur.saturating_add(bucket_seconds);
    }

    out
}

/// Verteilt ein Segment auf Kategorie Buckets.
pub(super) fn add_segment_to_category_buckets(
    buckets: &mut BTreeMap<u64, HashMap<String, u64>>,
    seg: &Segment,
    options: TimeSeriesOptions,
) {
    add_clipped_range_to_category_buckets(
        buckets,
        &seg.category,
        seg.start_ts,
        seg.end_ts,
        options,
    );
}

/// Schneidet ein Zeitintervall auf Buckets zu und summiert pro Kategorie.
pub(super) fn add_clipped_range_to_category_buckets(
    buckets: &mut BTreeMap<u64, HashMap<String, u64>>,
    category: &str,
    start_ts: u64,
    end_ts: u64,
    options: TimeSeriesOptions,
) {
    if end_ts <= start_ts || options.to_ts <= options.from_ts || options.bucket_seconds == 0 {
        return;
    }

    let clip_start = start_ts.max(options.from_ts);
    let clip_end = end_ts.min(options.to_ts);
    if clip_end <= clip_start {
        return;
    }

    let calendar_buckets = uses_calendar_day_buckets(options);
    add_range_to_buckets(
        clip_start,
        clip_end,
        options.bucket_seconds,
        options.from_ts,
        calendar_buckets,
        |bucket_start, secs| {
            let map = buckets.entry(bucket_start).or_default();
            *map.entry(category.to_string()).or_insert(0) += secs;
        },
    );
}

/// Verteilt Sekunden eines Intervalls auf benachbarte Buckets.
pub(super) fn add_range_to_buckets<F>(
    start_ts: u64,
    end_ts: u64,
    bucket_seconds: u64,
    range_start: u64,
    calendar_buckets: bool,
    mut add: F,
) where
    F: FnMut(u64, u64),
{
    let mut cur = start_ts;

    while cur < end_ts {
        let bucket_start = if calendar_buckets {
            calendar_bucket_start(cur, range_start, bucket_seconds)
        } else {
            (cur / bucket_seconds) * bucket_seconds
        };
        let bucket_end = bucket_start.saturating_add(bucket_seconds);
        let chunk_end = end_ts.min(bucket_end);
        let secs = chunk_end.saturating_sub(cur);

        if secs > 0 {
            add(bucket_start, secs);
        }

        cur = chunk_end;
    }
}

/// Zeitverlauf pro Kategorie über Buckets für gestapelte Charts.
pub fn dwell_time_series_by_category(
    rows: &[ActivityWithProject],
    options: TimeSeriesOptions,
) -> Vec<CategoryTimeSeriesPoint> {
    if !is_valid_timeseries_options(options) {
        return Vec::new();
    }

    let from_ts = effective_from_ts(options, rows);
    let calendar_buckets = uses_calendar_day_buckets(options);
    let bucket_starts: Vec<u64> = prefill_buckets(
        from_ts,
        options.to_ts,
        options.bucket_seconds,
        calendar_buckets,
    )
    .into_keys()
    .collect();

    let mut buckets: BTreeMap<u64, HashMap<String, u64>> = bucket_starts
        .into_iter()
        .map(|ts| (ts, HashMap::new()))
        .collect();

    for seg in build_segments(rows, options.max_segment_gap_seconds, options.tail_seconds) {
        add_segment_to_category_buckets(&mut buckets, &seg, options);
    }

    buckets
        .into_iter()
        .map(|(bucket_start_ts, categories)| {
            let mut by_category: Vec<(String, u64)> = categories.into_iter().collect();
            by_category.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));

            CategoryTimeSeriesPoint {
                bucket_start_ts,
                by_category,
            }
        })
        .collect()
}

/// Zeitverlauf pro Projekt über Buckets ohne Rohaktivitäten.
pub fn dwell_time_series_by_project(
    rows: &[ActivityWithProject],
    options: TimeSeriesOptions,
) -> Vec<CategoryTimeSeriesPoint> {
    if !is_valid_timeseries_options(options) {
        return Vec::new();
    }

    let from_ts = effective_from_ts(options, rows);
    let bucket_starts: Vec<u64> =
        prefill_buckets(from_ts, options.to_ts, options.bucket_seconds, false)
            .into_keys()
            .collect();
    let mut buckets: BTreeMap<u64, HashMap<String, u64>> = bucket_starts
        .into_iter()
        .map(|ts| (ts, HashMap::new()))
        .collect();

    for seg in build_project_segments(rows, options.max_segment_gap_seconds, options.tail_seconds) {
        add_segment_to_category_buckets(&mut buckets, &seg, options);
    }

    buckets
        .into_iter()
        .map(|(bucket_start_ts, categories)| {
            let mut by_category: Vec<(String, u64)> = categories.into_iter().collect();
            by_category.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
            CategoryTimeSeriesPoint {
                bucket_start_ts,
                by_category,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::dwell_time_series_by_category;
    use crate::activity_repo::ActivityWithProject;
    use crate::dwell::TimeSeriesOptions;

    /// Erzeugt eine Testaktivität ohne abgeleitete Metadaten.
    fn activity(title: &str, timestamp: u64, duration_seconds: u64) -> ActivityWithProject {
        ActivityWithProject {
            title: title.to_string(),
            timestamp,
            project_id: Some(1),
            project_name: Some("Testprojekt".to_string()),
            duration_seconds,
            activity_type: None,
            context_key: None,
        }
    }

    /// Prüft gleiche Gruppierung in Zeitverlauf und Pie Chart.
    #[test]
    fn timeline_uses_the_same_grouping_as_the_pie_chart() {
        let rows = vec![
            activity("Produkt A | Beispiel-Shop | Google Chrome", 1_000, 20),
            activity("Produkt B | Beispiel-Shop | Google Chrome", 1_020, 25),
        ];

        let points = dwell_time_series_by_category(
            &rows,
            TimeSeriesOptions {
                from_ts: 900,
                to_ts: 1_200,
                bucket_seconds: 300,
                max_segment_gap_seconds: 120,
                tail_seconds: 2,
                align_to_range_start: true,
            },
        );

        assert_eq!(points.len(), 1);
        assert_eq!(
            points[0].by_category,
            vec![("Beispiel-Shop".to_string(), 45)]
        );
    }
}
