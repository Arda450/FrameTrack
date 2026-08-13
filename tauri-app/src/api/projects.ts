import { invoke } from "@tauri-apps/api/core";
import type { Project } from "../types";

/** Lädt alle Projekte aus der lokalen Datenbank. */
export function getProjects(): Promise<Project[]> {
  return invoke<Project[]>("get_projects");
}

/** Legt ein neues Projekt mit dem angegebenen Namen an. */
export function createProject(name: string): Promise<Project> {
  return invoke<Project>("create_project", { name });
}

/** Benennt ein bestehendes Projekt um. */
export function renameProject(
  projectId: number,
  name: string,
): Promise<Project> {
  return invoke<Project>("rename_project", { projectId, name });
}

/** Löscht ein Projekt inklusive zugehöriger Aktivitäten. */
export function deleteProject(projectId: number): Promise<void> {
  return invoke("delete_project", { projectId });
}

/** Setzt das aktive Projekt für das Tracking. */
export function setActiveProject(projectId: number): Promise<Project> {
  return invoke<Project>("set_active_project", { projectId });
}
