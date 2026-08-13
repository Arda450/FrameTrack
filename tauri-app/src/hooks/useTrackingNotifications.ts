import { useCallback, useEffect, useState } from "react";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { formatDurationSeconds } from "../utils/formatDuration";

export const NOTIFICATION_INTERVALS = [60, 120, 240] as const;
export type NotificationIntervalMinutes =
  (typeof NOTIFICATION_INTERVALS)[number];

export type TrackingNotificationSettings = {
  enabled: boolean;
  intervalMinutes: NotificationIntervalMinutes;
};

const SETTINGS_KEY = "tracking-notification-settings";
const SESSION_STARTED_AT_KEY = "tracking-session-started-at";
const DEFAULT_SETTINGS: TrackingNotificationSettings = {
  enabled: false,
  intervalMinutes: 60,
};
const MINIMUM_SUMMARY_DURATION_MS = 15 * 60 * 1000;

/** Liest gespeicherte Benachrichtigungseinstellungen aus dem Local Storage. */
function readSettings(): TrackingNotificationSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
    const intervalMinutes = NOTIFICATION_INTERVALS.includes(
      stored.intervalMinutes,
    )
      ? stored.intervalMinutes
      : DEFAULT_SETTINGS.intervalMinutes;

    return {
      enabled: stored.enabled === true,
      intervalMinutes,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Liest den Startzeitpunkt der aktuellen Tracking Sitzung. */
function readSessionStartedAt(): number | null {
  const stored = Number(localStorage.getItem(SESSION_STARTED_AT_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : null;
}

/** Fordert bei Bedarf die System Benachrichtigungsberechtigung an. */
async function ensurePermission(): Promise<boolean> {
  if (await isPermissionGranted()) return true;
  return (await requestPermission()) === "granted";
}

/** Sendet eine native Desktop Benachrichtigung. */
function showNotification(title: string, body: string) {
  sendNotification({ title, body });
}

/** Steuert periodische Tracking Erinnerungen und Sitzungszusammenfassungen. */
export function useTrackingNotifications(
  isTracking: boolean,
  projectName: string | null,
) {
  const [settings, setSettings] =
    useState<TrackingNotificationSettings>(readSettings);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!isTracking || !settings.enabled) return;

    const startedAt = readSessionStartedAt() ?? Date.now();
    localStorage.setItem(SESSION_STARTED_AT_KEY, String(startedAt));

    const intervalMs = settings.intervalMinutes * 60 * 1000;
    const elapsedMs = Date.now() - startedAt;
    const firstDelayMs = intervalMs - (elapsedMs % intervalMs);
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const timeoutId = setTimeout(() => {
      const duration = formatDurationSeconds((Date.now() - startedAt) / 1000);
      const project = projectName
        ? `Aktives Projekt: ${projectName}.`
        : "Kein aktives Projekt.";
      showNotification(
        "Tracking läuft weiterhin",
        `${project} Laufzeit: ${duration}.`,
      );

      intervalId = setInterval(() => {
        const currentDuration = formatDurationSeconds(
          (Date.now() - startedAt) / 1000,
        );
        const currentProject = projectName
          ? `Aktives Projekt: ${projectName}.`
          : "Kein aktives Projekt.";
        showNotification(
          "Tracking läuft weiterhin",
          `${currentProject} Laufzeit: ${currentDuration}.`,
        );
      }, intervalMs);
    }, firstDelayMs);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTracking, projectName, settings.enabled, settings.intervalMinutes]);

  const setEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      try {
        if (!(await ensurePermission())) return false;
      } catch (error) {
        console.error("notification permission failed", error);
        return false;
      }
    }

    setSettings((current) => ({ ...current, enabled }));
    return true;
  }, []);

  const setIntervalMinutes = useCallback(
    (intervalMinutes: NotificationIntervalMinutes) => {
      setSettings((current) => ({ ...current, intervalMinutes }));
    },
    [],
  );

  const beginSession = useCallback(() => {
    localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
  }, []);

  const finishSession = useCallback(async () => {
    const startedAt = readSessionStartedAt();
    localStorage.removeItem(SESSION_STARTED_AT_KEY);

    if (!settings.enabled || !startedAt) return;

    const durationMs = Date.now() - startedAt;
    if (durationMs < MINIMUM_SUMMARY_DURATION_MS) return;

    try {
      if (!(await ensurePermission())) return;
      const duration = formatDurationSeconds(durationMs / 1000);
      const project = projectName
        ? `Zuletzt aktives Projekt: ${projectName}.`
        : "";
      showNotification(
        "Tracking beendet",
        `${project} Tracking-Laufzeit: ${duration}.`.trim(),
      );
    } catch (error) {
      console.error("tracking summary notification failed", error);
    }
  }, [projectName, settings.enabled]);

  return {
    settings,
    setEnabled,
    setIntervalMinutes,
    beginSession,
    finishSession,
  };
}
