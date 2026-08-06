import { useEffect, useMemo, useState } from "react";
import { ChartBar, Pencil, Settings, Trash2, X } from "lucide-react";
import {
  deleteProject,
  getProjects,
  setActiveProject,
} from "../../api/projects";
import type { Project } from "../../types";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
import { CreateProjectDialog } from "../dialogs/CreateProjectDialog";
import { RenameProjectDialog } from "../dialogs/RenameProjectDialog";
import { AppIcon } from "../shared/AppIcon";
import { useToast } from "../toast/ToastContext";
import { apiErrorMessage } from "../../utils/apiError";
import {
  toastProjectDeleted,
  toastProjectsDeletedDetail,
} from "../../utils/toastProjectMessages";
import { ProjectList } from "./ProjectList";
import { buildDeleteProjectDescription } from "./deleteProjectDialogDescription";

type AppSidebarProps = {
  theme: "dark" | "light";
  overviewOpen: boolean;
  settingsOpen: boolean;
  activeProject: Project | null;
  isTracking: boolean;
  projectsRevision: number;
  onOverviewOpenChange: (open: boolean) => void;
  onSettingsOpenChange: (open: boolean) => void;
  onProjectSelected: (project: Project) => void;
  onProjectDeleted?: (projectId: number) => void;
  onProjectRenamed?: (project: Project) => void;
  onStartTracking: () => Promise<void> | void;
  onStopTracking: () => Promise<void> | void;
};

