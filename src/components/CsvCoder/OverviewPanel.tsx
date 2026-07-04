import { Icon, StatusPill, styles } from "./ui";
import type { CsvRow } from "./types";
import { isBlankOrNA, LABEL_FIELD, NOTES_FIELD, FLAG_FIELD } from "./utils";

type OverviewPanelProps = {
  rows: CsvRow[];
  onOpenRow: (index: number) => void;
};

export function OverviewPanel({ rows, onOpenRow }: OverviewPanelProps) {
  return (
    <section className="bg-white dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 rounded-lg p-4 sm:p-5 lg:p-6 xl:col-span-2 xl:min-h-0 xl:overflow-y-auto">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        <Icon name="listChecks" />
        Overview
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((row, index) => {
          const hasCoding = !isBlankOrNA(row[LABEL_FIELD]);
          const hasNotes = !isBlankOrNA(row[NOTES_FIELD]);
          const isFlagged = String(row[FLAG_FIELD] ?? "").trim().toUpperCase() === "TRUE";

          const keys = Object.keys(row || {});
          const standardFieldsSet = new Set([
            "question", "student coding", "reference", "referencenotes",
            "vote", "votes", "totalvotes", "label", "notes", "flag", "id"
          ]);
          const coderKeys = keys.filter(key => {
            const k = key.toLowerCase();
            return !standardFieldsSet.has(k) && !k.endsWith("notes");
          });

          return (
            <button
              className={
                isFlagged
                  ? "grid gap-3 rounded-lg border border-amber-500 bg-amber-200 p-3 text-left text-amber-950 transition hover:border-amber-600 hover:bg-amber-300 dark:border-amber-300 dark:bg-amber-500/30 dark:text-amber-50 dark:hover:border-amber-200 dark:hover:bg-amber-500/40 cursor-pointer w-full"
                  : `grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-left dark:border-neutral-800 dark:bg-neutral-800 cursor-pointer w-full ${styles.interactiveSurface}`
              }
              key={`${row.Question ?? "row"}-${index}`}
              onClick={() => onOpenRow(index)}
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
              {coderKeys.length > 0 && (() => {
                let votesVal = 0;
                let totalVotesVal = coderKeys.length;
                let hasVotesDefined = false;

                if (row["Votes"] !== undefined && row["TotalVotes"] !== undefined) {
                  const v = parseInt(String(row["Votes"]).trim(), 10);
                  const tv = parseInt(String(row["TotalVotes"]).trim(), 10);
                  if (!isNaN(v) && !isNaN(tv) && tv > 0) {
                    votesVal = v;
                    totalVotesVal = tv;
                    hasVotesDefined = true;
                  }
                }

                if (!hasVotesDefined) {
                  const codes = coderKeys
                    .map(k => (row[k] || "").trim())
                    .filter(c => c && c.toLowerCase() !== "na");
                  if (codes.length > 0) {
                    const freq: Record<string, number> = {};
                    codes.forEach(c => {
                      freq[c] = (freq[c] || 0) + 1;
                    });
                    votesVal = Math.max(...Object.values(freq));
                  }
                }

                const ratioText = `${votesVal}/${totalVotesVal}`;
                const isNoMajority = votesVal <= totalVotesVal / 2;
                const highlightRed = isNoMajority && !hasCoding;

                return (
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                    Agreement:{" "}
                    <span
                      className={`font-mono px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                        highlightRed
                          ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/30 font-semibold"
                          : "bg-stone-200/50 dark:bg-neutral-800/80 border-stone-300/30 dark:border-neutral-700/50"
                      }`}
                    >
                      {ratioText}
                    </span>
                  </div>
                );
              })()}
            </button>
          );
        })}
      </div>
    </section>
  );
}
