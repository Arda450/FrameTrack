//! Gemeinsame Dwell Aggregation für Export und Berichte.

use std::collections::HashMap;

use frametrack_core::ActivityType;
use frametrack_db::{
    dwell_by_category, dwell_by_category_in_range, ActivityWithProject, DwellOptions, DwellSegment,
};

/// Parameter für die Berechnung von Verweildauer Segmenten.
pub struct DwellSegmentParams {
    pub max_segment_gap_seconds: u64,
    pub tail_seconds: u64,
    pub from_ts: Option<u64>,
    pub to_ts: Option<u64>,
}

/// Berechnet Verweildauer Segmente für die übergebenen Zeilen.
pub fn dwell_segments_for_rows(
    rows: &[ActivityWithProject],
    params: &DwellSegmentParams,
) -> Vec<DwellSegment> {
    if rows.is_empty() {
        return Vec::new();
    }

    let opts = DwellOptions {
        max_segment_gap_seconds: params.max_segment_gap_seconds,
        tail_seconds: params.tail_seconds,
        top_n: 0,
    };

    match (params.from_ts, params.to_ts) {
        (Some(from), Some(to)) if to > from => dwell_by_category_in_range(rows, opts, from, to),
        _ => dwell_by_category(rows, opts),
    }
}

/// Ergebniszeile für Aggregation nach Tätigkeitsklasse.
pub struct ActivityTypeTotal {
    pub label: String,
    pub seconds: u64,
}

/// Sammelt die Indizes der Zeilen pro Tätigkeitsklasse ohne vorzeitiges Klonen.
fn indices_by_activity_type(rows: &[ActivityWithProject]) -> HashMap<ActivityType, Vec<usize>> {
    let mut map: HashMap<ActivityType, Vec<usize>> = HashMap::new();
    for (index, row) in rows.iter().enumerate() {
        map.entry(row.effective_activity_type())
            .or_default()
            .push(index);
    }
    map
}

/// Sammelt Zeilen anhand gespeicherter Indizes für Dwell Berechnungen.
pub(crate) fn gather_rows(
    rows: &[ActivityWithProject],
    indices: &[usize],
) -> Vec<ActivityWithProject> {
    indices.iter().map(|&i| rows[i].clone()).collect()
}

/// Aggregiert geschätzte aktive Zeit pro Tätigkeitsklasse.
pub fn totals_by_activity_type(
    rows: &[ActivityWithProject],
    params: &DwellSegmentParams,
) -> Vec<ActivityTypeTotal> {
    let grouped = indices_by_activity_type(rows);

    let mut result: Vec<ActivityTypeTotal> = ActivityType::all()
        .iter()
        .filter_map(|&at| {
            let indices = grouped.get(&at)?;
            let type_rows = gather_rows(rows, indices);
            let segments = dwell_segments_for_rows(&type_rows, params);
            let total: u64 = segments.iter().map(|s| s.value_seconds).sum();
            if total == 0 {
                return None;
            }
            Some(ActivityTypeTotal {
                label: at.label().to_string(),
                seconds: total,
            })
        })
        .collect();

    result.sort_by(|a, b| b.seconds.cmp(&a.seconds));
    result
}
