import type { CsvRow, SavedSession } from "./types";

export const STORAGE_KEY_V1 = "curiosity-coding-tool:v1";
export const FLAG_FIELD = "Flag";

export function isCsvRow(value: unknown): value is CsvRow {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((fieldValue) => typeof fieldValue === "string")
  );
}

export function formatName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function normalizeRow(row: CsvRow, fields: string[]): CsvRow {
  return fields.reduce<CsvRow>((nextRow, field) => {
    const value = row[field];
    nextRow[field] = value == null ? "" : String(value);
    return nextRow;
  }, {});
}

export function ensureFlagField(fields: string[]) {
  return fields.includes(FLAG_FIELD) ? fields : [...fields, FLAG_FIELD];
}

export function readSavedSession(): SavedSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_V1);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (
      typeof parsed.firstName !== "string" ||
      typeof parsed.fileName !== "string" ||
      !Array.isArray(parsed.fields) ||
      !parsed.fields.every((field: unknown) => typeof field === "string") ||
      !Array.isArray(parsed.rows) ||
      !parsed.rows.every(isCsvRow)
    ) {
      return null;
    }

    const fields = parsed.fields;
    
    const normalizedRows = parsed.rows.map((row: CsvRow) => {
      const norm = normalizeRow(row, fields);
      norm["__originalIndex"] = String(row["__originalIndex"]);
      return norm;
    });

    const session: SavedSession = {
      firstName: formatName(parsed.firstName),
      fileName: parsed.fileName,
      fields,
      rows: normalizedRows,
      currentIndex:
        typeof parsed.currentIndex === "number" && Number.isFinite(parsed.currentIndex)
          ? parsed.currentIndex
          : 0,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : undefined,
    };

    return session;
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
