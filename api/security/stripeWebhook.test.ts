import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStripeWebhook } from "./stripeWebhook";

const secret = "whsec_test_secret_with_enough_entropy";
const now = 1782050000;
const body = JSON.stringify({
  id: "evt_123abc", type: "checkout.session.completed",
  created: now, livemode: false,
});
function header(message = body, timestamp = now, key = secret) {
  return `t=${timestamp},v1=${createHmac("sha256", key).update(`${timestamp}.${message}`).digest("hex")}`;
}
describe("Stripe webhook signature checks", () => {
  it("accepts an authentic raw-body signature within tolerance", () => {
    expect(verifyStripeWebhook(body, header(), secret, now)).toEqual({
      id: "evt_123abc", type: "checkout.session.completed", created: now, livemode: false,
    });
  });
  it("rejects unsigned events", () => {
    expect(verifyStripeWebhook(body, null, secret, now)).toBeNull();
  });
  it("rejects changed payloads", () => {
    expect(verifyStripeWebhook(body.replace("false", "true"), header(), secret, now)).toBeNull();
  });
  it("rejects forged signing keys", () => {
    expect(verifyStripeWebhook(body, header(body, now, "attacker"), secret, now)).toBeNull();
  });
  it("rejects stale or future timestamp replays", () => {
    expect(verifyStripeWebhook(body, header(body, now - 301), secret, now)).toBeNull();
    expect(verifyStripeWebhook(body, header(body, now + 301), secret, now)).toBeNull();
  });
  it("rejects malformed envelopes even when correctly signed", () => {
    const bad = JSON.stringify({ id: "forged", type: "charge.succeeded", created: now, livemode: true });
    expect(verifyStripeWebhook(bad, header(bad), secret, now)).toBeNull();
  });
  it("rejects missing webhook configuration", () => {
    expect(verifyStripeWebhook(body, header(), undefined, now)).toBeNull();
  });
});
