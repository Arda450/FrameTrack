//! SQLite Persistenz für Projekte, Aktivitäten und Aggregationen.

mod activity_repo;
mod dwell;
mod error;
mod project_repo;
mod schema;
mod seed;

pub use activity_repo::{
    count_activities, delete_all_activities, filter_activities_by_project_ids,
    get_activities_filtered, get_activities_page, get_activity_overview_summary,
    get_project_activity_totals, get_project_stats_summary,
    insert_aggregated_activity_with_project, ActivitiesFilter, ActivitiesPage,
    ActivityOverviewSummary, ActivityWithProject, ProjectActivityTotal, ProjectStatsSummary,
};
pub use dwell::{
    dwell_by_category, dwell_by_category_in_range, dwell_by_project_in_range,
    dwell_time_series_by_category, dwell_time_series_by_project, CategoryTimeSeriesPoint,
    DwellOptions, DwellSegment, TimeSeriesOptions,
};
pub use error::DbError;
pub use project_repo::{
    count_projects, create_project, delete_all_projects, delete_project, get_project_by_id,
    list_projects, project_exists, rename_project, upsert_project, DbProject,
};
pub use schema::{
    default_database_path, default_export_directory, init_database,
    init_in_memory_database, open_database,
};
pub use seed::{seed_demo_data, SeedOptions, SeedReport, SeedTimeMode};
