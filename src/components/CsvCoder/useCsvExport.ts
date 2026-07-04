import { useState } from "preact/hooks";
import { formatCsv } from "./csv";
import { formatName, normalizeRow } from "./SessionStorage";
import type { CsvRow } from "./types";
import { isBlankOrNA, isTauriDesktop, LABEL_FIELD, NOTES_FIELD, FLAG_FIELD } from "./utils";

function getBaseName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "");
}

function getExportName(fileName: string, firstName: string) {
  let baseName = getBaseName(fileName).trim() || "coded-data";
  if (baseName.toLowerCase().includes("compare")) {
    baseName = baseName.replace(/compare/i, (match) => {
      return match[0] === "C" ? "Reference" : "reference";
    });
    return `${baseName}.csv`;
  }
  const safeFirstName = formatName(firstName).replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_");
  return `${baseName} ${safeFirstName}.csv`;
}

async function writeDownload(content: string, fileName: string): Promise<boolean> {
  if (isTauriDesktop()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<boolean>("export_csv", { fileName, content });
    return result;
  }

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

export function useCsvExport(
  fileName: string,
  firstName: string,
  fields: string[],
  rows: CsvRow[],
  onExportSuccess: (timestamp: string) => void,
) {
  const [error, setError] = useState("");

  const exportCsv = async () => {
    setError("");

    const isCompare = fileName.toLowerCase().includes("compare");
    const exportFields = isCompare
      ? fields.filter(f => {
          const lower = f.toLowerCase();
          return lower === "date" || lower === "question" || lower === "student coding" || lower === "label" || lower === "notes" || lower.includes("id");
        })
      : fields;

    const exportRows = rows.map((row) => {
      // Normalize fields, ensuring only relevant fields are exported
      const nextRow = normalizeRow(row, exportFields);
      nextRow[LABEL_FIELD] = isBlankOrNA(nextRow[LABEL_FIELD]) ? "NA" : nextRow[LABEL_FIELD];
      nextRow[NOTES_FIELD] = isBlankOrNA(nextRow[NOTES_FIELD]) ? "NA" : nextRow[NOTES_FIELD];
      if (nextRow[FLAG_FIELD] !== undefined) {
        nextRow[FLAG_FIELD] = isBlankOrNA(nextRow[FLAG_FIELD]) ? "NA" : nextRow[FLAG_FIELD];
      }
      
      return nextRow;
    });

    const csv = formatCsv(exportRows, exportFields);

    try {
      const didWrite = await writeDownload(csv, getExportName(fileName, firstName));
      if (didWrite) {
        setError("");
        onExportSuccess(new Date().toISOString());
        return true;
      }
      return false;
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "CSV export failed.");
      return false;
    }
  };

  return { error, setError, exportCsv };
}
