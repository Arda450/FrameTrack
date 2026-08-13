//! Zerlegt Fenstertitel in Tokens und strukturierte Zwischenwerte.

use super::browser::{strip_browser_suffix, TITLE_SEPARATORS};

/// Prüft, ob ein String mindestens eine der Teilzeichenketten enthält.
pub(crate) fn contains_any(haystack: &str, needles: &[&str]) -> bool {
    needles.iter().any(|needle| haystack.contains(needle))
}

/// Zerlegt einen Titel an bekannten Trennzeichen in Tokens.
pub(crate) fn split_tokens(title: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let chars: Vec<char> = title.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if i + 2 < chars.len() {
            let triple: String = chars[i..i + 3].iter().collect();
            if TITLE_SEPARATORS.contains(&triple.as_str()) {
                if !current.trim().is_empty() {
                    tokens.push(current.trim().to_string());
                }
                current.clear();
                i += 3;
                continue;
            }
        }
        current.push(chars[i]);
        i += 1;
    }
    if !current.trim().is_empty() {
        tokens.push(current.trim().to_string());
    }
    tokens
}

/// Erkennt Repo Pfade der Form `owner/name`.
pub(crate) fn is_repo_like(token: &str) -> bool {
    let parts: Vec<&str> = token.split('/').collect();
    parts.len() == 2
        && !parts[0].is_empty()
        && !parts[1].is_empty()
        && parts[0]
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.')
        && parts[1]
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.')
}

/// Erkennt Ticket IDs der Form `PROJ-123`.
pub(crate) fn is_ticket_like(token: &str) -> bool {
    let Some((prefix, num)) = token.split_once('-') else {
        return false;
    };
    !prefix.is_empty()
        && prefix
            .chars()
            .next()
            .is_some_and(|c| c.is_ascii_uppercase())
        && prefix
            .chars()
            .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit())
        && !num.is_empty()
        && num.chars().all(|c| c.is_ascii_digit())
}

/// Liest die App oder Website Identität aus den Tokens.
pub(crate) fn detect_app(tokens: &[String]) -> String {
    tokens
        .last()
        .cloned()
        .unwrap_or_else(|| "Unknown".to_string())
}

/// Bereinigt eine Browser URL auf den Pfad ohne Domain und Query.
pub(crate) fn sanitized_url_path(url: &str) -> Option<String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return None;
    }

    let without_scheme = trimmed
        .split_once("://")
        .map(|(_, rest)| rest)
        .unwrap_or(trimmed);
    let path_start = without_scheme.find('/').unwrap_or(without_scheme.len());
    let path_and_query = &without_scheme[path_start..];
    let path_end = path_and_query
        .find(['?', '#'])
        .unwrap_or(path_and_query.len());
    let path = &path_and_query[..path_end];

    if path.is_empty() {
        Some("/".to_string())
    } else {
        Some(path.to_lowercase())
    }
}

/// Zwischenergebnis einer Titelanalyse für Klassifikation und Labels.
#[derive(Debug, Clone)]
pub(crate) struct ParsedTitle {
    pub raw_core: String,
    pub tokens: Vec<String>,
    pub app_key: String,
    pub from_browser: bool,
}

impl ParsedTitle {
    /// Liefert Inhaltstokens ohne trailing Browser Token.
    pub(crate) fn content_tokens(&self) -> &[String] {
        if self.from_browser && self.tokens.len() > 1 {
            &self.tokens[..self.tokens.len() - 1]
        } else {
            &self.tokens
        }
    }

    /// Joined Inhaltstokens in Kleinbuchstaben für Textsuche.
    pub(crate) fn content_lower(&self) -> String {
        self.content_tokens()
            .iter()
            .map(|t| t.as_str())
            .collect::<Vec<_>>()
            .join(" ")
            .to_lowercase()
    }
}

/// Parst einen Roh Fenstertitel in strukturierte Felder.
pub(crate) fn parse_window_title(raw: &str) -> Option<ParsedTitle> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    let core = strip_browser_suffix(trimmed);
    let from_browser = core != trimmed;
    let tokens = split_tokens(&core);
    if tokens.is_empty() {
        return None;
    }

    Some(ParsedTitle {
        app_key: detect_app(&tokens),
        raw_core: core,
        tokens,
        from_browser,
    })
}

#[cfg(test)]
mod tests {
    use super::sanitized_url_path;

    /// Prüft, dass Domain und Query aus URLs entfernt werden.
    #[test]
    fn url_sanitization_discards_domain_query_and_fragment() {
        assert_eq!(
            sanitized_url_path("https://shop.example/product/42?token=secret#details"),
            Some("/product/42".to_string())
        );
        assert_eq!(
            sanitized_url_path("www.example.test/watch?v=secret"),
            Some("/watch".to_string())
        );
    }
}
