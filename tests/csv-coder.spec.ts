import { expect, test } from "@playwright/test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const rubricUrl = "https://www.dropbox.com/scl/fi/hk484lt52g8u4j87q8wcg/RubricApril2026.xlsx";
const instructorDiaryUrl =
  "https://docs.google.com/spreadsheets/d/1OfLVEqSGIwWYakWB9QCMS1p0nSKU-8QfsL0Gb_YuN38/edit?usp=sharing";

test.use({ serviceWorkers: "block" });

function createCsvFile(name: string, rows: string[]) {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-coding-"));
  const filePath = join(directory, name);
  const header = "Date,Question,Student Coding,Label,Notes";

  writeFileSync(filePath, [header, ...rows].join("\n"), "utf8");
  return filePath;
}

function createCsvFixture(name: string, csv: string) {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-coding-"));
  const filePath = join(directory, name);

  writeFileSync(filePath, csv, "utf8");
  return filePath;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Tests that need localStorage to survive a page.reload() set
    // __test_preserve_ls in sessionStorage before reloading.
    // sessionStorage persists through reload but is fresh for every new
    // browser context, so this cannot leak between tests.
    if (!window.sessionStorage.getItem("__test_preserve_ls")) {
      window.localStorage.clear();
    }
    Object.defineProperty(Math, "random", {
      configurable: true,
      value: () => 0.99,
    });
  });
  await page.goto("/");
});

test("browser mode does not show desktop window controls", async ({ page }) => {
  await expect(page.locator("[data-desktop-topbar]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Minimize" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Maximize" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Close" })).toHaveCount(0);
});

