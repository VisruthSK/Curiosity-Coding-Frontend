import { useState } from "preact/hooks";
import { parseCsvText } from "./csv";
import { ensureFlagField, normalizeRow } from "./SessionStorage";
import type { CsvRow } from "./types";
import { LABEL_FIELD, NOTES_FIELD } from "./utils";

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

      const preparedRows = parsedRows.map((row) => normalizeRow(row, nextFields));

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
