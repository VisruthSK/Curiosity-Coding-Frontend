import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { formatCsv, parseCsvText } from "./CsvCoder/csv";
import { ModalDialog } from "./CsvCoder/ModalDialog";
import type { CsvRow, ModalState, SavedSession } from "./CsvCoder/types";
import { BrandLabel, Button, FieldLabel, Icon, StatusPill, styles } from "./CsvCoder/ui";
import { codingGroupLabels, codingOptions } from "../data/codingOptions";

const STORAGE_KEY = "curiosity-coding-tool:v1";
const LABEL_FIELD = "Label";
const NOTES_FIELD = "Notes";
const FLAG_FIELD = "Flag";
const RUBRIC_URL =
  "https://www.dropbox.com/scl/fi/hk484lt52g8u4j87q8wcg/RubricApril2026.xlsx";
const INSTRUCTOR_DIARY_URL =
  "https://docs.google.com/spreadsheets/d/1OfLVEqSGIwWYakWB9QCMS1p0nSKU-8QfsL0Gb_YuN38/edit?usp=sharing";

const groupOrder = ["1", "2", "3", "0"] as const;
const codingOptionsByGroup = codingOptions.reduce<
  Record<(typeof groupOrder)[number], typeof codingOptions>
>(
  (groups, option) => {
    groups[option.group].push(option);
    return groups;
  },
  { "0": [], "1": [], "2": [], "3": [] },
);

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

function ensureFlagField(fields: string[]) {
  return fields.includes(FLAG_FIELD) ? fields : [...fields, FLAG_FIELD];
}