test("codes rows, reviews completion, and exports with title-cased name", async ({
  page,
}) => {
  const csvPath = createCsvFile("sample survey.csv", [
    '2026-01-12,"How do I use R for this?",Clarification,NA,NA',
    '2026-01-13,"Can this apply to my major?",Application,NA,NA',
  ]);

  await page.getByLabel("First name").fill("  amy  ");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("button", { name: "Coder: Amy" })).toBeVisible();

  await page.getByLabel("Select CSV file").setInputFiles(csvPath);
  await expect(page.getByRole("heading", { name: "sample survey.csv" })).toBeVisible();
  await expect(page.getByText("Codings", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Amy" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("First name").fill("  ana  ");
  await page.getByRole("button", { name: "Save" }).click();
  const namePill = page.getByRole("button", { name: "Ana" });
  await expect(namePill).toBeVisible();
  await expect(namePill).toHaveCSS("font-size", "12px");
  await expect(namePill).toHaveCSS("height", "20px");

  await expect(page.getByRole("link", { name: "Rubric" })).toHaveAttribute("href", rubricUrl);
  await expect(page.getByRole("link", { name: "Instructor diary" })).toHaveAttribute(
    "href",
    instructorDiaryUrl,
  );
  await expect(page.getByText("Output:")).toHaveCount(0);

  await page.getByRole("button", { name: "Flag question" }).click();
  await expect(page.getByRole("button", { name: "Flagged" })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("2b").check();
  await page.getByLabel("Notes").fill("Check later");
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("2e").check();
  await page.getByRole("button", { name: "Next" }).click();

  const firstQuestion = page.getByRole("button", { name: /Question 1/ });
  const secondQuestion = page.getByRole("button", { name: /Question 2/ });

  await expect(firstQuestion).toBeVisible();
  await expect(firstQuestion).toHaveClass(/bg-amber-200/);
  await expect(firstQuestion).toContainText("Coding");
  await expect(firstQuestion).toContainText("Note");
  await expect(page.getByText("Flagged")).toHaveCount(0);
  await expect(page.getByText("No flag")).toHaveCount(0);
  await expect(secondQuestion).toContainText("Coding");
  await expect(secondQuestion).toContainText("No note");
  await expect(page.getByText("Output:")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Previous" })).toHaveCount(0);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const exported = await download;
  const exportedPath = await exported.path();

  expect(exported.suggestedFilename()).toBe("sample survey Ana.csv");
  if (!exportedPath) {
    throw new Error("Expected exported CSV file path.");
  }

  expect(readFileSync(exportedPath, "utf8")).toBe(
    [
      "Date,Question,Student Coding,Label,Notes,Flag",
      "2026-01-12,How do I use R for this?,Clarification,2b,Check later,TRUE",
      "2026-01-13,Can this apply to my major?,Application,2e,NA,NA",
    ].join("\n"),
  );
});

test("does not show compare coder details for non-compare files with date columns", async ({ page }) => {
  const normalCsvPath = createCsvFixture(
    "ordinary coding.csv",
    [
      "id,Date,Question,Student Coding,Label,Notes",
      "row-1,2026-04-01,Synthetic ordinary question?,Synthetic student coding,NA,NA",
    ].join("\n"),
  );

  await page.getByLabel("First name").fill("amy");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Select CSV file").setInputFiles(normalCsvPath);
  await expect(page.getByRole("heading", { name: "ordinary coding.csv" })).toBeVisible();
  await expect(page.getByText("Codings", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Show detailed coder notes")).toHaveCount(0);
  await expect(page.getByText("Date:")).toHaveCount(0);
  await expect(page.getByText("2026-04-01(1)")).toHaveCount(0);
});

test("keeps compare file fields visible for compare files", async ({ page }) => {
  const compareCsvPath = createCsvFixture(
    "ordinary compare.csv",
    [
      "Question,Student Coding,Reference,ReferenceNotes,Vote,Votes,TotalVotes",
      "Synthetic compare question?,Synthetic compare coding,2a,NA,NA,NA,NA",
    ].join("\n"),
  );

  await page.getByLabel("First name").fill("amy");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Select CSV file").setInputFiles(compareCsvPath);
  await expect(page.getByRole("heading", { name: "ordinary compare.csv" })).toBeVisible();
  await expect(page.getByText("Synthetic compare question?")).toBeVisible();
  await expect(page.getByText("Reference", { exact: true })).toBeVisible();
});

test("shows compare coder summary for compare files with coder columns", async ({ page }) => {
  const compareCsvPath = createCsvFixture(
    "section compare.csv",
    [
      "Question,Student Coding,Reference,ReferenceNotes,Ari,AriNotes,Bea,BeaNotes,Label,Notes",
      "Compare this?,Original,2b,Reference note,2b,Ari note,2e,Bea note,NA,NA",
    ].join("\n"),
  );

  await page.getByLabel("First name").fill("amy");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Select CSV file").setInputFiles(compareCsvPath);

  await expect(page.getByText("Compare this?")).toBeVisible();
  await expect(page.getByText("Codings")).toBeVisible();
  await expect(page.getByText("Show detailed coder notes")).toBeVisible();
  const codingsBlock = page.getByText("Codings").locator("xpath=..");
  await expect(codingsBlock.getByText("2b").first()).toBeVisible();
  await expect(codingsBlock.getByText("2e").first()).toBeVisible();
});

test("preserves CSV shape and escaped values on export", async ({ page }) => {
  const fields = ["Date", "Question", "Student Coding", "Context", "Label", "Notes", "Follow Up", "ID"];
  const weirdNote = "Line one, with comma\nLine two with \"quotes\"";
  const csvPath = createCsvFixture(
    "weird survey.csv",
    [
      fields.join(","),
      '2026-02-01,"Comma, quote ""here"", and\nnew line","Student, original",Section A,,,"keep ""as,is""",abc-123',
      "2026-02-02,Already coded?,Original,Section B,1a;2b,Existing note,unchanged,def-456",
      "2026-02-03,Left blank on purpose,,Section C,,,,ghi-789",
    ].join("\n"),
  );

  await page.getByLabel("First name").fill("zoe");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);

  // Assert ID values are NOT printed/rendered in the UI
  await expect(page.getByText("abc-123")).toHaveCount(0);
  await expect(page.getByText("def-456")).toHaveCount(0);
  await expect(page.getByText("ghi-789")).toHaveCount(0);

  await page.getByLabel("2b").check();
  await page.getByLabel("2e").check();
  await page.getByLabel("Notes").fill(weirdNote);
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByLabel("1a")).toBeChecked();
  await expect(page.getByLabel("2b")).toBeChecked();
  await expect(page.getByLabel("Notes")).toHaveValue("Existing note");
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByLabel("Notes")).toHaveValue("");
  await page.getByRole("button", { name: "Next" }).click();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const exported = await download;
  const exportedPath = await exported.path();

  expect(exported.suggestedFilename()).toBe("weird survey Zoe.csv");
  if (!exportedPath) {
    throw new Error("Expected exported CSV file path.");
  }

  expect(readFileSync(exportedPath, "utf8")).toBe(
    [
      [...fields, "Flag"].join(","),
      `2026-02-01,"Comma, quote ""here"", and\nnew line","Student, original",Section A,2b;2e,"${weirdNote.replaceAll('"', '""')}","keep ""as,is""",abc-123,NA`,
      "2026-02-02,Already coded?,Original,Section B,1a;2b,Existing note,unchanged,def-456,NA",
      "2026-02-03,Left blank on purpose,,Section C,NA,NA,,ghi-789,NA",
    ].join("\n"),
  );
});

test("flushes the latest coding state when the page is hidden", async ({ page }) => {
  const csvPath = createCsvFile("autosave survey.csv", [
    '2026-07-01,"Will this survive a quick close?",Autosave check,NA,NA',
  ]);

  await page.getByLabel("First name").fill("maya");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);
  await page.getByLabel("2b").check();
  await page.getByLabel("Notes").fill("Close-safe note");

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  const savedSession = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("curiosity-coding-tool:v1") ?? "null"),
  );

  expect(savedSession.rows[0].Label).toBe("2b");
  expect(savedSession.rows[0].Notes).toBe("Close-safe note");
});

