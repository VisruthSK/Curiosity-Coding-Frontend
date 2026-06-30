import { useEffect, useRef } from "preact/hooks";
import type { ModalState } from "./types";
import { Button, FieldLabel, styles } from "./ui";

type ModalDialogProps = {
  error: string;
  modal: NonNullable<ModalState>;
  fileName?: string;
  onCancel: () => void;
  onConfirmRename: () => void;
  onConfirmStartOver: () => void;
  onConfirmReplaceCsv: () => void;
  onRenameInput: (value: string) => void;
};

export function ModalDialog({
  error,
  modal,
  fileName,
  onCancel,
  onConfirmRename,
  onConfirmStartOver,
  onConfirmReplaceCsv,
  onRenameInput,
}: ModalDialogProps) {
  const isRename = modal.type === "rename";
  const isReplaceCsv = modal.type === "replace-csv";
  const modalRef = useRef<HTMLElement>(null);

  // Keep a stable ref so the focus-trap effect never re-fires when the
  // parent passes a new inline callback on each render.
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null;

    if (!modalRef.current) return;

    // Find all focusable elements inside the modal
    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus rename input or first element
    const renameInput = modalRef.current.querySelector<HTMLInputElement>("#rename-coder");
    if (renameInput) {
      renameInput.focus();
    } else {
      firstElement.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancelRef.current();
        return;
      }

      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElement) {
        previousActiveElement.focus();
      }
    };
  }, []); // empty: runs once on mount, cleaned up on unmount

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/35 px-4 backdrop-blur-sm dark:bg-black/55">
      <section
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-5 shadow-soft dark:border-neutral-700 dark:bg-neutral-900"
        ref={modalRef}
        role="dialog"
      >
        <h2 id="modal-title" className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
          {isRename ? "Rename coder" : isReplaceCsv ? "Replace current CSV?" : "Start over?"}
        </h2>

        {isRename ? (
          <>
            <div className="mt-4">
              <FieldLabel htmlFor="rename-coder">First name</FieldLabel>
            </div>
            <input
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
        ) : isReplaceCsv ? (
          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            This CSV has coded work that has not been exported. Discarding will permanently lose progress on "{fileName || 'the current file'}". Export before starting a new file, or continue and lose progress.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {modal.target === "signin"
              ? `This will clear the current CSV progress for "${fileName || 'the current file'}" and return to the first-name screen.`
              : `This will clear the current CSV progress for "${fileName || 'the current file'}" and return to file selection.`}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            onClick={isRename ? onConfirmRename : isReplaceCsv ? onConfirmReplaceCsv : onConfirmStartOver}
            variant="primary"
          >
            {isRename ? "Save" : isReplaceCsv ? "Replace" : "Start over"}
          </Button>
        </div>
      </section>
    </div>
  );
}
