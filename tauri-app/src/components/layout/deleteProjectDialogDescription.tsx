import type { ReactNode } from "react";
import type { Project } from "../../types";

export function buildDeleteProjectDescription(
  selectedProjects: Project[],
): ReactNode {
  const activityNote = "Aktivitäten werden mitgelöscht.";

  if (selectedProjects.length === 1) {
    return (
      <>
        Möchtest du das Projekt <strong>{selectedProjects[0].name}</strong>{" "}
        wirklich löschen? {activityNote}
      </>
    );
  }

  if (selectedProjects.length <= 4) {
    return (
      <>
        Möchtest du die Projekte{" "}
        {selectedProjects.map((project, index) => (
          <span key={project.id}>
            {index > 0 &&
              (index === selectedProjects.length - 1 ? " und " : ", ")}
            <strong>{project.name}</strong>
          </span>
        ))}{" "}
        wirklich löschen? {activityNote}
      </>
    );
  }

  const preview = selectedProjects.slice(0, 3);
  return (
    <>
      Möchtest du die {selectedProjects.length} ausgewählten Projekte wirklich
      löschen (
      {preview.map((project, index) => (
        <span key={project.id}>
          {index > 0 && ", "}
          <strong>{project.name}</strong>
        </span>
      ))}
      {" …"})? {activityNote}
    </>
  );
}
