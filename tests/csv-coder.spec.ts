import { expect, test } from "@playwright/test";
import Papa from "papaparse";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function createCsvFile(name: string, rows: string[]) {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-coding-"));
  const filePath = join(directory, name);
  const header = "Date,Question,Student Coding,Label,Notes";

  writeFileSync(filePath, [header, ...rows].join("\n"), "utf8");
  return filePath;
}

function createCsvFromRows(name: string, fields: string[], rows: Record<string, string>[]) {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-coding-"));
  const filePath = join(directory, name);
  const csv = Papa.unparse(rows, { columns: fields, newline: "\n" });

  writeFileSync(filePath, csv, "utf8");
  return filePath;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/");
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
  await page.getByLabel("2b").check();
  await page.getByLabel("Notes").fill("Check later");
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("2e").check();
  await page.getByRole("button", { name: "Next" }).click();

  const firstQuestion = page.getByRole("button", { name: /Question 1/ });
  const secondQuestion = page.getByRole("button", { name: /Question 2/ });

  await expect(firstQuestion).toBeVisible();
  await expect(firstQuestion).toContainText("Coding");
  await expect(firstQuestion).toContainText("Note");
  await expect(secondQuestion).toContainText("Coding");
  await expect(secondQuestion).toContainText("No note");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const exported = await download;
  const exportedPath = await exported.path();

  expect(exported.suggestedFilename()).toBe("sample survey Amy.csv");
  if (!exportedPath) {
    throw new Error("Expected exported CSV file path.");
  }

  const parsedExport = Papa.parse<Record<string, string>>(readFileSync(exportedPath, "utf8"), {
    header: true,
    skipEmptyLines: true,
  });

  expect(parsedExport.meta.fields).toEqual(["Date", "Question", "Student Coding", "Label", "Notes"]);
  expect(parsedExport.data).toEqual([
    {
      Date: "2026-01-12",
      Question: "How do I use R for this?",
      "Student Coding": "Clarification",
      Label: "2b",
      Notes: "Check later",
    },
    {
      Date: "2026-01-13",
      Question: "Can this apply to my major?",
      "Student Coding": "Application",
      Label: "2e",
      Notes: "NA",
    },
  ]);
});

test("preserves CSV shape and escaped values on export", async ({ page }) => {
  const fields = ["Date", "Question", "Student Coding", "Context", "Label", "Notes", "Follow Up"];
  const weirdNote = "Line one, with comma\nLine two with \"quotes\"";
  const csvPath = createCsvFromRows("weird survey.csv", fields, [
    {
      Date: "2026-02-01",
      Question: "Comma, quote \"here\", and\nnew line",
      "Student Coding": "Student, original",
      Context: "Section A",
      Label: "",
      Notes: "",
      "Follow Up": "keep \"as,is\"",
    },
    {
      Date: "2026-02-02",
      Question: "Already coded?",
      "Student Coding": "Original",
      Context: "Section B",
      Label: "1a;2b",
      Notes: "Existing note",
      "Follow Up": "unchanged",
    },
    {
      Date: "2026-02-03",
      Question: "Left blank on purpose",
      "Student Coding": "",
      Context: "Section C",
      Label: "",
      Notes: "",
      "Follow Up": "",
    },
  ]);

  await page.getByLabel("First name").fill("zoe");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);

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

  const parsedExport = Papa.parse<Record<string, string>>(readFileSync(exportedPath, "utf8"), {
    header: true,
    skipEmptyLines: true,
  });

  expect(parsedExport.meta.fields).toEqual(fields);
  expect(parsedExport.data).toEqual([
    {
      Date: "2026-02-01",
      Question: "Comma, quote \"here\", and\nnew line",
      "Student Coding": "Student, original",
      Context: "Section A",
      Label: "2b;2e",
      Notes: weirdNote,
      "Follow Up": "keep \"as,is\"",
    },
    {
      Date: "2026-02-02",
      Question: "Already coded?",
      "Student Coding": "Original",
      Context: "Section B",
      Label: "1a;2b",
      Notes: "Existing note",
      "Follow Up": "unchanged",
    },
    {
      Date: "2026-02-03",
      Question: "Left blank on purpose",
      "Student Coding": "",
      Context: "Section C",
      Label: "NA",
      Notes: "NA",
      "Follow Up": "",
    },
  ]);
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
