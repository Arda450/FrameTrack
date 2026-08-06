use frametrack_core::{models::WindowActivity, ActivityType};
use frametrack_db::{
    count_activities, create_project, delete_project, get_activities_filtered,
    get_activities_page, get_activity_overview_summary, get_project_stats_summary,
    insert_aggregated_activity_with_project, ActivitiesFilter,
};
use rusqlite::Connection;

fn open_test_db() -> Connection {
    frametrack_db::init_in_memory_database().expect("in-memory database")
}

fn sample_activity(title: &str, timestamp: u64) -> WindowActivity {
    WindowActivity {
        title: title.to_string(),
        timestamp,
        activity_type: ActivityType::Development,
        context_key: "VS Code".to_string(),
    }
}

#[test]
fn insert_and_filter_activities_by_project() {
    let conn = open_test_db();
    let project = create_project(&conn, "Major Project", 1_700_000_000).unwrap();
    let other = create_project(&conn, "Nebenprojekt", 1_700_000_001).unwrap();

    insert_aggregated_activity_with_project(
        &conn,
        &sample_activity("lib.rs - frametrack", 1_700_000_100),
        project.id,
        60,
    )
    .unwrap();
    insert_aggregated_activity_with_project(
        &conn,
        &sample_activity("Mail - Outlook", 1_700_000_200),
        other.id,
        30,
    )
    .unwrap();

    let filtered = get_activities_filtered(
        &conn,
        &ActivitiesFilter {
            project_id: Some(project.id),
            from_ts: None,
            to_ts: None,
            context_query: None,
        },
    )
    .unwrap();

    assert_eq!(filtered.len(), 1);
    assert_eq!(filtered[0].title, "lib.rs - frametrack");
    assert_eq!(filtered[0].duration_seconds, 60);
    assert_eq!(filtered[0].project_name.as_deref(), Some("Major Project"));
}

#[test]
fn paginated_query_respects_context_filter() {
    let conn = open_test_db();
    let project = create_project(&conn, "Test", 1_700_000_000).unwrap();

    insert_aggregated_activity_with_project(
        &conn,
        &sample_activity("lib.rs - frametrack - VS Code", 1_700_000_100),
        project.id,
        60,
    )
    .unwrap();
    insert_aggregated_activity_with_project(
        &conn,
        &sample_activity("Inbox - Outlook", 1_700_000_160),
        project.id,
        60,
    )
    .unwrap();

    let page = get_activities_page(
        &conn,
        &ActivitiesFilter {
            project_id: Some(project.id),
            from_ts: None,
            to_ts: None,
            context_query: Some("outlook".to_string()),
        },
        0,
        10,
        "timestamp".to_string(),
        "desc".to_string(),
    )
    .unwrap();

    assert_eq!(page.total_count, 1);
    assert_eq!(page.items.len(), 1);
    assert!(page.items[0].title.contains("Outlook"));
}

#[test]
fn overview_summary_aggregates_duration_seconds() {
    let conn = open_test_db();
    let project = create_project(&conn, "Test", 1_700_000_000).unwrap();

    insert_aggregated_activity_with_project(
        &conn,
        &sample_activity("Morning", 1_700_000_100),
        project.id,
        60,
    )
    .unwrap();
    insert_aggregated_activity_with_project(
        &conn,
        &sample_activity("Afternoon", 1_700_000_500),
        project.id,
        30,
    )
    .unwrap();

    let summary = get_activity_overview_summary(&conn, 1_700_000_000).unwrap();
    assert_eq!(summary.activity_count, 2);
    assert_eq!(summary.total_active_seconds, 90);
}

#[test]
fn delete_project_removes_its_activities() {
    let conn = open_test_db();
    let project = create_project(&conn, "Temp", 1_700_000_000).unwrap();

    insert_aggregated_activity_with_project(
        &conn,
        &sample_activity("Only row", 1_700_000_100),
        project.id,
        60,
    )
    .unwrap();

    assert_eq!(count_activities(&conn).unwrap(), 1);
    assert_eq!(delete_project(&conn, project.id).unwrap(), 1);
    assert_eq!(count_activities(&conn).unwrap(), 0);
    assert!(get_project_stats_summary(&conn, project.id, 0, 0, 0)
        .unwrap()
        .is_none());
}

#[test]
fn insert_skips_unknown_project_id() {
    let conn = open_test_db();

    insert_aggregated_activity_with_project(
        &conn,
        &sample_activity("orphan", 1_700_000_100),
        999,
        60,
    )
    .unwrap();

    assert_eq!(count_activities(&conn).unwrap(), 0);
}
