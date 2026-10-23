import { test, expect, type Page } from "@playwright/test";
import {
  task,
  configured,
  disabled,
  budgetResult,
} from "../tests/fixtures/omega-dashboard";
import contracts from "../tests/fixtures/omega-web-contracts.json" with { type: "json" };

test.beforeEach(async ({ page, baseURL }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/v1/"))
      return route.fulfill({ status: 503, json: { code: "TEST_UNAVAILABLE" } });
    return route.continue();
  });
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      json: {
        token: "fixture-token",
        user: { email: "browser@example.invalid" },
      },
    }),
  );
});
async function signIn(page: Page) {
  await page.goto("/#/omega-tasks");
  await page
    .getByLabel("Email", { exact: true })
    .fill("browser@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

test("disabled intake has honest availability, no task reads and no persistent session", async ({
  page,
}) => {
  const requests: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/v1/omega/tasks**", (route) => {
    requests.push(new URL(route.request().url()).pathname);
    return route.fulfill({ json: disabled });
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#/");
  await page
    .getByRole("link", { name: "Open omega tasks", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tasks, with a clear record." }),
  ).toBeVisible();
  await noOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("omega-sign-in.png"),
    fullPage: true,
  });
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "Tasks are not enabled yet" }),
  ).toBeVisible();
  expect(requests).toEqual(["/api/v1/omega/tasks/status"]);
  const contrast = await page.getByRole("button", { name: "Sign out", exact: true }).evaluate(element => {
    const css = getComputedStyle(element);
    const luminance = (rgb: string) => {
      const channels = (rgb.match(/\d+/g) || []).slice(0, 3).map(value => {
        const c = Number(value) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const a = luminance(css.color), b = luminance(css.backgroundColor);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await noOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("omega-disabled.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("saved outcomes render on desktop and mobile with keyboard access and no execution calls", async ({
  page,
}) => {
  const calls: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const vehicle = contracts.find(
    (item) => item.name === "leap day service due",
  )!;
  const second = {
    ...task,
    id: "ba9c1eb2-62f6-45fb-b7f9-a989521270ae",
    handler: vehicle.handler,
    payload: vehicle.payload,
    state: "completed",
    attempts: 1,
    result: vehicle.result,
  };
  const completed = {
    ...task,
    state: "completed",
    attempts: 1,
    result: budgetResult,
  };
  await page.route("**/api/v1/omega/tasks**", (route) => {
    const request = route.request(),
      url = new URL(request.url());
    calls.push(`${request.method()} ${url.pathname}`);
    expect(request.headers().authorization).toBe("Bearer fixture-token");
    const json = url.pathname.endsWith("/status")
      ? configured
      : url.search
        ? { tasks: [completed, second] }
        : { task: url.pathname.endsWith(second.id) ? second : completed };
    return route.fulfill({ json });
  });
  await signIn(page);
  const history = page.getByRole("region", { name: "Saved tasks" });
  await history.getByRole("button", { name: /Travel budget/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("ZAR 140.35", { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Task details" })
      .getByRole("heading", { name: "Travel budget" }),
  ).toBeFocused();
  await noOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("omega-budget.png"),
    fullPage: true,
  });
  await history
    .getByRole("button", { name: /Vehicle service schedule/ })
    .click();
  await expect(page.getByText("Service is due", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Distance overdue", { exact: true }),
  ).toBeVisible();
  await page.getByText("Supplied inputs", { exact: true }).click();
  await expect(page.getByText("2024-02-29", { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("omega-vehicle.png"),
    fullPage: true,
  });
  expect(calls.every((call) => call.startsWith("GET "))).toBe(true);
  expect(errors).toEqual([]);
});

test("cancellation conflict is unconfirmed until manual refresh", async ({
  page,
}) => {
  let cancelled = 0,
    refreshes = 0;
  await page.route("**/api/v1/omega/tasks**", (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (request.method() === "POST") {
      expect(url.pathname).toBe(`/api/v1/omega/tasks/${task.id}/cancel`);
      expect(request.postDataJSON()).toEqual({ confirm: true });
      cancelled++;
      return route.fulfill({
        status: 409,
        json: { code: "OMEGA_TASK_CONFLICT" },
      });
    }
    if (url.pathname.endsWith("/status")) {
      refreshes++;
      return route.fulfill({ json: configured });
    }
    return route.fulfill({
      json: url.search
        ? { tasks: [{ ...task, state: refreshes > 1 ? "running" : "pending" }] }
        : { task },
    });
  });
  await signIn(page);
  const select = page
    .getByRole("region", { name: "Saved tasks" })
    .getByRole("button", { name: /Travel budget/ });
  await select.click();
  await page.getByRole("button", { name: "Cancel task", exact: true }).click();
  await expect(page.getByRole("button", { name: "Keep task" })).toBeFocused();
  await page.getByRole("button", { name: "Keep task" }).click();
  await expect(
    page.getByRole("button", { name: "Cancel task", exact: true }),
  ).toBeFocused();
  expect(cancelled).toBe(0);
  await page.getByRole("button", { name: "Cancel task", exact: true }).click();
  await page.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Cancellation could not be confirmed",
  );
  await expect(select).toBeDisabled();
  expect(cancelled).toBe(1);
  await page
    .getByRole("button", { name: "Refresh tasks", exact: true })
    .click();
  await expect(select).toBeEnabled();
  await expect(select).toContainText("Running");
  await noOverflow(page);
});

test("session revocation clears task records and failed reads never show fabricated results", async ({
  page,
}) => {
  let checks = 0;
  await page.route("**/api/v1/omega/tasks**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/status")) {
      checks++;
      return route.fulfill(
        checks > 1
          ? { status: 401, json: { code: "AUTH_REQUIRED" } }
          : { json: configured },
      );
    }
    return route.fulfill({
      json: url.search
        ? { tasks: [task] }
        : { task: { ...task, state: "completed", result: null } },
    });
  });
  await signIn(page);
  await page
    .getByRole("region", { name: "Saved tasks" })
    .getByRole("button", { name: /Travel budget/ })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "No task outcome has been confirmed",
  );
  await expect(page.getByText("ZAR 140.35", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Refresh tasks", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(task.id, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("");
});
