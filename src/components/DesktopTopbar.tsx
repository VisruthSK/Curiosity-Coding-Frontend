import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { JSX } from "preact";
import { Icon } from "./CsvCoder/ui";

type DesktopTopbarProps = {
  codedCount: number;
  fileName: string;
  isOverview: boolean;
  onOpenKeybinds: () => void;
  onOpenReview: () => void;
  onStartOver: () => void;
  rowCount: number;
};

type TauriWindow = {
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  minimize: () => Promise<void>;
  startDragging: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
};

function ToolbarButton({ children, className = "", ...props }: {
  children: ComponentChildren;
  className?: string;
} & Omit<JSX.IntrinsicElements["button"], "className">) {
  return (
    <button
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-stone-300 bg-stone-100 px-2.5 text-xs font-semibold text-neutral-700 transition hover:border-stone-400 hover:bg-stone-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-100 dark:hover:border-white/20 dark:hover:bg-white/[0.1] dark:focus-visible:outline-blue-400 ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

function WindowButton({ children, className = "", ...props }: {
  children: ComponentChildren;
  className?: string;
} & Omit<JSX.IntrinsicElements["button"], "className">) {
  return (
    <button
      className={`inline-flex h-8 w-10 items-center justify-center rounded-md text-neutral-600 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-neutral-300 dark:focus-visible:outline-blue-400 ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    if (typeof document !== "undefined") {
      if (nextIsDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      try {
        window.localStorage.setItem("curiosity-coding-tool:theme", nextIsDark ? "dark" : "light");
      } catch {
        // ignore storage errors
      }
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      try {
        const stored = window.localStorage.getItem("curiosity-coding-tool:theme");
        if (stored === "dark" || stored === "light") {
          const isDarkMode = stored === "dark";
          setIsDark(isDarkMode);
          if (isDarkMode) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          setIsDark(true);
          document.documentElement.classList.add("dark");
        }
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 bg-stone-100 text-neutral-600 transition hover:bg-stone-200 hover:text-neutral-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-neutral-300 dark:hover:bg-white/[0.1] dark:hover:text-white"
      data-theme-toggle
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      type="button"
      onClick={toggleTheme}
    >
      <Icon name={isDark ? "sun" : "moon"} size={15} />
    </button>
  );
}

export function DesktopTopbar({
  codedCount,
  fileName,
  isOverview,
  onOpenKeybinds,
  onOpenReview,
  onStartOver,
  rowCount,
}: DesktopTopbarProps) {
  const [appWindow, setAppWindow] = useState<TauriWindow | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!window.__TAURI_INTERNALS__) {
      return;
    }

    document.documentElement.classList.add("tauri-desktop");

    let cancelled = false;

    async function loadWindow() {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const currentWindow = getCurrentWindow();
        if (cancelled) {
          return;
        }
        setAppWindow(currentWindow);
        setIsMaximized(await currentWindow.isMaximized());
      } catch {
        setAppWindow(null);
      }
    }

    void loadWindow();

    return () => {
      cancelled = true;
      document.documentElement.classList.remove("tauri-desktop");
    };
  }, []);

  if (!window.__TAURI_INTERNALS__) {
    return null;
  }

  async function toggleMaximize() {
    if (!appWindow) {
      return;
    }
    await appWindow.toggleMaximize();
    setIsMaximized(await appWindow.isMaximized());
  }

  async function startDragging(event: MouseEvent) {
    if (!appWindow || event.detail > 1 || (event.target as HTMLElement).closest("button")) {
      return;
    }
    await appWindow.startDragging();
  }

  async function toggleMaximizeFromChrome(event: MouseEvent) {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }
    await toggleMaximize();
  }

  return (
    <div
      className="desktop-topbar grid h-[60px] grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 border-b border-stone-200 bg-white px-3 text-neutral-900 shadow-[0_1px_12px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-100 dark:shadow-[0_1px_12px_rgba(0,0,0,0.24)]"
      data-desktop-topbar
      onDblClick={toggleMaximizeFromChrome}
      onMouseDown={startDragging}
    >
      <div className="flex min-w-0 items-center gap-2 self-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-200">
          <Icon name="lightbulb" size={17} />
        </div>
        <div className="flex min-w-0 items-center gap-2 leading-none">
          <div className="min-w-0 truncate text-sm font-semibold leading-none text-neutral-900 dark:text-white" title={fileName}>
            {fileName}
          </div>
          <span className="hidden shrink-0 items-center rounded border border-stone-300 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-neutral-500 dark:border-white/10 xl:inline-flex">
            v{__APP_VERSION__}
          </span>
        </div>
      </div>

      <div className="hidden min-w-0 items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400 md:flex" style={{ gridColumn: "2 / 3" }}>
        <div className="grid min-w-0 gap-1" style={{ width: "100%" }}>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{codedCount} / {rowCount} coded</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-stone-200 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${rowCount ? Math.round((codedCount / rowCount) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <ToolbarButton aria-pressed={isOverview} disabled={!rowCount} onClick={onOpenReview}>
          <Icon name="listChecks" size={15} />
          Review
        </ToolbarButton>
        <ToolbarButton className="hidden lg:inline-flex" disabled={!rowCount} data-keybinds-toggle onClick={onOpenKeybinds}>
          <Icon name="keyboard" size={15} />
          Keybinds
        </ToolbarButton>
        <ToolbarButton className="hidden xl:inline-flex" disabled={!rowCount} onClick={onStartOver}>
          <Icon name="rotateCcw" size={15} />
          Start over
        </ToolbarButton>
      </div>

      <ThemeToggle />

      <div className="flex items-center gap-0.5 border-l border-stone-200 pl-2 dark:border-white/10">
        <WindowButton aria-label="Minimize" className="hover:bg-stone-200 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white" onClick={() => appWindow?.minimize()}>
          <Icon name="minus" size={15} />
        </WindowButton>
        <WindowButton aria-label={isMaximized ? "Restore" : "Maximize"} className="hover:bg-stone-200 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white" onClick={toggleMaximize}>
          <Icon name={isMaximized ? "copy" : "square"} size={14} />
        </WindowButton>
        <WindowButton
          aria-label="Close"
          className="hover:bg-[#c42b1c] hover:text-white focus-visible:bg-[#c42b1c] focus-visible:text-white focus-visible:outline-[#8f1f14] active:bg-[#a52418] active:text-white dark:hover:bg-[#c42b1c] dark:hover:text-white dark:focus-visible:bg-[#c42b1c] dark:focus-visible:text-white dark:focus-visible:outline-[#f87171] dark:active:bg-[#a52418] dark:active:text-white"
          onClick={() => appWindow?.close()}
        >
          <Icon name="x" size={16} />
        </WindowButton>
      </div>
    </div>
  );
}
