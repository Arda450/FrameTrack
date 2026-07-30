import { invoke } from "@tauri-apps/api/core";
import type { DailyReport, WeeklyReport } from "../types";

export function getDailyReport(
  args: Record<string, unknown>,
): Promise<DailyReport> {
  return invoke<DailyReport>("get_daily_report", args);
}

export function getWeeklyReport(
  args: Record<string, unknown>,
): Promise<WeeklyReport> {
  return invoke<WeeklyReport>("get_weekly_report", args);
}
