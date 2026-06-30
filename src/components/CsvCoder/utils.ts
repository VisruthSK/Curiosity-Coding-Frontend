export const LABEL_FIELD = "Label";
export const NOTES_FIELD = "Notes";
export const FLAG_FIELD = "Flag";

export function isBlankOrNA(value: unknown): boolean {
  const str = String(value ?? "").trim();
  return str === "" || str.toLowerCase() === "na";
}

export function parseLabelValue(value: string | undefined): string[] {
  if (isBlankOrNA(value)) {
    return [];
  }
  return String(value)
    .split(";")
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean);
}

export function isTauriDesktop(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}
