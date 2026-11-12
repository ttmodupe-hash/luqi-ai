import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { unzipSync, strFromU8 } from "fflate";
test("executes a local draft in WASM and requires review before export", async ({
  page,
}) => {
  const paidRequests: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/api/v1/luqi-core")
    )
      paidRequests.push(request.url());
  });
  await page.goto("/#/devsecnet?panel=engineering");
  // Advanced development remains available, but is intentionally not the
  // first thing presented to ordinary customers.
  await page.getByText("For developers: write and test a JavaScript function", { exact: true }).click();
  await expect(page.getByLabel("Project idea for this function")).toBeVisible();
  await page
    .getByLabel("Project idea for this function")
    .fill("A school connectivity offer");
  await page
    .getByRole("button", { name: "Confirm plan and contract", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Load local reference (no AI)", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve draft for export", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Run isolated tests", exact: true })
    .click();
  await expect(
    page
      .getByRole("table", { name: "Executed contract tests" })
      .getByText("PASS", { exact: true }),
  ).toHaveCount(12);
  await expect(
    page.getByRole("button", { name: "Approve draft for export", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("I reviewed this source, executed results and limitations.", {
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Approve draft for export", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Download reviewed draft bundle",
      exact: true,
    })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("luqi-reviewed-draft.zip");
  expect(await download.failure()).toBeNull();
  const file = await download.path();
  expect(file).not.toBeNull();
  const files = unzipSync(await readFile(file!));
  const review = JSON.parse(strFromU8(files["review.json"]));
  expect(review.report.digest).toBe(
    createHash("sha256").update(files["draft.js"]).digest("hex"),
  );
  expect(review.humanAcknowledgement).toBe(true);
  expect(review.productionApproval).toBe(false);
  await expect(page).toHaveURL(/#\/devsecnet\?panel=engineering$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page
    .getByRole("textbox", { name: "JavaScript draft", exact: true })
    .fill("function solve() { return 0; }");
  await expect(
    page.getByRole("table", { name: "Executed contract tests" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Download reviewed draft bundle",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Run isolated tests", exact: true })
    .click();
  await expect(
    page
      .getByRole("table", { name: "Executed contract tests" })
      .getByText("FAIL", { exact: true }),
  ).toHaveCount(12);
  await expect(
    page.getByLabel(
      "I reviewed this source, executed results and limitations.",
      { exact: true },
    ),
  ).toBeDisabled();
  expect(paidRequests).toEqual([]);
});