test("randomizes loaded rows and keeps no-question coding last", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Math, "random", {
      configurable: true,
      value: () => 0,
    });
  });
  await page.goto("/");

  const csvPath = createCsvFile("random check.csv", [
    '2026-03-01,"First question?",First,NA,NA',
    '2026-03-02,"Second question?",Second,NA,NA',
  ]);

  await page.getByLabel("First name").fill("ivy");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);

  await expect(page.getByText("Second question?")).toBeVisible();
  await expect(page.getByText("First question?")).toHaveCount(0);

  await expect(page.locator("fieldset legend")).toHaveText([
    "Not statistical content",
    "Statistical or technology content",
    "Example context",
    "No question",
  ]);
});

test("mobile coding layout keeps controls visible without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const csvPath = createCsvFile("mobile check.csv", [
    '2026-04-01,"How should this look on a narrow phone screen with a longer question?",Mobile coding,NA,NA',
  ]);

  await page.getByLabel("First name").fill("mia");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);

  await expect(page.getByRole("button", { name: "Mia" })).toHaveCSS("height", "20px");
  await expect(page.getByRole("link", { name: "Rubric" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Instructor diary" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Flag question" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("renames coder and uses in-app start-over dialog", async ({ page }) => {
  const csvPath = createCsvFile("rename check.csv", [
    '2026-01-12,"Question one?",Clarification,NA,NA',
  ]);

  await page.getByLabel("First name").fill("maya");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "Coder: Maya" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("First name").fill("  sam  ");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Coder: Sam" })).toBeVisible();

  await page.getByLabel("Select CSV file").setInputFiles(csvPath);
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByRole("dialog")).toContainText("current CSV progress");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "rename check.csv" })).toBeVisible();

  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Start over" }).last().click();
  await expect(page.getByText("Choose CSV")).toBeVisible();
  await expect(page.getByRole("button", { name: "Coder: Sam" })).toBeVisible();
});

test("Ctrl+Enter and Shift+Tab keybinds navigate questions", async ({ page }) => {
  const csvPath = createCsvFile("keybinds.csv", [
    '2026-01-12,"First question?",First,NA,NA',
    '2026-01-13,"Second question?",Second,NA,NA',
    '2026-01-14,"Third question?",Third,NA,NA',
  ]);

  await page.getByLabel("First name").fill("kim");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);

  // With random=0.99, order stays [First, Second, Third]; starts on First
  await expect(page.getByText("First question?")).toBeVisible();

  // Press Ctrl+Enter to go to next question
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText("Second question?")).toBeVisible();

  // Press Ctrl+Enter again
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText("Third question?")).toBeVisible();

  // Press Ctrl+Enter at the last question — should go to overview
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();

  // Press Shift+Tab from overview — should go back to last question
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByText("Third question?")).toBeVisible();

  // Press Shift+Tab to go to previous question
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByText("Second question?")).toBeVisible();

  // Press Shift+Tab again
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByText("First question?")).toBeVisible();

  // Press Shift+Tab at the first question — should stay
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByText("First question?")).toBeVisible();
});

