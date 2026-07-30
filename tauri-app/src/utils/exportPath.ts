/** Letzter Pfadteil für kompakte Toast-Details. */
export function fileNameFromPath(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

/** Ordnerpfad ohne Dateiname. */
export function dirFromPath(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  if (parts.length <= 1) return path;
  const sep = path.includes("\\") ? "\\" : "/";
  return parts.slice(0, -1).join(sep);
}

export function joinPath(dir: string, fileName: string): string {
  const trimmed = dir.replace(/[/\\]+$/, "");
  const sep = trimmed.includes("\\") ? "\\" : "/";
  return `${trimmed}${sep}${fileName}`;
}

export function formatExportSuccessDetail(
  filePath: string,
  extraFileNames: string[] = [],
): string {
  const dir = dirFromPath(filePath);
  const names = [fileNameFromPath(filePath), ...extraFileNames].join(" · ");
  return `Ordner: ${dir}\n${names}`;
}
