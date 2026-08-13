import type { ReactNode } from "react";

/** Formatiert einen Projektnamen fett für Toasts. */
function projectNameStrong(name: string) {
  return <strong className="toastProjectName">{name}</strong>;
}

/** Erzeugt den Toast Text nach Projektanlage. */
export function toastProjectCreated(projectName: string): ReactNode {
  return <>Projekt {projectNameStrong(projectName)} erstellt</>;
}

/** Erzeugt den Toast Text nach Umbenennung. */
export function toastProjectRenamed(projectName: string): ReactNode {
  return <>Projekt in {projectNameStrong(projectName)} umbenannt</>;
}

/** Erzeugt den Toast Text nach Projekt Löschung. */
export function toastProjectDeleted(projectName: string): ReactNode {
  return <>Projekt {projectNameStrong(projectName)} gelöscht</>;
}

/** Erzeugt den Detailtext nach Mehrfach Löschung. */
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
