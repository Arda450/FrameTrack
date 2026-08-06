import {
  CheckSquare2,
  CirclePause,
  CirclePlay,
  Pencil,
  Plus,
  Square,
  Trash2,
} from "lucide-react";
import type { Project } from "../../types";
import { AppIcon } from "../shared/AppIcon";
import { colorForCategoryIndex } from "../../utils/chartColors";

type ProjectListProps = {
  projects: Project[];
  activeProject: Project | null;
  isTracking: boolean;
  isEditing: boolean;
  selectedProjectIds: Set<number>;
  onProjectClick: (projectId: number) => void;
  onCancelEdit: () => void;
  onRenameSelected: () => void;
  onDeleteSelected: () => void;
  onCreateProject: () => void;
};

export function ProjectList({
  projects,
  activeProject,
  isTracking,
  isEditing,
  selectedProjectIds,
  onProjectClick,
  onCancelEdit,
  onRenameSelected,
  onDeleteSelected,
  onCreateProject,
}: ProjectListProps) {
  return (
    <>
      <div className="appSidebarProjectsGroup">
        <div className="appSidebarProjectList">
          {projects.map((project, index) => {
            const isActive = activeProject?.id === project.id;
            const isTrackingThis = isActive && isTracking;
            const isSelected = selectedProjectIds.has(project.id);
            const accent = colorForCategoryIndex(index);

            return (
              <div
                key={project.id}
                className={[
                  "appSidebarProjectRow",
                  isActive ? "appSidebarProjectRowActive" : "",
                  isSelected ? "appSidebarProjectRowSelected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <button
                  type="button"
                  className="appSidebarProjectButton"
                  onClick={() => onProjectClick(project.id)}
                  title={
                    isEditing
                      ? project.name
                      : isTrackingThis
                        ? `${project.name} - Tracking stoppen`
                        : `${project.name} - Tracking starten`
                  }
                  aria-current={isActive ? "true" : undefined}
                  aria-pressed={isEditing ? isSelected : isTrackingThis}
                >
                  {isEditing ? (
                    <span className="appSidebarSelectionIcon">
                      <AppIcon
                        icon={isSelected ? CheckSquare2 : Square}
                        size={18}
                      />
                    </span>
                  ) : (
                    <span
                      className="appSidebarProjectIcon"
                      style={
                        isTrackingThis
                          ? undefined
                          : { background: accent, borderColor: accent }
                      }
                    >
                      <AppIcon
                        icon={isTrackingThis ? CirclePause : CirclePlay}
                        size={18}
                      />
                    </span>
                  )}
                  <span className="appSidebarProjectName">{project.name}</span>
                </button>
              </div>
            );
          })}

          {!isEditing && (
            <div className="appSidebarProjectRow appSidebarProjectRowAdd">
              <button
                type="button"
                className="appSidebarProjectButton appSidebarNewProject"
                onClick={onCreateProject}
              >
                <span className="appSidebarProjectIcon appSidebarProjectIconAdd">
                  <AppIcon icon={Plus} size={18} />
                </span>
                <span className="appSidebarProjectName">Neues Projekt</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="appSidebarEditActions">
          <button
            type="button"
            className="appSidebarCancelEditButton"
            onClick={onCancelEdit}
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="appSidebarRenameSelectedButton"
            disabled={selectedProjectIds.size !== 1}
            onClick={onRenameSelected}
          >
            <AppIcon icon={Pencil} size={14} />
            Umbenennen
          </button>
          <button
            type="button"
            className="appSidebarDeleteSelectedButton"
            disabled={selectedProjectIds.size === 0}
            onClick={onDeleteSelected}
          >
            <AppIcon icon={Trash2} size={14} />
            Löschen ({selectedProjectIds.size})
          </button>
        </div>
      )}
    </>
  );
}
