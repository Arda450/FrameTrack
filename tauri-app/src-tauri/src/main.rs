// Verhindert zusätzliches Konsolenfenster unter Windows im Release Build.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Startet die FrameTrack Desktop Anwendung.
fn main() {
    tauri_app_lib::run()
}
