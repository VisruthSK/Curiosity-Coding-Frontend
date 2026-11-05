import type { CsvRow } from "./types";

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

const comparisonFields = new Set([
  "class", "id", "day", "date", "question", "student coding", "reference",
  "referencenotes", "referenceflag", "vote", "votes", "totalvotes",
  "label", "notes", "flag", "__questionnumber",
]);

export function coderFields(row: CsvRow): string[] {
  return Object.keys(row).filter((field) => {
    const name = field.toLowerCase();
    return !comparisonFields.has(name) && !name.endsWith("notes") && !name.endsWith("flag");
  });
}

export function alignmentStatus(row: CsvRow): "Agrees" | "Disagrees" | "Unanswered" {
  const code = row[coderFields(row)[0]];
  if (isBlankOrNA(code) || isBlankOrNA(row.Reference)) return "Unanswered";
  const normalize = (value: string) => value.trim().replace(/;\s*/g, ";");
  return normalize(code) === normalize(row.Reference) ? "Agrees" : "Disagrees";
}
