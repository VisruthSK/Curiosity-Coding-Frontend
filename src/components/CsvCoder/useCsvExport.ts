import { useState } from "preact/hooks";
import { formatCsv } from "./csv";
import { formatName, normalizeRow } from "./SessionStorage";
import type { CsvRow } from "./types";
import { isBlankOrNA, isTauriDesktop, LABEL_FIELD, NOTES_FIELD, FLAG_FIELD } from "./utils";

function getBaseName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "");
}

function getExportName(fileName: string, firstName: string) {
  const baseName = getBaseName(fileName).trim() || "coded-data";
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

    const exportRows = rows.map((row) => {
      // Normalize fields, ensuring only relevant fields are exported
      const nextRow = normalizeRow(row, fields);
      nextRow[LABEL_FIELD] = isBlankOrNA(nextRow[LABEL_FIELD]) ? "NA" : nextRow[LABEL_FIELD];
      nextRow[NOTES_FIELD] = isBlankOrNA(nextRow[NOTES_FIELD]) ? "NA" : nextRow[NOTES_FIELD];
      nextRow[FLAG_FIELD] = isBlankOrNA(nextRow[FLAG_FIELD]) ? "NA" : nextRow[FLAG_FIELD];
      
      return nextRow;
    });

    const csv = formatCsv(exportRows, fields);

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
