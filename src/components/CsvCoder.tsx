import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { KeybindSettings } from "./CsvCoder/KeybindSettings";
import { DEFAULT_KEYBINDS, keybindMatches, readKeybindConfig, resetKeybindConfig, writeKeybindConfig } from "./CsvCoder/keybinds";
import type { KeybindConfig } from "./CsvCoder/keybinds";
import { ModalDialog } from "./CsvCoder/ModalDialog";
import type { CsvRow, ModalState } from "./CsvCoder/types";
import { BrandLabel, Button, FieldLabel, Icon, styles } from "./CsvCoder/ui";
import { DesktopTopbar } from "./DesktopTopbar";
import { DesktopUpdateNotice } from "./DesktopUpdateNotice";

import { useCodingSession } from "./CsvCoder/useCodingSession";
import { useAutosave } from "./CsvCoder/useAutosave";
import { useCsvImport } from "./CsvCoder/useCsvImport";
import { useCsvExport } from "./CsvCoder/useCsvExport";
import { CodingPanel } from "./CsvCoder/CodingPanel";
import { QuestionPanel } from "./CsvCoder/QuestionPanel";
import { OverviewPanel } from "./CsvCoder/OverviewPanel";
import {
  readSavedSession,
  clearSavedSession,
  formatName,
} from "./CsvCoder/SessionStorage";
import { isBlankOrNA, isTauriDesktop, parseLabelValue, LABEL_FIELD, NOTES_FIELD, FLAG_FIELD } from "./CsvCoder/utils";

const APP_TITLE = "Curiosity Coding Interface";

function hasUnexportedWork(rows: CsvRow[], exportedAt: string | null) {
  if (exportedAt) {
    return false;
  }
  return rows.some(
    (row) =>
      !isBlankOrNA(row[LABEL_FIELD]) ||
      !isBlankOrNA(row[NOTES_FIELD]) ||
      String(row[FLAG_FIELD] ?? "").trim().toUpperCase() === "TRUE",
  );
}

