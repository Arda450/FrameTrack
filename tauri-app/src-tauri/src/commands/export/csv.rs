//! CSV Formatierung und Dateiausgabe für Exporte.

use std::path::PathBuf;

use chrono::{Local, TimeZone};

use crate::dto::export::{ExportActivity, ExportAggregated};
use crate::error::ApiError;

/// Maskiert Semikolons, Anführungszeichen und Zeilenumbrüche für CSV Felder.
pub(crate) fn escape_csv_field(value: &str) -> String {
    let needs_quotes = [';', '"', '\n', '\r'].iter().any(|&c| value.contains(c));
    if needs_quotes {
        let escaped = value.replace('"', "\"\"");
        return format!("\"{}\"", escaped);
    }
    value.to_string()
}

/// Formatiert einen Unix Zeitstempel als lokales Datum.
fn format_date_local(ts: u64) -> String {
    let ts = ts as i64;
    Local
        .timestamp_opt(ts, 0)
        .single()
        .map(|dt| dt.format("%d.%m.%Y").to_string())
        .unwrap_or_default()
}

/// Formatiert einen Unix Zeitstempel als lokale Uhrzeit.
fn format_time_local(ts: u64) -> String {
    let ts = ts as i64;
    Local
        .timestamp_opt(ts, 0)
        .single()
        .map(|dt| dt.format("%H:%M:%S").to_string())
        .unwrap_or_default()
}

/// Formatiert Sekunden als lesbare Dauer für CSV Ausgabe.
fn format_duration_hms(seconds: u64) -> String {
    let hours = seconds / 3600;
    let minutes = (seconds % 3600) / 60;
    let secs = seconds % 60;
    if hours > 0 {
        return std::format!("{} h {} min {} s", hours, minutes, secs);
    }
    if minutes > 0 {
        return std::format!("{} min {} s", minutes, secs);
    }
    std::format!("{} s", secs)
}

/// Baut die CSV Zeilen für Rohaktivitäten.
pub(crate) fn build_samples_csv(activities: &[ExportActivity]) -> String {
    let mut lines = Vec::with_capacity(activities.len() + 1);
    lines.push(
        "datum;uhrzeit;kontext;taetigkeitsklasse;fenstertitel;projekt;projekt_id;timestamp_unix"
            .to_string(),
    );

    for a in activities {
        let project_name = a.project_name.as_deref().unwrap_or("");
        let project_id = a.project_id.map(|id| id.to_string()).unwrap_or_default();

        lines.push(format!(
            "{};{};{};{};{};{};{};{}",
            escape_csv_field(&format_date_local(a.timestamp)),
            escape_csv_field(&format_time_local(a.timestamp)),
            escape_csv_field(&a.context_label),
            escape_csv_field(&a.activity_type),
            escape_csv_field(&a.title),
            escape_csv_field(project_name),
            escape_csv_field(&project_id),
            a.timestamp,
        ));
    }

    lines.join("\n")
}

/// Baut die CSV Zeilen für aggregierte Verweildauer.
pub(crate) fn build_aggregated_csv(aggregated: &ExportAggregated) -> String {
    let mut lines = vec!["projekt;projekt_id;kategorie;aktiv_sekunden;aktiv_lesbar".to_string()];

    for row in &aggregated.by_project_category {
        let project_name = row.project_name.as_deref().unwrap_or("");
        let project_id = row.project_id.map(|id| id.to_string()).unwrap_or_default();

        lines.push(format!(
            "{};{};{};{};{}",
            escape_csv_field(project_name),
            escape_csv_field(&project_id),
            escape_csv_field(&row.category),
            row.active_seconds,
            escape_csv_field(&format_duration_hms(row.active_seconds)),
        ));
    }

    lines.push(String::new());
    lines.push("projekt;projekt_id;gesamt_aktiv_sekunden;gesamt_lesbar".to_string());

    for row in &aggregated.by_project {
        let project_name = row.project_name.as_deref().unwrap_or("");
        let project_id = row.project_id.map(|id| id.to_string()).unwrap_or_default();

        lines.push(format!(
            "{};{};{};{}",
            escape_csv_field(project_name),
            escape_csv_field(&project_id),
            row.active_seconds,
            escape_csv_field(&format_duration_hms(row.active_seconds)),
        ));
    }

    lines.push(String::new());
    lines.push("taetigkeitsklasse;aktiv_sekunden;aktiv_lesbar".to_string());

    for row in &aggregated.by_activity_type {
        lines.push(format!(
            "{};{};{}",
            escape_csv_field(&row.activity_type),
            row.active_seconds,
            escape_csv_field(&format_duration_hms(row.active_seconds)),
        ));
    }

    lines.join("\n")
}

/// Schreibt CSV Text mit UTF-8 BOM in eine Datei.
pub(crate) fn write_csv_with_bom(path: &PathBuf, csv: &str) -> Result<(), ApiError> {
    let mut bytes = vec![0xEF, 0xBB, 0xBF];
    bytes.extend_from_slice(csv.as_bytes());
    std::fs::write(path, bytes).map_err(|e| ApiError::new("EXPORT_WRITE_FAILED", e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::escape_csv_field;

    /// Prüft CSV Maskierung für Sonderzeichen.
    #[test]
    fn escape_csv_field_quotes_semicolons_and_newlines() {
        assert_eq!(escape_csv_field("plain"), "plain");
        assert_eq!(escape_csv_field("a;b"), "\"a;b\"");
        assert_eq!(escape_csv_field("line\nbreak"), "\"line\nbreak\"");
        assert_eq!(escape_csv_field("say \"hi\""), "\"say \"\"hi\"\"\"");
    }
}
