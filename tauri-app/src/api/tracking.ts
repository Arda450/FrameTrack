import { invoke } from "@tauri-apps/api/core";
import type { Project } from "../types";

/** Prüft ob das Fenster Tracking gerade aktiv ist. */
export function getTrackingStatus(): Promise<boolean> {
  return invoke<boolean>("is_tracking");
}

/** Startet das Aktivitäts Tracking im Hintergrund. */
export function startTracking(): Promise<void> {
  return invoke("start_tracking");
}

/** Stoppt das laufende Aktivitäts Tracking. */
export function stopTracking(): Promise<void> {
  return invoke("stop_tracking");
}

/** Liefert das aktuell aktive Projekt oder null. */
export function getActiveProject(): Promise<Project | null> {
  return invoke<Project | null>("get_active_project");
}
