import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { AppIcon } from "../shared/AppIcon";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmIcon?: LucideIcon;
  cancelIcon?: LucideIcon;
  compact?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

/**
 * Wiederverwendbarer Bestätigungsdialog (z. B. vor dem Löschen).
 * Gesteuert über `open`/`onOpenChange`; bestätigt via `onConfirm`.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Löschen",
  cancelLabel = "Abbrechen",
  confirmIcon,
  cancelIcon,
  compact = false,
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  const popupClassName = [
    "confirmDialogPopup",
    compact ? "confirmDialogPopup--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const actionsClassName = [
    "confirmDialogActions",
    compact ? "confirmDialogActions--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="confirmDialogBackdrop" />
        <AlertDialog.Popup className={popupClassName}>
          <div className="confirmDialogIntro">
            <AlertDialog.Title className="confirmDialogTitle">
              {title}
            </AlertDialog.Title>
            {description && (
              <AlertDialog.Description className="confirmDialogDescription">
                {description}
              </AlertDialog.Description>
            )}
          </div>
          <div className={actionsClassName}>
            <AlertDialog.Close
              className={[
                "confirmDialogCancel",
                compact || cancelIcon ? "confirmDialogButtonWithIcon" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {cancelIcon && <AppIcon icon={cancelIcon} size={14} />}
              {cancelLabel}
            </AlertDialog.Close>
            <button
              className={[
                "danger",
                "confirmDialogConfirm",
                compact || confirmIcon ? "confirmDialogButtonWithIcon" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmIcon && <AppIcon icon={confirmIcon} size={14} />}
              {confirmLabel}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
