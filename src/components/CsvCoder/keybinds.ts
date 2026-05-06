export type Keybind = {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
};

export type KeybindConfig = {
  next: Keybind;
  previous: Keybind;
  review: Keybind;
  flag: Keybind;
};

const KEYBINDS_STORAGE_KEY = "curiosity-coding-tool:keybinds:v1";

export const DEFAULT_KEYBINDS: KeybindConfig = {
  next: { key: "Enter", shiftKey: true, ctrlKey: false, altKey: false, metaKey: false },
  previous: { key: "Tab", shiftKey: true, ctrlKey: false, altKey: false, metaKey: false },
  review: { key: "r", shiftKey: true, ctrlKey: false, altKey: false, metaKey: false },
  flag: { key: "f", shiftKey: true, ctrlKey: false, altKey: false, metaKey: false },
};

const BLOCKED_COMBOS: Array<(kb: Keybind) => boolean> = [
  // Browser tab/window management
  (kb) => kb.ctrlKey && (kb.key === "t" || kb.key === "w" || kb.key === "n"),
  // Clipboard
  (kb) => kb.ctrlKey && (kb.key === "a" || kb.key === "c" || kb.key === "v" || kb.key === "x"),
  // Address bar / search
  (kb) => kb.ctrlKey && (kb.key === "l" || kb.key === "k" || kb.key === "f" || kb.key === "p"),
  // Window switching
  (kb) => kb.altKey && kb.key === "Tab",
];

export function isBlockedKeybind(kb: Keybind): boolean {
  return BLOCKED_COMBOS.some((check) => check(kb));
}

export function keybindMatches(kb: Keybind, event: KeyboardEvent): boolean {
  return (
    kb.key.toLowerCase() === event.key.toLowerCase() &&
    kb.shiftKey === event.shiftKey &&
    kb.ctrlKey === event.ctrlKey &&
    kb.altKey === event.altKey &&
    kb.metaKey === event.metaKey
  );
}

export function formatKeybind(kb: Keybind): string {
  const parts: string[] = [];
  if (kb.ctrlKey) parts.push("Ctrl");
  if (kb.altKey) parts.push("Alt");
  if (kb.shiftKey) parts.push("Shift");
  if (kb.metaKey) parts.push("Meta");

  // Display key names more readably
  let displayKey = kb.key;
  if (displayKey === " ") displayKey = "Space";
  else if (displayKey === "ArrowUp") displayKey = "↑";
  else if (displayKey === "ArrowDown") displayKey = "↓";
  else if (displayKey === "ArrowLeft") displayKey = "←";
  else if (displayKey === "ArrowRight") displayKey = "→";
  else if (displayKey.length === 1) displayKey = displayKey.toUpperCase();

  parts.push(displayKey);
  return parts.join("+");
}

export function keybindFromEvent(event: KeyboardEvent): Keybind {
  return {
    key: event.key.length === 1 ? event.key.toLowerCase() : event.key,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
  };
}

export function readKeybindConfig(): KeybindConfig {
  try {
    const raw = window.localStorage.getItem(KEYBINDS_STORAGE_KEY);
    if (!raw) return DEFAULT_KEYBINDS;

    const parsed = JSON.parse(raw) as Partial<KeybindConfig>;
    if (!isValidKeybind(parsed.next) || !isValidKeybind(parsed.previous) || !isValidKeybind(parsed.review) || !isValidKeybind(parsed.flag)) {
      return DEFAULT_KEYBINDS;
    }

    return { next: parsed.next, previous: parsed.previous, review: parsed.review, flag: parsed.flag };
  } catch {
    return DEFAULT_KEYBINDS;
  }
}

export function writeKeybindConfig(config: KeybindConfig): void {
  window.localStorage.setItem(KEYBINDS_STORAGE_KEY, JSON.stringify(config));
}

export function resetKeybindConfig(): void {
  window.localStorage.removeItem(KEYBINDS_STORAGE_KEY);
}

function isValidKeybind(value: unknown): value is Keybind {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as Keybind).key === "string" &&
    typeof (value as Keybind).shiftKey === "boolean" &&
    typeof (value as Keybind).ctrlKey === "boolean" &&
    typeof (value as Keybind).altKey === "boolean" &&
    typeof (value as Keybind).metaKey === "boolean"
  );
}
