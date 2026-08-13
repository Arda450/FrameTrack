import { invoke } from "@tauri-apps/api/core";

/** Löscht alle erfassten Aktivitäten und gibt deren Anzahl zurück. */
export function clearAllActivities(): Promise<number> {
  return invoke<number>("clear_all_activities");
}

/** Löscht alle Projekte und Aktivitäten vollständig. */
export function clearAllProjects(): Promise<number> {
  return invoke<number>("clear_all_projects");
}