test("textarea takes priority over keybinds — newlines and no navigation", async ({ page }) => {
  const csvPath = createCsvFile("keybinds-notes.csv", [
    '2026-01-12,"First question?",First,NA,NA',
    '2026-01-13,"Second question?",Second,NA,NA',
  ]);

  await page.getByLabel("First name").fill("lee");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);

  await expect(page.getByText("First question?")).toBeVisible();

  // Focus the notes textarea and press Shift+Enter — should insert newline, NOT navigate
  await page.getByLabel("Notes").click();
  await page.keyboard.press("Shift+Enter");
  // Verify we're still on the first question (no navigation)
  await expect(page.getByText("First question?")).toBeVisible();
  // Verify newline was inserted in the textarea
  const notesValue = await page.getByLabel("Notes").inputValue();
  expect(notesValue).toContain("\n");

  // Press Ctrl+Enter while in textarea — should NOT navigate (textarea takes priority)
  await page.getByLabel("Notes").click();
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText("First question?")).toBeVisible();

  // Click outside textarea, then Ctrl+Enter should navigate
  await page.getByText("First question?").click();
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText("Second question?")).toBeVisible();
});

test("keybind settings popover rebinds shortcuts", async ({ page }) => {
  // Use desktop viewport so the keybinds button is visible
  await page.setViewportSize({ width: 1280, height: 800 });

  const csvPath = createCsvFile("rebind.csv", [
    '2026-01-12,"First question?",First,NA,NA',
    '2026-01-13,"Second question?",Second,NA,NA',
  ]);

  await page.getByLabel("First name").fill("dev");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);

  await expect(page.getByText("First question?")).toBeVisible();

  // Open keybind settings
  await page.getByRole("button", { name: "Keybinds" }).click();
  await expect(page.getByText("Keyboard shortcuts")).toBeVisible();

  // Rebind "Next" to Ctrl+ArrowDown — click the Next keybind button, then press the combo
  await page.getByRole("button", { name: "Rebind Next shortcut" }).click();
  await expect(page.getByText("Press keys…")).toBeVisible();
  await page.keyboard.press("Control+ArrowDown");

  // Should show the new binding
  await expect(page.getByText("Ctrl+↓")).toBeVisible();

  // Close popover by clicking outside (on the question text)
  await page.getByText("First question?").click();
  await expect(page.getByText("Keyboard shortcuts")).toHaveCount(0);

  // Default Ctrl+Enter should no longer navigate
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText("First question?")).toBeVisible();

  // New Ctrl+ArrowDown should navigate to next
  await page.keyboard.press("Control+ArrowDown");
  await expect(page.getByText("Second question?")).toBeVisible();

  // Open popover again and reset to defaults
  await page.getByRole("button", { name: "Keybinds" }).click();
  await expect(page.getByText("Keyboard shortcuts")).toBeVisible();
  await page.getByText("Reset to defaults").click();
  await expect(page.getByRole("button", { name: "Rebind Next shortcut" })).toHaveText("Ctrl+Enter");

  // Close popover by clicking outside
  await page.getByText("Second question?").click();

  // Ctrl+Enter should work again after reset
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
});

test("Shift+R toggles review overview", async ({ page }) => {
  const csvPath = createCsvFile("review-keybind.csv", [
    '2026-01-12,"First question?",First,NA,NA',
    '2026-01-13,"Second question?",Second,NA,NA',
  ]);

  await page.getByLabel("First name").fill("rio");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);

  await expect(page.getByText("First question?")).toBeVisible();

  // Press Shift+R to enter overview
  await page.keyboard.press("Shift+R");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();

  // Press Shift+R again to return to coding
  await page.keyboard.press("Shift+R");
  await expect(page.getByText("First question?")).toBeVisible();
});

test("keybind settings button remains available on touch devices", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    serviceWorkers: "block",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    window.localStorage.clear();
    Object.defineProperty(Math, "random", {
      configurable: true,
      value: () => 0.99,
    });
  });
  await page.goto("/");

  const csvPath = createCsvFile("mobile-keybinds.csv", [
    '2026-01-12,"Only question?",Solo,NA,NA',
  ]);

  await page.getByLabel("First name").fill("mia");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);

  await expect(page.getByRole("button", { name: "Keybinds" })).toBeVisible();

  await context.close();
});

