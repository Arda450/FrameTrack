import type { ReactNode } from "react";

function projectNameStrong(name: string) {
  return <strong className="toastProjectName">{name}</strong>;
}

export function toastProjectCreated(projectName: string): ReactNode {
  return <>Projekt {projectNameStrong(projectName)} erstellt</>;
}

export function toastProjectRenamed(projectName: string): ReactNode {
  return <>Projekt in {projectNameStrong(projectName)} umbenannt</>;
}

export function toastProjectDeleted(projectName: string): ReactNode {
  return <>Projekt {projectNameStrong(projectName)} gelöscht</>;
}

export function toastProjectsDeletedDetail(projectNames: string[]): ReactNode {
  return (
    <>
      {projectNames.map((name, index) => (
        <span key={`${index}-${name}`}>
          {index > 0 && ", "}
          {projectNameStrong(name)}
        </span>
      ))}
    </>
  );
}
