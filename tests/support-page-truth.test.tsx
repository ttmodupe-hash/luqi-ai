// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import SupportPage from "../app/src/pages/SupportPage";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("does not advertise fabricated tickets, paid subscriptions, or form submissions", () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  render(<MemoryRouter><SupportPage /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: /LUQI help and feedback/i })).toBeTruthy();
  expect(screen.getByText(/Online ticket creation, ticket tracking and reply dashboards are not/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /submit|send|ticket|pay/i })).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.getByRole("link", { name: "Help and feedback" }).getAttribute("href")).toBe("/contact");
  expect(screen.getByRole("link", { name: "Service status" }).getAttribute("href")).toBe("/service-status");
  expect(fetchSpy).not.toHaveBeenCalled();
});
