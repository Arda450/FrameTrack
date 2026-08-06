import type { ReactNode } from "react";
import type { Project } from "../../types";

function ProjectName({ name }: { name: string }) {
  return <strong className="dialogProjectName">{name}</strong>;
}

export function buildDeleteProjectDescription(
  selectedProjects: Project[],
): ReactNode {
  const activityNote = "Aktivitäten werden mitgelöscht.";

  if (selectedProjects.length === 1) {
    return (
      <>
        Möchtest du das Projekt <ProjectName name={selectedProjects[0].name} />{" "}
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
            <ProjectName name={project.name} />
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
          <ProjectName name={project.name} />
        </span>
      ))}
      {" …"})? {activityNote}
    </>
  );
}
