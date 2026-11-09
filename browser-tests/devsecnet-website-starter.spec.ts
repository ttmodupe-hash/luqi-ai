import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("320px guest builds, previews and downloads an actual safe service website", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const aiRequests: string[] = [];
  page.on("request", request => {
    if (request.method() !== "GET" &&
        /\/(api|v1)\/(ai|chat|pilot)|generativelanguage\.googleapis\.com|api\.openai\.com/.test(request.url()))
      aiRequests.push(request.url());
  });
  await page.goto("/#/devsecnet?panel=engineering");
  await expect(page.getByRole("heading", { name: "Build something useful. Learn by doing." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build a simple website for your service" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download my website (.html)" })).toBeDisabled();
  await expect(page.getByText("Resource blueprint · proposals only")).not.toBeVisible();
  await expect(page.getByText("TypeScript: parameterized owner-scoped lookup")).not.toBeVisible();

  await page.getByLabel("Business or project name").fill("Khanyisa Repairs");
  await page.getByLabel("What service do you offer?").fill("Local appliance repair and maintenance");
  await page.getByLabel("Public service area (not your home address)").fill("Soweto");
  await page.getByLabel("Public telephone number (optional)").fill("+27 71 234 5678");
  await expect(page.getByText("3 of 3 website details entered")).toBeVisible();
  const preview = page.frameLocator('iframe[title="Preview of your website"]');
  await expect(preview.getByRole("heading", { name: "Khanyisa Repairs" })).toBeVisible();
  await expect(preview.getByText("Local appliance repair and maintenance").first()).toBeVisible();

  const started = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my website (.html)" }).click();
  const download = await started;
  expect(download.suggestedFilename()).toBe("luqi-simple-service-website.html");
  const html = await readFile(await download.path(), "utf8");
  expect(html).toContain("Khanyisa Repairs");
  expect(html).toContain('href="tel:+27712345678"');
  expect(html).not.toContain("<script");
  await expect(page.getByText(/Nothing was published/)).toBeVisible();
  expect(aiRequests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("invalid public telephone disables export without leaking the previous preview", async ({ page }) => {
  await page.goto("/#/devsecnet?panel=engineering");
  await page.getByLabel("Business or project name").fill("A repair service");
  await page.getByLabel("What service do you offer?").fill("Window repairs");
  await page.getByLabel("Public service area (not your home address)").fill("Tshwane");
  await expect(page.getByRole("button", { name: "Download my website (.html)" })).toBeEnabled();
  await page.getByLabel("Public telephone number (optional)").fill("javascript:alert(1)");
  await expect(page.getByRole("button", { name: "Download my website (.html)" })).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("Check your entries");
  await expect(page.locator('iframe[title="Preview of your website"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Clear draft" }).click();
  await expect(page.getByRole("button", { name: "Download my website (.html)" })).toBeDisabled();
});
