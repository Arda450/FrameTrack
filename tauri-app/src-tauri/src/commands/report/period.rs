//! Perioden Aggregation für Tages und Wochenberichte.

use chrono::{Local, TimeZone};

use crate::commands::aggregation::{totals_by_activity_type, DwellSegmentParams};
use crate::dto::stats::{CategoryTimeSeriesPointDto, CategoryValueDto, DwellSegmentDto};
use frametrack_db::{
    dwell_by_category_in_range, dwell_by_project_in_range, dwell_time_series_by_category,
    ActivityWithProject, DwellOptions, TimeSeriesOptions,
};

pub const SECONDS_PER_DAY: u64 = 86_400;
pub const DEFAULT_GAP_SECS: u64 = 120;
pub const DEFAULT_TAIL_SECS: u64 = 2;

/// Dwell Parameter für Berichte und Lazy Projektaggregation.
#[derive(Debug, Clone, Copy)]
pub struct DwellParams {
    pub gap: u64,
    pub tail: u64,
}

impl DwellParams {
    /// Baut Dwell Parameter aus optionalen IPC Werten mit Standardfallback.
    pub fn from_options(max_segment_gap_seconds: Option<u64>, tail_seconds: Option<u64>) -> Self {
        Self {
            gap: max_segment_gap_seconds.unwrap_or(DEFAULT_GAP_SECS),
            tail: tail_seconds.unwrap_or(DEFAULT_TAIL_SECS),
        }
    }

    /// Erzeugt DwellOptions für direkte Aufrufe der DB Aggregationsfunktionen.
    pub(crate) fn dwell_opts(&self, top_n: usize) -> DwellOptions {
        DwellOptions {
            max_segment_gap_seconds: self.gap,
            tail_seconds: self.tail,
            top_n,
        }
    }

    /// Erzeugt Parameter für die gemeinsame Tätigkeitsklassen Aggregation.
    pub(crate) fn dwell_segment_params(
        &self,
        range_start: u64,
        range_end: u64,
    ) -> DwellSegmentParams {
        DwellSegmentParams {
            max_segment_gap_seconds: self.gap,
            tail_seconds: self.tail,
            from_ts: Some(range_start),
            to_ts: Some(range_end),
        }
    }
}

/// Eingaben für den gemeinsamen Berichtskern.
#[derive(Debug, Clone)]
pub struct PeriodBuildParams {
    pub range_start: u64,
    pub range_end_exclusive: u64,
    pub timeline_bucket_seconds: u64,
    pub dwell: DwellParams,
}

/// Gemeinsamer Kern beider Berichtstypen mit KPIs und Charts.
pub struct PeriodReportCore {
    pub project_name: Option<String>,
    pub total_active_seconds: u64,
    pub context_count: i64,
    pub first_activity_ts: Option<u64>,
    pub last_activity_ts: Option<u64>,
    pub by_category: Vec<DwellSegmentDto>,
    pub by_activity_type: Vec<DwellSegmentDto>,
    pub timeline: Vec<CategoryTimeSeriesPointDto>,
}

/// Berechnet lokale Mitternacht für einen Unix Zeitstempel.
pub fn day_start_from_ts(ts: u64) -> u64 {
    let ts = ts as i64;
    Local
        .timestamp_opt(ts, 0)
        .single()
        .and_then(|dt| {
            dt.date_naive()
                .and_hms_opt(0, 0, 0)
                .and_then(|ndt| ndt.and_local_timezone(Local).single())
        })
        .map(|ldt| ldt.timestamp() as u64)
        .unwrap_or(ts as u64)
}

/// Liefert exklusives Tagesende ab Mitternacht.
pub fn day_end_exclusive(day_start_ts: u64) -> u64 {
    day_start_ts.saturating_add(SECONDS_PER_DAY)
}

/// Mappt DB Dwell Segmente auf transportfähige DTOs.
fn map_dwell_segments(segments: Vec<frametrack_db::DwellSegment>) -> Vec<DwellSegmentDto> {
    segments
        .into_iter()
        .map(|s| DwellSegmentDto {
            name: s.name,
            value: s.value_seconds,
        })
        .collect()
}

