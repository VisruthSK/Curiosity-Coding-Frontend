import { useState } from "preact/hooks";
import { parseCsvText } from "./csv";
import { ensureFlagField, normalizeRow } from "./SessionStorage";
import type { CsvRow } from "./types";

const LABEL_FIELD = "Label";
const NOTES_FIELD = "Notes";

function randomizeRows(rowsToRandomize: CsvRow[]) {
  const nextRows = [...rowsToRandomize];
  for (let index = nextRows.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextRows[index], nextRows[randomIndex]] = [nextRows[randomIndex], nextRows[index]];
  }
  return nextRows;
}

export function useCsvImport(
  onSuccess: (fileName: string, fields: string[], rows: CsvRow[]) => void,
) {
  const [error, setError] = useState("");

  const loadCsvText = (text: string, fileName: string) => {
    setError("");
    try {
      const { fields: parsedFields, rows: parsedRows } = parseCsvText(text);

      if (!parsedFields.includes(LABEL_FIELD) || !parsedFields.includes(NOTES_FIELD)) {
        setError("CSV must include Label and Notes columns.");
        return false;
      }

      if (!parsedRows.length) {
        setError("CSV did not contain any rows to code.");
        return false;
      }

      const nextFields = ensureFlagField(parsedFields);

      // Map each row to normalize and assign original index before randomization
      const preparedRows = parsedRows.map((row, index) => {
        const norm = normalizeRow(row, nextFields);
        norm["__originalIndex"] = String(index);
        return norm;
      });

      const randomized = randomizeRows(preparedRows);
      onSuccess(fileName, nextFields, randomized);
      return true;
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "CSV could not be parsed.");
      return false;
    }
  };

  return { error, setError, loadCsvText };
}
