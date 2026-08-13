//! Tauri Backend Einstiegspunkt und Command Registrierung.

mod commands;
mod dto;
mod error;

use commands::{
    clear_all_activities, clear_all_projects, create_project, delete_project,
    export_activities_csv_to_paths, export_activities_json_to_path, export_report_pdf_to_path,
    get_active_project, get_activities_page, get_app_stats, get_by_project_for_range,
    get_daily_report, get_dwell_by_category, get_export_directory, get_overview_stats,
    get_project_stats, get_projects, get_time_series_by_category, get_weekly_report, is_tracking,
    rename_project, set_active_project, show_activities_json, start_tracking, stop_tracking,
};
use frametrack_db::init_database;
use frametrack_tracking::TrackingState;

/// Startet die Tauri Anwendung mit Datenbank, Plugins und IPC Commands.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = init_database().unwrap_or_else(|e| panic!("Failed to initialize database: {}", e));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage(TrackingState::new(db))
        .invoke_handler(tauri::generate_handler![
            set_active_project,
            create_project,
            delete_project,
            rename_project,
            get_projects,
            get_active_project,
            start_tracking,
            stop_tracking,
            get_activities_page,
            get_daily_report,
            get_weekly_report,
            get_by_project_for_range,
            get_dwell_by_category,
            get_time_series_by_category,
            get_overview_stats,
            get_project_stats,
            is_tracking,
            show_activities_json,
            export_activities_json_to_path,
            export_activities_csv_to_paths,
            export_report_pdf_to_path,
            get_app_stats,
            get_export_directory,
            clear_all_activities,
            clear_all_projects,
        ])
        .run(tauri::generate_context!("tauri.conf.json"))
        .expect("error while running tauri application");
}
