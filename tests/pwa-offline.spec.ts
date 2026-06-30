import { expect, test } from "@playwright/test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function createCsvFile(name: string) {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-coding-pwa-"));
  const filePath = join(directory, name);

  writeFileSync(
    filePath,
    [
      "Date,Question,Student Coding,Label,Notes",
      '2026-05-01,"Can I code offline?",Offline check,NA,NA',
    ].join("\n"),
    "utf8",
  );
  return filePath;
}

async function waitForServiceWorkerControl(page: import("@playwright/test").Page) {
  const hasController = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) return false;
    return Boolean(navigator.serviceWorker.controller);
  });

  if (!hasController) {
    await page.reload({ waitUntil: "domcontentloaded" });
  }

  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
}

test("PWA reloads offline and preserves the CSV workflow", async ({ context, page }) => {
  const csvPath = createCsvFile("offline workflow.csv");

  await page.addInitScript(() => {
    Object.defineProperty(Math, "random", {
      configurable: true,
      value: () => 0.99,
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForServiceWorkerControl(page);
  await expect(page.getByRole("heading", { name: "Enter first name" })).toBeVisible();

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Enter first name" })).toBeVisible();

  await page.getByLabel("First name").fill("opal");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Select CSV file").setInputFiles(csvPath);
  await page.getByLabel("2b").check();
  await page.getByLabel("Notes").fill("Offline note");
  await page.waitForFunction(() =>
    window.localStorage.getItem("curiosity-coding-tool:v1")?.includes("Offline note"),
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "offline workflow.csv" })).toBeVisible();
  await expect(page.getByLabel("2b")).toBeChecked();
  await expect(page.getByLabel("Notes")).toHaveValue("Offline note");

  await page.getByRole("button", { name: "Next" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const exported = await download;
  const exportedPath = await exported.path();

  expect(exported.suggestedFilename()).toBe("offline workflow Opal.csv");
  if (!exportedPath) {
    throw new Error("Expected exported CSV file path.");
  }
  expect(readFileSync(exportedPath, "utf8")).toContain("Offline note");
});

test("PWA registration is skipped inside the Tauri desktop runtime", async ({ page }) => {
  await page.addInitScript(() => {
    window.__TAURI_INTERNALS__ = {
      invoke: async () => null,
    };
  });

  await page.goto("/", { waitUntil: "load" });

  await expect
    .poll(async () => page.evaluate(() => navigator.serviceWorker.getRegistrations()))
    .toHaveLength(0);
});

test("service worker install discovery sees the built first-load assets", () => {
  const indexPath = join(process.cwd(), "dist", "index.html");
  const serviceWorkerPath = join(process.cwd(), "dist", "sw.js");

  test.skip(!existsSync(indexPath) || !existsSync(serviceWorkerPath), "Run pnpm build before this assertion.");

  const html = readFileSync(indexPath, "utf8");
  const serviceWorker = readFileSync(serviceWorkerPath, "utf8");
  const discoveredAssets = Array.from(html.matchAll(/\b(?:src|href)="([^"]+)"/g))
    .map((match) => match[1])
    .filter((assetUrl) => assetUrl.startsWith("/") && !assetUrl.startsWith("//"));
  const requiredFirstLoadAssets = discoveredAssets.filter((assetUrl) =>
    /^\/(?:_astro\/|pwa-register\.js|theme\.js|manifest\.webmanifest)/.test(assetUrl),
  );

  expect(requiredFirstLoadAssets).not.toHaveLength(0);
  expect(serviceWorker).toContain('html.matchAll(/\\b(?:src|href)="([^"]+)"/g)');
  expect(serviceWorker).toContain("APP_SHELL");
  expect(new Set(requiredFirstLoadAssets).size).toBe(requiredFirstLoadAssets.length);
});