/// Mappt DB Zeitverlauf Punkte auf transportfähige DTOs.
fn map_time_series_points(
    points: Vec<frametrack_db::CategoryTimeSeriesPoint>,
) -> Vec<CategoryTimeSeriesPointDto> {
    points
        .into_iter()
        .map(|p| CategoryTimeSeriesPointDto {
            ts: p.bucket_start_ts,
            categories: p
                .by_category
                .into_iter()
                .map(|(name, value)| CategoryValueDto { name, value })
                .collect(),
        })
        .collect()
}

/// Zählt aktive Kontexte ohne Sonstige Bucket.
fn count_distinct_contexts(segments: &[DwellSegmentDto]) -> i64 {
    segments
        .iter()
        .filter(|s| s.name != "Sonstige" && s.value > 0)
        .count() as i64
}

/// Baut KPIs, Kategorien und Zeitverlauf für Tages und Wochenberichte.
pub fn build_period_report_core(
    rows: &[ActivityWithProject],
    params: &PeriodBuildParams,
) -> PeriodReportCore {
    let range_start = params.range_start;
    let range_end = params.range_end_exclusive;
    let dwell = params.dwell;

    let by_category = map_dwell_segments(dwell_by_category_in_range(
        rows,
        dwell.dwell_opts(10),
        range_start,
        range_end,
    ));
    let by_activity_type =
        totals_by_activity_type(rows, &dwell.dwell_segment_params(range_start, range_end))
            .into_iter()
            .map(|total| DwellSegmentDto {
                name: total.label,
                value: total.seconds,
            })
            .collect();
    let all_segments =
        dwell_by_category_in_range(rows, dwell.dwell_opts(0), range_start, range_end);
    let total_active_seconds: u64 = all_segments.iter().map(|s| s.value_seconds).sum();
    let context_count = count_distinct_contexts(&map_dwell_segments(all_segments));

    let timeline = dwell_time_series_by_category(
        rows,
        TimeSeriesOptions {
            from_ts: range_start,
            to_ts: range_end,
            bucket_seconds: params.timeline_bucket_seconds.max(60),
            max_segment_gap_seconds: dwell.gap,
            tail_seconds: dwell.tail,
            align_to_range_start: true,
        },
    );

    PeriodReportCore {
        project_name: None,
        total_active_seconds,
        context_count,
        first_activity_ts: rows.first().map(|r| r.timestamp),
        last_activity_ts: rows.last().map(|r| r.timestamp),
        by_category,
        by_activity_type,
        timeline: map_time_series_points(timeline),
    }
}

/// Aggregiert aktive Zeit pro Projekt über einen Zeitraum.
pub fn compute_by_project_for_range(
    rows: &[ActivityWithProject],
    range_start: u64,
    range_end_exclusive: u64,
    dwell: DwellParams,
) -> Vec<DwellSegmentDto> {
    let segments =
        dwell_by_project_in_range(rows, dwell.dwell_opts(0), range_start, range_end_exclusive);

    let mut out: Vec<DwellSegmentDto> = segments
        .into_iter()
        .map(|segment| DwellSegmentDto {
            name: segment.name,
            value: segment.value_seconds,
        })
        .collect();

    out.sort_by(|a, b| b.value.cmp(&a.value).then_with(|| a.name.cmp(&b.name)));
    out
}

/// Aggregiert aktive Zeit pro Kalendertag für Wochenberichte.
pub fn compute_by_day(
    rows: &[ActivityWithProject],
    day_starts: &[u64],
    dwell: DwellParams,
) -> Vec<DwellSegmentDto> {
    let mut out: Vec<DwellSegmentDto> = day_starts
        .iter()
        .map(|&day_start| {
            let day_end = day_end_exclusive(day_start);
            let segments =
                dwell_by_category_in_range(rows, dwell.dwell_opts(0), day_start, day_end);
            let total: u64 = segments.iter().map(|s| s.value_seconds).sum();
            DwellSegmentDto {
                name: format_iso_date_local(day_start),
                value: total,
            }
        })
        .collect();

    out.sort_by(|a, b| a.name.cmp(&b.name));
    out
}

/// Formatiert einen Unix Zeitstempel als ISO Datum in lokaler Zeit.
pub fn format_iso_date_local(ts: u64) -> String {
    let ts = ts as i64;
    Local
        .timestamp_opt(ts, 0)
        .single()
        .map(|dt| dt.format("%Y-%m-%d").to_string())
        .unwrap_or_default()
}
