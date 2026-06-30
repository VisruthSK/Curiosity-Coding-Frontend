import { useEffect, useState } from "preact/hooks";
import { relaunch as relaunchProcess } from "@tauri-apps/plugin-process";
import { Button } from "./CsvCoder/ui";

type UpdateStatus =
  | "idle"
  | "checking"
  | "installing"
  | "installed";

type TauriUpdate = {
  version: string;
  downloadAndInstall: () => Promise<void>;
};

export function DesktopUpdateNotice() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [version, setVersion] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function autoUpdate() {
      if (!window.__TAURI_INTERNALS__) {
        return;
      }

      try {
        const updater = await import("@tauri-apps/plugin-updater");
        const nextUpdate = (await updater.check()) as TauriUpdate | null;

        if (cancelled) {
          return;
        }

        if (!nextUpdate) {
          setStatus("idle");
          return;
        }

        setVersion(nextUpdate.version);
        setStatus("installing");

        // Silently download and install in the background
        await nextUpdate.downloadAndInstall();

        if (cancelled) {
          return;
        }

        setStatus("installed");
      } catch (checkError) {
        if (cancelled) {
          return;
        }

        const errorMessage =
          checkError instanceof Error ? checkError.message : "Update failed.";

        // Log production failures to local diagnostics file
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("log_update_failure", { error: errorMessage });
        } catch (e) {
          console.error("Failed to log update failure:", e);
        }

        setStatus("idle");
      }
    }

    void autoUpdate();

    return () => {
      cancelled = true;
    };
  }, []);

  async function relaunch() {
    await relaunchProcess();
  }

  if (status !== "installed") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-20 max-w-sm rounded-lg border border-stone-300 bg-white p-3 text-sm text-neutral-900 shadow-soft dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="grid gap-3">
        <div>
          <div className="font-semibold">Update installed</div>
          <div className="mt-1 text-neutral-600 dark:text-neutral-400">
            Version {version} is ready. Relaunch to apply.
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={relaunch} variant="primary">
            Relaunch
          </Button>
        </div>
      </div>
    </div>
  );
}
