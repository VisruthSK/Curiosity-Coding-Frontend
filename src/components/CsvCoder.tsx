import { csvFormatRows, csvParseRows } from "d3-dsv";
import type { ChangeEvent, FocusEvent, SubmitEvent } from "react";
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

type ModalState =
  | { type: "rename"; value: string }
  | { type: "start-over"; target: "signin" | "csv" }
  | null;

const STORAGE_KEY = "curiosity-coding-tool:v1";
const LABEL_FIELD = "Label";
const NOTES_FIELD = "Notes";
const RUBRIC_URL =
  "https://www.dropbox.com/scl/fi/hk484lt52g8u4j87q8wcg/RubricApril2026.xlsx";

const groupOrder = ["0", "1", "2", "3"] as const;
const codingOptionsByGroup = codingOptions.reduce<
  Record<(typeof groupOrder)[number], typeof codingOptions>
>(
  (groups, option) => {
    groups[option.group].push(option);
    return groups;
  },
  { "0": [], "1": [], "2": [], "3": [] },
);
const iconPaths = {
  checkCircle: [
    ["circle", { cx: "12", cy: "12", r: "10" }],
    ["path", { d: "m9 12 2 2 4-4" }],
  ],
  chevronLeft: [["path", { d: "m15 18-6-6 6-6" }]],
  chevronRight: [["path", { d: "m9 18 6-6-6-6" }]],
  circle: [["circle", { cx: "12", cy: "12", r: "10" }]],
  download: [
    ["path", { d: "M12 15V3" }],
    ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
    ["path", { d: "m7 10 5 5 5-5" }],
  ],
  fileText: [
    ["path", { d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }],
    ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }],
    ["path", { d: "M10 9H8" }],
    ["path", { d: "M16 13H8" }],
    ["path", { d: "M16 17H8" }],
  ],
  listChecks: [
    ["path", { d: "M13 5h8" }],
    ["path", { d: "M13 12h8" }],
    ["path", { d: "M13 19h8" }],
    ["path", { d: "m3 17 2 2 4-4" }],
    ["path", { d: "m3 7 2 2 4-4" }],
  ],
  rotateCcw: [
    ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
    ["path", { d: "M3 3v5h5" }],
  ],
  upload: [
    ["path", { d: "M12 3v12" }],
    ["path", { d: "m17 8-5-5-5 5" }],
    ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
  ],
} as const;

type IconName = keyof typeof iconPaths;

function Icon({ className, name, size = 18 }: { className?: string; name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name].map(([tagName, attributes], index) => {
        const Element = tagName;

        return <Element key={`${name}-${index}`} {...attributes} />;
      })}
    </svg>
  );
}

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
  const safeFirstName = formatName(firstName).replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_");
  return `${baseName} ${safeFirstName}.csv`;
}

function formatName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function normalizeRow(row: CsvRow, fields: string[]) {
  return fields.reduce<CsvRow>((nextRow, field) => {
    const value = row[field];
    nextRow[field] = value == null ? "" : String(value);
    return nextRow;
  }, {});
}

