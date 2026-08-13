import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type {
  NotificationIntervalMinutes,
  TrackingNotificationSettings,
} from "../../hooks/useTrackingNotifications";
import { AppIcon } from "../shared/AppIcon";
import { SettingsPanel } from "../panels/SettingsPanel";

type SettingsDialogProps = {
  open: boolean;
  theme: "dark" | "light";
  onOpenChange: (open: boolean) => void;
  onThemeChange: (theme: "dark" | "light") => void;
  onDataCleared: () => void;
  notificationSettings: TrackingNotificationSettings;
  onNotificationsEnabledChange: (enabled: boolean) => Promise<boolean>;
  onNotificationIntervalChange: (interval: NotificationIntervalMinutes) => void;
};

/** Dialog mit Einstellungsinhalt als schwebendes Panel. */
export function SettingsDialog({
  open,
  theme,
  onOpenChange,
  onThemeChange,
  onDataCleared,
  notificationSettings,
  onNotificationsEnabledChange,
  onNotificationIntervalChange,
}: SettingsDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <Dialog.Portal>
        <Dialog.Popup className="settingsDialogPopup">
          <header className="settingsDialogHeader">
            <Dialog.Title className="settingsDialogTitle">
              Einstellungen
            </Dialog.Title>
            <Dialog.Close
              className="settingsDialogClose"
              aria-label="Schliessen"
            >
              <AppIcon icon={X} size={18} aria-hidden />
            </Dialog.Close>
          </header>
          <div className="settingsDialogBody">
            <SettingsPanel
              theme={theme}
              onThemeChange={onThemeChange}
              onDataCleared={onDataCleared}
              notificationSettings={notificationSettings}
              onNotificationsEnabledChange={onNotificationsEnabledChange}
              onNotificationIntervalChange={onNotificationIntervalChange}
            />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
