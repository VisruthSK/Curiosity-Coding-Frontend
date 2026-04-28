import type { ModalState } from "./types";
import { Button, FieldLabel, styles } from "./ui";

type ModalDialogProps = {
  error: string;
  modal: NonNullable<ModalState>;
  onCancel: () => void;
  onConfirmRename: () => void;
  onConfirmStartOver: () => void;
  onRenameInput: (value: string) => void;
};

export function ModalDialog({
  error,
  modal,
  onCancel,
  onConfirmRename,
  onConfirmStartOver,
  onRenameInput,
}: ModalDialogProps) {
  const isRename = modal.type === "rename";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/35 px-4 backdrop-blur-sm dark:bg-black/55">
      <section
        aria-modal="true"
        className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-neutral-700 dark:bg-neutral-900"
        role="dialog"
      >
        <h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
          {isRename ? "Rename coder" : "Start over?"}
        </h2>

        {isRename ? (
          <>
            <div className="mt-4">
              <FieldLabel htmlFor="rename-coder">First name</FieldLabel>
            </div>
            <input
              autoFocus
              className={`${styles.field} mt-2 px-3 py-3 text-base`}
              id="rename-coder"
              onInput={(event) => onRenameInput(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onConfirmRename();
                }
              }}
              value={modal.value}
            />
            {error ? <p className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p> : null}
          </>
        ) : (
          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {modal.target === "signin"
              ? "This will return to the first-name screen."
              : "This will clear the current CSV progress and return to file selection."}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button onClick={onCancel}>Cancel</Button>
          <Button onClick={isRename ? onConfirmRename : onConfirmStartOver} variant="primary">
            {isRename ? "Save" : "Start over"}
          </Button>
        </div>
      </section>
    </div>
  );
}
