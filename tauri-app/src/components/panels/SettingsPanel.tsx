import { useState } from "react";
import { clearAllActivities, clearAllProjects } from "../../api/settings";
import { AppIcon } from "../shared/AppIcon";
import { InfoHint } from "../shared/InfoHint";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
import { useToast } from "../toast/ToastContext";
import { Bell, Database, Moon, ShieldCheck, Sun } from "lucide-react";
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
};

/** Einstellungen für Theme, Benachrichtigungen und Datenbereinigung. */
export function SettingsPanel({
  theme,
  onThemeChange,
  onDataCleared,
  notificationSettings,
  onNotificationsEnabledChange,
  onNotificationIntervalChange,
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

  return (
    <section className="container">
      {/* Erscheinungsbild */}
      <div className="settingsSection settingsThemeSection">
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
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span>Tracking-Erinnerungen</span>
              <InfoHint label="Hinweis zu Tracking-Benachrichtigungen">
                Periodische Erinnerungen erscheinen nach dem gewählten Intervall
                von 1, 2 oder 4 Stunden. Beim Pausieren oder Stoppen wird nur
                dann eine Abschlusszusammenfassung angezeigt, wenn mindestens 15
                Minuten getrackt wurden.
              </InfoHint>
            </div>
            <span>
              Periodischer Tracking-Status und Zusammenfassung beim Beenden
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
            <span className="settingsSelectWrap">
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
            </span>
          </div>
        </div>
      </div>

      {/* Datenschutz und lokale Speicherung */}
      <div className="settingsSection">
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AppIcon icon={ShieldCheck} size={16} aria-hidden />
          Datenschutz und lokale Daten
        </h3>
        <div className="privacyNotice">
          <p>
            FrameTrack verarbeitet Fenstertitel und Aktivitätsdaten
            ausschliesslich lokal auf diesem Gerät. Es gibt keine
            Cloud-Synchronisation, Telemetrie oder Übertragung an
            FrameTrack-Server.
          </p>
          <p>
            Browser-Adressen werden nur flüchtig im Arbeitsspeicher zur
            Klassifikation verwendet und nicht in der Datenbank gespeichert.
          </p>
          <p>
            Die Datenbank liegt unter{" "}
            <code>Dokumente/frametrack-data/frametrack.db</code>. Exporte können
            sensible Fenstertitel enthalten und sollten entsprechend geschützt
            werden.
          </p>
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
