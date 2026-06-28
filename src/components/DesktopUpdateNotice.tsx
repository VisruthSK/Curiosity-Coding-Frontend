import { useEffect, useState } from "preact/hooks";
import { Button, Icon } from "./CsvCoder/ui";

type UpdateStatus = "idle" | "checking" | "available" | "installing" | "installed" | "error";

type TauriUpdate = {
  version: string;
  downloadAndInstall: (
    onEvent?: (event: { event: string; data?: unknown }) => void,
  ) => Promise<void>;
};

export function DesktopUpdateNotice() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [version, setVersion] = useState("");
  const [update, setUpdate] = useState<TauriUpdate | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkForUpdate() {
      if (!window.__TAURI_INTERNALS__) {
        return;
      }

      setStatus("checking");

      try {
        const updater = await import("@tauri-apps/plugin-updater");
        const nextUpdate = (await updater.check()) as TauriUpdate | null;

        if (cancelled) {
          return;
        }

        if (nextUpdate) {
          setUpdate(nextUpdate);
          setVersion(nextUpdate.version);
          setStatus("available");
        } else {
          setStatus("idle");
        }
      } catch (checkError) {
        if (cancelled) {
          return;
        }

        if (import.meta.env.DEV) {
          setError(checkError instanceof Error ? checkError.message : "Update check failed.");
          setStatus("error");
        } else {
          setStatus("idle");
        }
      }
    }

    void checkForUpdate();

    return () => {
      cancelled = true;
    };
  }, []);

  async function installUpdate() {
    if (!update) {
      return;
    }

    setStatus("installing");

    try {
      await update.downloadAndInstall();
      setStatus("installed");
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : "Update installation failed.");
      setStatus("error");
    }
  }

  async function relaunch() {
    const process = await import("@tauri-apps/plugin-process");
    await process.relaunch();
  }

  if (status === "idle" || status === "checking") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-20 max-w-sm rounded-lg border border-stone-300 bg-white p-3 text-sm text-neutral-900 shadow-soft dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
      {status === "available" ? (
        <div className="grid gap-3">
          <div>
            <div className="font-semibold">Desktop update available</div>
            <div className="mt-1 text-neutral-600 dark:text-neutral-400">Version {version}</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setStatus("idle")} variant="secondarySmall">
              Later
            </Button>
            <Button onClick={installUpdate} variant="primary">
              <Icon name="download" size={16} />
              Install
            </Button>
          </div>
        </div>
      ) : null}

      {status === "installing" ? <div>Installing update...</div> : null}

      {status === "installed" ? (
        <div className="grid gap-3">
          <div>
            <div className="font-semibold">Update installed</div>
            <div className="mt-1 text-neutral-600 dark:text-neutral-400">
              Relaunch when you are ready.
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={relaunch} variant="primary">
              Relaunch
            </Button>
          </div>
        </div>
      ) : null}

      {status === "error" ? <div>{error}</div> : null}
    </div>
  );
}
