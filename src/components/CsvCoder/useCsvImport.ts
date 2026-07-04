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

      let nextFields = [...parsedFields];
      if (!nextFields.includes(LABEL_FIELD)) {
        nextFields.push(LABEL_FIELD);
      }
      if (!nextFields.includes(NOTES_FIELD)) {
        nextFields.push(NOTES_FIELD);
      }

      if (!parsedRows.length) {
        setError("CSV did not contain any rows to code.");
        return false;
      }

      nextFields = ensureFlagField(nextFields);

      const hasReference = parsedFields.includes("Reference");
      const hasReferenceNotes = parsedFields.includes("ReferenceNotes");

      const preparedRows = parsedRows.map((row) => {
        const normalized = normalizeRow(row, nextFields);
        if (hasReference && (!normalized[LABEL_FIELD] || normalized[LABEL_FIELD].toLowerCase() === "na")) {
          normalized[LABEL_FIELD] = row["Reference"] || "";
        }
        if (hasReferenceNotes && (!normalized[NOTES_FIELD] || normalized[NOTES_FIELD].toLowerCase() === "na")) {
          normalized[NOTES_FIELD] = row["ReferenceNotes"] || "";
        }
        return normalized;
      });

      let sortedRows = preparedRows;
      const isCompare = fileName.toLowerCase().includes("compare");
      if (isCompare) {
        const keys = Object.keys(preparedRows[0] || {});
        const standardFieldsSet = new Set([
          "question", "student coding", "reference", "referencenotes",
          "vote", "votes", "totalvotes", "label", "notes", "flag", "id"
        ]);
        const coderKeys = keys.filter(key => {
          const k = key.toLowerCase();
          return !standardFieldsSet.has(k) && !k.endsWith("notes");
        });

        const getAgreementScore = (row: CsvRow) => {
          const codes = coderKeys
            .map(k => (row[k] || "").trim())
            .filter(c => c && c.toLowerCase() !== "na");
          if (codes.length === 0) return 0;
          const freq: Record<string, number> = {};
          codes.forEach(c => {
            freq[c] = (freq[c] || 0) + 1;
          });
          const maxFreq = Math.max(...Object.values(freq));
          return maxFreq / codes.length;
        };

        sortedRows = [...preparedRows].sort((a, b) => getAgreementScore(a) - getAgreementScore(b));
      } else {
        sortedRows = randomizeRows(preparedRows);
      }
      onSuccess(fileName, nextFields, sortedRows);
      return true;
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "CSV could not be parsed.");
      return false;
    }
  };

  return { error, setError, loadCsvText };
}
