import { describe, expect, it } from "vitest";
import { parseCsvText, formatCsv } from "../../src/components/CsvCoder/csv";

describe("CSV parsing and formatting logic", () => {
  it("successfully parses valid CSV text", () => {
    const csv = "Date,Question,Label,Notes\n2026-06-01,How to code?,2b,Simple note";
    const { fields, rows } = parseCsvText(csv);
    expect(fields).toEqual(["Date", "Question", "Label", "Notes"]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      Date: "2026-06-01",
      Question: "How to code?",
      Label: "2b",
      Notes: "Simple note",
    });
  });

  it("handles and strips UTF-8 BOM", () => {
    const csv = "\ufeffDate,Question,Label,Notes\n2026-06-01,How to code?,2b,Simple note";
    const { fields, rows } = parseCsvText(csv);
    expect(fields).toEqual(["Date", "Question", "Label", "Notes"]);
    expect(rows).toHaveLength(1);
  });

  it("rejects empty headers", () => {
    expect(() => parseCsvText("")).toThrow("CSV is empty or missing headers.");
  });

  it("rejects duplicate headers", () => {
    const csv = "Date,Question,Label,Label\n2026-06-01,How to code?,2b,2b";
    expect(() => parseCsvText(csv)).toThrow("CSV contains duplicate header names: Label");
  });

  it("rejects blank headers", () => {
    const csv = "Date,Question,,Notes\n2026-06-01,How to code?,2b,Simple note";
    expect(() => parseCsvText(csv)).toThrow("CSV contains blank header names.");
  });

  it("rejects headers that differ only by whitespace or have untrimmed whitespace", () => {
    const csv = "Date,Question ,Label,Notes\n2026-06-01,How to code?,2b,Simple note";
    expect(() => parseCsvText(csv)).toThrow("CSV headers cannot have leading or trailing whitespace.");
  });

  it("rejects row length mismatches", () => {
    const csv = "Date,Question,Label,Notes\n2026-06-01,How to code?,2b";
    expect(() => parseCsvText(csv)).toThrow("Row length mismatch at line 2: expected 4 columns, found 3.");
  });

  it("ignores completely empty lines", () => {
    const csv = "Date,Question,Label,Notes\n2026-06-01,How to code?,2b,Simple note\n\n   \n";
    const { rows } = parseCsvText(csv);
    expect(rows).toHaveLength(1);
  });

  it("formats rows back to CSV correctly", () => {
    const fields = ["Date", "Question", "Label", "Notes"];
    const rows = [
      { Date: "2026-06-01", Question: "How to code?", Label: "2b", Notes: "Simple note" },
    ];
    const csv = formatCsv(rows, fields);
    expect(csv.trim()).toBe('Date,Question,Label,Notes\n2026-06-01,How to code?,2b,Simple note');
  });
});