export function AppSidebar({
  theme,
  overviewOpen,
  settingsOpen,
  activeProject,
  isTracking,
  projectsRevision,
  onOverviewOpenChange,
  onSettingsOpenChange,
  onProjectSelected,
  onProjectDeleted,
  onProjectRenamed,
  onStartTracking,
  onStopTracking,
}: AppSidebarProps) {
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(
    new Set(),
  );
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function loadProjects() {
    const rows = await getProjects();
    setProjects(rows);
  }

  useEffect(() => {
    loadProjects().catch((e) => console.error("get_projects failed", e));
  }, [projectsRevision]);

  async function activateAndTrack(projectId: number) {
    const project = await setActiveProject(projectId);
    onProjectSelected(project);
    onSettingsOpenChange(false);
    await onStartTracking();
  }

  async function handleProjectClick(projectId: number) {
    if (isEditing) {
      toggleProjectSelection(projectId);
      return;
    }

    const isActive = activeProject?.id === projectId;

    try {
      if (isActive && isTracking) {
        await onStopTracking();
        return;
      }

      if (isActive && !isTracking) {
        await onStartTracking();
        return;
      }

      if (isTracking) {
        const project = await setActiveProject(projectId);
        onProjectSelected(project);
        onSettingsOpenChange(false);
        return;
      }

      await activateAndTrack(projectId);
    } catch (e) {
      console.error("project tracking toggle failed", e);
    }
  }

  async function confirmDeleteProjects() {
    const projectIds = [...selectedProjectIds];
    if (projectIds.length === 0) return;

    const deletedProjects = projects.filter((project) =>
      projectIds.includes(project.id),
    );

    try {
      for (const projectId of projectIds) {
        await deleteProject(projectId);
        onProjectDeleted?.(projectId);
      }
      await loadProjects();
      setSelectedProjectIds(new Set());
      setIsEditing(false);

      if (deletedProjects.length === 1) {
        toast.success(toastProjectDeleted(deletedProjects[0].name));
      } else {
        toast.success(`${deletedProjects.length} Projekte gelöscht`, {
          detail: toastProjectsDeletedDetail(
            deletedProjects.map((project) => project.name),
          ),
        });
      }
    } catch (e) {
      console.error("delete_project failed", e);
      toast.error(
        apiErrorMessage(e, "Projekte konnten nicht gelöscht werden."),
      );
    }
  }

  function toggleEditing() {
    if (isEditing) {
      setSelectedProjectIds(new Set());
    }
    setIsEditing(!isEditing);
  }

  function toggleProjectSelection(projectId: number) {
    setSelectedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  async function handleCreated(project: Project) {
    onProjectSelected(project);
    onSettingsOpenChange(false);
    await loadProjects().catch((e) => console.error("get_projects failed", e));
    try {
      await onStartTracking();
    } catch (e) {
      console.error("start_tracking after create failed", e);
    }
  }

  function openRenameDialog() {
    if (selectedProjectIds.size !== 1) return;
    const projectId = [...selectedProjectIds][0];
    const project = projects.find((row) => row.id === projectId);
    if (!project) return;
    setRenameTarget(project);
    setRenameOpen(true);
  }

  async function handleRenamed(project: Project) {
    await loadProjects();
    setSelectedProjectIds(new Set());
    setIsEditing(false);
    onProjectRenamed?.(project);
  }

  const selectedProjects = useMemo(
    () => projects.filter((project) => selectedProjectIds.has(project.id)),
    [projects, selectedProjectIds],
  );

  const deleteDialogDescription = useMemo(
    () => buildDeleteProjectDescription(selectedProjects),
    [selectedProjects],
  );

  return (
    <aside className="appSidebar" aria-label="Seitennavigation">
      <div className="appSidebarBrand">
        <img
          src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
          alt=""
          aria-hidden
          className="appSidebarLogo"
        />
        <span className="appSidebarBrandName" aria-label="FrameTrack">
          Frame<span className="appSidebarBrandNameAccent">Track</span>
        </span>
      </div>

      <button
        type="button"
        className={[
          "appSidebarNavItem",
          overviewOpen ? "appSidebarNavItemActive" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => {
          onSettingsOpenChange(false);
          onOverviewOpenChange(true);
        }}
      >
        <AppIcon icon={ChartBar} size={14} />
        App-Übersicht
      </button>

      <button
        type="button"
        className={[
          "appSidebarNavItem",
          settingsOpen ? "appSidebarNavItemActive" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => {
          onOverviewOpenChange(false);
          onSettingsOpenChange(true);
        }}
      >
        <AppIcon icon={Settings} size={14} />
        Einstellungen
      </button>

      <div className="appSidebarDivider" />

      <section className="appSidebarProjectsSection" aria-label="Projekte">
        <div className="appSidebarProjectHeader">
          <span>Projekte</span>
          {projects.length > 0 && (
            <button
              type="button"
              className={[
                "appSidebarEditButton",
                isEditing ? "appSidebarEditButtonActive" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={toggleEditing}
              aria-pressed={isEditing}
              aria-label={
                isEditing
                  ? "Projektbearbeitung beenden"
                  : "Projekte bearbeiten (umbenennen oder löschen)"
              }
              title={isEditing ? "Bearbeitung beenden" : "Projekte bearbeiten"}
            >
              <AppIcon icon={isEditing ? X : Pencil} size={14} />
            </button>
          )}
        </div>

        <ProjectList
          projects={projects}
          activeProject={activeProject}
          isTracking={isTracking}
          isEditing={isEditing}
          selectedProjectIds={selectedProjectIds}
          onProjectClick={handleProjectClick}
          onCancelEdit={toggleEditing}
          onRenameSelected={openRenameDialog}
          onDeleteSelected={() => setDeleteConfirmationOpen(true)}
          onCreateProject={() => setCreateOpen(true)}
        />
      </section>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      <RenameProjectDialog
        open={renameOpen}
        project={renameTarget}
        onOpenChange={setRenameOpen}
        onRenamed={handleRenamed}
      />

      <ConfirmDialog
        open={deleteConfirmationOpen}
        compact
        title={
          selectedProjectIds.size === 1
            ? "Projekt löschen?"
            : `${selectedProjectIds.size} Projekte löschen?`
        }
        description={deleteDialogDescription}
        confirmLabel={`${selectedProjectIds.size} löschen`}
        confirmIcon={Trash2}
        cancelLabel="Abbrechen"
        cancelIcon={X}
        onConfirm={confirmDeleteProjects}
        onOpenChange={setDeleteConfirmationOpen}
      />
    </aside>
  );
}
