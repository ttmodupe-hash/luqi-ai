// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import SelfHealingUnavailablePage from "../src/pages/SelfHealingUnavailablePage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("shows an honest, navigable unavailable state without polling or provider calls", () => {
  const request = vi.spyOn(globalThis, "fetch");
  const poll = vi.spyOn(globalThis, "setInterval");
  render(<MemoryRouter><SelfHealingUnavailablePage /></MemoryRouter>);

  expect(screen.getByRole("heading", { name: "Automated repair is not available" })).toBeTruthy();
  expect(screen.getByText(/does not currently run automatic code repairs/i)).toBeTruthy();
  expect(screen.getByRole("navigation", { name: "Continue using Luqi" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Open Luqi Chat" }).getAttribute("href")).toBe("/chat");
  expect(screen.getByRole("link", { name: "Return to Luqi home" }).getAttribute("href")).toBe("/");
  expect(request).not.toHaveBeenCalled();
  expect(poll).not.toHaveBeenCalled();
  expect(screen.queryByText(/PR merged and deployed to production/i)).toBeNull();
});
