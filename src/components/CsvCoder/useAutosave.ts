import { useEffect, useRef } from "preact/hooks";
import { writeSavedSession } from "./SessionStorage";
import type { SessionState } from "./useCodingSession";

export function useAutosave(
  firstName: string,
  isNameConfirmed: boolean,
  sessionState: SessionState,
  setSaveStatus: (status: string) => void,
) {
  const saveSessionRef = useRef<() => void>(() => {});

  saveSessionRef.current = () => {
    if (!isNameConfirmed || !sessionState.fileName) {
      return;
    }
    writeSavedSession({
      firstName,
      fileName: sessionState.fileName,
      fields: sessionState.fields,
      rows: sessionState.rows,
      currentIndex: sessionState.currentIndex,
      exportedAt: sessionState.exportedAt ?? undefined,
    });
  };

  // Autosave on changes with debounce
  useEffect(() => {
    if (!isNameConfirmed || !sessionState.fileName) {
      return;
    }

    setSaveStatus("Saving...");
    const timeoutId = window.setTimeout(() => {
      saveSessionRef.current();
      setSaveStatus(
        `Saved ${new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}`,
      );
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [
    sessionState.currentIndex,
    sessionState.fields,
    sessionState.fileName,
    firstName,
    isNameConfirmed,
    sessionState.rows,
    sessionState.exportedAt,
    setSaveStatus,
  ]);

  // Autosave on exit/visibility change
  useEffect(() => {
    if (!isNameConfirmed) {
      return;
    }

    function saveBeforeExit() {
      saveSessionRef.current();
    }

    function saveWhenHidden() {
      if (document.visibilityState === "hidden") {
        saveSessionRef.current();
      }
    }

    window.addEventListener("pagehide", saveBeforeExit);
    document.addEventListener("visibilitychange", saveWhenHidden);

    return () => {
      window.removeEventListener("pagehide", saveBeforeExit);
      document.removeEventListener("visibilitychange", saveWhenHidden);
    };
  }, [isNameConfirmed]);
}
