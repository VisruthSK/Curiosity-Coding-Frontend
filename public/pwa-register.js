if ("serviceWorker" in navigator && window.location.protocol !== "file:" && !window.__TAURI_INTERNALS__) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      if (import.meta.env?.DEV) {
        console.error("Service worker registration failed", error);
      }
    });
  });
}