function randomizeRows(rowsToRandomize: CsvRow[]) {
  const nextRows = [...rowsToRandomize];

  for (let index = nextRows.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextRows[index], nextRows[randomIndex]] = [nextRows[randomIndex], nextRows[index]];
  }

  return nextRows;
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

    const fields = ensureFlagField(parsed.fields);

    return {
      firstName: formatName(parsed.firstName),
      fileName: parsed.fileName,
      fields,
      rows: parsed.rows.map((row) => normalizeRow(row, fields)),
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
  const questionSectionRef = useRef<HTMLElement | null>(null);

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
  const isCurrentRowFlagged = String(currentRow?.[FLAG_FIELD] ?? "").trim().toUpperCase() === "TRUE";
  const codedCount = useMemo(
    () => rows.filter((row) => !isBlankOrNA(row[LABEL_FIELD])).length,
    [rows],
  );
  const rowNumber = rows.length ? currentIndex + 1 : 0;

  function confirmName(event: Event) {
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

  async function handleFileChange(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }

    setError("");

    try {
      const { fields: parsedFields, rows: parsedRows } = parseCsvText(await file.text());

      if (!parsedFields.includes(LABEL_FIELD) || !parsedFields.includes(NOTES_FIELD)) {
        setError("CSV must include Label and Notes columns.");
        return;
      }

      if (!parsedRows.length) {
        setError("CSV did not contain any rows to code.");
        return;
      }

      const nextFields = ensureFlagField(parsedFields);

      setFileName(file.name);
      setFields(nextFields);
      setRows(randomizeRows(parsedRows.map((row) => normalizeRow(row, nextFields))));
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

  function toggleCurrentRowFlag() {
    updateCurrentRow(FLAG_FIELD, isCurrentRowFlagged ? "NA" : "TRUE");
  }

  function scrollToQuestionOnMobile() {
    if (!window.matchMedia("(max-width: 767px)").matches) {
      return;
    }

    window.requestAnimationFrame(() => {
      questionSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  function goToPrevious() {
    if (isOverview) {
      setCurrentIndex(rows.length - 1);
      setIsOverview(false);
      scrollToQuestionOnMobile();
      return;
    }

    setCurrentIndex((index) => Math.max(index - 1, 0));
    scrollToQuestionOnMobile();
  }

  function goToNext() {
    if (currentIndex >= rows.length - 1) {
      setIsOverview(true);
      return;
    }

    setCurrentIndex((index) => Math.min(index + 1, rows.length - 1));
    scrollToQuestionOnMobile();
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
      nextRow[FLAG_FIELD] = isBlankOrNA(nextRow[FLAG_FIELD]) ? "NA" : nextRow[FLAG_FIELD];
      return nextRow;
    });
    const csv = formatCsv(exportRows, fields);

    writeDownload(csv, getExportName(fileName, firstName));
  }

  function keepNotesVisible(event: Event) {
    const notes = event.currentTarget as HTMLTextAreaElement;

    window.setTimeout(() => {
      notes.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 150);
  }

  if (!hydrated) {
    return (
      <main className="flex h-dvh items-center justify-center overflow-hidden px-6 py-10">
        <div className="h-2 w-44 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
          <div className="h-full w-1/2 bg-blue-700 dark:bg-blue-700" />
        </div>
      </main>
    );
  }

  const modalElement = modal ? (
    <ModalDialog
      error={error}
      modal={modal}
      onCancel={() => {
        setError("");
        setModal(null);
      }}
      onConfirmRename={confirmRename}
      onConfirmStartOver={confirmStartOver}
      onRenameInput={(value) => setModal({ type: "rename", value })}
    />
  ) : null;

  if (!isNameConfirmed) {
    return (
      <>
      <main className="h-dvh overflow-hidden px-4 py-4 text-neutral-950 dark:text-neutral-100 sm:px-6 lg:px-8">
        <section className="mx-auto flex h-full w-full max-w-[1800px] items-center justify-center">
          <div className={`${styles.card} w-full p-5 sm:max-w-lg sm:p-6 lg:p-8`}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <BrandLabel />
                <h1 className="mt-2 text-2xl font-semibold text-neutral-950 dark:text-neutral-50 sm:text-3xl">
                  Enter first name
                </h1>
              </div>
            </div>

            <form className="space-y-4" onSubmit={confirmName}>
              <FieldLabel htmlFor="first-name">First name</FieldLabel>
              <input
                autoComplete="given-name"
                autoFocus
                className={`${styles.field} px-3 py-3 text-base`}
                id="first-name"
                onInput={(event) => setNameInput(event.currentTarget.value)}
                value={nameInput}
              />
              {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
              <Button className="w-full" type="submit" variant="primary">
                Continue
                <Icon name="chevronRight" />
              </Button>
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
          <div className={`${styles.card} p-5 sm:p-6 lg:p-8`}>
          <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 dark:border-neutral-800 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <BrandLabel />
              <h1 className="mt-2 text-2xl font-semibold text-neutral-950 dark:text-neutral-50 sm:text-3xl">
                Choose CSV
              </h1>
              <button
                className={`${styles.mutedLink} mt-2`}
                onClick={openRenameModal}
                type="button"
              >
                Coder: {firstName}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setModal({ type: "start-over", target: "signin" })}
                variant="secondarySmall"
              >
                <Icon name="rotateCcw" size={16} />
                Start over
              </Button>
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
              className={`flex min-h-[42vh] w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 px-5 py-12 text-center dark:border-neutral-700 dark:bg-neutral-800 ${styles.interactiveSurface}`}
              htmlFor="csv-upload"
            >
              <Icon className="mb-3 text-blue-700 dark:text-blue-300" name="upload" size={28} />
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

  const detailFields = fields.filter(
    (field) => field !== LABEL_FIELD && field !== NOTES_FIELD && field !== FLAG_FIELD,
  );

  return (
    <>
    <main className="min-h-dvh overflow-y-auto px-3 py-3 text-neutral-950 dark:text-neutral-100 sm:px-5 sm:py-4 lg:px-6 xl:h-dvh xl:overflow-hidden xl:px-8">
      <div className="mx-auto flex min-h-full w-full max-w-[1800px] flex-col gap-3 sm:gap-4 xl:h-full xl:min-h-0">
        <header className={`${styles.card} shrink-0 p-3 sm:p-4`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="max-w-full truncate text-xl font-semibold text-neutral-950 dark:text-neutral-50 sm:text-2xl">
                  {fileName}
                </h1>
                <button
                  className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[900px] font-medium leading-5 text-amber-900 transition hover:border-amber-400 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:border-amber-400/50 dark:hover:bg-amber-400/20"
                  onClick={openRenameModal}
                  type="button"
                >
                  {firstName}
                </button>
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
                <Button
                  className="sm:w-auto"
                  onClick={() => setIsOverview(true)}
                  variant="secondarySmall"
                >
                  <Icon name="listChecks" size={16} />
                  Review
                </Button>
              ) : null}
              <Button
                className="sm:w-auto"
                onClick={() => setModal({ type: "start-over", target: "csv" })}
                variant="secondarySmall"
              >
                <Icon name="rotateCcw" size={16} />
                Start over
              </Button>
            </div>
          </div>

          <div className="mt-3">
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
            <section className={`${styles.card} p-4 sm:p-5 lg:p-6 xl:col-span-2 xl:min-h-0 xl:overflow-y-auto`}>
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                <Icon name="listChecks" />
                Overview
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.map((row, index) => {
                  const hasCoding = !isBlankOrNA(row[LABEL_FIELD]);
                  const hasNotes = !isBlankOrNA(row[NOTES_FIELD]);
                  const isFlagged = String(row[FLAG_FIELD] ?? "").trim().toUpperCase() === "TRUE";

                  return (
                    <button
                      className={
                        isFlagged
                          ? "grid gap-3 rounded-lg border border-amber-500 bg-amber-200 p-3 text-left text-amber-950 transition hover:border-amber-600 hover:bg-amber-300 dark:border-amber-300 dark:bg-amber-500/30 dark:text-amber-50 dark:hover:border-amber-200 dark:hover:bg-amber-500/40"
                          : `grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-left dark:border-neutral-800 dark:bg-neutral-800 ${styles.interactiveSurface}`
                      }
                      key={`${row.Question ?? "row"}-${index}`}
                      onClick={() => openRow(index)}
                      type="button"
                    >
                      <span
                        className={
                          isFlagged
                            ? "text-sm font-semibold text-amber-950 dark:text-amber-50"
                            : "text-sm font-semibold text-neutral-950 dark:text-neutral-50"
                        }
                      >
                        Question {index + 1}
                      </span>
                      <span className="flex flex-wrap gap-2">
                        <StatusPill active={hasCoding} activeText="Coding" inactiveText="No coding" />
                        <StatusPill active={hasNotes} activeText="Note" inactiveText="No note" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <>
          <section className={`${styles.card} p-4 sm:p-5 lg:p-6 xl:min-h-0 xl:overflow-y-auto`} ref={questionSectionRef}>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  <Icon name="fileText" />
                  I Wonder Question
                  </span>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Coding preview:{" "}
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedCodes.length ? selectedCodes.join(";") : "NA"}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 md:ml-auto md:flex-nowrap md:justify-end">
                  <a
                    className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 transition hover:border-stone-400 hover:bg-stone-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
                    href={RUBRIC_URL}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Rubric
                    <Icon name="externalLink" size={15} />
                  </a>
                  <a
                    className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 transition hover:border-stone-400 hover:bg-stone-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
                    href={INSTRUCTOR_DIARY_URL}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Instructor diary
                    <Icon name="externalLink" size={15} />
                  </a>
                <Button
                  aria-pressed={isCurrentRowFlagged}
                  className={
                    `md:ml-auto ${isCurrentRowFlagged
                      ? "border-amber-500 bg-amber-200 text-amber-950 hover:border-amber-600 hover:bg-amber-300 dark:border-amber-300 dark:bg-amber-500/30 dark:text-amber-50 dark:hover:border-amber-200 dark:hover:bg-amber-500/40"
                      : ""}`
                  }
                  onClick={toggleCurrentRowFlag}
                  variant="secondarySmall"
                >
                  <Icon name="flag" size={16} />
                  {isCurrentRowFlagged ? "Flagged" : "Flag question"}
                </Button>
              </div>
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

          <aside className={`${styles.card} p-3 sm:p-4 lg:p-5 xl:min-h-0 xl:overflow-y-auto`}>
            <div className="space-y-4">
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
                              className={`grid cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800 ${styles.interactiveSurface}`}
                              key={option.code}
                            >
                              <input
                                checked={checked}
                                className="mt-1 h-4 w-4 accent-blue-600 dark:accent-blue-600"
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
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <textarea
                  className={`${styles.field} mt-2 min-h-32 resize-y px-3 py-2 text-sm leading-6`}
                  id="notes"
                  onFocus={keepNotesVisible}
                  onInput={(event) =>
                    updateCurrentRow(
                      NOTES_FIELD,
                      event.currentTarget.value.trim() ? event.currentTarget.value : "NA",
                    )
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
          {isOverview ? (
            <div className="flex justify-center">
              <Button onClick={exportCsv} variant="primary">
                <Icon name="download" />
                Export CSV
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <Button
                className="disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:border-stone-300 disabled:hover:bg-transparent disabled:hover:shadow-none dark:disabled:hover:border-neutral-700"
                disabled={currentIndex === 0}
                onClick={goToPrevious}
              >
                <Icon name="chevronLeft" />
                Previous
              </Button>
              <div aria-hidden="true" />
              <Button onClick={goToNext} variant="primary">
                Next
                <Icon name="chevronRight" />
              </Button>
            </div>
          )}
        </footer>
      </div>
    </main>
    {modalElement}
    </>
  );
}
