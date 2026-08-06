// holt den aktiven fenstertitel aus der windows api
// erzeugt zeitstempel

use crate::TrackingError;
use frametrack_core::{
    category_key_from_title_with_url, classify_activity_type_with_url, ActivityType,
};
use uiautomation::{
    types::{ControlType, Handle, TreeScope, UIProperty},
    variants::Variant,
    UIAutomation,
};
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW};

/// Ergebnis einer Fenster-Analyse beim Tracking (URL wird nicht persistiert).
#[derive(Debug, Clone)]
pub struct WindowAnalysis {
    pub activity_type: ActivityType,
    pub category_key: String,
}

/// Klassifikator für den Tracking-Thread.
///
/// Die UI-Automation-Instanz wird einmal pro Tracking-Lauf initialisiert. Eine
/// aus der Adressleiste gelesene URL bleibt ausschliesslich in `analyze`.
pub struct ActiveWindowClassifier {
    automation: Option<UIAutomation>,
}

impl ActiveWindowClassifier {
    pub fn new() -> Self {
        Self {
            automation: UIAutomation::new().ok(),
        }
    }

    pub fn analyze(&self, title: &str) -> WindowAnalysis {
        let ephemeral_url = self.read_ephemeral_browser_url(title);
        let activity_type =
            classify_activity_type_with_url(title, ephemeral_url.as_deref());
        let category_key =
            category_key_from_title_with_url(title, ephemeral_url.as_deref());
        WindowAnalysis {
            activity_type,
            category_key,
        }
    }

    pub fn classify(&self, title: &str) -> ActivityType {
        self.analyze(title).activity_type
    }

    fn read_ephemeral_browser_url(&self, title: &str) -> Option<String> {
        if !is_supported_browser_title(title) {
            return None;
        }
        let hwnd = unsafe { GetForegroundWindow() };
        self.automation.as_ref().and_then(|automation| {
            try_read_browser_url(automation, hwnd)
        })
    }
}

impl Default for ActiveWindowClassifier {
    fn default() -> Self {
        Self::new()
    }
}

// Gibt aktuelle Unix-Zeit in Sekunden zurück
pub fn current_timestamp() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

// get the title of the active window
pub fn try_get_active_window_title() -> Result<String, TrackingError> {
    let (_, title) = active_window_and_title()?;
    Ok(title)
}

fn active_window_and_title() -> Result<(windows::Win32::Foundation::HWND, String), TrackingError> {
    unsafe {
        let hwnd = GetForegroundWindow(); // hwnd ist ein handle to the active window, it is a pointer to the window handle
        if hwnd.0.is_null() {
            return Err(TrackingError::WindowNotFound);
        }

        let mut title: [u16; 512] = [0; 512];
        let len = GetWindowTextW(hwnd, &mut title);
        if len <= 0 {
            return Err(TrackingError::EmptyTitle);
        }

        Ok((hwnd, String::from_utf16_lossy(&title[..len as usize])))
    }
}

fn is_supported_browser_title(title: &str) -> bool {
    const BROWSER_SUFFIXES: &[&str] = &[
        "mozilla firefox",
        "google chrome",
        "microsoft edge",
        "brave",
        "opera",
        "vivaldi",
    ];
    let lower = title.to_lowercase();
    BROWSER_SUFFIXES
        .iter()
        .any(|browser| lower.ends_with(browser))
}

fn try_read_browser_url(
    automation: &UIAutomation,
    hwnd: windows::Win32::Foundation::HWND,
) -> Option<String> {
    let handle = Handle::from(hwnd.0 as isize);
    let window = automation.element_from_handle(handle).ok()?;
    let edit_condition = automation
        .create_property_condition(
            UIProperty::ControlType,
            Variant::from(ControlType::Edit as i32),
            None,
        )
        .ok()?;
    let edits = window
        .find_all(TreeScope::Descendants, &edit_condition)
        .ok()?;

    edits.into_iter().find_map(|element| {
        let value = element
            .get_property_value(UIProperty::ValueValue)
            .ok()?
            .get_string()
            .ok()?;
        looks_like_web_url(&value).then(|| value.trim().to_string())
    })
}

fn looks_like_web_url(value: &str) -> bool {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.chars().any(char::is_whitespace) {
        return false;
    }

    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return true;
    }

    let authority = trimmed.split(['/', '?', '#']).next().unwrap_or_default();
    authority.contains('.') && !authority.starts_with('.')
}

#[cfg(test)]
mod tests {
    use super::looks_like_web_url;

    #[test]
    fn recognises_web_urls_without_accepting_search_text() {
        assert!(looks_like_web_url("https://example.test/product/42"));
        assert!(looks_like_web_url("www.example.test/watch?v=42"));
        assert!(!looks_like_web_url("rust ownership tutorial"));
        assert!(!looks_like_web_url(""));
    }
}
