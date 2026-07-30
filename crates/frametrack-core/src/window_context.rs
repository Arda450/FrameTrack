//! Normalisiert Windows-Fenstertitel zu lesbaren Kontext-Labels und klassifiziert Tätigkeitstypen.

use serde::Serialize;

/// Tätigkeitsklassen für die Übersichts-Aggregation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
pub enum ActivityType {
    Development,
    Communication,
    Research,
    Organization,
    Entertainment,
    Shopping,
    System,
    Other,
}

impl ActivityType {
    /// Deutscher Anzeigename für UI und Export.
    pub fn label(&self) -> &'static str {
        match self {
            Self::Development => "Entwicklung",
            Self::Communication => "Kommunikation",
            Self::Research => "Recherche",
            Self::Organization => "Organisation",
            Self::Entertainment => "Unterhaltung",
            Self::Shopping => "Einkaufen",
            Self::System => "System",
            Self::Other => "Sonstiges",
        }
    }

    /// Stabiler, sprachunabhängiger Wert für die lokale Persistenz.
    pub fn key(&self) -> &'static str {
        match self {
            Self::Development => "development",
            Self::Communication => "communication",
            Self::Research => "research",
            Self::Organization => "organization",
            Self::Entertainment => "entertainment",
            Self::Shopping => "shopping",
            Self::System => "system",
            Self::Other => "other",
        }
    }

    /// Liest einen zuvor persistierten Schlüssel.
    pub fn from_key(key: &str) -> Option<Self> {
        match key {
            "development" => Some(Self::Development),
            "communication" => Some(Self::Communication),
            "research" => Some(Self::Research),
            "organization" => Some(Self::Organization),
            "entertainment" => Some(Self::Entertainment),
            "shopping" => Some(Self::Shopping),
            "system" => Some(Self::System),
            "other" => Some(Self::Other),
            _ => None,
        }
    }

    /// Alle Varianten in fester Reihenfolge (für konsistente Charts).
    pub fn all() -> &'static [ActivityType] {
        &[
            Self::Development,
            Self::Communication,
            Self::Research,
            Self::Organization,
            Self::Entertainment,
            Self::Shopping,
            Self::System,
            Self::Other,
        ]
    }
}

const TITLE_SEPARATORS: &[&str] = &[" · ", " | ", " — ", " – ", " - "];

const BROWSER_WRAPPERS: &[&str] = &[
    "Mozilla Firefox",
    "Google Chrome",
    "Microsoft Edge",
    "Brave",
    "Opera",
    "Vivaldi",
];

