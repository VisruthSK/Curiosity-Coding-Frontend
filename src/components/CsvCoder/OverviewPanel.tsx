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
            </button>
          );
        })}
      </div>
    </section>
  );
}
