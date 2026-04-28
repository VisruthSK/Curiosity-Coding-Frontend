(() => {
  const key = "curiosity-coding-tool:theme";
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const storedTheme = () => {
    try {
      const value = window.localStorage.getItem(key);
      return value === "dark" || value === "light" ? value : null;
    } catch {
      return null;
    }
  };

  const setTheme = (theme) => {
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
  };

  setTheme(storedTheme() ?? (media.matches ? "dark" : "light"));

  media.addEventListener("change", (event) => {
    if (storedTheme()) return;
    setTheme(event.matches ? "dark" : "light");
  });
})();