fn strip_browser_suffix(title: &str) -> String {
    let mut out = title.trim().to_string();
    loop {
        let mut stripped = false;
        let lower = out.to_lowercase();
        'wrappers: for wrapper in BROWSER_WRAPPERS {
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

fn split_tokens(title: &str) -> Vec<String> {
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

fn is_repo_like(token: &str) -> bool {
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

fn is_ticket_like(token: &str) -> bool {
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

/// Leitet die stabile App-/Website-Identität aus der üblichen Titelform
/// `<Inhalt> – <App oder Website>` ab.
///
/// Die Auswahl ist absichtlich strukturbasiert: Neue Apps und Websites werden
/// dadurch automatisch gruppiert, ohne eine Namensliste pflegen zu müssen.
fn detect_app(tokens: &[String]) -> String {
    tokens
        .last()
        .cloned()
        .unwrap_or_else(|| "Unknown".to_string())
}

/// Stabiler Gruppierungsschlüssel für Charts, Berichte und aggregierte Exporte.
///
/// Details wie Dokument-, Video- oder Produktnamen werden entfernt, damit
/// verschiedene Fenster derselben App bzw. Website zusammengefasst werden.
pub fn category_key_from_title(raw_title: &str) -> String {
    let raw = raw_title.trim();
    if raw.is_empty() {
        return "Unknown".to_string();
    }

    let core = strip_browser_suffix(raw);
    let tokens = split_tokens(&core);
    if tokens.is_empty() {
        return "Unknown".to_string();
    }

    detect_app(&tokens)
}

/// Lesbarer App-/Website-Name für bestehende Aufrufer.
pub fn format_app_label_from_title(raw_title: &str) -> String {
    category_key_from_title(raw_title)
}

/// Kurzes Anzeige-Label für einen Roh-Fenstertitel.
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

/// Klassifiziert einen Fenstertitel in eine Tätigkeitsklasse.
///
/// Die Erkennung ist absichtlich **strukturbasiert**: Es werden Muster im
/// Titelformat (Dateiendungen, Ticket-IDs, Repo-Pfade, typische Phrasen,
/// URL-Pfadsegmente, Desktop-App-Rollen) ausgewertet – **ohne** Liste
/// bekannter Websites oder Domains.
pub fn classify_activity_type(raw_title: &str) -> ActivityType {
    classify_activity_type_with_url(raw_title, None)
}

/// Klassifiziert einen Fenstertitel mit einer optionalen, nur flüchtig
/// verwendeten Browser-URL.
///
/// Von der URL wird ausschliesslich der Pfad vor Query und Fragment betrachtet.
/// Domain, Query-Parameter und die URL selbst werden weder zurückgegeben noch
/// persistiert.
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

fn sanitized_url_path(url: &str) -> Option<String> {
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

#[derive(Debug, Clone)]
struct ParsedTitle {
    raw_core: String,
    tokens: Vec<String>,
    app_key: String,
    from_browser: bool,
}

impl ParsedTitle {
    fn content_tokens(&self) -> &[String] {
        if self.from_browser && self.tokens.len() > 1 {
            &self.tokens[..self.tokens.len() - 1]
        } else {
            &self.tokens
        }
    }

    fn content_lower(&self) -> String {
        self.content_tokens()
            .iter()
            .map(|t| t.as_str())
            .collect::<Vec<_>>()
            .join(" ")
            .to_lowercase()
    }
}

fn parse_window_title(raw: &str) -> Option<ParsedTitle> {
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

fn contains_any(haystack: &str, needles: &[&str]) -> bool {
    needles.iter().any(|needle| haystack.contains(needle))
}

const CODE_EXTENSIONS: &[&str] = &[
    ".rs", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".java", ".kt", ".kts",
    ".swift", ".c", ".cpp", ".h", ".hpp", ".cs", ".rb", ".php", ".sql", ".toml", ".yaml", ".yml",
    ".json", ".md", ".mdx", ".vue", ".svelte", ".scss", ".css", ".less", ".html", ".htm", ".xml",
    ".sh", ".bash", ".zsh", ".ps1", ".bat", ".wasm",
];

const CODE_FILENAMES: &[&str] = &[
    "cargo.toml",
    "cargo.lock",
    "package.json",
    "package-lock.json",
    "go.mod",
    "go.sum",
    "dockerfile",
    "makefile",
    "cmakelists.txt",
    "tsconfig.json",
    "vite.config",
    "tauri.conf.json",
];

const DEV_WORKFLOW_PHRASES: &[&str] = &[
    "pull request",
    "merge request",
    "code review",
    "ci/cd",
    "continuous integration",
    "build failed",
    "test failed",
    "test suite",
    "stack trace",
    "compiler error",
    "debug console",
    "git merge",
    "git rebase",
    "git commit",
    "localhost",
    "127.0.0.1",
    "::1",
];

const DEV_URL_PATH_MARKERS: &[&str] = &[
    "/pull/",
    "/pulls/",
    "/merge_requests/",
    "/merge-request/",
    "/issues/",
    "/commit/",
    "/commits/",
    "/tree/",
    "/blob/",
    "/compare/",
    "/actions/",
    "/pipelines/",
    "/runs/",
    "/ci/",
    "/packages/",
];

const DEV_APP_ROLE_SIGNALS: &[&str] = &[
    "terminal",
    "powershell",
    "command prompt",
    "cmd.exe",
    "shell",
    "console",
    " git",
    "studio",
    "editor",
    " ide",
    "vim",
    "emacs",
    "debug",
    "compiler",
    "docker",
    "kubernetes",
    "kubectl",
    "cargo",
    "webpack",
    "vite",
    "node.js",
];

const COMMUNICATION_PHRASES: &[&str] = &[
    "inbox",
    "outbox",
    "unread",
    "compose",
    "e-mail",
    "email",
    "nachricht",
    "chat",
    "meeting",
    "standup",
    "stand-up",
    "huddle",
    "video call",
    "voice call",
    "waiting room",
    "calendar invite",
    "einladung",
    "teams-besprechung",
    "zoom meeting",
];

const COMMUNICATION_APP_SIGNALS: &[&str] = &[
    "mail",
    "posteingang",
    "outlook",
    "thunderbird",
    "chat",
    "teams",
    "zoom",
    "meet",
    "skype",
    "telegram",
    "whatsapp",
    "signal",
    "discord",
    "slack",
    "kalender",
    "calendar",
];

const ORGANIZATION_PHRASES: &[&str] = &[
    "sprint",
    "backlog",
    "kanban",
    "roadmap",
    "milestone",
    "issue tracker",
    "project board",
    "task board",
    "to-do",
    "todo",
    "checklist",
    "planner",
    "zeiterfassung",
    "time tracking",
];

const ORGANIZATION_APP_SIGNALS: &[&str] = &[
    "explorer",
    "finder",
    "datei-explorer",
    "files",
    "pdf",
    "acrobat",
    "word",
    "excel",
    "powerpoint",
    "sheets",
    "slides",
    "keynote",
    "pages",
    "numbers",
    "figma",
    "miro",
    "whiteboard",
    "notizen",
    "notes",
    "notion",
    "obsidian",
    "logseq",
    "evernote",
    "onenote",
    "trello",
    "asana",
    "jira",
    "confluence",
    "linear",
    "clickup",
    "todoist",
];

const RESEARCH_PHRASES: &[&str] = &[
    "documentation",
    "dokumentation",
    "tutorial",
    "anleitung",
    "guide",
    "handbook",
    "reference",
    "api reference",
    "getting started",
    "how to",
    "wie man",
    "was ist",
    "erklärung",
    "learn ",
    " lernen",
    "course",
    "kurs",
    "specification",
    "spezifikation",
    "whitepaper",
    " wiki",
    "artikel",
    " blog",
    " docs",
    "manual",
    "handbuch",
    "faq",
    "cheatsheet",
];

const OFFICE_DOC_EXTENSIONS: &[&str] = &[".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];

const ENTERTAINMENT_PHRASES: &[&str] = &[
    "livestream",
    "live stream",
    "gameplay",
    "gaming",
    "playthrough",
    "speedrun",
    "playlist",
    "podcast",
    "soundtrack",
    "trailer",
    "episode",
    "season ",
    "serie",
    "film",
    "movie",
    "anime",
    "streamt",
    "jetzt live",
    "now playing",
    "hoerspiel",
    "hörspiel",
];

const ENTERTAINMENT_APP_SIGNALS: &[&str] = &[
    "steam",
    "epic games",
    "vlc",
    "media player",
    "xbox",
    "playstation",
    "nintendo",
    "gog galaxy",
    "battle.net",
];

const ENTERTAINMENT_URL_MARKERS: &[&str] = &[
    "/watch",
    "/track/",
    "/album/",
    "/videos/",
    "/video/",
    "/shorts/",
    "/playlist",
    "/live/",
    "/stream/",
    "/episode/",
    "/serien/",
    "/movies/",
];

const MEDIA_PLATFORM_KEYWORDS: &[&str] = &[
    "video", "stream", "music", "podcast", "radio", "anime", "film", "serie", "tv",
];

const SHOPPING_PHRASES: &[&str] = &[
    "warenkorb",
    "shopping cart",
    "checkout",
    "bestellung",
    "order confirmation",
    "lieferung",
    "produktdetails",
    "product details",
    "add to cart",
    "in den warenkorb",
    "jetzt kaufen",
    "buy now",
    "sale",
    "rabatt",
    "angebot",
    "preisvergleich",
];

const SHOPPING_APP_MARKERS: &[&str] = &[" store", " marketplace"];

const SHOPPING_URL_MARKERS: &[&str] = &[
    "/product/",
    "/products/",
    "/cart",
    "/basket",
    "/checkout",
    "/shop/",
    "/order/",
];

const SHOPPING_APP_FALSE_POSITIVES: &[&str] = &["photoshop", "workshop", "snapshop"];

const SYSTEM_PHRASES: &[&str] = &[
    "settings",
    "einstellungen",
    "control panel",
    "systemsteuerung",
    "task manager",
    "aufgabenverwaltung",
    "geräte-manager",
    "device manager",
    "windows update",
    "system configuration",
    "system preferences",
    "installer",
    "installation",
    "setup wizard",
    "registry editor",
    "disk management",
    "datenträgerverwaltung",
    "sicherheit",
    "security center",
];

const SYSTEM_APP_SIGNALS: &[&str] = &[
    "settings",
    "einstellungen",
    "systemsteuerung",
    "task manager",
    "aufgabenverwaltung",
    "geräte-manager",
    "device manager",
    "registry",
    "installer",
    "windows update",
    "control panel",
];

fn has_code_file_signal(token: &str) -> bool {
    let lower = token.to_lowercase();
    CODE_FILENAMES.iter().any(|name| lower.contains(name))
        || CODE_EXTENSIONS.iter().any(|ext| lower.ends_with(ext))
}

fn has_source_path_signal(text: &str) -> bool {
    let lower = text.to_lowercase();
    lower.contains("/src/")
        || lower.contains("\\src\\")
        || lower.contains("/crates/")
        || lower.contains("\\crates\\")
        || lower.contains("/components/")
        || lower.contains("\\components\\")
}

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

    // Desktop-Entwicklungswerkzeuge: generische Rollenwörter im App-Namen.
    let app_probe = format!(" {app_lower} ");
    contains_any(&app_probe, DEV_APP_ROLE_SIGNALS)
        || parsed
            .content_tokens()
            .iter()
            .any(|token| has_code_file_signal(token))
}

fn has_communication_signals(full_lower: &str, app_lower: &str, content_lower: &str) -> bool {
    let app_probe = format!(" {app_lower} ");
    contains_any(content_lower, COMMUNICATION_PHRASES)
        || contains_any(full_lower, COMMUNICATION_PHRASES)
        || contains_any(&app_probe, COMMUNICATION_APP_SIGNALS)
}

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

fn has_research_signals(content_lower: &str, full_lower: &str) -> bool {
    contains_any(content_lower, RESEARCH_PHRASES) || contains_any(full_lower, RESEARCH_PHRASES)
}

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

fn is_media_or_game_app(app_lower: &str) -> bool {
    app_lower.contains("game")
        || app_lower.ends_with(" video")
        || app_lower.ends_with(" music")
        || app_lower.ends_with(" player")
        || is_media_platform_name(app_lower)
}

fn is_media_platform_name(text: &str) -> bool {
    let lower = text.to_lowercase();
    contains_any(&lower, MEDIA_PLATFORM_KEYWORDS)
}

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

fn is_shopping_app_name(app_lower: &str) -> bool {
    app_lower.ends_with("shop") || app_lower.contains("-shop") || app_lower.contains(" shop")
}

fn has_system_signals(full_lower: &str, app_lower: &str, content_lower: &str) -> bool {
    let app_probe = format!(" {app_lower} ");
    contains_any(content_lower, SYSTEM_PHRASES)
        || contains_any(full_lower, SYSTEM_PHRASES)
        || contains_any(&app_probe, SYSTEM_APP_SIGNALS)
}

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

#[cfg(test)]
mod tests {
    use super::{
        classify_activity_type, classify_activity_type_with_url, format_app_label_from_title,
        format_context_label_from_title, sanitized_url_path, ActivityType,
    };

    #[test]
    fn groups_different_browser_pages_by_trailing_site_identity() {
        assert_eq!(
            format_app_label_from_title("Einführung in Rust – VideoPortal – Mozilla Firefox"),
            "VideoPortal"
        );
        assert_eq!(
            format_app_label_from_title(
                "Fortgeschrittene Patterns – VideoPortal – Mozilla Firefox"
            ),
            "VideoPortal"
        );
    }

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

    #[test]
    fn context_label_keeps_detail_but_uses_same_app_identity() {
        assert_eq!(
            format_context_label_from_title("Einführung in Rust – VideoPortal – Mozilla Firefox"),
            "VideoPortal: Einführung in Rust"
        );
    }

    #[test]
    fn browser_suffix_matching_is_case_insensitive() {
        assert_eq!(
            format_app_label_from_title("Produktdetails | Beispiel-Shop - google chrome"),
            "Beispiel-Shop"
        );
    }

    #[test]
    fn classifies_repo_and_pull_request_without_known_domains() {
        assert_eq!(
            classify_activity_type("myrepo/api - Pull Request #12 · ExampleHost · Google Chrome"),
            ActivityType::Development
        );
        assert_eq!(
            classify_activity_type("acme/website · ExampleHost · Mozilla Firefox"),
            ActivityType::Development
        );
    }

    #[test]
    fn classifies_code_files_and_terminals_structurally() {
        assert_eq!(
            classify_activity_type("OverviewPanel.tsx - frametrack - Cursor"),
            ActivityType::Development
        );
        assert_eq!(
            classify_activity_type("Administrator: Windows PowerShell"),
            ActivityType::Development
        );
    }

    #[test]
    fn classifies_tickets_and_office_docs_as_organization() {
        assert_eq!(
            classify_activity_type("PROJ-452 Sprint board · WorkTracker · Microsoft Edge"),
            ActivityType::Organization
        );
        assert_eq!(
            classify_activity_type("Budget Q3.xlsx - Excel"),
            ActivityType::Organization
        );
    }

    #[test]
    fn classifies_research_by_content_phrases_not_domains() {
        assert_eq!(
            classify_activity_type("Rust Ownership Guide · UnknownDocs · Mozilla Firefox"),
            ActivityType::Research
        );
        assert_eq!(
            classify_activity_type("How to async/await · LearningPortal · Google Chrome"),
            ActivityType::Research
        );
    }

    #[test]
    fn classifies_communication_by_meeting_and_mail_signals() {
        assert_eq!(
            classify_activity_type("Weekly Team Standup · VideoMeet · Google Chrome"),
            ActivityType::Communication
        );
        assert_eq!(
            classify_activity_type("Posteingang - Outlook"),
            ActivityType::Communication
        );
    }

    #[test]
    fn classifies_entertainment_structurally() {
        assert_eq!(
            classify_activity_type("Funny Cats · VideoPortal · Google Chrome"),
            ActivityType::Entertainment
        );
        assert_eq!(
            classify_activity_type("Cyberpunk 2077 · Steam"),
            ActivityType::Entertainment
        );
        assert_eq!(
            classify_activity_type_with_url(
                "Katzen Compilation · YouTube · Microsoft Edge",
                Some("https://www.youtube.com/watch?v=secret-id"),
            ),
            ActivityType::Entertainment
        );
    }

    #[test]
    fn classifies_shopping_without_hardcoded_domains() {
        assert_eq!(
            classify_activity_type("Produktdetails | Beispiel-Shop | Google Chrome"),
            ActivityType::Shopping
        );
        assert_eq!(
            classify_activity_type("Warenkorb · LocalStore · Mozilla Firefox"),
            ActivityType::Shopping
        );
        assert_eq!(
            classify_activity_type_with_url(
                "Logitech MX Master 3S | Digitec Galaxus | Google Chrome",
                Some("https://www.digitec.ch/de/s1/product/logitech-mx-master?tracking=secret"),
            ),
            ActivityType::Shopping
        );
    }

    #[test]
    fn classifies_system_and_settings() {
        assert_eq!(
            classify_activity_type("Einstellungen"),
            ActivityType::System
        );
        assert_eq!(
            classify_activity_type("Windows Update · Systemsteuerung"),
            ActivityType::System
        );
    }

    #[test]
    fn photoshop_is_not_classified_as_shopping() {
        assert_eq!(
            classify_activity_type("logo.psd - Adobe Photoshop"),
            ActivityType::Other
        );
    }

    #[test]
    fn tutorial_stays_research_not_entertainment() {
        assert_eq!(
            classify_activity_type("Rust Tutorial · VideoPortal · Google Chrome"),
            ActivityType::Research
        );
        assert_eq!(
            classify_activity_type_with_url(
                "Rust Tutorial - YouTube - Google Chrome",
                Some("https://www.youtube.com/watch?v=secret-id"),
            ),
            ActivityType::Research
        );
    }

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

    #[test]
    fn activity_type_keys_round_trip() {
        for activity_type in ActivityType::all() {
            assert_eq!(
                ActivityType::from_key(activity_type.key()),
                Some(*activity_type)
            );
        }
    }
}
