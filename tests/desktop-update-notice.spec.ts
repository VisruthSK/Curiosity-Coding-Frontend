import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

type DesktopInvoke = {
  args: unknown;
  cmd: string;
};

type DesktopUpdateMock = {
  failInstall?: boolean;
  updaterResult: unknown;
};

async function bootDesktopApp(page: import("@playwright/test").Page, mock: DesktopUpdateMock) {
  await page.addInitScript((updateMock) => {
    window.__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: unknown) => {
        const testWindow = window as typeof window & { __desktopInvokes?: DesktopInvoke[] };
        testWindow.__desktopInvokes = [...(testWindow.__desktopInvokes ?? []), { cmd, args }];

        if (cmd === "plugin:updater|check") {
          if (updateMock.updaterResult === "throw") {
            throw new Error("check failed");
          }
          return updateMock.updaterResult;
        }

        if (cmd === "plugin:updater|download_and_install" && updateMock.failInstall) {
          throw new Error("install failed");
        }

        if (cmd === "plugin:window|is_fullscreen") {
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
  }, mock);

  await page.goto("/");
}

async function desktopInvokes(page: import("@playwright/test").Page) {
  return page.evaluate(
    () => (window as typeof window & { __desktopInvokes?: DesktopInvoke[] }).__desktopInvokes ?? [],
  );
}

test("desktop update notice stays hidden when no update is available", async ({ page }) => {
  await bootDesktopApp(page, { updaterResult: null });

  await expect(page.getByText("Desktop update available")).toBeHidden();
  await expect
    .poll(async () => (await desktopInvokes(page)).some((call) => call.cmd === "plugin:updater|check"))
    .toBe(true);
});

test("desktop update notice shows an available update", async ({ page }) => {
  await bootDesktopApp(page, {
    updaterResult: {
      body: "Test release",
      currentVersion: "0.1.0",
      date: "2026-06-29",
      rawJson: "{}",
      rid: 7,
      version: "0.1.1",
    },
  });

  await expect(page.getByText("Desktop update available")).toBeVisible();
  await expect(page.getByText("Version 0.1.1")).toBeVisible();
});

test("desktop update notice installs and relaunches after a successful update", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await bootDesktopApp(page, {
    updaterResult: {
      body: "Test release",
      currentVersion: "0.1.0",
      date: "2026-06-29",
      rawJson: "{}",
      rid: 7,
      version: "0.1.1",
    },
  });

  await page.getByRole("button", { name: "Install" }).click();
  await expect(page.getByText("Update installed")).toBeVisible();
  await page.getByRole("button", { name: "Relaunch" }).click();

  await expect
    .poll(async () => (await desktopInvokes(page)).map((call) => call.cmd))
    .toContain("plugin:process|restart");
  expect(pageErrors).toEqual([]);
});

test("desktop update notice reports check failures in dev", async ({ page }) => {
  await bootDesktopApp(page, { updaterResult: "throw" });
  await expect(page.getByText("check failed")).toBeVisible();
});

test("desktop update notice reports install failures", async ({ page }) => {
  await bootDesktopApp(page, {
    failInstall: true,
    updaterResult: {
      body: "Test release",
      currentVersion: "0.1.0",
      date: "2026-06-29",
      rawJson: "{}",
      rid: 7,
      version: "0.1.1",
    },
  });
  await page.getByRole("button", { name: "Install" }).click();
  await expect(page.getByText("install failed")).toBeVisible();
});
