import { expect, test } from "@playwright/test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test.use({ serviceWorkers: "block" });

const rubricUrl = "https://www.dropbox.com/scl/fi/hk484lt52g8u4j87q8wcg/RubricApril2026.xlsx";
const instructorDiaryUrl =
  "https://docs.google.com/spreadsheets/d/1OfLVEqSGIwWYakWB9QCMS1p0nSKU-8QfsL0Gb_YuN38/edit?usp=sharing";

function createCsvFile(name: string) {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-coding-desktop-"));
  const filePath = join(directory, name);

  writeFileSync(
    filePath,
    [
      "Date,Question,Student Coding,Label,Notes",
      '2026-06-01,"Can desktop export save?",Desktop check,NA,NA',
    ].join("\n"),
    "utf8",
  );
  return filePath;
}

test("desktop export sends CSV content to the Tauri export command", async ({ page }) => {
  const csvPath = createCsvFile("desktop export.csv");

  await page.addInitScript(() => {
    Object.defineProperty(Math, "random", {
      configurable: true,
      value: () => 0.99,
    });

    window.__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: unknown) => {
        const testWindow = window as typeof window & { __desktopInvokes?: unknown[] };
        testWindow.__desktopInvokes = [...(testWindow.__desktopInvokes ?? []), { cmd, args }];
        if (cmd === "plugin:window|is_maximized") {
          return false;
        }
        return null;
      },
      transformCallback: () => 1,
      unregisterCallback: () => null,
      metadata: {
        currentWindow: {
          label: "main",
        },
      },
    };
  });

  await page.goto("/");
  await expect(page.locator("[data-desktop-topbar]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Minimize" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Maximize" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
  await page.getByLabel("First name").fill("nora");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);
  await page.getByLabel("2b").check();
  await page.getByLabel("Notes").fill("Saved from desktop");
  await expect(page.getByText("v0.1.0")).toBeVisible();
  await expect(page.getByRole("link", { name: "Rubric" })).toHaveAttribute("href", rubricUrl);
  await expect(page.getByRole("link", { name: "Instructor diary" })).toHaveAttribute("href", instructorDiaryUrl);
  await page.getByRole("link", { name: "Rubric" }).click();
  await page.getByRole("link", { name: "Instructor diary" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Export CSV" }).click();

  await page.waitForFunction(() =>
    (window as typeof window & { __desktopInvokes?: { cmd: string; args: unknown }[] })
      .__desktopInvokes?.some((call) => call.cmd === "export_csv"),
  );

  const exportCall = await page.evaluate(
    () =>
      (window as typeof window & { __desktopInvokes?: { cmd: string; args: unknown }[] })
        .__desktopInvokes?.find((call) => call.cmd === "export_csv"),
  );

  expect(exportCall).toEqual({
    cmd: "export_csv",
    args: {
      fileName: "desktop export Nora.csv",
      content: [
        "Date,Question,Student Coding,Label,Notes,Flag",
        "2026-06-01,Can desktop export save?,Desktop check,2b,Saved from desktop,NA",
      ].join("\n"),
    },
  });

  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          (window as typeof window & { __desktopInvokes?: { cmd: string; args: unknown }[] })
            .__desktopInvokes?.filter((call) => call.cmd === "open_external_url")
            .map((call) => call.args) ?? [],
      ),
    )
    .toEqual([
      { url: rubricUrl },
      { url: instructorDiaryUrl },
    ]);

  const decorationCall = await page.evaluate(
    () =>
      (window as typeof window & { __desktopInvokes?: { cmd: string; args: unknown }[] })
        .__desktopInvokes?.find((call) => call.cmd.includes("set_decorations")),
  );

  expect(decorationCall).toBeUndefined();

  await page.getByRole("button", { name: "Minimize" }).click();
  await page.getByRole("button", { name: "Maximize" }).click();
  await page.locator("[data-desktop-topbar]").dispatchEvent("mousedown", { detail: 1 });

  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          (window as typeof window & { __desktopInvokes?: { cmd: string; args: unknown }[] })
            .__desktopInvokes?.map((call) => call.cmd) ?? [],
      ),
    )
    .toEqual(expect.arrayContaining([
      "plugin:window|minimize",
      "plugin:window|toggle_maximize",
      "plugin:window|start_dragging",
    ]));
});

// ── export_csv return-value / cancel / failure tests ─────────────────────────

function bootDesktopSession(
  page: import("@playwright/test").Page,
  exportCsvHandler: (args: unknown) => Promise<unknown>,
) {
  return page.addInitScript((handlerSrc: string) => {
    Object.defineProperty(Math, "random", { configurable: true, value: () => 0.99 });
    // eslint-disable-next-line no-new-func
    const handler = new Function("return " + handlerSrc)();
    window.__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: unknown) => {
        if (cmd === "plugin:window|is_maximized") return false;
        if (cmd === "export_csv") return handler(args);
        return null;
      },
      transformCallback: () => 1,
      unregisterCallback: () => null,
      metadata: { currentWindow: { label: "main" } },
    };
  }, exportCsvHandler.toString());
}

async function loadAndCodeCsv(page: import("@playwright/test").Page, csvPath: string) {
  await page.goto("/");
  await page.getByLabel("First name").fill("nora");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);
  await page.getByLabel("2b").check();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
}

async function getExportedAt(page: import("@playwright/test").Page): Promise<string | null> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("curiosity-coding-tool:v1");
    if (!raw) return null;
    try {
      return JSON.parse(raw).exportedAt ?? null;
    } catch {
      return null;
    }
  });
}

test("Tauri export cancel does not set exportedAt", async ({ page }) => {
  const csvPath = createCsvFile("cancel-export.csv");
  // export_csv returns false (user cancelled)
  await bootDesktopSession(page, async () => false);
  await loadAndCodeCsv(page, csvPath);

  await page.getByRole("button", { name: "Export CSV" }).click();
  await page.waitForTimeout(300);

  expect(await getExportedAt(page)).toBeNull();
  // Start-next-CSV button should NOT appear since no successful export
  await expect(page.getByRole("button", { name: "Start next CSV" })).toHaveCount(0);
});

test("Tauri export failure does not set exportedAt", async ({ page }) => {
  const csvPath = createCsvFile("fail-export.csv");
  // export_csv throws (write error)
  await bootDesktopSession(page, async () => { throw new Error("disk full"); });
  await loadAndCodeCsv(page, csvPath);

  await page.getByRole("button", { name: "Export CSV" }).click();
  await page.waitForTimeout(300);

  expect(await getExportedAt(page)).toBeNull();
  await expect(page.getByRole("button", { name: "Start next CSV" })).toHaveCount(0);
});

test("successful Tauri export persists exportedAt through autosave", async ({ page }) => {
  const csvPath = createCsvFile("success-export.csv");
  // export_csv returns true (file written)
  await bootDesktopSession(page, async () => true);
  await loadAndCodeCsv(page, csvPath);

  await page.getByRole("button", { name: "Export CSV" }).click();
  await page.waitForTimeout(500);

  const exportedAt = await getExportedAt(page);
  expect(exportedAt).not.toBeNull();
  expect(typeof exportedAt).toBe("string");

  // Start-next-CSV button should appear
  await expect(page.getByRole("button", { name: "Start next CSV" })).toBeVisible();
});
