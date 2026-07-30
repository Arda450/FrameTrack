import { useEffect, useId, useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, X } from "lucide-react";
import { renameProject } from "../../api/projects";
import { Project } from "../../types";
import { apiErrorMessage } from "../../utils/apiError";
import { AppIcon } from "../shared/AppIcon";
import { useToast } from "../toast/ToastContext";

type RenameProjectDialogProps = {
  open: boolean;
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  onRenamed: (project: Project) => void;
};

/**
 * Dialog zum Umbenennen eines bestehenden Projekts.
 */
export function RenameProjectDialog({
  open,
  project,
  onOpenChange,
  onRenamed,
}: RenameProjectDialogProps) {
  const toast = useToast();
  const nameId = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !project) return;
    setName(project.name);
    setError(null);
    setIsSaving(false);
  }, [open, project]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!project) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Bitte einen Projektnamen eingeben.");
      return;
    }
    if (trimmed === project.name) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const updated = await renameProject(project.id, trimmed);
      toast.success(`Projekt in ${updated.name} umbenannt`);
      onRenamed(updated);
      onOpenChange(false);
    } catch (e) {
      console.error("rename_project failed", e);
      const message = apiErrorMessage(e, "Projekt konnte nicht umbenannt werden.");
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirmDialogBackdrop" />
        <Dialog.Popup className="confirmDialogPopup confirmDialogPopup--compact createProjectDialog createProjectDialog--compact">
          <form
            className="createProjectForm createProjectForm--compact"
            onSubmit={handleSubmit}
          >
            <div className="confirmDialogIntro">
              <Dialog.Title className="confirmDialogTitle">
                Projekt umbenennen
              </Dialog.Title>
              <Dialog.Description className="confirmDialogDescription">
                Neuer Name für Sidebar und Auswertungen.
              </Dialog.Description>
            </div>

            <label className="createProjectLabel" htmlFor={nameId}>
              Projektname
              <input
                id={nameId}
                className="createProjectInput"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Neuer Projektname"
                maxLength={120}
                autoFocus
                disabled={isSaving}
              />
            </label>

            {error && <p className="createProjectError">{error}</p>}

            <div className="confirmDialogActions confirmDialogActions--compact">
              <Dialog.Close
                className="confirmDialogCancel confirmDialogButtonWithIcon"
                disabled={isSaving}
              >
                <AppIcon icon={X} size={14} />
                Abbrechen
              </Dialog.Close>
              <button
                type="submit"
                className="confirmDialogButtonWithIcon"
                disabled={isSaving || !name.trim()}
              >
                <AppIcon icon={Check} size={14} />
                {isSaving ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
