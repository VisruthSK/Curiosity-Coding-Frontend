import { useState } from "preact/hooks";
import { parseCsvText } from "./csv";
import { normalizeRow } from "./SessionStorage";
import type { CsvRow } from "./types";
import { alignmentStatus, coderFields, CODING_FIELDS, FLAG_FIELD, IDENTITY_FIELDS, LABEL_FIELD, NOTES_FIELD } from "./utils";

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

      const isAlignment = fileName.toLowerCase().includes("alignment");
      const isCompare = fileName.toLowerCase().includes("compare");
      const isReview = isCompare || isAlignment;

      const required = isReview ? [...IDENTITY_FIELDS, "Student Coding"] : CODING_FIELDS;
      const missing = required.filter((field) => !parsedFields.includes(field));
      if (missing.length) {
        setError(`CSV is missing required columns: ${missing.join(", ")}.`);
        return false;
      }

      if (!parsedRows.length) {
        setError("CSV did not contain any rows to code.");
        return false;
      }

      const nextFields = isReview ? [...parsedFields, LABEL_FIELD, NOTES_FIELD, FLAG_FIELD] : [...parsedFields];

      const hasReference = parsedFields.includes("Reference");
      const hasReferenceNotes = parsedFields.includes("ReferenceNotes");

      nextFields.push("__QuestionNumber");
      const preparedRows = parsedRows.map((row, index) => {
        const normalized = normalizeRow(row, nextFields);
        normalized.__QuestionNumber = String(index + 1);
        if (hasReference && (!normalized[LABEL_FIELD] || normalized[LABEL_FIELD].toLowerCase() === "na")) {
          normalized[LABEL_FIELD] = row["Reference"] || "";
        }
        if (hasReferenceNotes && (!normalized[NOTES_FIELD] || normalized[NOTES_FIELD].toLowerCase() === "na")) {
          normalized[NOTES_FIELD] = row["ReferenceNotes"] || "";
        }
        return normalized;
      });

      let sortedRows = preparedRows;
      if (isReview) {
        const coderKeys = coderFields(preparedRows[0] || {});

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

        sortedRows = [...preparedRows].sort((a, b) => {
          if (isAlignment) {
            const disagreement = (row: CsvRow) => alignmentStatus(row) === "Disagrees" ? 0 : 1;
            return disagreement(a) - disagreement(b) || Number(a.__QuestionNumber) - Number(b.__QuestionNumber);
          }
          return getAgreementScore(a) - getAgreementScore(b) || Number(a.__QuestionNumber) - Number(b.__QuestionNumber);
        });
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
