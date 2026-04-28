(() => {
  const key = "curiosity-coding-tool:theme";
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let activeTheme = "light";

  const storedTheme = () => {
    try {
      const value = window.localStorage.getItem(key);
      return value === "dark" || value === "light" ? value : null;
    } catch {
      return null;
    }
  };

  const setTheme = (theme) => {
    activeTheme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(theme === "dark"));
      button.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
      button.querySelector('[data-theme-icon="dark"]')?.classList.toggle("hidden", theme === "dark");
      button.querySelector('[data-theme-icon="light"]')?.classList.toggle("hidden", theme !== "dark");
    });
  };

  const saveTheme = (theme) => {
    try {
      window.localStorage.setItem(key, theme);
    } catch {
      return;
    }
  };

  setTheme(storedTheme() ?? (media.matches ? "dark" : "light"));

  media.addEventListener("change", (event) => {
    if (storedTheme()) return;
    setTheme(event.matches ? "dark" : "light");
  });

  window.addEventListener("DOMContentLoaded", () => {
    setTheme(activeTheme);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextTheme = activeTheme === "dark" ? "light" : "dark";
        saveTheme(nextTheme);
        setTheme(nextTheme);
      });
    });
  });
})();
