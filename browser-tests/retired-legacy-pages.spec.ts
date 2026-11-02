import { test, expect } from "@playwright/test";

test("untrusted static consoles cannot impersonate account, security, or admin sessions", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const apiRequests: string[] = [];
  await page.route("**/api/**", route => { apiRequests.push(route.request().url()); return route.abort(); });
  for (const [url, heading] of [
    ["/diagnostics.html", "Legacy diagnostics unavailable"],
    ["/security.html", "Legacy security console unavailable"],
    ["/workspace.html", "LUQI workspace has moved"],
  ]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.locator("form, input, textarea, button, iframe")).toHaveCount(0);
    await expect(page.locator("script")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  expect(apiRequests).toEqual([]);
  await page.getByRole("link", { name: "Open LUQI workspace" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("link", { name: "Create account", exact: true })).toBeVisible();
});
