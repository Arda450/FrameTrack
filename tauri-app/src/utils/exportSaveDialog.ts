import { save } from "@tauri-apps/plugin-dialog";
import { getExportDirectory } from "../api/export";
import { dirFromPath, joinPath } from "./exportPath";

type SaveExportOptions = {
  title: string;
  defaultFileName: string;
  extension: string;
  filterName: string;
};

const LAST_EXPORT_DIR_KEY = "frametrack-export-dir";
export const EXPORT_DIR_CHANGED_EVENT = "frametrack-export-dir-changed";

/** Zuletzt gewählter oder Standard-Exportordner. */
export async function getPreferredExportDirectory(): Promise<string> {
  const saved = localStorage.getItem(LAST_EXPORT_DIR_KEY);
  if (saved) return saved;
  return getExportDirectory();
}

/** Merkt sich den Ordner aus einem Exportpfad. */
export function rememberExportDirectoryFromFilePath(filePath: string): void {
  const dir = dirFromPath(filePath);
  localStorage.setItem(LAST_EXPORT_DIR_KEY, dir);
  window.dispatchEvent(
    new CustomEvent<string>(EXPORT_DIR_CHANGED_EVENT, { detail: dir }),
  );
}

/** Öffnet den System-Speicherndialog. `null` = Abbruch. */
export async function pickExportSavePath(
  options: SaveExportOptions,
): Promise<string | null> {
  const dir = await getPreferredExportDirectory();
  const path = await save({
    title: options.title,
    defaultPath: joinPath(dir, options.defaultFileName),
    filters: [
      {
        name: options.filterName,
        extensions: [options.extension],
      },
    ],
  });
  if (path) rememberExportDirectoryFromFilePath(path);
  return path;
}

/** Zweite CSV-Datei im selben Ordner neben der Samples-Datei. */
export function aggregatedCsvPathBeside(samplesPath: string): string {
  if (/samples/i.test(samplesPath)) {
    return samplesPath.replace(/samples/gi, "aggregated");
  }
  if (/\.csv$/i.test(samplesPath)) {
    return samplesPath.replace(/\.csv$/i, "-aggregated.csv");
  }
  return `${samplesPath}-aggregated.csv`;
}

/** Erzeugt einen Standard Dateinamen für Exporte. */
export function defaultExportFileName(
  prefix: string,
  extension: string,
): string {
  const stamp = Math.floor(Date.now() / 1000);
  return `${prefix}-${stamp}.${extension}`;
}
