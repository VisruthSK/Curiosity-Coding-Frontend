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
    } catch (e) {
      console.error("Failed to open URL in Tauri desktop mode:", e);
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
  isCompareFile: boolean;
  selectedCodes: string[];
  isCurrentRowFlagged: boolean;
  onToggleFlag: () => void;
  questionSectionRef: any;
  questionNumber: number;
};

export function QuestionPanel({
  currentRow,
  detailFields,
  isCompareFile,
  selectedCodes,
  isCurrentRowFlagged,
  onToggleFlag,
  questionSectionRef,
  questionNumber,
}: QuestionPanelProps) {
  const standardFieldsSet = new Set([
    "question", "student coding", "reference", "referencenotes",
    "vote", "votes", "totalvotes", "label", "notes", "flag", "id"
  ]);

  const keys = Object.keys(currentRow || {});
  const coderKeys = isCompareFile
    ? keys.filter(key => {
        const k = key.toLowerCase();
        return !standardFieldsSet.has(k) && !k.endsWith("notes") && !k.endsWith("flag");
      })
    : [];

  const coderRelatedKeysSet = new Set<string>();
  coderKeys.forEach(key => {
    coderRelatedKeysSet.add(key.toLowerCase());
    coderRelatedKeysSet.add((key + "notes").toLowerCase());
    coderRelatedKeysSet.add((key + "flag").toLowerCase());
  });

  const filteredDetailFields = detailFields.filter(
    (field) => {
      const fLower = field.toLowerCase();
      return !coderRelatedKeysSet.has(fLower) && fLower !== "totalvotes";
    }
  );

  const codeToCoders: Record<string, { name: string; notes: string; flagged: boolean }[]> = {};
  coderKeys.forEach(key => {
    const code = (currentRow?.[key] || "").trim();
    if (!code) return;
    const notesKey = keys.find(k => k.toLowerCase() === (key.toLowerCase() + "notes"));
    const notes = notesKey ? (currentRow?.[notesKey] || "").trim() : "";
    const flagKey = keys.find(k => k.toLowerCase() === (key.toLowerCase() + "flag"));
    const flagged = flagKey ? String(currentRow?.[flagKey] || "").trim().toUpperCase() === "TRUE" : false;
    if (!codeToCoders[code]) {
      codeToCoders[code] = [];
    }
    codeToCoders[code].push({ name: key, notes, flagged });
  });

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
        {filteredDetailFields.map((field) => (
          <div
            className={
              field === "Question"
                ? "rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-neutral-800 dark:bg-neutral-800 sm:p-5 xl:p-6"
                : "grid gap-1 border-b border-stone-100 pb-3 dark:border-neutral-800 last:border-b-0"
            }
            key={field}
          >
            <dt className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-500">
              {field === "TotalVotes" ? "Total Votes" : field}
            </dt>
            <dd
              className={
                field === "Question"
                  ? "mt-2 whitespace-pre-wrap text-base leading-7 text-neutral-950 dark:text-neutral-50 sm:text-lg xl:text-xl xl:leading-8"
                  : "whitespace-pre-wrap text-sm leading-6 text-neutral-800 dark:text-neutral-200"
              }
            >
              {(() => {
                const fLower = field.toLowerCase();
                if (fLower === "vote") {
                  let hasMajority = false;
                  let majorityCode = "";
                  
                  if (currentRow?.["Votes"] !== undefined && currentRow?.["TotalVotes"] !== undefined) {
                    const votesVal = parseInt(String(currentRow["Votes"]).trim(), 10);
                    const totalVotesVal = parseInt(String(currentRow["TotalVotes"]).trim(), 10);
                    if (!isNaN(votesVal) && !isNaN(totalVotesVal) && totalVotesVal > 0) {
                      if (votesVal > totalVotesVal / 2) {
                        hasMajority = true;
                        majorityCode = String(currentRow["Vote"] || "").trim();
                      }
                    }
                  }
                  
                  if (!hasMajority) {
                    const codes = coderKeys
                      .map(k => (currentRow?.[k] || "").trim())
                      .filter(c => c && c.toLowerCase() !== "na");
                    if (codes.length > 0) {
                      const freq: Record<string, number> = {};
                      codes.forEach(c => {
                        freq[c] = (freq[c] || 0) + 1;
                      });
                      const maxFreq = Math.max(...Object.values(freq));
                      const codeWithMax = Object.keys(freq).find(c => freq[c] === maxFreq);
                      if (maxFreq > coderKeys.length / 2 && codeWithMax) {
                        hasMajority = true;
                        majorityCode = codeWithMax;
                      }
                    }
                  }
                  
                  return hasMajority && majorityCode && majorityCode.toLowerCase() !== "na" ? majorityCode : "NA";
                }
                
                if (fLower === "votes") {
                  if (currentRow?.["Votes"] !== undefined && currentRow?.["TotalVotes"] !== undefined) {
                    const v = String(currentRow["Votes"]).trim();
                    const tv = String(currentRow["TotalVotes"]).trim();
                    if (v && tv && v.toLowerCase() !== "na" && tv.toLowerCase() !== "na") {
                      return `${v}/${tv}`;
                    }
                  }
                  const codes = coderKeys
                    .map(k => (currentRow?.[k] || "").trim())
                    .filter(c => c && c.toLowerCase() !== "na");
                  const freq: Record<string, number> = {};
                  codes.forEach(c => {
                    freq[c] = (freq[c] || 0) + 1;
                  });
                  const maxFreq = Math.max(...Object.values(freq));
                  return `${codes.length > 0 ? maxFreq : 0}/${coderKeys.length}`;
                }
                
                return currentRow?.[field] || <span className="text-neutral-400 dark:text-neutral-600">Blank</span>;
              })()}
            </dd>
          </div>
        ))}

        {Object.keys(codeToCoders).length > 0 && (
          <div className="grid gap-1 border-b border-stone-100 pb-3 dark:border-neutral-800 last:border-b-0">
            <dt className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-500">Codings</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {Object.entries(codeToCoders).map(([code, coders]) => {
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1.5 rounded bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 transition-colors"
                  >
                    <span className="font-semibold">{code}</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">({coders.length})</span>
                  </span>
                );
              })}
            </dd>
            <details className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
              <summary className="cursor-pointer font-medium hover:text-neutral-900 dark:hover:text-neutral-200">
                Show detailed coder notes
              </summary>
              <div className="mt-2 grid gap-1 border-t border-stone-100 pt-2 dark:border-neutral-800">
                {coderKeys.map(key => {
                  const code = (currentRow?.[key] || "").trim();
                  const notesKey = keys.find(k => k.toLowerCase() === (key.toLowerCase() + "notes"));
                  const notes = notesKey ? (currentRow?.[notesKey] || "").trim() : "";
                  const showNotesVal = notes && notes.toLowerCase() !== "na" ? notes : "";
                  const flagKey = keys.find(k => k.toLowerCase() === (key.toLowerCase() + "flag"));
                  const flagged = flagKey ? String(currentRow?.[flagKey] || "").trim().toUpperCase() === "TRUE" : false;
                  const showFlagVal = flagged ? "Flagged" : "";
                  return (
                    <div key={key} className="grid gap-4 py-0.5 grid-cols-3">
                      <div className="flex justify-between">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">{key}:</span>
                        <span className="font-mono text-neutral-900 dark:text-neutral-100">{code || "NA"}</span>
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400 text-right truncate" title={showNotesVal}>
                        {showNotesVal || <span className="text-neutral-300 dark:text-neutral-700">—</span>}
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400 text-right truncate font-medium" title={showFlagVal}>
                        {showFlagVal ? (
                          <span className="text-amber-700 dark:text-amber-300">⚑ Flagged</span>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-700">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        )}
      </dl>
    </section>
  );
}
