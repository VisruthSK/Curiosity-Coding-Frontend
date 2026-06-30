import { Button, Icon, styles } from "./ui";
import type { CsvRow } from "./types";
import { isTauriDesktop } from "./utils";

const RUBRIC_URL =
  "https://www.dropbox.com/scl/fi/hk484lt52g8u4j87q8wcg/RubricApril2026.xlsx";
const INSTRUCTOR_DIARY_URL =
  "https://docs.google.com/spreadsheets/d/1OfLVEqSGIwWYakWB9QCMS1p0nSKU-8QfsL0Gb_YuN38/edit?usp=sharing";

let tauriCorePromise: Promise<any> | null = null;
function getTauriCore() {
  if (!tauriCorePromise) {
    tauriCorePromise = import("@tauri-apps/api/core");
  }
  return tauriCorePromise;
}

async function openExternalUrl(url: string) {
  if (isTauriDesktop()) {
    try {
      const { invoke } = await getTauriCore();
      await invoke("open_external_url", { url });
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function openExternalLink(event: MouseEvent, url: string) {
  if (!isTauriDesktop()) {
    return;
  }
  event.preventDefault();
  void openExternalUrl(url);
}

type QuestionPanelProps = {
  currentRow: CsvRow | undefined;
  detailFields: string[];
  selectedCodes: string[];
  isCurrentRowFlagged: boolean;
  onToggleFlag: () => void;
  questionSectionRef: any;
  questionNumber: number;
};

export function QuestionPanel({
  currentRow,
  detailFields,
  selectedCodes,
  isCurrentRowFlagged,
  onToggleFlag,
  questionSectionRef,
  questionNumber,
}: QuestionPanelProps) {
  return (
    <section className="bg-white dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 rounded-lg p-4 sm:p-5 lg:p-6 xl:min-h-0 xl:overflow-y-auto" ref={questionSectionRef}>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              <Icon name="fileText" />
              Question {questionNumber}
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
            className={styles.smallSecondaryButton}
            href={RUBRIC_URL}
            onClick={(event) => openExternalLink(event, RUBRIC_URL)}
            rel="noopener noreferrer"
            target="_blank"
          >
            Rubric
            <Icon name="externalLink" size={15} />
          </a>
          <a
            className={styles.smallSecondaryButton}
            href={INSTRUCTOR_DIARY_URL}
            onClick={(event) => openExternalLink(event, INSTRUCTOR_DIARY_URL)}
            rel="noopener noreferrer"
            target="_blank"
          >
            Instructor diary
            <Icon name="externalLink" size={15} />
          </a>
          <Button
            aria-pressed={isCurrentRowFlagged}
            className={`md:ml-auto ${
              isCurrentRowFlagged
                ? "border-amber-500 bg-amber-200 text-amber-950 hover:border-amber-600 hover:bg-amber-300 dark:border-amber-300 dark:bg-amber-500/30 dark:text-amber-50 dark:hover:border-amber-200 dark:hover:bg-amber-500/40"
                : ""
            }`}
            onClick={onToggleFlag}
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
  );
}
