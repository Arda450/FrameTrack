//! Mehrprojektfilter auf bereits geladenen Aktivitätszeilen.

use super::types::ActivityWithProject;

/// Begrenzt bereits geladene Aktivitäten auf eine optionale Projekt Auswahl.
///
/// `None` bedeutet alle Projekte. Eine leere Auswahl liefert keine Zeilen.
/// Die Funktion wird von Berichten und Export gemeinsam verwendet.
pub fn filter_activities_by_project_ids(
    rows: Vec<ActivityWithProject>,
    project_ids: Option<&[i64]>,
) -> Vec<ActivityWithProject> {
    match project_ids {
        None => rows,
        Some(ids) => rows
            .into_iter()
            .filter(|row| row.project_id.is_some_and(|id| ids.contains(&id)))
            .collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use frametrack_core::ActivityType;

    /// Erzeugt eine Testzeile mit optionalem Projekt.
    fn sample_row(project_id: Option<i64>, title: &str) -> ActivityWithProject {
        ActivityWithProject {
            title: title.to_string(),
            timestamp: 1_700_000_000,
            project_id,
            project_name: project_id.map(|id| format!("Projekt {id}")),
            duration_seconds: 60,
            activity_type: Some(ActivityType::Development),
            context_key: None,
        }
    }

    /// Prüft, dass `None` alle Zeilen behält.
    #[test]
    fn none_keeps_all_rows() {
        let rows = vec![
            sample_row(Some(1), "a"),
            sample_row(Some(2), "b"),
            sample_row(None, "c"),
        ];
        let filtered = filter_activities_by_project_ids(rows.clone(), None);
        assert_eq!(filtered.len(), rows.len());
    }

    /// Prüft, dass eine leere Auswahl keine Zeilen liefert.
    #[test]
    fn empty_selection_returns_no_rows() {
        let rows = vec![sample_row(Some(1), "a"), sample_row(Some(2), "b")];
        let filtered = filter_activities_by_project_ids(rows, Some(&[]));
        assert!(filtered.is_empty());
    }

    /// Prüft Filterung auf passende Projekt IDs.
    #[test]
    fn filters_to_matching_project_ids() {
        let rows = vec![
            sample_row(Some(1), "a"),
            sample_row(Some(2), "b"),
            sample_row(Some(3), "c"),
        ];
        let filtered = filter_activities_by_project_ids(rows, Some(&[1, 3]));
        assert_eq!(filtered.len(), 2);
        assert!(filtered
            .iter()
            .all(|row| row.project_id == Some(1) || row.project_id == Some(3)));
    }

    /// Prüft, dass Zeilen ohne Projekt bei Filterung ausgeschlossen werden.
    #[test]
    fn rows_without_project_are_excluded_when_filtering() {
        let rows = vec![sample_row(Some(1), "a"), sample_row(None, "ohne projekt")];
        let filtered = filter_activities_by_project_ids(rows, Some(&[1]));
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].project_id, Some(1));
    }
}
