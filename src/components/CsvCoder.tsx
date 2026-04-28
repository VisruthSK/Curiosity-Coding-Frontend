import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  RotateCcw,
  Upload,
} from "lucide-react";
import Papa from "papaparse";
import type { ChangeEvent, SubmitEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { codingGroupLabels, codingOptions } from "../data/codingOptions";

type CsvRow = Record<string, string>;

type SavedSession = {
  firstName: string;
  fileName: string;
  fields: string[];
  rows: CsvRow[];
  currentIndex: number;
  savedAt: string;
};

const STORAGE_KEY = "curiosity-coding-tool:v1";
const LABEL_FIELD = "Label";
const NOTES_FIELD = "Notes";

const groupOrder = ["0", "1", "2", "3"] as const;

function isBlankOrNA(value: unknown) {
  return String(value ?? "").trim().toLowerCase() === "na" || String(value ?? "").trim() === "";
}

function parseLabelValue(value: string | undefined) {
  if (isBlankOrNA(value)) {
    return [];
  }

  return String(value)
    .split(";")
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean);
}

function getBaseName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "");
}

function getExportName(fileName: string, firstName: string) {
  const baseName = getBaseName(fileName).trim() || "coded-data";
  const safeFirstName = firstName.trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_");
  return `${baseName} ${safeFirstName}.csv`;
}

function normalizeRow(row: CsvRow, fields: string[]) {
  return fields.reduce<CsvRow>((nextRow, field) => {
    const value = row[field];
    nextRow[field] = value == null ? "" : String(value);
    return nextRow;
  }, {});
}

