import { useEffect, useRef, useState } from "preact/hooks";
import type { Keybind, KeybindConfig } from "./keybinds";
import { DEFAULT_KEYBINDS, formatKeybind, isBlockedKeybind, keybindFromEvent } from "./keybinds";

type CaptureTarget = "next" | "previous" | "review" | null;

type KeybindSettingsProps = {
  config: KeybindConfig;
  onChange: (config: KeybindConfig) => void;
  onReset: () => void;
  onClose: () => void;
};

export function KeybindSettings({ config, onChange, onReset, onClose }: KeybindSettingsProps) {
  const [captureTarget, setCaptureTarget] = useState<CaptureTarget>(null);
  const [captureValue, setCaptureValue] = useState<Keybind | null>(null);
  const [blockedWarning, setBlockedWarning] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!captureTarget) return;

    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault();
      event.stopPropagation();

      const kb = keybindFromEvent(event);

      // Ignore bare modifier presses (Shift, Ctrl, Alt, Meta alone)
      if (["Shift", "Control", "Alt", "Meta"].includes(event.key)) {
        return;
      }

      // Ignore Escape — use it to cancel capture
      if (event.key === "Escape") {
        setCaptureTarget(null);
        setCaptureValue(null);
        setBlockedWarning(false);
        return;
      }

      if (isBlockedKeybind(kb)) {
        setCaptureValue(kb);
        setBlockedWarning(true);
        return;
      }

      onChange({ ...config, [captureTarget as "next" | "previous" | "review"]: kb });
      setCaptureTarget(null);
      setCaptureValue(null);
      setBlockedWarning(false);
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [captureTarget, config, onChange]);

  // Close on outside click (but not on the theme toggle)
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!popoverRef.current) return;
      if (popoverRef.current.contains(event.target as Node)) return;
      if ((event.target as HTMLElement).closest("[data-theme-toggle], [data-keybinds-toggle]")) return;
      onClose();
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [onClose]);

  function startCapture(target: CaptureTarget) {
    setCaptureTarget(target);
    setCaptureValue(null);
    setBlockedWarning(false);
  }

  return (
    <div
      ref={popoverRef}
      className="w-64 rounded-lg border border-stone-200 bg-white p-3 shadow-lg animate-in fade-in-0 zoom-in-98 duration-200 ease-out dark:border-neutral-700 dark:bg-neutral-900"
    >
      <div className="mb-2 text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-500">
        Keyboard shortcuts
      </div>

      <div className="grid gap-2">
        <KeybindRow
          label="Next"
          keybind={captureTarget === "next" && captureValue ? captureValue : config.next}
          isCapturing={captureTarget === "next"}
          isBlocked={blockedWarning && captureTarget === "next"}
          onClick={() => startCapture("next")}
        />
        <KeybindRow
          label="Previous"
          keybind={captureTarget === "previous" && captureValue ? captureValue : config.previous}
          isCapturing={captureTarget === "previous"}
          isBlocked={blockedWarning && captureTarget === "previous"}
          onClick={() => startCapture("previous")}
        />
        <KeybindRow
          label="Review"
          keybind={captureTarget === "review" && captureValue ? captureValue : config.review}
          isCapturing={captureTarget === "review"}
          isBlocked={blockedWarning && captureTarget === "review"}
          onClick={() => startCapture("review")}
        />
      </div>

      {blockedWarning ? (
        <p className="mt-2 text-xs text-red-700 dark:text-red-400">
          That shortcut conflicts with a browser action. Try a different combination.
        </p>
      ) : null}

      <button
        className="mt-3 text-xs text-neutral-500 underline decoration-neutral-300 underline-offset-2 transition hover:text-blue-700 hover:decoration-blue-600 dark:text-neutral-400 dark:decoration-neutral-600 dark:hover:text-blue-200 dark:hover:decoration-blue-500"
        onClick={() => {
          onReset();
          setCaptureTarget(null);
          setCaptureValue(null);
          setBlockedWarning(false);
        }}
        type="button"
      >
        Reset to defaults
      </button>
    </div>
  );
}

function KeybindRow({
  label,
  keybind,
  isCapturing,
  isBlocked,
  onClick,
}: {
  label: string;
  keybind: Keybind;
  isCapturing: boolean;
  isBlocked: boolean;
  onClick: () => void;
}) {
  const isDefault =
    JSON.stringify(keybind) === JSON.stringify(DEFAULT_KEYBINDS[label.toLowerCase() as "next" | "previous" | "review"]);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
      <button
        aria-label={`Rebind ${label} shortcut`}
        className={`min-w-24 rounded border px-2 py-1 text-xs font-medium transition ${
          isBlocked
            ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            : isCapturing
              ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
              : isDefault
                ? "border-stone-200 bg-stone-50 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
        }`}
        onClick={onClick}
        type="button"
      >
        {isCapturing && !isBlocked ? "Press keys…" : formatKeybind(keybind)}
      </button>
    </div>
  );
}
