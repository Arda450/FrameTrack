//! Interne Segment Erzeugung für Verweildauer Berechnungen.

use crate::activity_repo::ActivityWithProject;

/// Zeitintervall mit Kategorie Label für Dwell Aggregation.
#[derive(Debug, Clone)]
pub(super) struct Segment {
    pub start_ts: u64,
    pub end_ts: u64,
    pub category: String,
}

/// Baut Kategorie Segmente aus aufsteigend sortierten Aktivitäten.
pub(super) fn build_segments(
    rows: &[ActivityWithProject],
    max_segment_gap_seconds: u64,
    tail_seconds: u64,
) -> Vec<Segment> {
    rows.iter()
        .map(|row| {
            let duration = explicit_duration(row, max_segment_gap_seconds, tail_seconds);
            Segment {
                start_ts: row.timestamp,
                end_ts: row.timestamp.saturating_add(duration),
                category: row.effective_category_key(),
            }
        })
        .collect()
}

/// Baut Projekt Segmente aus aufsteigend sortierten Aktivitäten.
pub(super) fn build_project_segments(
    rows: &[ActivityWithProject],
    max_segment_gap_seconds: u64,
    tail_seconds: u64,
) -> Vec<Segment> {
    rows.iter()
        .map(|row| {
            let duration = explicit_duration(row, max_segment_gap_seconds, tail_seconds);
            Segment {
                start_ts: row.timestamp,
                end_ts: row.timestamp.saturating_add(duration),
                category: row
                    .project_name
                    .clone()
                    .unwrap_or_else(|| "Ohne Projekt".to_string()),
            }
        })
        .collect()
}

/// Ermittelt die effektive Segmentdauer aus gespeicherter oder Fallback Zeit.
pub(super) fn explicit_duration(
    row: &ActivityWithProject,
    max_segment_gap_seconds: u64,
    fallback_seconds: u64,
) -> u64 {
    let duration = if row.duration_seconds > 0 {
        row.duration_seconds
    } else {
        fallback_seconds
    };
    duration.min(max_segment_gap_seconds)
}

/// Sortiert Segmente und fasst Restwerte bei Top N Limit zusammen.
pub(super) fn finalize_dwell_segments(
    totals: std::collections::HashMap<String, u64>,
    top_n: usize,
) -> Vec<super::DwellSegment> {
    let mut segments: Vec<super::DwellSegment> = totals
        .into_iter()
        .filter(|(_, v)| *v > 0)
        .map(|(name, value_seconds)| super::DwellSegment {
            name,
            value_seconds,
        })
        .collect();

    segments.sort_by(|a, b| b.value_seconds.cmp(&a.value_seconds));

    if top_n > 0 && segments.len() > top_n {
        let rest_sum: u64 = segments[top_n..].iter().map(|s| s.value_seconds).sum();
        segments.truncate(top_n);
        if rest_sum > 0 {
            segments.push(super::DwellSegment {
                name: "Sonstige".to_string(),
                value_seconds: rest_sum,
            });
        }
    }

    segments
}