test("Shift+F toggles flag on current question", async ({ page }) => {
  const csvPath = createCsvFile("flag-keybind.csv", [
    '2026-01-12,"First question?",First,NA,NA',
    '2026-01-13,"Second question?",Second,NA,NA',
  ]);

  await page.getByLabel("First name").fill("sam");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);

  await expect(page.getByText("First question?")).toBeVisible();

  // Press Shift+F to flag
  await page.keyboard.press("Shift+F");
  await expect(page.getByRole("button", { name: "Flagged" })).toBeVisible();

  // Press Shift+F again to unflag
  await page.keyboard.press("Shift+F");
  await expect(page.getByRole("button", { name: "Flag question" })).toBeVisible();
});

test("warns before replacing an active unexported CSV", async ({ page }) => {
  const firstCsv = createCsvFile("first.csv", [
    '2026-01-12,"First question?",First,NA,NA',
    '2026-01-13,"Second question?",Second,NA,NA',
  ]);
  const secondCsv = createCsvFile("second.csv", [
    '2026-02-01,"Replacement question?",Third,NA,NA',
  ]);

  await page.getByLabel("First name").fill("ada");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(firstCsv);

  await expect(page.getByText("First question?")).toBeVisible();

  // Code a row to create unexported work
  await page.getByRole("checkbox", { name: /2b/ }).click();
  await page.getByLabel("Notes").fill("important observation");

  // Try to load a second CSV — should show the replace confirmation dialog
  await page.getByLabel("Select CSV file").setInputFiles(secondCsv);
  await expect(page.getByRole("dialog")).toContainText("coded work that has not been exported");
  await expect(page.getByRole("button", { name: "Replace" })).toBeVisible();

  // Cancel — should stay on the first CSV
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("First question?")).toBeVisible();

  // Try again and confirm replacement
  await page.getByLabel("Select CSV file").setInputFiles(secondCsv);
  await expect(page.getByRole("dialog")).toContainText("coded work that has not been exported");
  await page.getByRole("button", { name: "Replace" }).click();
  await expect(page.getByText("Replacement question?")).toBeVisible();
});

