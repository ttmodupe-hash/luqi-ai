import { test, expect } from "@playwright/test";

test("trip control checks consumption, calculates a return split and keeps the budget across corridors", async ({
  page,
}) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.goto("/#/drive");
  const budget = page.getByRole("region", {
    name: "Trip fuel budget",
    exact: true,
  });
  await budget.getByLabel("Road distance (km)", { exact: true }).fill("600");
  await budget.getByLabel("Fuel use (L/100 km)", { exact: true }).fill("120");
  await budget.getByLabel("Pump price (R/L)", { exact: true }).fill("30");
  await expect(
    budget.getByRole("status", { name: "Trip fuel estimate" }),
  ).toContainText("720.0 L · R21600.00");
  await budget
    .getByRole("button", { name: "Use 12.0 L/100 km", exact: true })
    .click();
  await budget
    .getByRole("button", { name: "Return trip", exact: true })
    .click();
  await budget.getByLabel("Travellers", { exact: true }).selectOption("4");
  await expect(
    budget.getByRole("status", { name: "Trip fuel estimate" }),
  ).toContainText("144.0 L · R4320.00");
  // WebKit can use comma grouping for en-ZA. Require the exact same share
  // with either browser's supported decimal and thousands separators.
  await expect(budget.locator(".fuelSplit strong")).toHaveText(
    /^R(?:1[,\s]080\.00|1[\s.]080,00|1080[.,]00)$/,
  );
  await page
    .getByRole("button", { name: "N3 · Johannesburg to Durban", exact: true })
    .click();
  await expect(
    budget.getByLabel("Road distance (km)", { exact: true }),
  ).toHaveValue("600");
  await expect(budget.getByLabel("Travellers", { exact: true })).toHaveValue(
    "4",
  );
  await expect(
    budget.getByRole("status", { name: "Trip fuel estimate" }),
  ).toContainText("R4320.00");
  await budget.getByLabel("Pump price (R/L)", { exact: true }).fill("");
  await expect(
    budget.getByRole("status", { name: "Trip fuel estimate" }),
  ).toContainText("Enter three positive amounts");
  await expect(budget.locator(".fuelAmount")).toHaveText("R—");
  expect(
    posts.filter((url) => /luqi-core|ai-pilot|chat\/completions/.test(url)),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("saved places can be arranged, read in four languages and downloaded in the saved order", async ({
  page,
}) => {
  await page.goto("/#/drive");
  const notebook = page.getByRole("region", {
    name: "My field guide",
    exact: true,
  });
  await notebook
    .getByRole("button", { name: "Save this place", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explore Western Cape", exact: true })
    .click();
  await notebook
    .getByRole("button", { name: "Save this place", exact: true })
    .click();
  await notebook
    .getByRole("button", {
      name: "Move Table Mountain National Park up",
      exact: true,
    })
    .click();
  await notebook
    .getByRole("button", {
      name: "Read Table Mountain National Park",
      exact: true,
    })
    .click();
  const reading = notebook.getByRole("region", {
    name: "Saved guide: Table Mountain National Park",
    exact: true,
  });
  for (const language of ["english", "sepitori", "setswana", "isizulu"]) {
    await reading
      .getByLabel("Reading language", { exact: true })
      .selectOption(language);
    await expect(reading.locator("p")).not.toBeEmpty();
  }
  const downloading = page.waitForEvent("download");
  await notebook
    .getByRole("button", { name: "Download field guide (.txt)", exact: true })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe(
    "luqi-south-africa-field-guide.txt",
  );
  const stream = await download.createReadStream();
  let content = "";
  for await (const chunk of stream!) content += chunk.toString();
  expect(content.indexOf("1. Table Mountain National Park")).toBeGreaterThan(
    -1,
  );
  expect(content.indexOf("2. Addo Elephant National Park")).toBeGreaterThan(
    content.indexOf("1. Table Mountain National Park"),
  );
  for (const language of ["English", "Sepitori", "Setswana", "isiZulu"])
    expect(content).toContain(language);
  await page.reload();
  await expect(notebook.locator(".notebookPlaceName").first()).toHaveText(
    "Table Mountain National Park",
  );
  await expect(notebook.getByRole("status").first()).toContainText(
    "2 places saved",
  );
});

test.describe("small phone trip planning", () => {
  test.use({ viewport: { width: 320, height: 800 } });
  test("keeps planner controls readable within the viewport", async ({
    page,
  }) => {
    await page.goto("/#/drive");
    const budget = page.getByRole("region", {
      name: "Trip fuel budget",
      exact: true,
    });
    await budget.getByLabel("Road distance (km)", { exact: true }).fill("600");
    await budget
      .getByRole("button", { name: "8 L/100 km", exact: true })
      .click();
    await budget.getByLabel("Pump price (R/L)", { exact: true }).fill("30");
    await expect(
      budget.getByRole("status", { name: "Trip fuel estimate" }),
    ).toContainText("48.0 L · R1440.00");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const inputs = await budget.getByRole("spinbutton").all();
    for (const input of inputs)
      expect(
        await input.evaluate(
          (element) => element.getBoundingClientRect().width,
        ),
      ).toBeGreaterThan(200);
  });
});
