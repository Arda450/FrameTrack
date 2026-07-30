import { invoke } from "@tauri-apps/api/core";
import type { Project } from "../types";

export function getTrackingStatus(): Promise<boolean> {
  return invoke<boolean>("is_tracking");
}

export function startTracking(): Promise<void> {
  return invoke("start_tracking");
}

export function stopTracking(): Promise<void> {
  return invoke("stop_tracking");
}

export function getActiveProject(): Promise<Project | null> {
  return invoke<Project | null>("get_active_project");
}
