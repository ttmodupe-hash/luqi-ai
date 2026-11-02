import { test, expect } from "@playwright/test";

test("public workspace does not advertise unavailable admin controls", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#/");
  await expect(page.getByRole("navigation", { name: "Footer navigation" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: "Administration" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Create account", exact: true })).toBeVisible();

  await page.goto("/#/admin");
  await expect(page.getByText("Administrator sign-in unavailable")).toBeVisible();
  await expect(page.getByText(/reviewed server-side administrator session/)).toBeVisible();
  await expect(page.locator("input[type=password]")).toHaveCount(0);
});
