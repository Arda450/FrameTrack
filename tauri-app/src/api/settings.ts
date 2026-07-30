import { invoke } from "@tauri-apps/api/core";

export function clearAllActivities(): Promise<number> {
  return invoke<number>("clear_all_activities");
}

export function clearAllProjects(): Promise<number> {
  return invoke<number>("clear_all_projects");
}
