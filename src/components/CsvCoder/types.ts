export type CsvRow = Record<string, string>;

export type SavedSession = {
  firstName: string;
  fileName: string;
  fields: string[];
  rows: CsvRow[];
  currentIndex: number;
  savedAt: string;
};

export type ModalState =
  | { type: "rename"; value: string }
  | { type: "start-over"; target: "signin" | "csv" }
  | null;
