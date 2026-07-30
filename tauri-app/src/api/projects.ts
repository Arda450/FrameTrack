import { invoke } from "@tauri-apps/api/core";
import type { Project } from "../types";

export function getProjects(): Promise<Project[]> {
  return invoke<Project[]>("get_projects");
}

export function createProject(name: string): Promise<Project> {
  return invoke<Project>("create_project", { name });
}

export function renameProject(
  projectId: number,
  name: string,
): Promise<Project> {
  return invoke<Project>("rename_project", { projectId, name });
}

export function deleteProject(projectId: number): Promise<void> {
  return invoke("delete_project", { projectId });
}

export function setActiveProject(projectId: number): Promise<Project> {
  return invoke<Project>("set_active_project", { projectId });
}
