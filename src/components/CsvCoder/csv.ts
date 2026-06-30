import { csvFormatRows, csvParseRows } from "d3-dsv";
import type { CsvRow } from "./types";

export function parseCsvText(csvText: string) {
  // Strip BOM if present
  let normalizedText = csvText;
  if (normalizedText.startsWith("\ufeff")) {
    normalizedText = normalizedText.slice(1);
  }

  const parsed = csvParseRows(normalizedText);
  const [header = [], ...dataRecords] = parsed;

  if (parsed.length === 0 || header.length === 0) {
    throw new Error("CSV is empty or missing headers.");
  }

  const seenHeaders = new Set<string>();
  for (const h of header) {
    if (h.trim() === "") {
      throw new Error("CSV contains blank header names.");
    }
    if (h !== h.trim()) {
      throw new Error("CSV headers cannot have leading or trailing whitespace.");
    }
    if (seenHeaders.has(h)) {
      throw new Error(`CSV contains duplicate header names: ${h}`);
    }
    seenHeaders.add(h);
  }

  const fields = header;
  const rows: CsvRow[] = [];

  for (let i = 0; i < dataRecords.length; i++) {
    const record = dataRecords[i];
    
    // Check if the row is entirely empty/blank
    const isBlank =
      record.length === 0 ||
      (record.length === 1 && record[0] === "") ||
      record.every((val) => val.trim() === "");

    if (isBlank) {
      continue;
    }

    if (record.length !== fields.length) {
      throw new Error(
        `Row length mismatch at line ${i + 2}: expected ${fields.length} columns, found ${record.length}.`,
      );
    }

    const row = fields.reduce<CsvRow>((rowObj, field, index) => {
      rowObj[field] = record[index] ?? "";
      return rowObj;
    }, {});
    rows.push(row);
  }

  return { fields, rows };
}

export function formatCsv(rows: CsvRow[], fields: string[]) {
  return csvFormatRows([
    fields,
    ...rows.map((row) => fields.map((field) => row[field] ?? "")),
  ]);
}
