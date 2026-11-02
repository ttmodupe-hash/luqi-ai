export const taskId = "da9c1eb2-62f6-45fb-b7f9-a989521270ae";
export const configured = {
  intake: "configured",
  storage: "connected",
  execution: "operator_run_only",
  workerVerified: false,
  handlers: ["travel.budget", "vehicle.schedule"],
  ownerTaskLimit: 100,
};
export const disabled = {
  intake: "disabled",
  execution: "disabled",
  workerVerified: false,
  handlers: [],
};
export const task = {
  id: taskId,
  handler: "travel.budget",
  version: "web-v1",
  state: "pending",
  payload: { currency: "ZAR", amounts: ["100.25", "40", "0.10"] },
  result: null,
  error: null,
  attempts: 0,
  maxAttempts: 3,
  nextRunAt: null,
  createdAt: "2026-10-23T00:00:00.000000Z",
  updatedAt: "2026-10-23T00:00:00.000000Z",
};
export const budgetResult = {
  total: "140.35",
  currency: "ZAR",
  basis: "user_supplied",
  notice: "Arithmetic from supplied amounts; no live prices or FX rates.",
};
