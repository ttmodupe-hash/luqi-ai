// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { trails } from "../src/features/drive/drive-navigation";
import FieldNotebook, {
  formatFieldGuide,
} from "../src/features/drive/FieldNotebook";
import FaultBench from "../src/components/FaultBench";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
it("keeps selected places in order across sessions and ignores unknown saved IDs", () => {
  const [a, b] = trails[0].stops;
  localStorage.setItem(
    "luqi.drive.field-notebook.v1",
    JSON.stringify(["unrecognised", a.id, a.id]),
  );
  const { unmount } = render(<FieldNotebook guide={b} />);
  fireEvent.click(screen.getByRole("button", { name: "Save this place" }));
  expect(
    screen.getAllByRole("listitem").map((el) => el.firstChild?.textContent),
  ).toEqual([a.area, b.area]);
  unmount();
  render(<FieldNotebook guide={b} />);
  expect(screen.getByText("2 places saved · On this browser")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remove " + a.area }));
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  const guide = formatFieldGuide([b]);
  for (const briefing of Object.values(b.descriptions))
    expect(guide).toContain(briefing);
  expect(guide).toContain(b.source.url);
  expect(guide).not.toContain(String(b.lat));
});
it("retains a downloadable in-memory guide if storage is blocked", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Storage disabled");
  });
  render(<FieldNotebook guide={trails[0].stops[0]} />);
  fireEvent.click(screen.getByRole("button", { name: "Save this place" }));
  expect(screen.getByText(/Storage unavailable/)).toBeTruthy();
  expect(
    screen.getByRole("button", { name: /Download field guide/ }),
  ).toBeTruthy();
});
it("latches a tripped DC circuit until reset and restores current at a suitable load", () => {
  render(<FaultBench />);
  fireEvent.change(screen.getByLabelText("Choose the load"), {
    target: { value: "4" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Test circuit" }));
  expect(screen.getByRole("status").textContent).toContain("Switch tripped");
  fireEvent.change(screen.getByLabelText("Choose the load"), {
    target: { value: "24" },
  });
  expect(screen.getByRole("status").textContent).toContain("Switch tripped");
  fireEvent.click(screen.getByRole("button", { name: "Reset trip switch" }));
  fireEvent.click(screen.getByRole("button", { name: "Test circuit" }));
  expect(screen.getByRole("status").textContent).toContain("0.5 A");
});
it("lets a learner distinguish mismatch, damage, replacement and a successful fit", () => {
  render(<FaultBench />);
  fireEvent.click(screen.getByRole("button", { name: /Thread fit/ }));
  fireEvent.change(screen.getByLabelText("Choose bolt pitch"), {
    target: { value: "1.5" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Try the fit" }));
  expect(screen.getByRole("status").textContent).toContain("Thread mismatch");
  fireEvent.click(screen.getByRole("button", { name: "Simulate forcing it" }));
  expect(screen.getByRole("status").textContent).toContain("Threads stripped");
  fireEvent.click(
    screen.getByRole("button", { name: "Replace practice part" }),
  );
  fireEvent.change(screen.getByLabelText("Choose bolt pitch"), {
    target: { value: "1.0" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Try the fit" }));
  expect(screen.getByRole("status").textContent).toContain("Threads engaged");
});