test("does not warn when replacing after export", async ({ page }) => {
  const firstCsv = createCsvFile("first-exported.csv", [
    '2026-01-12,"First question?",First,NA,NA',
    '2026-01-13,"Second question?",Second,NA,NA',
  ]);
  const secondCsv = createCsvFile("second-after-export.csv", [
    '2026-02-01,"Replacement question?",Third,NA,NA',
  ]);

  await page.getByLabel("First name").fill("grace");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(firstCsv);

  await expect(page.getByText("First question?")).toBeVisible();

  // Code a row
  await page.getByRole("checkbox", { name: /2b/ }).click();

  // Go to overview and export
  await page.keyboard.press("Control+Enter");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
  await page.getByRole("button", { name: "Export CSV" }).click();

  // Wait for export to complete — the download triggers in browser mode
  await page.waitForTimeout(500);

  // Now load a second CSV — should NOT show the replace dialog
  await page.getByLabel("Select CSV file").setInputFiles(secondCsv);
  await expect(page.getByText("Replacement question?")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("warns when replacing if user edits label after export", async ({ page }) => {
  const firstCsv = createCsvFile("first-exported-edit-label.csv", [
    '2026-01-12,"First question?",First,NA,NA',
    '2026-01-13,"Second question?",Second,NA,NA',
  ]);
  const secondCsv = createCsvFile("second-after-export-label.csv", [
    '2026-02-01,"Replacement question?",Third,NA,NA',
  ]);

  await page.getByLabel("First name").fill("grace");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(firstCsv);

  await expect(page.getByText("First question?")).toBeVisible();

  // Code a row
  await page.getByRole("checkbox", { name: /2b/ }).click();

  // Go to overview and export
  await page.keyboard.press("Control+Enter");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
  await page.getByRole("button", { name: "Export CSV" }).click();
  await page.waitForTimeout(500);

  // Now click on Question 1 in Overview to edit it again
  await page.getByRole("button", { name: "Question 1" }).click();
  await expect(page.getByText("First question?")).toBeVisible();

  // Edit label (check 2e as well)
  await page.getByRole("checkbox", { name: /2e/ }).check();

  // Now try to load a second CSV — should show the replace dialog since we have unexported edits!
  await page.getByLabel("Select CSV file").setInputFiles(secondCsv);
  await expect(page.getByRole("dialog")).toContainText("coded work that has not been exported");
});

test("warns when replacing if user edits notes after export", async ({ page }) => {
  const firstCsv = createCsvFile("first-exported-edit-notes.csv", [
    '2026-01-12,"First question?",First,NA,NA',
    '2026-01-13,"Second question?",Second,NA,NA',
  ]);
  const secondCsv = createCsvFile("second-after-export-notes.csv", [
    '2026-02-01,"Replacement question?",Third,NA,NA',
  ]);

  await page.getByLabel("First name").fill("grace");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(firstCsv);

  await expect(page.getByText("First question?")).toBeVisible();

  // Code a row
  await page.getByRole("checkbox", { name: /2b/ }).click();

  // Go to overview and export
  await page.keyboard.press("Control+Enter");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
  await page.getByRole("button", { name: "Export CSV" }).click();
  await page.waitForTimeout(500);

  // Go back and edit notes
  await page.getByRole("button", { name: "Question 1" }).click();
  await expect(page.getByText("First question?")).toBeVisible();
  await page.getByLabel("Notes").fill("Additional note after export");

  // Try to load a second CSV — should show the replace dialog
  await page.getByLabel("Select CSV file").setInputFiles(secondCsv);
  await expect(page.getByRole("dialog")).toContainText("coded work that has not been exported");
});

test("warns when replacing if user toggles flag after export", async ({ page }) => {
  const firstCsv = createCsvFile("first-exported-toggle-flag.csv", [
    '2026-01-12,"First question?",First,NA,NA',
    '2026-01-13,"Second question?",Second,NA,NA',
  ]);
  const secondCsv = createCsvFile("second-after-export-flag.csv", [
    '2026-02-01,"Replacement question?",Third,NA,NA',
  ]);

  await page.getByLabel("First name").fill("grace");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(firstCsv);

  await expect(page.getByText("First question?")).toBeVisible();

  // Code a row
  await page.getByRole("checkbox", { name: /2b/ }).click();

  // Go to overview and export
  await page.keyboard.press("Control+Enter");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
  await page.getByRole("button", { name: "Export CSV" }).click();
  await page.waitForTimeout(500);

  // Go back and toggle flag
  await page.getByRole("button", { name: "Question 1" }).click();
  await expect(page.getByText("First question?")).toBeVisible();
  await page.getByRole("button", { name: "Flag question" }).click();

  // Try to load a second CSV — should show the replace dialog
  await page.getByLabel("Select CSV file").setInputFiles(secondCsv);
  await expect(page.getByRole("dialog")).toContainText("coded work that has not been exported");
});

test("does not warn after reload when replacing a successfully exported CSV", async ({ page }) => {
  const firstCsv = createCsvFile("first-reload-exported.csv", [
    '2026-01-12,"First question?",First,NA,NA',
  ]);
  const secondCsv = createCsvFile("second-after-reload.csv", [
    '2026-02-01,"Replacement question?",Second,NA,NA',
  ]);

  await page.getByLabel("First name").fill("grace");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(firstCsv);

  await expect(page.getByText("First question?")).toBeVisible();

  await page.getByRole("checkbox", { name: /2b/ }).check();

  // Navigate to overview and export
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
  await page.getByRole("button", { name: "Export CSV" }).click();

  // Confirm export succeeded: Start next CSV button appears
  await expect(page.getByRole("button", { name: "Start next CSV" })).toBeVisible();

  // Wait until autosave has persisted exportedAt to localStorage
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem("curiosity-coding-tool:v1");
        return raw ? JSON.parse(raw).exportedAt ?? null : null;
      }),
    )
    .not.toBeNull();

  // Signal the beforeEach initScript to preserve localStorage through the
  // upcoming reload (sessionStorage survives reload; fresh per test context).
  await page.evaluate(() =>
    window.sessionStorage.setItem("__test_preserve_ls", "1"),
  );

  await page.reload();

  // Session restores from localStorage with exportedAt intact.
  // isOverview is not persisted, so the app opens on the question panel.
  await expect(page.getByText("First question?")).toBeVisible();

  // Load second CSV — must NOT warn because exportedAt survived the reload
  await page.getByLabel("Select CSV file").setInputFiles(secondCsv);
  await expect(page.getByText("Replacement question?")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
