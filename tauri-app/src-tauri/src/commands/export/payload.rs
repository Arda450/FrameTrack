//! JSON Payload und Dwell Aggregation für Exporte.

use std::collections::{HashMap, HashSet};

use chrono::Local;

use crate::commands::aggregation::{dwell_segments_for_rows, gather_rows, totals_by_activity_type};
use crate::dto::export::{
    ExportActivity, ExportAggregated, ExportAggregatedActivityTypeRow, ExportAggregatedCategoryRow,
    ExportAggregatedProjectRow, ExportMeta, ExportPayload,
};
use frametrack_db::{ActivitiesFilter, ActivityWithProject};
use frametrack_tracking::current_timestamp;

use super::request::{dwell_params_from_filter, to_export_activity, ExportRequest};

/// Aggregiert Verweildauer nach Projekt, Kategorie und Tätigkeitsklasse.
pub(crate) fn compute_aggregated(
    rows: &[ActivityWithProject],
    filter: &ActivitiesFilter,
) -> ExportAggregated {
    let dwell_params = dwell_params_from_filter(filter);
    let mut by_project: HashMap<Option<i64>, Vec<usize>> = HashMap::new();

    for (index, row) in rows.iter().enumerate() {
        by_project.entry(row.project_id).or_default().push(index);
    }

    let mut by_project_category: Vec<ExportAggregatedCategoryRow> = Vec::new();

    for (project_id, indices) in by_project {
        let project_rows = gather_rows(rows, &indices);
        let project_name = project_rows.first().and_then(|r| r.project_name.clone());

        let segments = dwell_segments_for_rows(&project_rows, &dwell_params);

        for seg in segments {
            if seg.value_seconds == 0 {
                continue;
            }
            by_project_category.push(ExportAggregatedCategoryRow {
                project_id,
                project_name: project_name.clone(),
                category: seg.name,
                active_seconds: seg.value_seconds,
            });
        }
    }

    by_project_category.sort_by(|a, b| {
        b.active_seconds.cmp(&a.active_seconds).then_with(|| {
            a.project_name
                .cmp(&b.project_name)
                .then_with(|| a.category.cmp(&b.category))
        })
    });

    let mut project_totals: HashMap<Option<i64>, (Option<String>, u64)> = HashMap::new();
    for row in &by_project_category {
        let entry = project_totals
            .entry(row.project_id)
            .or_insert((row.project_name.clone(), 0));
        entry.1 = entry.1.saturating_add(row.active_seconds);
    }

    let mut by_project_summary: Vec<ExportAggregatedProjectRow> = project_totals
        .into_iter()
        .map(
            |(project_id, (project_name, active_seconds))| ExportAggregatedProjectRow {
                project_id,
                project_name,
                active_seconds,
            },
        )
        .collect();

    by_project_summary.sort_by(|a, b| {
        b.active_seconds
            .cmp(&a.active_seconds)
            .then_with(|| a.project_name.cmp(&b.project_name))
    });

    let by_activity_type = totals_by_activity_type(rows, &dwell_params)
        .into_iter()
        .map(|total| ExportAggregatedActivityTypeRow {
            activity_type: total.label,
            active_seconds: total.seconds,
        })
        .collect();

    ExportAggregated {
        by_project_category,
        by_project: by_project_summary,
        by_activity_type,
    }
}

/// Baut die exportierte JSON Struktur inklusive Metadaten.
pub(crate) fn build_payload(rows: Vec<ActivityWithProject>, req: &ExportRequest) -> ExportPayload {
    let active_project_ids: HashSet<i64> = rows.iter().filter_map(|row| row.project_id).collect();
    let filter_project_id = req
        .filter
        .project_id
        .filter(|project_id| active_project_ids.contains(project_id));
    let filter_project_ids = req.project_ids.as_ref().map(|project_ids| {
        project_ids
            .iter()
            .copied()
            .filter(|project_id| active_project_ids.contains(project_id))
            .collect()
    });
    let aggregated = compute_aggregated(&rows, &req.filter);
    let export_activities: Vec<ExportActivity> = rows.into_iter().map(to_export_activity).collect();
    let sample_count = export_activities.len();
    let aggregated_count = aggregated.by_project_category.len();

    ExportPayload {
        meta: ExportMeta {
            exported_at_unix: current_timestamp(),
            sample_count,
            aggregated_count,
            timezone: Local::now().offset().to_string(),
            filter_project_id,
            filter_project_ids,
            filter_from_ts: req.filter.from_ts,
            filter_to_ts: req.filter.to_ts,
            filter_context_query: req.filter.context_query.clone(),
        },
        activities: export_activities,
        aggregated,
    }
}

#[cfg(test)]
mod tests {
    use super::{build_payload, compute_aggregated};
    use crate::commands::export::request::ExportRequest;
    use frametrack_core::ActivityType;
    use frametrack_db::{ActivitiesFilter, ActivityWithProject};

    /// Erzeugt eine Testzeile mit Entwicklungsmetadaten.
    fn sample_row(title: &str, timestamp: u64, duration_seconds: u64) -> ActivityWithProject {
        ActivityWithProject {
            title: title.to_string(),
            timestamp,
            project_id: Some(1),
            project_name: Some("Testprojekt".to_string()),
            duration_seconds,
            activity_type: Some(ActivityType::Development),
            context_key: Some("VS Code".to_string()),
        }
    }

    /// Prüft Metadaten und Aktivitätszeilen im Export Payload.
    #[test]
    fn build_payload_sets_meta_and_activity_rows() {
        let rows = vec![
            sample_row("lib.rs - frametrack", 1_700_000_100, 60),
            sample_row("README.md - frametrack", 1_700_000_200, 30),
        ];
        let req = ExportRequest::from_params(None, Some(vec![1, 2]), None, None, None);
        let payload = build_payload(rows, &req);

        assert_eq!(payload.meta.filter_project_ids, Some(vec![1]));
        assert_eq!(payload.meta.sample_count, 2);
        assert_eq!(payload.activities.len(), 2);
        assert_eq!(payload.activities[0].activity_type, "Entwicklung");
        assert!(!payload.aggregated.by_project_category.is_empty());
    }

    /// Prüft Kategorieaggregation für mehrere Seiten einer Site.
    #[test]
    fn compute_aggregated_groups_same_context_for_one_project() {
        let rows = vec![
            sample_row("Page A - Example - Chrome", 1_000, 20),
            sample_row("Page B - Example - Chrome", 1_020, 25),
        ];
        let filter = ActivitiesFilter {
            project_id: Some(1),
            from_ts: None,
            to_ts: None,
            context_query: None,
        };

        let aggregated = compute_aggregated(&rows, &filter);
        let total: u64 = aggregated
            .by_project_category
            .iter()
            .map(|row| row.active_seconds)
            .sum();

        assert_eq!(total, 45);
        assert_eq!(aggregated.by_project.len(), 1);
        assert_eq!(aggregated.by_project[0].active_seconds, 45);
    }
}
