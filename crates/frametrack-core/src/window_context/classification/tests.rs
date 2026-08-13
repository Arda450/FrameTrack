use super::logic::{classify_activity_type, classify_activity_type_with_url};
use crate::window_context::ActivityType;

/// Prüft Repo und Pull Request Erkennung ohne Domain Listen.
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

/// Prüft Code Dateien und Terminal Erkennung.
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

/// Prüft Ticket und Office Dokument Erkennung.
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

/// Prüft Recherche anhand von Inhaltsphrasen.
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

/// Prüft Kommunikation anhand von Meeting und Mail Signalen.
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

/// Prüft Unterhaltungserkennung strukturell.
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

/// Prüft Einkaufserkennung ohne feste Domain Listen.
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

/// Prüft System und Einstellungen.
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

/// Prüft, dass Photoshop nicht als Shop gilt.
#[test]
fn photoshop_is_not_classified_as_shopping() {
    assert_eq!(
        classify_activity_type("logo.psd - Adobe Photoshop"),
        ActivityType::Other
    );
}

/// Prüft, dass Tutorials Recherche und nicht Unterhaltung sind.
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
