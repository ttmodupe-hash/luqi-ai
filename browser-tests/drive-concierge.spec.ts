import { test, expect } from "@playwright/test";

test("320px guest can create source-linked tourism briefing without GPS or AI inference", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const paidRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/(v1\/)?(chat|ai|pilot|payments)\b/i.test(new URL(request.url()).pathname) &&
        request.method() !== "GET") paidRequests.push(request.url());
  });
  await page.goto("/#/drive?trail=n3");
  await expect(page.getByRole("heading", { name: "Luqi-Drive", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open tourism concierge" }).click();
  await expect(page.getByRole("heading", { name: "Four-lens tourism concierge" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create source-linked briefing" })).toBeDisabled();
  await page.getByRole("radio", { name: "I am a passenger" }).check();
  await page.getByLabel("Travel style").selectOption("ECO_SAFARI");
  await page.getByLabel("Total budget ceiling (ZAR)").fill("450");
  await page.getByRole("button", { name: "Create source-linked briefing" }).click();
  await expect(page.getByRole("heading", { name: "Biodiversity & eco-safari" })).toBeVisible();
  await expect(page.getByText(/No verified venue fees or live booking data/)).toBeVisible();
  await expect(page.getByRole("link", { name: /UNESCO Maloti-Drakensberg Park — original source/ }).first())
    .toHaveAttribute("href", "https://whc.unesco.org/en/list/985");
  expect(paidRequests).toEqual([]);
});

test("province without a curated pack cannot fabricate concierge facts", async ({ page }) => {
  await page.goto("/#/drive");
  await page.getByRole("button", { name: "Open tourism concierge" }).click();
  await page.getByRole("radio", { name: "I am a passenger" }).check();
  await expect(page.getByRole("button", { name: "Create source-linked briefing" })).toBeDisabled();
  await expect(page.getByText(/No local four-lens pack is available/)).toBeVisible();
});
