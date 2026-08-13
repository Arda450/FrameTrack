//! Export Commands für JSON, CSV und PDF.

mod csv;
mod payload;
mod request;

use tauri::State;

use crate::dto::export::ExportCsvResultDto;
use crate::error::ApiError;
use csv::{build_aggregated_csv, build_samples_csv, write_csv_with_bom};
use frametrack_tracking::TrackingState;

use payload::build_payload;
use request::{export_params, load_filtered_activities, parse_target_path};

/// Gibt gefilterte Aktivitäten als JSON String zurück.
#[tauri::command]
pub fn show_activities_json(
    state: State<TrackingState>,
    project_id: Option<i64>,
    project_ids: Option<Vec<i64>>,
    from_ts: Option<u64>,
    to_ts: Option<u64>,
    context_query: Option<String>,
) -> Result<String, ApiError> {
    let req = export_params(project_id, project_ids, from_ts, to_ts, context_query);
    let rows = load_filtered_activities(&state, &req)?;
    let payload = build_payload(rows, &req);

    serde_json::to_string(&payload)
        .map_err(|e| ApiError::new("JSON_SERIALIZE_FAILED", e.to_string()))
}

/// Speichert den JSON Export am angegebenen Pfad.
#[tauri::command]
pub fn export_activities_json_to_path(
    state: State<TrackingState>,
    project_id: Option<i64>,
    project_ids: Option<Vec<i64>>,
    from_ts: Option<u64>,
    to_ts: Option<u64>,
    context_query: Option<String>,
    target_path: String,
) -> Result<String, ApiError> {
    let out_path = parse_target_path(&target_path)?;
    let req = export_params(project_id, project_ids, from_ts, to_ts, context_query);
    let rows = load_filtered_activities(&state, &req)?;
    let payload = build_payload(rows, &req);

    let pretty = serde_json::to_string_pretty(&payload)
        .map_err(|e| ApiError::new("JSON_SERIALIZE_FAILED", e.to_string()))?;

    std::fs::write(&out_path, pretty)
        .map_err(|e| ApiError::new("EXPORT_WRITE_FAILED", e.to_string()))?;

    Ok(out_path.to_string_lossy().to_string())
}

/// Exportiert Rohdaten und Aggregationen gemeinsam als CSV Dateien.
///
/// Die flachen Parameter bilden bewusst den bestehenden IPC Vertrag ab.
#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub fn export_activities_csv_to_paths(
    state: State<TrackingState>,
    project_id: Option<i64>,
    project_ids: Option<Vec<i64>>,
    from_ts: Option<u64>,
    to_ts: Option<u64>,
    context_query: Option<String>,
    samples_path: String,
    aggregated_path: String,
) -> Result<ExportCsvResultDto, ApiError> {
    let samples_out = parse_target_path(&samples_path)?;
    let aggregated_out = parse_target_path(&aggregated_path)?;
    let req = export_params(project_id, project_ids, from_ts, to_ts, context_query);
    let rows = load_filtered_activities(&state, &req)?;
    let payload = build_payload(rows, &req);

    let mut samples = payload.activities;
    samples.sort_by_key(|a| a.timestamp);

    write_csv_with_bom(&samples_out, &build_samples_csv(&samples))?;
    write_csv_with_bom(&aggregated_out, &build_aggregated_csv(&payload.aggregated))?;

    Ok(ExportCsvResultDto {
        samples_path: samples_out.to_string_lossy().to_string(),
        aggregated_path: aggregated_out.to_string_lossy().to_string(),
    })
}

/// Speichert PDF Bytes am angegebenen Pfad.
#[tauri::command]
pub fn export_report_pdf_to_path(
    pdf_bytes: Vec<u8>,
    target_path: String,
) -> Result<String, ApiError> {
    if pdf_bytes.is_empty() {
        return Err(ApiError::new(
            "EXPORT_EMPTY_PDF",
            "PDF-Export enthält keine Daten.",
        ));
    }

    let out_path = parse_target_path(&target_path)?;

    std::fs::write(&out_path, pdf_bytes)
        .map_err(|e| ApiError::new("EXPORT_WRITE_FAILED", e.to_string()))?;

    Ok(out_path.to_string_lossy().to_string())
}
