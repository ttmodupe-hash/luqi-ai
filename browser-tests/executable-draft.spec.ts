import { expect, test } from "@playwright/test";
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
  await page
    .getByLabel("Project idea for this function")
    .fill("A school connectivity offer");
  await page
    .getByRole("button", { name: "Confirm plan and contract", exact: true })
    .click();
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
  await page
    .getByLabel("JavaScript draft", { exact: true })
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
