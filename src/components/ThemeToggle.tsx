import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "curiosity-coding-tool:theme";

function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function setTheme(theme: Theme) {
  const root = document.documentElement;

  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export default function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("light");
  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;

  useEffect(() => {
    setThemeState(getTheme());
  }, []);

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";

    setTheme(nextTheme);
    setThemeState(nextTheme);
  }

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className="fixed right-3 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white/85 text-neutral-800 shadow-sm backdrop-blur transition hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/85 dark:text-neutral-100 dark:hover:bg-neutral-800"
      onClick={toggleTheme}
      title={isDark ? "Light mode" : "Dark mode"}
      type="button"
    >
      <Icon aria-hidden="true" size={18} />
    </button>
  );
}
