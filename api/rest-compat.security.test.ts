import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  resolveSessionUser: vi.fn(),
  loginAccount: vi.fn(),
  registerAccount: vi.fn(),
}));
vi.mock("./auth", () => auth);
vi.mock("./services/payments", () => ({
  paymentsConfigured: () => true,
  verifyWebhookSignature: () => false,
  initializeTopup: vi.fn(),
  verifyTransaction: vi.fn(),
}));
import { restCompat } from "./rest-compat";

const jsonBody = (data: object) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(data),
});

describe("legacy REST access boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.resolveSessionUser.mockResolvedValue(null);
  });

  it.each([
    "/api/v25/payments/balance?key=other@example.com",
    "/api/v1/billing/balance",
    "/api/billing/dashboard",
    "/api/system/diagnostics-ledger",
    "/api/v1/self-healing/pipeline/jobs",
    "/api/v1/zta/approvals",
  ])("requires authentication for %s", async (route) => {
    const result = await restCompat.request("https://luqi-ai.com" + route);
    expect(result.status).toBe(401);
  });

  it.each([
    "/api/v25/payments/topup",
    "/api/v1/billing/topup",
    "/api/v1/jobs/submit",
    "/api/v1/self-healing/pipeline/run",
  ])("requires authentication for %s", async (route) => {
    const result = await restCompat.request("https://luqi-ai.com" + route, jsonBody({ credits: 100 }));
    expect(result.status).toBe(401);
  });

  it("requires a genuine provider signature on payment callbacks", async () => {
    const result = await restCompat.request(
      "https://luqi-ai.com/api/v25/payments/webhook",
      jsonBody({ event: "charge.success", data: { reference: "test" } }),
    );
    expect(result.status).toBe(401);
  });

  it("does not expose internal administration to ordinary accounts", async () => {
    auth.resolveSessionUser.mockResolvedValue({ id: 5, email: "test@example.com", role: "user" });
    const result = await restCompat.request("https://luqi-ai.com/api/v1/zta/status");
    expect(result.status).toBe(403);
  });

  it("does not claim an unverified security deployment took place", async () => {
    auth.resolveSessionUser.mockResolvedValue({ id: 1, email: "admin@example.com", role: "admin" });
    const result = await restCompat.request("https://luqi-ai.com/api/v1/self-healing/pipeline/run", jsonBody({}));
    expect(result.status).toBe(501);
    const output = await result.json() as { deployed: boolean };
    expect(output.deployed).toBe(false);
  });
});
