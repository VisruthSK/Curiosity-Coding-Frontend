import { FieldLabel, styles } from "./ui";
import { codingGroupLabels, codingOptions } from "../../data/codingOptions";
import type { CsvRow } from "./types";

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

const NOTES_FIELD = "Notes";

type CodingPanelProps = {
  currentRow: CsvRow | undefined;
  selectedCodes: string[];
  onToggleCode: (code: string) => void;
  onUpdateNotes: (value: string) => void;
};

export function CodingPanel({
  currentRow,
  selectedCodes,
  onToggleCode,
  onUpdateNotes,
}: CodingPanelProps) {
  function keepNotesVisible(event: Event) {
    const notes = event.currentTarget as HTMLTextAreaElement;
    window.setTimeout(() => {
      notes.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 150);
  }

  return (
    <aside className={`${styles.card} p-3 sm:p-4 lg:p-5 xl:min-h-0 xl:overflow-y-auto`}>
      <div className="space-y-4">
        <div className="grid gap-4">
          {groupOrder.map((group) => (
            <fieldset className="grid gap-2" key={group}>
              <legend className="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {codingGroupLabels[group]}
              </legend>
              <div className="grid gap-2">
                {codingOptionsByGroup[group].map((option) => {
                  const checked = selectedCodes.includes(option.code);
                  return (
                    <label
                      className={`grid cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800 ${styles.interactiveSurface}`}
                      key={option.code}
                    >
                      <input
                        checked={checked}
                        className="mt-1 h-4 w-4 accent-blue-600 dark:accent-blue-600"
                        onChange={() => onToggleCode(option.code)}
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
            onInput={(event) => {
              const value = event.currentTarget.value;
              onUpdateNotes(value === "" ? "NA" : value);
            }}
            value={currentRow?.[NOTES_FIELD] === "NA" ? "" : currentRow?.[NOTES_FIELD] ?? ""}
          />
        </div>
      </div>
    </aside>
  );
}
