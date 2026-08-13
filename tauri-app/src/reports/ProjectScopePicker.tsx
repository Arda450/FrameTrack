import { Check, ChevronDown, FolderKanban } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { Project } from "../types";
import { AppIcon } from "../components/shared/AppIcon";

type Props = {
  projects: Project[];
  activeProjectId: number;
  selectedProjectIds: number[];
  onChange: (projectIds: number[]) => void;
};

type MenuPosition = {
  left: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
};

/** Bildet die Anzeige für den gewählten Projektumfang. */
export function projectScopeLabel(
  projects: Project[],
  selectedProjectIds: number[],
): string {
  const selected = projects.filter((project) =>
    selectedProjectIds.includes(project.id),
  );
  if (selected.length === projects.length && projects.length > 1) {
    return "Alle Projekte";
  }
  if (selected.length === 1) {
    return selected[0].name;
  }
  return `${selected.length} Projekte`;
}

/** Mehrfachauswahl des Projektumfangs für Berichte und Export. */
export function ProjectScopePicker({
  projects,
  activeProjectId,
  selectedProjectIds,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const menuId = useId();
  const selectedSet = useMemo(
    () => new Set(selectedProjectIds),
    [selectedProjectIds],
  );

  useEffect(() => {
    if (!open) return;
    /** Schliesst das Dropdown bei Klick ausserhalb. */
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    /** Schliesst das Dropdown bei Escape. */
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    /** Positioniert das Menü innerhalb des sichtbaren Fensters. */
    function updateMenuPosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const margin = 8;
      const gap = 6;
      const width = 250;
      const availableBelow = window.innerHeight - rect.bottom - gap - margin;
      const availableAbove = rect.top - gap - margin;
      const openBelow =
        availableBelow >= 220 || availableBelow >= availableAbove;
      const maxHeight = Math.min(
        360,
        Math.max(120, openBelow ? availableBelow : availableAbove),
      );
      const left = Math.min(
        window.innerWidth - width - margin,
        Math.max(margin, rect.right - width),
      );

      setMenuPosition(
        openBelow
          ? { left, top: rect.bottom + gap, maxHeight }
          : {
              left,
              bottom: window.innerHeight - rect.top + gap,
              maxHeight,
            },
      );
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  /** Wählt ein Projekt für den Berichtsumfang an oder ab. */
  function toggleProject(projectId: number) {
    if (selectedSet.has(projectId)) {
      if (selectedProjectIds.length === 1) return;
      onChange(selectedProjectIds.filter((id) => id !== projectId));
      return;
    }
    onChange([...selectedProjectIds, projectId]);
  }

  return (
    <div className="projectScopePicker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="projectScopePickerTrigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <AppIcon icon={FolderKanban} size={15} />
        <span>{projectScopeLabel(projects, selectedProjectIds)}</span>
        <AppIcon icon={ChevronDown} size={14} />
      </button>

      {open && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              className="projectScopePickerMenu"
              role="menu"
              aria-label="Projektumfang auswählen"
              style={menuPosition}
            >
              <p className="projectScopePickerTitle">Berichtsumfang</p>
              <button
                type="button"
                className="projectScopePickerAction"
                onClick={() => onChange([activeProjectId])}
              >
                Aktives Projekt
              </button>
              <button
                type="button"
                className="projectScopePickerAction"
                onClick={() => onChange(projects.map((project) => project.id))}
              >
                Alle Projekte
              </button>
              <div className="projectScopePickerDivider" />
              {projects.map((project) => {
                const checked = selectedSet.has(project.id);
                return (
                  <button
                    key={project.id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    className="projectScopePickerProject"
                    onClick={() => toggleProject(project.id)}
                  >
                    <span
                      className={[
                        "projectScopePickerCheck",
                        checked ? "projectScopePickerCheckActive" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {checked ? <AppIcon icon={Check} size={13} /> : null}
                    </span>
                    <span>{project.name}</span>
                  </button>
                );
              })}
              <p className="projectScopePickerHint">
                Auswahl gilt für Anzeige und Export.
              </p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
