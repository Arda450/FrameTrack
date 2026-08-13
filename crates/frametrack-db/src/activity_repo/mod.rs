//! Lese und Schreibzugriff auf die Tabelle `activities`.
//!
//! Die `Connection` wird beim App Start erzeugt und als Parameter durchgereicht.

mod filter;
mod query;
mod stats;
mod types;
mod write;

pub use filter::filter_activities_by_project_ids;
pub use query::{get_activities_filtered, get_activities_page};
pub use stats::{
    get_activity_overview_summary, get_project_activity_totals, get_project_stats_summary,
};
pub use types::{
    ActivitiesFilter, ActivitiesPage, ActivityOverviewSummary, ActivityWithProject,
    ProjectActivityTotal, ProjectStatsSummary,
};
pub use write::{count_activities, delete_all_activities, insert_aggregated_activity_with_project};
