//! Klassifikationslogik auf Basis struktureller Titelsignale.

use super::signals::*;
use crate::window_context::activity_type::ActivityType;
use crate::window_context::title_parse::{
    contains_any, is_repo_like, is_ticket_like, parse_window_title, sanitized_url_path, ParsedTitle,
};

/// Klassifiziert einen Fenstertitel in eine Tätigkeitsklasse.
pub fn classify_activity_type(raw_title: &str) -> ActivityType {
    classify_activity_type_with_url(raw_title, None)
}

/// Klassifiziert einen Fenstertitel mit optionaler flüchtiger Browser URL.
pub fn classify_activity_type_with_url(
    raw_title: &str,
    ephemeral_url: Option<&str>,
) -> ActivityType {
    let Some(parsed) = parse_window_title(raw_title) else {
        return ActivityType::Other;
    };
    let url_path = ephemeral_url.and_then(sanitized_url_path);
    classify_from_parsed(&parsed, url_path.as_deref())
}

/// Ordnet ein geparstes Titelformat einer Tätigkeitsklasse zu.
fn classify_from_parsed(parsed: &ParsedTitle, url_path: Option<&str>) -> ActivityType {
    let full_lower = parsed.raw_core.to_lowercase();
    let app_lower = parsed.app_key.to_lowercase();
    let content_lower = parsed.content_lower();

    if has_development_signals(parsed, &full_lower, &app_lower) {
        return ActivityType::Development;
    }
    if has_communication_signals(&full_lower, &app_lower, &content_lower) {
        return ActivityType::Communication;
    }
    if has_organization_signals(parsed, &full_lower, &app_lower, &content_lower) {
        return ActivityType::Organization;
    }
    if has_research_signals(&content_lower, &full_lower) {
        return ActivityType::Research;
    }
    if has_entertainment_signals(parsed, &full_lower, &app_lower, &content_lower, url_path) {
        return ActivityType::Entertainment;
    }
    if has_shopping_signals(&full_lower, &app_lower, &content_lower, url_path) {
        return ActivityType::Shopping;
    }
    if has_system_signals(&full_lower, &app_lower, &content_lower) {
        return ActivityType::System;
    }

    ActivityType::Other
}

/// Erkennt Code Dateien und Entwicklungsdateinamen in Tokens.
pub(crate) fn has_code_file_signal(token: &str) -> bool {
    let lower = token.to_lowercase();
    CODE_FILENAMES.iter().any(|name| lower.contains(name))
        || CODE_EXTENSIONS.iter().any(|ext| lower.ends_with(ext))
}

/// Erkennt typische Quellcode Pfade im Text.
fn has_source_path_signal(text: &str) -> bool {
    let lower = text.to_lowercase();
    lower.contains("/src/")
        || lower.contains("\\src\\")
        || lower.contains("/crates/")
        || lower.contains("\\crates\\")
        || lower.contains("/components/")
        || lower.contains("\\components\\")
}

/// Prüft Entwicklungssignale in Titel und App Rolle.
fn has_development_signals(parsed: &ParsedTitle, full_lower: &str, app_lower: &str) -> bool {
    if parsed
        .content_tokens()
        .iter()
        .any(|token| is_repo_like(token) || has_code_file_signal(token))
    {
        return true;
    }

    if contains_any(full_lower, DEV_WORKFLOW_PHRASES)
        || contains_any(full_lower, DEV_URL_PATH_MARKERS)
        || has_source_path_signal(full_lower)
    {
        return true;
    }

    let app_probe = format!(" {app_lower} ");
    contains_any(&app_probe, DEV_APP_ROLE_SIGNALS)
        || parsed
            .content_tokens()
            .iter()
            .any(|token| has_code_file_signal(token))
}

/// Prüft Kommunikationssignale in Titel und App Rolle.
fn has_communication_signals(full_lower: &str, app_lower: &str, content_lower: &str) -> bool {
    let app_probe = format!(" {app_lower} ");
    contains_any(content_lower, COMMUNICATION_PHRASES)
        || contains_any(full_lower, COMMUNICATION_PHRASES)
        || contains_any(&app_probe, COMMUNICATION_APP_SIGNALS)
}

