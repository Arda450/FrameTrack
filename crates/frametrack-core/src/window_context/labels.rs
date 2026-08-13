//! Stabile Gruppierungsschlüssel und Anzeige Labels aus Fenstertiteln.

use super::browser::strip_browser_suffix;
use super::title_parse::{
    contains_any, detect_app, is_repo_like, is_ticket_like, sanitized_url_path, split_tokens,
};

const REDDIT_URL_PATH_MARKERS: &[&str] = &["/r/", "/comments/"];

/// Leitet den stabilen Gruppierungsschlüssel aus dem Fenstertitel ab.
pub fn category_key_from_title(raw_title: &str) -> String {
    category_key_from_title_with_url(raw_title, None)
}

/// Wie [`category_key_from_title`], nutzt optional einen flüchtigen Browser URL Pfad.
pub fn category_key_from_title_with_url(raw_title: &str, ephemeral_url: Option<&str>) -> String {
    if let Some(path) = ephemeral_url.and_then(sanitized_url_path) {
        if let Some(site) = site_key_from_url_path(&path) {
            return site.to_string();
        }
    }

    category_key_from_title_tokens(raw_title)
}

/// Lesbarer App oder Website Name für bestehende Aufrufer.
pub fn format_app_label_from_title(raw_title: &str) -> String {
    category_key_from_title(raw_title)
}

/// Kurzes Anzeige Label für einen Roh Fenstertitel.
pub fn format_context_label_from_title(raw_title: &str) -> String {
    let raw = raw_title.trim();
    if raw.is_empty() {
        return "Unknown".to_string();
    }

    let core = strip_browser_suffix(raw);
    let tokens = split_tokens(&core);
    if tokens.is_empty() {
        return "Unknown".to_string();
    }

    let app = detect_app(&tokens);
    let entity = tokens
        .iter()
        .find(|t| is_repo_like(t) || is_ticket_like(t))
        .cloned();

    let details: Vec<String> = tokens
        .iter()
        .filter(|t| **t != app && entity.as_ref() != Some(t))
        .cloned()
        .collect();

    if let Some(entity) = entity {
        return format!("{app}: {entity}");
    }
    if !details.is_empty() {
        return format!("{app}: {}", details.join(" | "));
    }
    app
}

/// Bildet den Gruppierungsschlüssel nur aus Titel Tokens.
fn category_key_from_title_tokens(raw_title: &str) -> String {
    let raw = raw_title.trim();
    if raw.is_empty() {
        return "Unknown".to_string();
    }

    let core = strip_browser_suffix(raw);
    let tokens = split_tokens(&core);
    if tokens.is_empty() {
        return "Unknown".to_string();
    }

    if is_reddit_title_signal(&tokens, &core) {
        return "Reddit".to_string();
    }

    let key = detect_app(&tokens);
    if key.eq_ignore_ascii_case("reddit") {
        return "Reddit".to_string();
    }

    key
}

/// Mappt URL Pfade auf bekannte Site Schlüssel.
fn site_key_from_url_path(path: &str) -> Option<&'static str> {
    if contains_any(path, REDDIT_URL_PATH_MARKERS) {
        return Some("Reddit");
    }
    None
}

/// Erkennt Reddit an Titelinhalt oder Subreddit Token.
fn is_reddit_title_signal(tokens: &[String], core: &str) -> bool {
    let lower = core.to_lowercase();
    if lower.contains("reddit") {
        return true;
    }

    tokens.iter().any(|token| {
        let trimmed = token.trim();
        trimmed.starts_with("r/")
            && trimmed.len() > 2
            && trimmed
                .chars()
                .skip(2)
                .all(|c| c.is_ascii_alphanumeric() || c == '_')
    })
}

#[cfg(test)]
mod tests {
    use super::{
        category_key_from_title, category_key_from_title_with_url, format_app_label_from_title,
        format_context_label_from_title,
    };

    /// Prüft Gruppierung verschiedener Browser Seiten derselben Site.
    #[test]
    fn groups_different_browser_pages_by_trailing_site_identity() {
        assert_eq!(
            format_app_label_from_title("Einführung in Rust - VideoPortal - Mozilla Firefox"),
            "VideoPortal"
        );
        assert_eq!(
            format_app_label_from_title(
                "Fortgeschrittene Patterns - VideoPortal - Mozilla Firefox"
            ),
            "VideoPortal"
        );
    }

    /// Prüft Shop Gruppierung ohne feste Domain Liste.
    #[test]
    fn groups_different_shop_pages_without_known_site_names() {
        assert_eq!(
            format_app_label_from_title("Mechanische Tastatur | Beispiel-Shop | Google Chrome"),
            "Beispiel-Shop"
        );
        assert_eq!(
            format_app_label_from_title("Ergonomische Maus | Beispiel-Shop | Google Chrome"),
            "Beispiel-Shop"
        );
    }

    /// Prüft Desktop Dokument Gruppierung nach App Identität.
    #[test]
    fn groups_desktop_documents_by_trailing_app_identity() {
        assert_eq!(
            format_app_label_from_title("bericht.md - Arbeitseditor"),
            "Arbeitseditor"
        );
        assert_eq!(
            format_app_label_from_title("planung.md - Arbeitseditor"),
            "Arbeitseditor"
        );
    }

    /// Prüft Detail Label bei gleicher App Identität.
    #[test]
    fn context_label_keeps_detail_but_uses_same_app_identity() {
        assert_eq!(
            format_context_label_from_title("Einführung in Rust - VideoPortal - Mozilla Firefox"),
            "VideoPortal: Einführung in Rust"
        );
    }

    /// Prüft Reddit Erkennung über URL Pfad.
    #[test]
    fn groups_reddit_by_url_path_without_domain_lists() {
        assert_eq!(
            category_key_from_title_with_url(
                "Interessanter Thread - Google Chrome",
                Some("https://www.reddit.com/r/rust/comments/abc123/title/"),
            ),
            "Reddit"
        );
        assert_eq!(
            category_key_from_title_with_url(
                "Front page - Google Chrome",
                Some("https://old.reddit.com/r/programming/"),
            ),
            "Reddit"
        );
    }

    /// Prüft Reddit Erkennung aus Titel und Subreddit.
    #[test]
    fn groups_reddit_from_title_when_site_name_or_subreddit_present() {
        assert_eq!(
            category_key_from_title("r/rust - Ownership question - Reddit - Mozilla Firefox"),
            "Reddit"
        );
        assert_eq!(
            format_app_label_from_title("Some post title - Reddit - Google Chrome"),
            "Reddit"
        );
    }
}
