//! Tracking-Commands: Fenstererfassung starten/stoppen und Aktivitäten abfragen.
//!
//! Der Polling-Loop läuft in einem Hintergrund-Thread. Persistenz nur in SQLite
//! (keine unbegrenzte RAM-Liste). UI-Events (`new-activity`) nur bei Titelwechsel.

use std::sync::{atomic::Ordering, Arc, Mutex};
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, State};

use crate::dto::activity::ActivityDto;
use frametrack_core::models::WindowActivity;
use frametrack_tracking::{
    current_timestamp, minute_bucket_start, try_get_active_window_title, ActiveWindowClassifier,
    MinuteAccumulator, MinuteActivityKey, TrackingError, TrackingState, WindowAnalysis,
    SAMPLE_INTERVAL_SECONDS,
};

fn persist_dominant_minute(
    accumulator: &MinuteAccumulator,
    db: &Arc<Mutex<rusqlite::Connection>>,
    app: &AppHandle,
) {
    let Some(dominant) = accumulator.dominant_minute() else {
        return;
    };

    let Ok(db_conn) = db.lock() else {
        eprintln!("DB lock error while persisting minute");
        return;
    };
    if !frametrack_db::project_exists(&db_conn, dominant.key.project_id).unwrap_or(false) {
        return;
    }

    let activity = WindowActivity {
        title: dominant.key.title.clone(),
        timestamp: dominant.timestamp,
        activity_type: dominant.key.activity_type,
        context_key: dominant.key.context_key.clone(),
    };
    if let Err(error) = frametrack_db::insert_aggregated_activity_with_project(
        &db_conn,
        &activity,
        dominant.key.project_id,
        dominant.duration_seconds,
    ) {
        eprintln!("DB insert error: {}", error);
        return;
    }
    drop(db_conn);

    let dto = ActivityDto::from_parts(
        activity.title,
        activity.timestamp,
        Some(dominant.key.project_id),
        Some(dominant.key.project_name.clone()),
    );
    let _ = app.emit("new-activity", dto);
}

/// Erfasst das aktive Fenster leichtgewichtig alle zwei Sekunden im RAM.
/// Pro Minute wird nur die meistgenutzte App als aggregierter DB-Eintrag gespeichert.
#[tauri::command]
pub fn start_tracking(state: State<TrackingState>, app: AppHandle) {
    if state.is_running.swap(true, Ordering::SeqCst) {
        return;
    }

    if let Ok(mut active) = state.active_project.lock() {
        if let Some((project_id, _)) = active.clone() {
            let exists = state
                .db
                .lock()
                .ok()
                .and_then(|conn| frametrack_db::project_exists(&conn, project_id).ok())
                .unwrap_or(false);
            if !exists {
                *active = None;
                state.is_running.store(false, Ordering::SeqCst);
                eprintln!(
                    "Tracking nicht gestartet: Projekt #{project_id} existiert nicht mehr."
                );
                return;
            }
        }
    }

    let run_id = state.session_id.fetch_add(1, Ordering::SeqCst) + 1;
    let is_running = Arc::clone(&state.is_running);
    let session_id = Arc::clone(&state.session_id);
    let db = Arc::clone(&state.db);
    let active_project = Arc::clone(&state.active_project);
    let app_handle = app.clone();

    thread::spawn(move || {
        let mut accumulator = MinuteAccumulator::new(current_timestamp());
        let mut last_classification: Option<(String, frametrack_core::ActivityType, String)> = None;
        let classifier = ActiveWindowClassifier::new();

        while is_running.load(Ordering::SeqCst) && session_id.load(Ordering::SeqCst) == run_id {
            let timestamp = current_timestamp();
            if minute_bucket_start(timestamp) != accumulator.bucket_start() {
                persist_dominant_minute(&accumulator, &db, &app_handle);
                accumulator.reset(timestamp);
                last_classification = None;
            }

            let title = match try_get_active_window_title() {
                Ok(title) => title,
                Err(TrackingError::WindowNotFound | TrackingError::EmptyTitle) => {
                    thread::sleep(Duration::from_secs(SAMPLE_INTERVAL_SECONDS));
                    continue;
                }
                Err(e) => {
                    eprintln!("Tracking error: {}", e);
                    thread::sleep(Duration::from_secs(SAMPLE_INTERVAL_SECONDS));
                    continue;
                }
            };

            if !title.is_empty() {
                let analysis = match &last_classification {
                    Some((last_title, activity_type, context_key))
                        if last_title == &title =>
                    {
                        WindowAnalysis {
                            activity_type: *activity_type,
                            category_key: context_key.clone(),
                        }
                    }
                    _ => {
                        let analysis = classifier.analyze(&title);
                        last_classification = Some((
                            title.clone(),
                            analysis.activity_type,
                            analysis.category_key.clone(),
                        ));
                        analysis
                    }
                };
                let proj = active_project.lock().ok().and_then(|g| g.clone());
                if let Some((project_id, project_name)) = proj {
                    accumulator.record(
                        MinuteActivityKey {
                            project_id,
                            project_name,
                            title,
                            context_key: analysis.category_key,
                            activity_type: analysis.activity_type,
                        },
                        timestamp,
                    );
                }
            }

            thread::sleep(Duration::from_secs(SAMPLE_INTERVAL_SECONDS));
        }

        persist_dominant_minute(&accumulator, &db, &app_handle);
    });
}

/// Stoppt den Hintergrund-Thread (setzt `is_running` auf false).
pub fn stop_tracking_internal(state: &TrackingState) {
    state.is_running.store(false, Ordering::SeqCst);
    state.session_id.fetch_add(1, Ordering::SeqCst);
}

/// Stoppt den Hintergrund-Thread (setzt `is_running` auf false).
#[tauri::command]
pub fn stop_tracking(state: State<TrackingState>) {
    stop_tracking_internal(&state);
}

/// Gibt zurück, ob der Tracking-Loop aktuell läuft.
#[tauri::command]
pub fn is_tracking(state: State<TrackingState>) -> bool {
    state.is_running.load(Ordering::SeqCst)
}
