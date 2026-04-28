import { csvFormatRows, csvParseRows } from "d3-dsv";
import type { CsvRow } from "./types";

export function parseCsvText(csvText: string) {
  const [header = [], ...dataRecords] = csvParseRows(csvText);
  const fields = header.map((field) => field.trim()).filter(Boolean);
  const rows = dataRecords
    .map((record) =>
      fields.reduce<CsvRow>((row, field, index) => {
        row[field] = record[index] ?? "";
        return row;
      }, {}),
    )
    .filter((row) => fields.some((field) => row[field].trim() !== ""));

  return { fields, rows };
}

export function formatCsv(rows: CsvRow[], fields: string[]) {
  return csvFormatRows([
    fields,
    ...rows.map((row) => fields.map((field) => row[field] ?? "")),
  ]);
}