function isCsvRow(value: unknown): value is CsvRow {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((fieldValue) => typeof fieldValue === "string")
  );
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
      !parsed.fields.every((field) => typeof field === "string") ||
      !Array.isArray(parsed.rows) ||
      !parsed.rows.every(isCsvRow)
    ) {
      return null;
    }

    return {
      firstName: formatName(parsed.firstName),
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
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
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
  const [isOverview, setIsOverview] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("Not saved");
  const [modal, setModal] = useState<ModalState>(null);
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
  const rowNumber = rows.length ? currentIndex + 1 : 0;

  function confirmName(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedName = formatName(nameInput);

    if (!cleanedName) {
      setError("Enter a first name before continuing.");
      return;
    }

    setFirstName(cleanedName);
    setNameInput(cleanedName);
    setIsNameConfirmed(true);
    setError("");
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError("");

    try {
      const [header = [], ...dataRecords] = csvParseRows(await file.text());
      const parsedFields = header.map((field) => field.trim()).filter(Boolean);
      const parsedRows = dataRecords
        .map((record) =>
          parsedFields.reduce<CsvRow>((row, field, index) => {
            row[field] = record[index] ?? "";
            return row;
          }, {}),
        )
        .filter((row) => parsedFields.some((field) => row[field].trim() !== ""));

      if (!parsedFields.includes(LABEL_FIELD) || !parsedFields.includes(NOTES_FIELD)) {
        setError("CSV must include Label and Notes columns.");
        return;
      }

      if (!parsedRows.length) {
        setError("CSV did not contain any rows to code.");
        return;
      }

      setFileName(file.name);
      setFields(parsedFields);
      setRows(parsedRows.map((row) => normalizeRow(row, parsedFields)));
      setCurrentIndex(0);
      setIsOverview(false);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "CSV could not be parsed.");
    }
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
    if (isOverview) {
      setCurrentIndex(rows.length - 1);
      setIsOverview(false);
      return;
    }

    setCurrentIndex((index) => Math.max(index - 1, 0));
  }

  function goToNext() {
    if (currentIndex >= rows.length - 1) {
      setIsOverview(true);
      return;
    }

    setCurrentIndex((index) => Math.min(index + 1, rows.length - 1));
  }

  function openRow(index: number) {
    setCurrentIndex(index);
    setIsOverview(false);
  }

  function openRenameModal() {
    setModal({ type: "rename", value: firstName });
  }

  function confirmRename() {
    if (!modal || modal.type !== "rename") {
      return;
    }

    const nextName = formatName(modal.value);

    if (!nextName) {
      setError("Enter a first name before continuing.");
      return;
    }

    setFirstName(nextName);
    setNameInput(nextName);
    setError("");
    setModal(null);
  }

  function clearCurrentCsv() {
    window.localStorage.removeItem(STORAGE_KEY);
    setFileName("");
    setFields([]);
    setRows([]);
    setCurrentIndex(0);
    setIsOverview(false);
    setError("");
    setSaveStatus("Not saved");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function returnToSignin() {
    clearCurrentCsv();
    setFirstName("");
    setNameInput("");
    setIsNameConfirmed(false);
  }

  function confirmStartOver() {
    if (!modal || modal.type !== "start-over") {
      return;
    }

    if (modal.target === "signin") {
      returnToSignin();
    } else {
      clearCurrentCsv();
    }

    setModal(null);
  }

  function exportCsv() {
    const exportRows = rows.map((row) => {
      const nextRow = normalizeRow(row, fields);
      nextRow[LABEL_FIELD] = isBlankOrNA(nextRow[LABEL_FIELD]) ? "NA" : nextRow[LABEL_FIELD];
      nextRow[NOTES_FIELD] = isBlankOrNA(nextRow[NOTES_FIELD]) ? "NA" : nextRow[NOTES_FIELD];
      return nextRow;
    });
    const csv = csvFormatRows([
      fields,
      ...exportRows.map((row) => fields.map((field) => row[field] ?? "")),
    ]);

    writeDownload(csv, getExportName(fileName, firstName));
  }

  function keepNotesVisible(event: FocusEvent<HTMLTextAreaElement>) {
    window.setTimeout(() => {
      event.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 150);
  }

  if (!hydrated) {
    return (
      <main className="flex h-dvh items-center justify-center overflow-hidden px-6 py-10">
        <div className="h-2 w-44 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
          <div className="h-full w-1/2 bg-teal-700 dark:bg-blue-700" />
        </div>
      </main>
    );
  }

  const modalElement = modal ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/35 px-4 backdrop-blur-sm dark:bg-black/55">
      <section
        aria-modal="true"
        className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-neutral-700 dark:bg-neutral-900"
        role="dialog"
      >
        {modal.type === "rename" ? (
          <>
            <h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
              Rename coder
            </h2>
            <label
              className="mt-4 block text-sm font-medium text-neutral-800 dark:text-neutral-200"
              htmlFor="rename-coder"
            >
              First name
            </label>
            <input
              autoFocus
              className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base text-neutral-950 shadow-sm transition focus:border-teal-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
              id="rename-coder"
              onChange={(event) =>
                setModal({ type: "rename", value: event.target.value })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  confirmRename();
                }
              }}
              value={modal.value}
            />
            {error ? <p className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p> : null}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                className="inline-flex items-center justify-center rounded-lg border border-stone-300 px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-stone-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                onClick={() => {
                  setError("");
                  setModal(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center rounded-lg bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white"
                onClick={confirmRename}
                type="button"
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
              Start over?
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              {modal.target === "signin"
                ? "This will return to the first-name screen."
                : "This will clear the current CSV progress and return to file selection."}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                className="inline-flex items-center justify-center rounded-lg border border-stone-300 px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-stone-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                onClick={() => setModal(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center rounded-lg bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white"
                onClick={confirmStartOver}
                type="button"
              >
                Start over
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  ) : null;

  if (!isNameConfirmed) {
    return (
      <>
      <main className="h-dvh overflow-hidden px-4 py-4 text-neutral-950 dark:text-neutral-100 sm:px-6 lg:px-8">
        <section className="mx-auto flex h-full w-full max-w-[1800px] items-center justify-center">
          <div className="w-full rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-neutral-800 dark:bg-neutral-900 sm:max-w-lg sm:p-6 lg:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-teal-800 dark:text-blue-300">
                  Curiosity Coding
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-neutral-950 dark:text-neutral-50 sm:text-3xl">
                  Enter first name
                </h1>
              </div>
            </div>

            <form className="space-y-4" onSubmit={confirmName}>
              <label
                className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
                htmlFor="first-name"
              >
                First name
              </label>
              <input
                autoComplete="given-name"
                autoFocus
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base text-neutral-950 shadow-sm transition focus:border-teal-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                id="first-name"
                onChange={(event) => setNameInput(event.target.value)}
                value={nameInput}
              />
              {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white"
                type="submit"
              >
                Continue
                <Icon name="chevronRight" />
              </button>
            </form>
          </div>
        </section>
      </main>
      {modalElement}
      </>
    );
  }

  if (!rows.length) {
    return (
      <>
      <main className="h-dvh overflow-hidden px-4 py-4 text-neutral-950 dark:text-neutral-100 sm:px-6 lg:px-8">
        <section className="mx-auto flex h-full w-full max-w-[1800px] flex-col">
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-neutral-800 dark:bg-neutral-900 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 dark:border-neutral-800 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-teal-800 dark:text-blue-300">Curiosity Coding</p>
              <h1 className="mt-2 text-2xl font-semibold text-neutral-950 dark:text-neutral-50 sm:text-3xl">
                Choose CSV
              </h1>
              <button
                className="mt-2 text-sm text-neutral-600 underline decoration-stone-300 underline-offset-4 transition hover:text-teal-800 hover:decoration-teal-700 dark:text-neutral-400 dark:decoration-neutral-700 dark:hover:text-blue-200 dark:hover:decoration-blue-500"
                onClick={openRenameModal}
                type="button"
              >
                Coder: {firstName}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-neutral-800 transition hover:bg-stone-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                onClick={() => setModal({ type: "start-over", target: "signin" })}
                type="button"
              >
                <Icon name="rotateCcw" size={16} />
                Start over
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-1 flex-col">
            <input
              accept=".csv,text/csv"
              className="sr-only"
              id="csv-upload"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
            <label
              className="flex min-h-[42vh] w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 px-5 py-12 text-center transition hover:border-teal-700 hover:bg-teal-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
              htmlFor="csv-upload"
            >
              <Icon className="mb-3 text-teal-800 dark:text-blue-300" name="upload" size={28} />
              <span className="text-base font-semibold text-neutral-950 dark:text-neutral-50">Select CSV file</span>
            </label>
            {error ? <p className="mt-4 text-sm text-red-700 dark:text-red-400">{error}</p> : null}
          </div>
          </div>
        </section>
      </main>
      {modalElement}
      </>
    );
  }

  const detailFields = fields.filter((field) => field !== LABEL_FIELD && field !== NOTES_FIELD);

  return (
    <>
    <main className="min-h-dvh overflow-y-auto px-3 py-3 text-neutral-950 dark:text-neutral-100 sm:px-5 sm:py-5 lg:px-6 xl:h-dvh xl:overflow-hidden xl:px-8">
      <div className="mx-auto flex min-h-full w-full max-w-[1800px] flex-col gap-4 sm:gap-5 xl:h-full xl:min-h-0">
        <header className="shrink-0 rounded-lg border border-stone-200 bg-white p-4 shadow-soft dark:border-neutral-800 dark:bg-neutral-900 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-teal-800 dark:text-blue-300">
                Curiosity Coding
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="max-w-full truncate text-2xl font-semibold text-neutral-950 dark:text-neutral-50">
                  {fileName}
                </h1>
                <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-400/10 dark:text-amber-200">
                  {firstName}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                <span className="font-medium text-neutral-950 dark:text-neutral-50">
                  {codedCount}
                </span>
                /{rows.length} coded
              </div>
              {!isOverview ? (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-neutral-800 transition hover:bg-stone-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 sm:w-auto"
                  onClick={() => setIsOverview(true)}
                  type="button"
                >
                  <Icon name="listChecks" size={16} />
                  Review
                </button>
              ) : null}
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-neutral-800 transition hover:bg-stone-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 sm:w-auto"
                onClick={() => setModal({ type: "start-over", target: "csv" })}
                type="button"
              >
                <Icon name="rotateCcw" size={16} />
                Start over
              </button>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
              <span>
                {isOverview ? "Overview" : `Question ${rowNumber} of ${rows.length}`}
              </span>
              <span>{saveStatus}</span>
            </div>
            <progress
              aria-label="Coding progress"
              className="coding-progress"
              max={rows.length}
              value={codedCount}
            />
          </div>
        </header>

        <div className="grid flex-1 gap-4 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(400px,32vw)] xl:overflow-hidden">
          {isOverview ? (
            <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft dark:border-neutral-800 dark:bg-neutral-900 sm:p-5 lg:p-6 xl:col-span-2 xl:min-h-0 xl:overflow-y-auto">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                <Icon name="listChecks" />
                Overview
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.map((row, index) => {
                  const hasCoding = !isBlankOrNA(row[LABEL_FIELD]);
                  const hasNotes = !isBlankOrNA(row[NOTES_FIELD]);

                  return (
                    <button
                      className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-left transition hover:border-teal-700 hover:bg-teal-50 dark:border-neutral-800 dark:bg-neutral-800 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
                      key={`${row.Question ?? "row"}-${index}`}
                      onClick={() => openRow(index)}
                      type="button"
                    >
                      <span className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                        Question {index + 1}
                      </span>
                      <span className="flex flex-wrap gap-2">
                        <span
                          className={
                            hasCoding
                              ? "inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
                              : "inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
                          }
                        >
                          {hasCoding ? (
                            <Icon name="checkCircle" size={14} />
                          ) : (
                            <Icon name="circle" size={14} />
                          )}
                          {hasCoding ? "Coding" : "No coding"}
                        </span>
                        <span
                          className={
                            hasNotes
                              ? "inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
                              : "inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
                          }
                        >
                          {hasNotes ? (
                            <Icon name="checkCircle" size={14} />
                          ) : (
                            <Icon name="circle" size={14} />
                          )}
                          {hasNotes ? "Note" : "No note"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <>
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft dark:border-neutral-800 dark:bg-neutral-900 sm:p-5 lg:p-6 xl:min-h-0 xl:overflow-y-auto">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              <Icon name="fileText" />
              Current row
            </div>

            <dl className="grid gap-3 lg:gap-4">
              {detailFields.map((field) => (
                <div
                  className={
                    field === "Question"
                      ? "rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-neutral-800 dark:bg-neutral-800 sm:p-5 xl:p-6"
                      : "grid gap-1 border-b border-stone-100 pb-3 dark:border-neutral-800 last:border-b-0"
                  }
                  key={field}
                >
                  <dt className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-500">{field}</dt>
                  <dd
                    className={
                      field === "Question"
                        ? "mt-2 whitespace-pre-wrap text-base leading-7 text-neutral-950 dark:text-neutral-50 sm:text-lg xl:text-xl xl:leading-8"
                        : "whitespace-pre-wrap text-sm leading-6 text-neutral-800 dark:text-neutral-200"
                    }
                  >
                    {currentRow?.[field] || <span className="text-neutral-400 dark:text-neutral-600">Blank</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <aside className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft dark:border-neutral-800 dark:bg-neutral-900 sm:p-5 lg:p-6 xl:min-h-0 xl:overflow-y-auto">
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
                  Coding (
                  <a
                    className="text-teal-800 underline decoration-teal-700/45 underline-offset-4 transition hover:text-teal-900 hover:decoration-teal-900 dark:text-blue-300 dark:decoration-blue-500/70 dark:hover:text-blue-200 dark:hover:decoration-blue-300"
                    href={RUBRIC_URL}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Rubric
                  </a>
                  )
                </h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {selectedCodes.length ? selectedCodes.join(";") : "NA"}
                </p>
              </div>

              <div className="grid gap-4">
                {groupOrder.map((group) => (
                  <fieldset className="grid gap-2" key={group}>
                    <legend className="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      {codingGroupLabels[group]}
                    </legend>
                    <div className="grid gap-2">
                      {codingOptionsByGroup[group]
                        .map((option) => {
                          const checked = selectedCodes.includes(option.code);
                          return (
                            <label
                              className="grid cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 transition hover:border-teal-700 hover:bg-teal-50 dark:border-neutral-800 dark:bg-neutral-800 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
                              key={option.code}
                            >
                              <input
                                checked={checked}
                                className="mt-1 h-4 w-4 accent-teal-700"
                                onChange={() => toggleCode(option.code)}
                                type="checkbox"
                              />
                              <span className="min-w-0">
                                <span className="mr-2 inline-flex min-w-8 justify-center rounded border border-stone-300 bg-stone-50 px-1.5 py-0.5 text-xs font-bold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
                                  {option.code}
                                </span>
                                <span className="text-sm leading-5 text-neutral-800 dark:text-neutral-200">
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
                <label className="text-sm font-semibold text-neutral-800 dark:text-neutral-200" htmlFor="notes">
                  Notes
                </label>
                <textarea
                  className="mt-2 min-h-32 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm leading-6 text-neutral-950 shadow-sm transition focus:border-teal-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
                  id="notes"
                  onFocus={keepNotesVisible}
                  onChange={(event) =>
                    updateCurrentRow(NOTES_FIELD, event.target.value.trim() ? event.target.value : "NA")
                  }
                  value={isBlankOrNA(currentRow?.[NOTES_FIELD]) ? "" : currentRow?.[NOTES_FIELD] ?? ""}
                />
              </div>
            </div>
          </aside>
            </>
          )}
        </div>

        <footer className="shrink-0 rounded-lg border border-stone-200 bg-white/95 p-3 shadow-soft backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              disabled={!isOverview && currentIndex === 0}
              onClick={goToPrevious}
              type="button"
            >
              <Icon name="chevronLeft" />
              Previous
            </button>

            <div className="min-w-0 break-words text-center text-sm text-neutral-600 dark:text-neutral-400 sm:truncate">
              Output: {getExportName(fileName, firstName)}
            </div>

            {isOverview ? (
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white"
                onClick={exportCsv}
                type="button"
              >
                <Icon name="download" />
                Export CSV
              </button>
            ) : (
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white"
                onClick={goToNext}
                type="button"
              >
                Next
                <Icon name="chevronRight" />
              </button>
            )}
          </div>
        </footer>
      </div>
    </main>
    {modalElement}
    </>
  );
}