export default function CsvCoder() {
  const [hydrated, setHydrated] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isNameConfirmed, setIsNameConfirmed] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Not saved");
  const [modal, setModal] = useState<ModalState>(null);
  const [keybindConfig, setKeybindConfig] = useState<KeybindConfig>(DEFAULT_KEYBINDS);
  const [showKeybindSettings, setShowKeybindSettings] = useState(false);
  const [keybindSettingsClosing, setKeybindSettingsClosing] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const questionSectionRef = useRef<HTMLElement | null>(null);

  const [sessionState, dispatch] = useCodingSession();

  // Wire up autosave
  useAutosave(firstName, isNameConfirmed, sessionState, setSaveStatus);

  // Wire up Csv import
  const { error: importError, setError: setImportError, loadCsvText } = useCsvImport(
    (fileName, fields, rows) => {
      dispatch({ type: "load_csv", fileName, fields, rows });
    }
  );

  // Wire up Csv export
  const { error: exportError, setError: setExportError, exportCsv } = useCsvExport(
    sessionState.fileName,
    firstName,
    sessionState.fields,
    sessionState.rows,
    (timestamp) => {
      dispatch({ type: "set_exported", timestamp });
    }
  );

  const error = importError || exportError;
  const setError = (msg: string) => {
    setImportError(msg);
    setExportError(msg);
  };

  useEffect(() => {
    setKeybindConfig(readKeybindConfig());
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!sessionState.rows.length || modal) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const isEditing = target.isContentEditable || 
        target.tagName === "TEXTAREA" || 
        (target.tagName === "INPUT" && (target as HTMLInputElement).type !== "checkbox" && (target as HTMLInputElement).type !== "radio" && (target as HTMLInputElement).type !== "button" && (target as HTMLInputElement).type !== "submit");

      if (isEditing) {
        return;
      }

      if (keybindMatches(keybindConfig.next, event)) {
        event.preventDefault();
        dispatch({ type: "go_next" });
        scrollToQuestionOnMobile();
      } else if (keybindMatches(keybindConfig.previous, event)) {
        event.preventDefault();
        dispatch({ type: "go_previous" });
        scrollToQuestionOnMobile();
      } else if (keybindMatches(keybindConfig.review, event)) {
        event.preventDefault();
        dispatch({ type: "toggle_overview" });
      } else if (!sessionState.isOverview && keybindMatches(keybindConfig.flag, event)) {
        event.preventDefault();
        dispatch({ type: "toggle_flag" });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessionState.rows.length, modal, sessionState.isOverview, keybindConfig]);

  // Load saved session on mount
  useEffect(() => {
    const saved = readSavedSession();

    if (saved) {
      setFirstName(saved.firstName);
      setNameInput(saved.firstName);
      setIsNameConfirmed(Boolean(saved.firstName));
      dispatch({
        type: "load_session",
        fileName: saved.fileName,
        fields: saved.fields,
        rows: saved.rows,
        currentIndex: Math.min(Math.max(saved.currentIndex, 0), Math.max(saved.rows.length - 1, 0)),
        exportedAt: saved.exportedAt ?? null,
      });
      setSaveStatus(`Saved ${new Date(saved.savedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}`);
    }

    setHydrated(true);
  }, []);

  const currentRow = sessionState.rows[sessionState.currentIndex];
  const selectedCodes = useMemo(() => parseLabelValue(currentRow?.[LABEL_FIELD]), [currentRow]);
  const isCurrentRowFlagged = String(currentRow?.[FLAG_FIELD] ?? "").trim().toUpperCase() === "TRUE";
  const codedCount = useMemo(
    () => sessionState.rows.filter((row) => !isBlankOrNA(row[LABEL_FIELD])).length,
    [sessionState.rows],
  );
  const rowNumber = sessionState.rows.length ? sessionState.currentIndex + 1 : 0;
  const isDesktop = hydrated && isTauriDesktop();

  const confirmName = useCallback((event: Event) => {
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
  }, [nameInput]);

  const loadCsvFile = useCallback(async (file: File) => {
    setError("");
    const text = await file.text();
    loadCsvText(text, file.name);
  }, [loadCsvText]);

  const handleFileChange = useCallback(async (event: Event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }

    if (hasUnexportedWork(sessionState.rows, sessionState.exportedAt)) {
      setPendingFile(file);
      setModal({ type: "replace-csv", fileName: file.name });
      return;
    }

    await loadCsvFile(file);
  }, [sessionState.rows, sessionState.exportedAt, loadCsvFile]);

  const scrollToQuestionOnMobile = useCallback(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) {
      return;
    }

    window.requestAnimationFrame(() => {
      questionSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }, []);

  const goToPrevious = useCallback(() => {
    dispatch({ type: "go_previous" });
    scrollToQuestionOnMobile();
  }, [dispatch, scrollToQuestionOnMobile]);

  const goToNext = useCallback(() => {
    dispatch({ type: "go_next" });
    scrollToQuestionOnMobile();
  }, [dispatch, scrollToQuestionOnMobile]);

  const openRow = useCallback((index: number) => {
    dispatch({ type: "open_row", index });
  }, [dispatch]);

  const openRenameModal = useCallback(() => {
    setModal({ type: "rename", value: firstName });
  }, [firstName]);

  const openKeybindSettings = useCallback(() => {
    setShowKeybindSettings(true);
    setKeybindSettingsClosing(false);
  }, []);

  const closeKeybindSettings = useCallback(() => {
    setKeybindSettingsClosing(true);
    setTimeout(() => {
      setShowKeybindSettings(false);
      setKeybindSettingsClosing(false);
    }, 200);
  }, []);

  const confirmRename = useCallback(() => {
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
  }, [modal]);

  const clearCurrentCsv = useCallback(() => {
    clearSavedSession();
    dispatch({ type: "clear" });
    setError("");
    setSaveStatus("Not saved");
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [dispatch]);

  const returnToSignin = useCallback(() => {
    clearCurrentCsv();
    setFirstName("");
    setNameInput("");
    setIsNameConfirmed(false);
  }, [clearCurrentCsv]);

  const confirmStartOver = useCallback(() => {
    if (!modal || modal.type !== "start-over") {
      return;
    }

    if (modal.target === "signin") {
      returnToSignin();
    } else {
      clearCurrentCsv();
    }

    setModal(null);
  }, [modal, returnToSignin, clearCurrentCsv]);

  const confirmReplaceCsv = useCallback(async () => {
    if (!modal || modal.type !== "replace-csv" || !pendingFile) {
      return;
    }

    setModal(null);
    const file = pendingFile;
    setPendingFile(null);
    await loadCsvFile(file);
  }, [modal, pendingFile, loadCsvFile]);

  // Derive Topbar props based on state
  const topbarProps = useMemo(() => {
    if (!isNameConfirmed) {
      return {
        codedCount: 0,
        fileName: APP_TITLE,
        isOverview: false,
        onOpenReview: () => undefined,
        onStartOver: () => undefined,
        rowCount: 0,
      };
    }
    if (!sessionState.rows.length) {
      return {
        codedCount: 0,
        fileName: sessionState.fileName || "Choose CSV",
        isOverview: false,
        onOpenReview: () => undefined,
        onStartOver: () => setModal({ type: "start-over", target: "signin" }),
        rowCount: 0,
      };
    }
    return {
      codedCount,
      fileName: sessionState.fileName,
      isOverview: sessionState.isOverview,
      onOpenReview: () => dispatch({ type: "set_overview", value: true }),
      onStartOver: () => setModal({ type: "start-over", target: "csv" }),
      rowCount: sessionState.rows.length,
    };
  }, [isNameConfirmed, sessionState.fileName, sessionState.rows.length, sessionState.isOverview, codedCount]);

  if (!hydrated) {
    return (
      <main className="flex h-dvh items-center justify-center overflow-hidden px-6 py-10">
        <div className="h-2 w-44 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
          <div className="h-full w-1/2 bg-blue-700 dark:bg-blue-700" />
        </div>
      </main>
    );
  }

  // Render Inner Content
  const mainContent = (() => {
    if (!isNameConfirmed) {
      return (
        <section className="mx-auto flex h-full w-full max-w-[1800px] items-center justify-center">
          <div className={`${styles.card} w-full p-5 sm:max-w-lg sm:p-6 lg:p-8`}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <BrandLabel label={APP_TITLE} />
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
      );
    }

    if (!sessionState.rows.length) {
      return (
        <section className="mx-auto flex h-full w-full max-w-[1800px] flex-col">
          <div className={`${styles.card} p-5 sm:p-6 lg:p-8`}>
            <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 dark:border-neutral-800 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <BrandLabel label={APP_TITLE} />
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
      );
    }

    const detailFields = sessionState.fields.filter(
      (field) => field !== LABEL_FIELD && field !== NOTES_FIELD && field !== FLAG_FIELD && field !== "__originalIndex",
    );

    return (
      <div className="mx-auto flex min-h-full w-full max-w-[1800px] flex-col gap-3 sm:gap-4 xl:h-full xl:min-h-0">
        <header className={`${styles.card} shrink-0 p-3 sm:p-4 ${isDesktop ? "hidden" : ""}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="max-w-full truncate text-xl font-semibold text-neutral-950 dark:text-neutral-50 sm:text-2xl">
                  {sessionState.fileName}
                </h1>
                <button
                  className="inline-flex h-5 items-center rounded border border-amber-300 bg-amber-50 px-2 text-xs font-medium leading-none text-amber-900 transition hover:border-amber-400 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:border-amber-400/50 dark:hover:bg-amber-400/20"
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
                /{sessionState.rows.length} coded
              </div>
              {!sessionState.isOverview ? (
                <Button
                  className="sm:w-auto"
                  onClick={() => dispatch({ type: "set_overview", value: true })}
                  variant="secondarySmall"
                >
                  <Icon name="listChecks" size={16} />
                  Review
                </Button>
              ) : null}
              <div className="relative">
                <Button
                  className="sm:w-auto"
                  data-keybinds-toggle
                  onClick={() => {
                    if (showKeybindSettings) {
                      closeKeybindSettings();
                    } else {
                      openKeybindSettings();
                    }
                  }}
                  variant="secondarySmall"
                >
                  <Icon name="keyboard" size={16} />
                  Keybinds
                </Button>
                {!isDesktop && showKeybindSettings ? (
                  <div className="absolute right-0 top-full z-10 mt-2">
                    <KeybindSettings
                      config={keybindConfig}
                      isClosing={keybindSettingsClosing}
                      onChange={(next) => {
                        setKeybindConfig(next);
                        writeKeybindConfig(next);
                      }}
                      onReset={() => {
                        setKeybindConfig(DEFAULT_KEYBINDS);
                        resetKeybindConfig();
                      }}
                      onClose={closeKeybindSettings}
                    />
                  </div>
                ) : null}
              </div>
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
                {sessionState.isOverview ? "Overview" : `Question ${rowNumber} of ${sessionState.rows.length}`}
              </span>
              <span>{saveStatus}</span>
            </div>
            <progress
              aria-label="Coding progress"
              className="coding-progress"
              max={sessionState.rows.length}
              value={codedCount}
            />
          </div>
        </header>

        {isDesktop && showKeybindSettings ? (
          <div className="fixed right-48 top-14 z-30">
            <KeybindSettings
              config={keybindConfig}
              isClosing={keybindSettingsClosing}
              onChange={(next) => {
                setKeybindConfig(next);
                writeKeybindConfig(next);
              }}
              onReset={() => {
                setKeybindConfig(DEFAULT_KEYBINDS);
                resetKeybindConfig();
              }}
              onClose={closeKeybindSettings}
            />
          </div>
        ) : null}

        <div className="grid flex-1 gap-4 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(400px,32vw)] xl:overflow-hidden">
          {sessionState.isOverview ? (
            <OverviewPanel
              rows={sessionState.rows}
              onOpenRow={openRow}
            />
          ) : (
            <>
              <QuestionPanel
                currentRow={currentRow}
                detailFields={detailFields}
                selectedCodes={selectedCodes}
                isCurrentRowFlagged={isCurrentRowFlagged}
                onToggleFlag={() => dispatch({ type: "toggle_flag" })}
                questionSectionRef={questionSectionRef}
                questionNumber={sessionState.currentIndex + 1}
              />
              <CodingPanel
                currentRow={currentRow}
                selectedCodes={selectedCodes}
                onToggleCode={(code) => dispatch({ type: "toggle_code", code })}
                onUpdateNotes={(value) => dispatch({ type: "update_notes", value })}
              />
            </>
          )}
        </div>

        <footer className="shrink-0 rounded-lg border border-stone-200 bg-white/95 p-3 shadow-soft backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 sm:p-4">
          {sessionState.isOverview ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={exportCsv} variant="primary">
                <Icon name="download" />
                Export CSV
              </Button>
              {sessionState.exportedAt ? (
                <Button onClick={clearCurrentCsv} variant="secondary">
                  <Icon name="rotateCcw" size={16} />
                  Start next CSV
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <Button
                className="disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:border-stone-300 disabled:hover:bg-transparent disabled:hover:shadow-none dark:disabled:hover:border-neutral-700"
                disabled={sessionState.currentIndex === 0}
                onClick={goToPrevious}
              >
                <Icon name="chevronLeft" />
                Previous
              </Button>
              <div aria-hidden="true" className="text-center text-sm text-neutral-600 dark:text-neutral-400">
                {saveStatus}
              </div>
              <Button onClick={goToNext} variant="primary">
                Next
                <Icon name="chevronRight" />
              </Button>
            </div>
          )}
        </footer>
      </div>
    );
  })();

  const modalElement = modal ? (
    <ModalDialog
      error={error}
      modal={modal}
      fileName={sessionState.fileName}
      onCancel={() => {
        setError("");
        setModal(null);
        setPendingFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }}
      onConfirmRename={confirmRename}
      onConfirmStartOver={confirmStartOver}
      onConfirmReplaceCsv={confirmReplaceCsv}
      onRenameInput={(value) => setModal({ type: "rename", value })}
    />
  ) : null;

  const mainClassName = sessionState.rows.length
    ? `${isDesktop ? "desktop-workspace" : "app-shell"} px-3 py-3 text-neutral-950 dark:text-neutral-100 sm:px-5 sm:py-4 lg:px-6 xl:px-8`
    : `${isDesktop ? "desktop-workspace" : "app-shell"} px-4 py-4 text-neutral-950 dark:text-neutral-100 sm:px-6 lg:px-8`;

  return (
    <>
      <DesktopTopbar
        codedCount={topbarProps.codedCount}
        fileName={topbarProps.fileName}
        isOverview={topbarProps.isOverview}
        onOpenKeybinds={openKeybindSettings}
        onOpenReview={topbarProps.onOpenReview}
        onStartOver={topbarProps.onStartOver}
        rowCount={topbarProps.rowCount}
      />
      <main className={mainClassName}>
        {mainContent}
      </main>
      {modalElement}
      <input
        accept=".csv,text/csv"
        className="sr-only"
        id="csv-upload"
        aria-label="Select CSV file"
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />
      <DesktopUpdateNotice />
    </>
  );
}
