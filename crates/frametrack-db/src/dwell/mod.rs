//! Verweildauer Aggregation aus sortierten Aktivitätszeilen.

mod segments;
mod timeseries;

use std::collections::HashMap;

use crate::activity_repo::ActivityWithProject;

pub use timeseries::{dwell_time_series_by_category, dwell_time_series_by_project};

pub const SECONDS_PER_DAY: u64 = 86_400;

/// Ein aggregiertes Verweildauer Segment mit Name und Sekunden.
#[derive(Debug, Clone)]
pub struct DwellSegment {
    pub name: String,
    pub value_seconds: u64,
}

/// Steuerparameter für Kategorie und Projekt Verweildauer.
pub struct DwellOptions {
    pub max_segment_gap_seconds: u64,
    pub tail_seconds: u64,
    pub top_n: usize,
}

impl Default for DwellOptions {
    /// Liefert Standardwerte für Charts und Berichte.
    fn default() -> Self {
        Self {
            max_segment_gap_seconds: 120,
            tail_seconds: 2,
            top_n: 10,
        }
    }
}

/// Steuerparameter für Zeitverlauf Charts.
#[derive(Debug, Clone, Copy)]
pub struct TimeSeriesOptions {
    pub from_ts: u64,
    pub to_ts: u64,
    pub bucket_seconds: u64,
    pub max_segment_gap_seconds: u64,
    pub tail_seconds: u64,
    /// Wenn true beginnt die X Achse exakt bei from_ts.
    pub align_to_range_start: bool,
}

impl Default for TimeSeriesOptions {
    /// Liefert neutrale Standardwerte für leere Charts.
    fn default() -> Self {
        Self {
            from_ts: 0,
            to_ts: 0,
            bucket_seconds: 900,
            max_segment_gap_seconds: 120,
            tail_seconds: 2,
            align_to_range_start: false,
        }
    }
}

/// Ein Zeitverlauf Bucket mit Kategorie Summen.
#[derive(Debug, Clone)]
pub struct CategoryTimeSeriesPoint {
    pub bucket_start_ts: u64,
    pub by_category: Vec<(String, u64)>,
}

/// Schätzt Verweildauer pro Kategorie aus sortierten Projektaktivitäten.
pub fn dwell_by_category(rows: &[ActivityWithProject], options: DwellOptions) -> Vec<DwellSegment> {
    if rows.is_empty() {
        return Vec::new();
    }

    let mut totals: HashMap<String, u64> = HashMap::new();

    for seg in segments::build_segments(rows, options.max_segment_gap_seconds, options.tail_seconds)
    {
        let secs = seg.end_ts.saturating_sub(seg.start_ts);
        if secs > 0 {
            *totals.entry(seg.category).or_insert(0) += secs;
        }
    }

    segments::finalize_dwell_segments(totals, options.top_n)
}

/// Wie dwell_by_category, beschränkt Segmente auf from_ts bis to_ts.
pub fn dwell_by_category_in_range(
    rows: &[ActivityWithProject],
    options: DwellOptions,
    from_ts: u64,
    to_ts: u64,
) -> Vec<DwellSegment> {
    if rows.is_empty() || to_ts <= from_ts {
        return Vec::new();
    }

    let mut totals: HashMap<String, u64> = HashMap::new();

    for seg in segments::build_segments(rows, options.max_segment_gap_seconds, options.tail_seconds)
    {
        let clip_start = seg.start_ts.max(from_ts);
        let clip_end = seg.end_ts.min(to_ts);
        if clip_end > clip_start {
            *totals.entry(seg.category).or_insert(0) += clip_end - clip_start;
        }
    }

    segments::finalize_dwell_segments(totals, options.top_n)
}

/// Verweildauer pro Projekt für einen begrenzten Zeitraum.
pub fn dwell_by_project_in_range(
    rows: &[ActivityWithProject],
    options: DwellOptions,
    from_ts: u64,
    to_ts: u64,
) -> Vec<DwellSegment> {
    if rows.is_empty() || to_ts <= from_ts {
        return Vec::new();
    }

    let mut totals: HashMap<String, u64> = HashMap::new();
    for seg in segments::build_project_segments(
        rows,
        options.max_segment_gap_seconds,
        options.tail_seconds,
    ) {
        let clip_start = seg.start_ts.max(from_ts);
        let clip_end = seg.end_ts.min(to_ts);
        if clip_end > clip_start {
            *totals.entry(seg.category).or_insert(0) += clip_end - clip_start;
        }
    }

    segments::finalize_dwell_segments(totals, options.top_n)
}

#[cfg(test)]
mod tests {
    use super::{dwell_by_category, DwellOptions};
    use crate::activity_repo::ActivityWithProject;

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

    /// Prüft Pie Aggregation gleicher Site Seiten.
    #[test]
    fn pie_aggregation_combines_distinct_pages_of_the_same_site() {
        let rows = vec![
            activity("Erstes Video - VideoPortal - Mozilla Firefox", 1_000, 30),
            activity("Zweites Video - VideoPortal - Mozilla Firefox", 1_030, 45),
        ];

        let segments = dwell_by_category(
            &rows,
            DwellOptions {
                max_segment_gap_seconds: 120,
                tail_seconds: 2,
                top_n: 10,
            },
        );

        assert_eq!(segments.len(), 1);
        assert_eq!(segments[0].name, "VideoPortal");
        assert_eq!(segments[0].value_seconds, 75);
    }
}
