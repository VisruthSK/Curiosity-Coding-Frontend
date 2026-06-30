import { expect, type Page, test } from "@playwright/test";

const STORAGE_KEY = "curiosity-coding-tool:v1";
const ROW_COUNT = 8;

test.use({ serviceWorkers: "block" });

type ViewportSize = {
  width: number;
  height: number;
};

function createSeededSession() {
  return {
    firstName: "Test",
    fileName: "viewport-test.csv",
    fields: ["Question", "Label", "Notes", "Flag"],
    rows: Array.from({ length: ROW_COUNT }, (_, index) => ({
      Question: `Question ${index + 1}: ${"This is a long test question. ".repeat(120)}`,
      Label: "NA",
      Notes: "NA",
      Flag: "NA",
    })),
    currentIndex: 0,
    savedAt: new Date().toISOString(),
  };
}

async function openSeededCodingSession(page: Page, viewport: ViewportSize) {
  await page.setViewportSize(viewport);
  await page.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.clear();
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    },
    { storageKey: STORAGE_KEY, session: createSeededSession() },
  );
  await page.goto("/");
  await expect(page.getByText(`Question 1 of ${ROW_COUNT}`)).toBeVisible();
}

async function getScrollablePositions(page: Page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll("html, body, main, section, aside"))
      .map((element, index) => {
        const htmlElement = element as HTMLElement;
        const tag = htmlElement.tagName.toLowerCase();
        const rect = htmlElement.getBoundingClientRect();
        const isDocumentElement = element === document.documentElement || element === document.body;
        const metrics = isDocumentElement
          ? {
              clientHeight: window.innerHeight,
              scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
              scrollTop: window.scrollY,
              rect: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
            }
          : {
              clientHeight: htmlElement.clientHeight,
              scrollHeight: htmlElement.scrollHeight,
              scrollTop: htmlElement.scrollTop,
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            };
        const isVisible = isDocumentElement || (
          rect.width > 0 &&
          rect.height > 0 &&
          getComputedStyle(htmlElement).visibility !== "hidden"
        );

        return {
          index,
          tag,
          ...metrics,
          isVisible,
          canScroll: isVisible && metrics.scrollHeight > metrics.clientHeight + 2,
        };
      })
      .filter((position) => position.canScroll)
      .map(({ index, tag, scrollTop, rect }) => ({ index, tag, scrollTop, rect }))
      .sort((first, second) => {
        const firstIsDocument = first.tag === "html" || first.tag === "body";
        const secondIsDocument = second.tag === "html" || second.tag === "body";
        if (firstIsDocument === secondIsDocument) return 0;
        return firstIsDocument ? 1 : -1;
      });
  });
}

test("cramped desktop viewport fails open to user scroll", async ({ page }) => {
  await openSeededCodingSession(page, { width: 1280, height: 720 });

  const overflow = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) throw new Error("main not found");

    return {
      htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      mainOverflowY: getComputedStyle(main).overflowY,
    };
  });

  expect(overflow.htmlOverflowY).not.toBe("hidden");
  expect(overflow.bodyOverflowY).not.toBe("hidden");
  expect(overflow.mainOverflowY).not.toBe("hidden");

  const before = await getScrollablePositions(page);
  expect(before.length).toBeGreaterThan(0);

  const scrollTarget = before[0];
  await page.mouse.move(
    scrollTarget.rect.x + Math.min(scrollTarget.rect.width / 2, 640),
    scrollTarget.rect.y + Math.min(scrollTarget.rect.height / 2, 360),
  );
  await page.mouse.wheel(0, 800);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));

  const after = await getScrollablePositions(page);
  const moved = after.some((nextPosition) => {
    const previousPosition = before.find(
      (position) => position.index === nextPosition.index && position.tag === nextPosition.tag,
    );

    return previousPosition ? nextPosition.scrollTop > previousPosition.scrollTop : false;
  });

  expect(moved).toBe(true);
});

test("comfortable desktop viewport keeps the app shell filling the screen", async ({ page }) => {
  await openSeededCodingSession(page, { width: 1280, height: 900 });

  const box = await page.locator("main").boundingBox();
  expect(box).not.toBeNull();
  expect(Math.abs(Math.round(box!.height) - 900)).toBeLessThanOrEqual(1);
});

test("keyboard navigation remains usable on cramped desktop", async ({ page }) => {
  await openSeededCodingSession(page, { width: 1280, height: 720 });

  await page.locator("main header").click();
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText(`Question 2 of ${ROW_COUNT}`)).toBeVisible();

  await page.keyboard.press("Shift+Tab");
  await expect(page.getByText(`Question 1 of ${ROW_COUNT}`)).toBeVisible();
});

test.describe("touch-capable desktop-ish context", () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    hasTouch: true,
    isMobile: false,
  });

  test("shows Keybinds without hover or fine pointer support", async ({ page }) => {
    await openSeededCodingSession(page, { width: 1280, height: 720 });

    await expect(page.getByRole("button", { name: /keybinds/i })).toBeVisible();
  });
});