function readSavedSession(): SavedSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SavedSession>;
    if (
      typeof parsed.firstName !== "string" ||
      typeof parsed.fileName !== "string" ||
      !Array.isArray(parsed.fields) ||
      !Array.isArray(parsed.rows)
    ) {
      return null;
    }

    return {
      firstName: parsed.firstName,
      fileName: parsed.fileName,
      fields: parsed.fields,
      rows: parsed.rows,
      currentIndex:
        typeof parsed.currentIndex === "number" && Number.isFinite(parsed.currentIndex)
          ? parsed.currentIndex
          : 0,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeDownload(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function CsvCoder() {
  const [hydrated, setHydrated] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isNameConfirmed, setIsNameConfirmed] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("Not saved");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = readSavedSession();

    if (saved) {
      setFirstName(saved.firstName);
      setNameInput(saved.firstName);
      setIsNameConfirmed(Boolean(saved.firstName));
      setFileName(saved.fileName);
      setFields(saved.fields);
      setRows(saved.rows);
      setCurrentIndex(Math.min(Math.max(saved.currentIndex, 0), Math.max(saved.rows.length - 1, 0)));
      setSaveStatus(`Saved ${new Date(saved.savedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}`);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !isNameConfirmed) {
      return;
    }

    setSaveStatus("Saving...");
    const timeoutId = window.setTimeout(() => {
      const session: SavedSession = {
        firstName,
        fileName,
        fields,
        rows,
        currentIndex,
        savedAt: new Date().toISOString(),
      };

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setSaveStatus(`Saved ${new Date(session.savedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}`);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [currentIndex, fields, fileName, firstName, hydrated, isNameConfirmed, rows]);

  const currentRow = rows[currentIndex];
  const selectedCodes = useMemo(() => parseLabelValue(currentRow?.[LABEL_FIELD]), [currentRow]);
  const codedCount = useMemo(
    () => rows.filter((row) => !isBlankOrNA(row[LABEL_FIELD])).length,
    [rows],
  );
  const completionPercentage = rows.length ? Math.round((codedCount / rows.length) * 100) : 0;
  const rowNumber = rows.length ? currentIndex + 1 : 0;

  function confirmName(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedName = nameInput.trim();

    if (!cleanedName) {
      setError("Enter a first name before continuing.");
      return;
    }

    setFirstName(cleanedName);
    setNameInput(cleanedName);
    setIsNameConfirmed(true);
    setError("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError("");
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      complete: (results) => {
        const parsedFields = results.meta.fields?.filter(Boolean) ?? [];

        if (!parsedFields.includes(LABEL_FIELD) || !parsedFields.includes(NOTES_FIELD)) {
          setError("CSV must include Label and Notes columns.");
          return;
        }

        const parsedRows = results.data
          .map((row) => normalizeRow(row, parsedFields))
          .filter((row) => parsedFields.some((field) => String(row[field] ?? "").trim() !== ""));

        if (!parsedRows.length) {
          setError("CSV did not contain any rows to code.");
          return;
        }

        setFileName(file.name);
        setFields(parsedFields);
        setRows(parsedRows);
        setCurrentIndex(0);
      },
      error: (parseError) => {
        setError(parseError.message);
      },
    });
  }

  function updateCurrentRow(field: string, value: string) {
    setRows((previousRows) =>
      previousRows.map((row, index) =>
        index === currentIndex
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  }

  function toggleCode(code: string) {
    const nextCodes = selectedCodes.includes(code)
      ? selectedCodes.filter((selectedCode) => selectedCode !== code)
      : [...selectedCodes, code];
    const sortedCodes = codingOptions
      .map((option) => option.code)
      .filter((optionCode) => nextCodes.includes(optionCode));

    updateCurrentRow(LABEL_FIELD, sortedCodes.length ? sortedCodes.join(";") : "NA");
  }

  function goToPrevious() {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  }

  function goToNext() {
    setCurrentIndex((index) => Math.min(index + 1, rows.length - 1));
  }

  function clearSavedWork() {
    window.localStorage.removeItem(STORAGE_KEY);
    setFirstName("");
    setNameInput("");
    setIsNameConfirmed(false);
    setFileName("");
    setFields([]);
    setRows([]);
    setCurrentIndex(0);
    setError("");
    setSaveStatus("Not saved");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function exportCsv() {
    const exportRows = rows.map((row) => {
      const nextRow = normalizeRow(row, fields);
      nextRow[LABEL_FIELD] = isBlankOrNA(nextRow[LABEL_FIELD]) ? "NA" : nextRow[LABEL_FIELD];
      nextRow[NOTES_FIELD] = isBlankOrNA(nextRow[NOTES_FIELD]) ? "NA" : nextRow[NOTES_FIELD];
      return nextRow;
    });
    const csv = Papa.unparse(exportRows, {
      columns: fields,
      newline: "\r\n",
    });

    writeDownload(csv, getExportName(fileName, firstName));
  }

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="h-2 w-44 overflow-hidden rounded bg-neutral-200">
          <div className="h-full w-1/2 bg-teal-700" />
        </div>
      </main>
    );
  }

  if (!isNameConfirmed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-8">
        <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-soft">
          <div className="mb-6">
            <p className="text-sm font-medium text-teal-800">Curiosity Coding</p>
            <h1 className="mt-2 text-2xl font-semibold text-neutral-950">Enter first name</h1>
          </div>

          <form className="space-y-4" onSubmit={confirmName}>
            <label className="block text-sm font-medium text-neutral-800" htmlFor="first-name">
              First name
            </label>
            <input
              autoComplete="given-name"
              autoFocus
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base text-neutral-950 shadow-sm transition focus:border-teal-700"
              id="first-name"
              onChange={(event) => setNameInput(event.target.value)}
              value={nameInput}
            />
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              type="submit"
            >
              Continue
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!rows.length) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-8">
        <section className="w-full max-w-xl rounded-lg border border-stone-200 bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-teal-800">Curiosity Coding</p>
              <h1 className="mt-2 text-2xl font-semibold text-neutral-950">Choose CSV</h1>
              <p className="mt-2 text-sm text-neutral-600">Coder: {firstName}</p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-neutral-800 transition hover:bg-stone-50"
              onClick={clearSavedWork}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={16} />
              Start over
            </button>
          </div>

          <div className="mt-6">
            <input
              accept=".csv,text/csv"
              className="sr-only"
              id="csv-upload"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
            <label
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 px-5 py-12 text-center transition hover:border-teal-700 hover:bg-teal-50"
              htmlFor="csv-upload"
            >
              <Upload aria-hidden="true" className="mb-3 text-teal-800" size={28} />
              <span className="text-base font-semibold text-neutral-950">Select CSV file</span>
              <span className="mt-2 text-sm text-neutral-600">Parsed and autosaved in this browser</span>
            </label>
            {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  const detailFields = fields.filter((field) => field !== LABEL_FIELD && field !== NOTES_FIELD);

  return (
    <main className="min-h-screen px-4 py-5 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-teal-800">Curiosity Coding</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="max-w-full truncate text-2xl font-semibold text-neutral-950">
                  {fileName}
                </h1>
                <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                  {firstName}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="text-sm text-neutral-600">
                <span className="font-medium text-neutral-950">{codedCount}</span>/{rows.length} coded
              </div>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-neutral-800 transition hover:bg-stone-50"
                onClick={clearSavedWork}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={16} />
                Start over
              </button>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm text-neutral-600">
              <span>
                Row {rowNumber} of {rows.length}
              </span>
              <span>{saveStatus}</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-stone-200">
              <div
                className="h-full bg-teal-700 transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft sm:p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-700">
              <FileText aria-hidden="true" size={18} />
              Current row
            </div>

            <dl className="grid gap-3">
              {detailFields.map((field) => (
                <div
                  className={
                    field === "Question"
                      ? "rounded-lg border border-stone-200 bg-stone-50 p-4"
                      : "grid gap-1 border-b border-stone-100 pb-3 last:border-b-0"
                  }
                  key={field}
                >
                  <dt className="text-xs font-semibold uppercase text-neutral-500">{field}</dt>
                  <dd
                    className={
                      field === "Question"
                        ? "mt-2 whitespace-pre-wrap text-lg leading-7 text-neutral-950"
                        : "whitespace-pre-wrap text-sm leading-6 text-neutral-800"
                    }
                  >
                    {currentRow?.[field] || <span className="text-neutral-400">Blank</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <aside className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft sm:p-5">
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-neutral-950">Coding</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  {selectedCodes.length ? selectedCodes.join(";") : "NA"}
                </p>
              </div>

              <div className="grid gap-4">
                {groupOrder.map((group) => (
                  <fieldset className="grid gap-2" key={group}>
                    <legend className="mb-2 text-sm font-semibold text-neutral-800">
                      {codingGroupLabels[group]}
                    </legend>
                    <div className="grid gap-2">
                      {codingOptions
                        .filter((option) => option.group === group)
                        .map((option) => {
                          const checked = selectedCodes.includes(option.code);
                          return (
                            <label
                              className="grid cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 transition hover:border-teal-700 hover:bg-teal-50"
                              key={option.code}
                            >
                              <input
                                checked={checked}
                                className="mt-1 h-4 w-4 accent-teal-700"
                                onChange={() => toggleCode(option.code)}
                                type="checkbox"
                              />
                              <span className="min-w-0">
                                <span className="mr-2 inline-flex min-w-8 justify-center rounded border border-stone-300 bg-stone-50 px-1.5 py-0.5 text-xs font-bold text-neutral-900">
                                  {option.code}
                                </span>
                                <span className="text-sm leading-5 text-neutral-800">
                                  {option.label}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </fieldset>
                ))}
              </div>

              <div>
                <label className="text-sm font-semibold text-neutral-800" htmlFor="notes">
                  Notes
                </label>
                <textarea
                  className="mt-2 min-h-28 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm leading-6 text-neutral-950 shadow-sm transition focus:border-teal-700"
                  id="notes"
                  onChange={(event) =>
                    updateCurrentRow(NOTES_FIELD, event.target.value.trim() ? event.target.value : "NA")
                  }
                  value={isBlankOrNA(currentRow?.[NOTES_FIELD]) ? "" : currentRow?.[NOTES_FIELD] ?? ""}
                />
              </div>
            </div>
          </aside>
        </div>

        <footer className="sticky bottom-0 rounded-lg border border-stone-200 bg-white/95 p-3 shadow-soft backdrop-blur sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={currentIndex === 0}
              onClick={goToPrevious}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={18} />
              Previous
            </button>

            <div className="text-center text-sm text-neutral-600">
              Output: {getExportName(fileName, firstName)}
            </div>

            {currentIndex === rows.length - 1 ? (
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                onClick={exportCsv}
                type="button"
              >
                <Download aria-hidden="true" size={18} />
                Export CSV
              </button>
            ) : (
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                onClick={goToNext}
                type="button"
              >
                Next
                <ChevronRight aria-hidden="true" size={18} />
              </button>
            )}
          </div>
        </footer>
      </div>
    </main>
  );
}