/// Prüft Organisationssignale wie Tickets und Office Dateien.
fn has_organization_signals(
    parsed: &ParsedTitle,
    full_lower: &str,
    app_lower: &str,
    content_lower: &str,
) -> bool {
    if parsed
        .content_tokens()
        .iter()
        .any(|token| is_ticket_like(token))
    {
        return true;
    }

    if parsed.content_tokens().iter().any(|token| {
        OFFICE_DOC_EXTENSIONS
            .iter()
            .any(|ext| token.to_lowercase().ends_with(ext))
    }) {
        return true;
    }

    let app_probe = format!(" {app_lower} ");
    contains_any(content_lower, ORGANIZATION_PHRASES)
        || contains_any(full_lower, ORGANIZATION_PHRASES)
        || contains_any(&app_probe, ORGANIZATION_APP_SIGNALS)
}

/// Prüft Recherche Phrasen im Inhalt.
fn has_research_signals(content_lower: &str, full_lower: &str) -> bool {
    contains_any(content_lower, RESEARCH_PHRASES) || contains_any(full_lower, RESEARCH_PHRASES)
}

/// Prüft Unterhaltungssignale in Titel, App und URL Pfad.
fn has_entertainment_signals(
    parsed: &ParsedTitle,
    full_lower: &str,
    app_lower: &str,
    content_lower: &str,
    url_path: Option<&str>,
) -> bool {
    let app_probe = format!(" {app_lower} ");
    contains_any(content_lower, ENTERTAINMENT_PHRASES)
        || contains_any(full_lower, ENTERTAINMENT_PHRASES)
        || url_path.is_some_and(|path| contains_any(path, ENTERTAINMENT_URL_MARKERS))
        || contains_any(&app_probe, ENTERTAINMENT_APP_SIGNALS)
        || is_media_or_game_app(app_lower)
        || parsed
            .content_tokens()
            .iter()
            .any(|token| is_media_platform_name(token))
}

/// Erkennt Medien oder Spiele Apps am Namen.
fn is_media_or_game_app(app_lower: &str) -> bool {
    app_lower.contains("game")
        || app_lower.ends_with(" video")
        || app_lower.ends_with(" music")
        || app_lower.ends_with(" player")
        || is_media_platform_name(app_lower)
}

/// Erkennt Medien Plattform Schlagwörter im Text.
fn is_media_platform_name(text: &str) -> bool {
    let lower = text.to_lowercase();
    contains_any(&lower, MEDIA_PLATFORM_KEYWORDS)
}

/// Prüft Einkaufssignale in Titel, App und URL Pfad.
fn has_shopping_signals(
    full_lower: &str,
    app_lower: &str,
    content_lower: &str,
    url_path: Option<&str>,
) -> bool {
    if SHOPPING_APP_FALSE_POSITIVES
        .iter()
        .any(|marker| app_lower.contains(marker))
    {
        return false;
    }

    let app_probe = format!(" {app_lower} ");
    contains_any(content_lower, SHOPPING_PHRASES)
        || contains_any(full_lower, SHOPPING_PHRASES)
        || contains_any(&app_probe, SHOPPING_APP_MARKERS)
        || url_path.is_some_and(|path| contains_any(path, SHOPPING_URL_MARKERS))
        || is_shopping_app_name(app_lower)
}

/// Erkennt Shop Apps am Namen.
fn is_shopping_app_name(app_lower: &str) -> bool {
    app_lower.ends_with("shop") || app_lower.contains("-shop") || app_lower.contains(" shop")
}

/// Prüft System und Einstellungssignale.
fn has_system_signals(full_lower: &str, app_lower: &str, content_lower: &str) -> bool {
    let app_probe = format!(" {app_lower} ");
    contains_any(content_lower, SYSTEM_PHRASES)
        || contains_any(full_lower, SYSTEM_PHRASES)
        || contains_any(&app_probe, SYSTEM_APP_SIGNALS)
}
