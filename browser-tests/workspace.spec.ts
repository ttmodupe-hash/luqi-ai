import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/v1/")) {
      return route.fulfill({ status: 503, json: { code: "TEST_UNAVAILABLE" } });
    }
    return route.continue();
  });
});

test("workspace filters distinguish usable tools from previews without making AI requests", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() !== "GET" ||
      /generativelanguage|openai|\/api\/|\/v1\//.test(request.url())
    )
      requests.push(request.url());
  });
  await page.goto("/#/");
  await expect(
    page.getByText("Check AI trial availability"),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(6);
  await page.getByRole("button", { name: "Ready to use", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(4);
  await expect(page.getByRole("article").getByRole("link")).toHaveCount(4);
  await page
    .getByRole("button", { name: "In development", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(page.getByRole("article").getByRole("link")).toHaveCount(0);
  await page.getByLabel("Filter workspace tools").fill("unmatched-example");
  await expect(
    page.getByRole("heading", { name: "No tools match your search." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show all tools" }).click();
  await expect(page.getByRole("article")).toHaveCount(6);
  await page.getByLabel("Filter workspace tools").fill("  PHYSICS  ");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("article").getByRole("heading", { name: "Physics lab" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear tool search" }).click();
  await expect(page.getByRole("article")).toHaveCount(6);
  expect(requests).toEqual([]);
});

test("keyboard search contains focus, closes with Escape and navigates to private notes", async ({
  page,
}) => {
  await page.goto("/#/");
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Find your next step" });
  await expect(dialog).toBeVisible();
  const search = dialog.getByLabel("Search tools");
  await expect(search).toBeFocused();
  await search.fill("Omega");
  await expect(
    dialog.getByRole("link", { name: "Omega tasks" }),
  ).toBeVisible();
  await expect(dialog.getByRole("link")).toHaveCount(1);
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("search.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Search workspace" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Search workspace" }).click();
  await search.fill("private notes");
  await dialog.getByRole("link", { name: "Private notes" }).click();
  await expect(page).toHaveURL(/#\/companion$/);
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Companion conversations" }),
  ).toBeVisible();
});

test("navigation and skip link work at small widths without changing hash routes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#workspace-content")).toBeFocused();
  await expect(page).toHaveURL(/#\/$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("button", { name: "Close navigation" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Private notes" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Companion conversations" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toHaveCount(0);
  await page.goto("/#/");
  await page.getByRole("link", { name: "Explore tools" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose where to start." }),
  ).toBeFocused();
  await expect(page).toHaveURL(/#\/$/);
  await page.screenshot({
    path: test.info().outputPath("small-workspace.png"),
    fullPage: true,
  });
});

test("physics lab remains interactive while the AI tutor is unavailable", async ({
  page,
}) => {
  const writes: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#/");
  await page
    .getByRole("link", { name: "Open physics lab", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Experiential STEM Physics Laboratory" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI physics tutor is unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByPlaceholder(
      "Ask Dr. Kwame any question about this physics lab...",
    ),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Pause Simulation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume Simulation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("slider", { name: "String length", exact: true })
    .fill("2");
  await expect(
    page.getByRole("slider", { name: "String length", exact: true }),
  ).toHaveValue("2");
  await page
    .getByRole("button", { name: "Resume Simulation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause Simulation", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("physics-lab.png"),
    fullPage: true,
  });
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test('archive aliases show unavailable access with a keyboard path to private notes', async ({ page }) => {
  const apiCalls: string[] = [];
  page.on('request', request => {
    if (/\/api\/trpc\//.test(request.url())) apiCalls.push(request.url());
  });
  await page.setViewportSize({ width: 320, height: 780 });
  for (const path of ['/archive', '/vault']) {
    await page.goto('/#' + path);
    await expect(page.getByRole('heading', { name: 'Archive vault' })).toBeVisible();
    await expect(page.getByText('Unavailable', { exact: true })).toBeVisible();
    await expect(page.getByText(/Existing files are preserved/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(apiCalls).toEqual([]);
  const notes = page.getByRole('link', { name: 'Open private notes', exact: true });
  await notes.focus();
  await expect(notes).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/companion$/);
});
