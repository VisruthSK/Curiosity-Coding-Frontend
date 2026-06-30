import type { CsvRow, SavedSession } from "./types";
import { FLAG_FIELD } from "./utils";

export const STORAGE_KEY_V1 = "curiosity-coding-tool:v1";

export function formatName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function normalizeRow(row: CsvRow, fields: string[]): CsvRow {
  return Object.fromEntries(
    fields.map((field) => [field, row[field] == null ? "" : String(row[field])])
  );
}

export function ensureFlagField(fields: string[]) {
  return fields.includes(FLAG_FIELD) ? fields : [...fields, FLAG_FIELD];
}

export function readSavedSession(): SavedSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_V1);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.firstName || !parsed.fileName || !parsed.rows) {
      return null;
    }

    return {
      firstName: formatName(parsed.firstName),
      fileName: parsed.fileName,
      fields: parsed.fields,
      rows: parsed.rows,
      currentIndex: parsed.currentIndex || 0,
      savedAt: parsed.savedAt || new Date().toISOString(),
      exportedAt: parsed.exportedAt || undefined,
    };
  } catch {
    return null;
  }
}

export function writeSavedSession(session: Omit<SavedSession, "savedAt">): SavedSession {
  const fullSession: SavedSession = {
    ...session,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(fullSession));
  return fullSession;
}

export function clearSavedSession(): void {
  window.localStorage.removeItem(STORAGE_KEY_V1);
}
