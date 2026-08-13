//! Browser Erkennung für Titelbereinigung und URL Auslesen.

/// Anzeigenamen bekannter Browser in Fenstertiteln.
pub const BROWSER_NAMES: &[&str] = &[
    "Mozilla Firefox",
    "Google Chrome",
    "Microsoft Edge",
    "Brave",
    "Opera",
    "Vivaldi",
];

/// Trennzeichen zwischen Inhalt und Browsername in Fenstertiteln.
pub(crate) const TITLE_SEPARATORS: &[&str] = &[" · ", " | ", " — ", " - ", " - "];

/// Prüft, ob der Titel mit einem bekannten Browser endet.
pub fn is_supported_browser_title(title: &str) -> bool {
    let lower = title.to_lowercase();
    BROWSER_NAMES
        .iter()
        .any(|browser| lower.ends_with(&browser.to_lowercase()))
}

/// Entfernt wiederholt Browser Suffixe vom Fenstertitel.
pub(crate) fn strip_browser_suffix(title: &str) -> String {
    let mut out = title.trim().to_string();
    loop {
        let mut stripped = false;
        let lower = out.to_lowercase();
        'wrappers: for wrapper in BROWSER_NAMES {
            for separator in TITLE_SEPARATORS {
                let suffix = format!("{separator}{wrapper}");
                if lower.ends_with(&suffix.to_lowercase()) {
                    out = out[..out.len() - suffix.len()].trim().to_string();
                    stripped = true;
                    break 'wrappers;
                }
            }
        }
        if !stripped {
            break;
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::is_supported_browser_title;

    /// Prüft Browser Erkennung unabhängig von Gross und Kleinschreibung.
    #[test]
    fn browser_suffix_matching_is_case_insensitive() {
        assert!(is_supported_browser_title(
            "Produktdetails | Beispiel-Shop - google chrome"
        ));
        assert!(!is_supported_browser_title("bericht.md - Arbeitseditor"));
    }
}
