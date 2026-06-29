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
  saveStatus: string;
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
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-2.5 text-xs font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 ${className}`}
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
      className={`inline-flex h-8 w-10 items-center justify-center rounded-md text-neutral-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 ${className}`}
      type="button"
      {...props}
    >
      {children}
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
  saveStatus,
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
      className="desktop-topbar grid h-[60px] grid-cols-[minmax(180px,1.2fr)_auto_auto_auto_auto] items-center gap-3 border-b border-white/10 bg-neutral-950 px-3 text-neutral-100 shadow-[0_1px_12px_rgba(0,0,0,0.24)]"
      data-desktop-topbar
      onDblClick={toggleMaximizeFromChrome}
      onMouseDown={startDragging}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-blue-400/20 bg-blue-500/15 text-blue-200">
          <Icon name="lightbulb" size={17} />
        </div>
        <div className="min-w-0 truncate text-sm font-semibold text-white" title={fileName}>
          {fileName}
        </div>
        <Icon className="hidden shrink-0 text-neutral-500 md:block" name="chevronDown" size={14} />
        <span className="hidden shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-500 xl:inline">
          v{__APP_VERSION__}
        </span>
      </div>

      <div className="hidden min-w-44 items-center gap-3 text-xs text-neutral-400 md:flex">
        <div className="grid min-w-24 gap-1">
          <div>
            <span className="font-semibold text-neutral-200">{codedCount}</span> / {rowCount} coded
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${rowCount ? Math.round((codedCount / rowCount) * 100) : 0}%` }}
            />
          </div>
        </div>
        <div className="hidden items-center gap-1.5 whitespace-nowrap lg:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {saveStatus}
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

      <div className="flex items-center gap-1 border-l border-white/10 pl-2">
        <button
          aria-label="Switch color theme"
          aria-pressed="false"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-neutral-300 transition hover:bg-white/[0.1] hover:text-white"
          data-theme-toggle
          title="Theme"
          type="button"
        >
          <Icon name="moon" size={15} />
        </button>
        <ToolbarButton aria-label="More" className="w-8 px-0">
          <Icon name="ellipsis" size={16} />
        </ToolbarButton>
      </div>

      <div className="flex items-center gap-0.5 border-l border-white/10 pl-2">
        <WindowButton aria-label="Minimize" onClick={() => appWindow?.minimize()}>
          <Icon name="minus" size={15} />
        </WindowButton>
        <WindowButton aria-label={isMaximized ? "Restore" : "Maximize"} onClick={toggleMaximize}>
          <Icon name={isMaximized ? "copy" : "square"} size={14} />
        </WindowButton>
        <WindowButton
          aria-label="Close"
          className="hover:bg-red-600 hover:text-white"
          onClick={() => appWindow?.close()}
        >
          <Icon name="x" size={16} />
        </WindowButton>
      </div>
    </div>
  );
}
