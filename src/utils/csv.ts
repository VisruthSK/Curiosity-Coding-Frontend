import { csvFormatRows, csvParseRows } from "d3-dsv";

export type CsvRow = Record<string, string>;

type ParseCsvResult = {
  fields: string[];
  rows: CsvRow[];
};

export async function parseCsvFile(file: File): Promise<ParseCsvResult> {
  const records = csvParseRows(await file.text());
  const [header = [], ...dataRecords] = records;
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

export function unparseCsv(rows: CsvRow[], columns: string[]) {
  return csvFormatRows([
    columns,
    ...rows.map((row) => columns.map((column) => row[column] ?? "")),
  ]);
}
