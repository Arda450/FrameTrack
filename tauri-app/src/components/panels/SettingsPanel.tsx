import { useState } from "react";
import { clearAllActivities, clearAllProjects } from "../../api/settings";
import { AppIcon } from "../shared/AppIcon";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
import { useToast } from "../toast/ToastContext";
import { Bell, Database, Moon, Sun } from "lucide-react";
import {
  NOTIFICATION_INTERVALS,
  type NotificationIntervalMinutes,
  type TrackingNotificationSettings,
} from "../../hooks/useTrackingNotifications";

type SettingsPanelProps = {
  theme: "dark" | "light";
  onThemeChange: (theme: "dark" | "light") => void;
  onDataCleared: () => void;
  notificationSettings: TrackingNotificationSettings;
  onNotificationsEnabledChange: (enabled: boolean) => Promise<boolean>;
  onNotificationIntervalChange: (interval: NotificationIntervalMinutes) => void;
  onSendTestNotification: () => Promise<boolean>;
};

export function SettingsPanel({
  theme,
  onThemeChange,
  onDataCleared,
  notificationSettings,
  onNotificationsEnabledChange,
  onNotificationIntervalChange,
  onSendTestNotification,
}: SettingsPanelProps) {
  const toast = useToast();
  const [isClearing, setIsClearing] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [pendingClear, setPendingClear] = useState<"activities" | "all" | null>(
    null,
  );

  async function handleClearActivities() {
    setIsClearing(true);
    try {
      const count = await clearAllActivities();
      toast.success(
        count === 1 ? "1 Aktivität gelöscht" : `${count} Aktivitäten gelöscht`,
      );
      onDataCleared();
    } catch (e) {
      toast.error("Aktivitäten konnten nicht gelöscht werden.");
      console.error(e);
    } finally {
      setIsClearing(false);
    }
  }

  async function handleClearAll() {
    setIsClearing(true);
    try {
      await clearAllProjects();
      toast.success("Alle Daten gelöscht");
      onDataCleared();
    } catch (e) {
      toast.error("Daten konnten nicht gelöscht werden.");
      console.error(e);
    } finally {
      setIsClearing(false);
    }
  }

  function toggleTheme() {
    onThemeChange(theme === "dark" ? "light" : "dark");
  }

  async function toggleNotifications() {
    setIsUpdatingNotifications(true);
    const enabled = !notificationSettings.enabled;
    const updated = await onNotificationsEnabledChange(enabled);
    setIsUpdatingNotifications(false);

    if (!updated) {
      toast.error(
        "Windows-Benachrichtigungen wurden nicht freigegeben. Prüfe die Benachrichtigungseinstellungen von Windows.",
      );
    }
  }

  async function sendTestNotification() {
    setIsUpdatingNotifications(true);
    const sent = await onSendTestNotification();
    setIsUpdatingNotifications(false);

    if (!sent) {
      toast.error("Testbenachrichtigung konnte nicht gesendet werden.");
    }
  }

  return (
    <section className="container">
      {/* Erscheinungsbild */}
      <div className="settingsSection">
        <div className="settingRow">
          <div className="settingLabel">
            <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* if else für die Icons */}
              {theme === "dark" ? (
                <AppIcon icon={Moon} size={16} aria-hidden />
              ) : (
                <AppIcon icon={Sun} size={16} aria-hidden />
              )}
              {/* if else für den Text */}
              {theme === "dark" ? "Dark" : "Light"} Mode
            </h4>
          </div>
          <button
            type="button"
            className={`toggleSwitch ${theme === "dark" ? "active" : ""}`}
            onClick={toggleTheme}
            role="switch"
            aria-checked={theme === "dark"}
            aria-label="Dunkles Erscheinungsbild umschalten"
          />
        </div>
      </div>

      {/* Windows-Benachrichtigungen */}
      <div className="settingsSection">
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AppIcon icon={Bell} size={16} aria-hidden />
          Benachrichtigungen
        </h3>
        <div className="settingRow">
          <div className="settingLabel">
            <span>Tracking-Erinnerungen</span>
            <span>
              Zeigt den Tracking-Status und eine Zusammenfassung in Windows
            </span>
          </div>
          <button
            type="button"
            className={`toggleSwitch ${notificationSettings.enabled ? "active" : ""}`}
            onClick={() => void toggleNotifications()}
            disabled={isUpdatingNotifications}
            role="switch"
            aria-checked={notificationSettings.enabled}
            aria-label="Tracking-Erinnerungen umschalten"
          />
        </div>
        <div className="settingRow">
          <div className="settingLabel">
            <span>Erinnerungsintervall</span>
            <span>Während eines laufenden Trackings</span>
          </div>
          <div className="settingControl">
            <select
              className="settingsSelect"
              value={notificationSettings.intervalMinutes}
              disabled={
                !notificationSettings.enabled || isUpdatingNotifications
              }
              onChange={(event) =>
                onNotificationIntervalChange(
                  Number(event.target.value) as NotificationIntervalMinutes,
                )
              }
              aria-label="Intervall für Tracking-Erinnerungen"
            >
              {NOTIFICATION_INTERVALS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes === 60 ? "1 Stunde" : `${minutes / 60} Stunden`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="settingRow">
          <div className="settingLabel">
            <span>Darstellung prüfen</span>
            <span>Sendet sofort eine Windows-Testbenachrichtigung</span>
          </div>
          <div className="settingControl">
            <button
              type="button"
              className="secondary"
              onClick={() => void sendTestNotification()}
              disabled={
                !notificationSettings.enabled || isUpdatingNotifications
              }
            >
              Test senden
            </button>
          </div>
        </div>
      </div>

      {/* Datenverwaltung */}
      <div className="settingsSection">
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AppIcon icon={Database} size={16} aria-hidden />
          Datenverwaltung
        </h3>
        <div className="settingRow">
          <div className="settingLabel">
            <span>Aktivitäten löschen</span>
            <span>Entfernt alle erfassten Fenster-Aktivitäten</span>
          </div>
          <div className="settingControl">
            <button
              className="danger"
              onClick={() => setPendingClear("activities")}
              disabled={isClearing}
            >
              Löschen
            </button>
          </div>
        </div>
        <div className="settingRow">
          <div className="settingLabel">
            <span>Alle Daten löschen</span>
            <span>Entfernt Projekte und Aktivitäten</span>
          </div>
          <div className="settingControl">
            <button
              className="danger"
              onClick={() => setPendingClear("all")}
              disabled={isClearing}
            >
              Alles löschen
            </button>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="appInfo">
        <strong>FrameTrack {new Date().getFullYear()}</strong>
        <br />
        Lokales Activity-Tracking für Windows
      </div>

      <ConfirmDialog
        open={pendingClear !== null}
        title={
          pendingClear === "all"
            ? "Alle Daten löschen?"
            : "Alle Aktivitäten löschen?"
        }
        description={
          pendingClear === "all"
            ? "Projekte und Aktivitäten werden unwiderruflich gelöscht."
            : "Alle erfassten Fenster-Aktivitäten werden unwiderruflich gelöscht."
        }
        confirmLabel={isClearing ? "Wird gelöscht…" : "Endgültig löschen"}
        onOpenChange={(open) => {
          if (!open) setPendingClear(null);
        }}
        onConfirm={() => {
          if (pendingClear === "all") {
            void handleClearAll();
          } else if (pendingClear === "activities") {
            void handleClearActivities();
          }
        }}
      />
    </section>
  );
}
