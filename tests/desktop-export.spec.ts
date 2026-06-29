import { expect, test } from "@playwright/test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test.use({ serviceWorkers: "block" });

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
  await page.getByLabel("First name").fill("nora");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);
  await page.getByLabel("2b").check();
  await page.getByLabel("Notes").fill("Saved from desktop");
  await expect(page.getByText("v0.1.0")).toBeVisible();
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

  const decorationCall = await page.evaluate(
    () =>
      (window as typeof window & { __desktopInvokes?: { cmd: string; args: unknown }[] })
        .__desktopInvokes?.find((call) => call.cmd.includes("set_decorations")),
  );

  expect(decorationCall).toBeUndefined();
});
