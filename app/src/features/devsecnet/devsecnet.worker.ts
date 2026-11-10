/// <reference lib="webworker" />
import { reviewCode } from "./review-engine";
import { compareMembership } from "./compute-engine";
const worker = self as unknown as DedicatedWorkerGlobalScope;
let started = false;
worker.onmessage = (event) => {
  if (started) return;
  started = true;
  try {
    const command = event.data;
    if (
      command?.kind === "review" &&
      Object.keys(command).sort().join("|") === "kind|language|source"
    )
      worker.postMessage({
        ok: true,
        kind: "review",
        result: reviewCode(command.source, command.language),
      });
    else if (
      command?.kind === "compare" &&
      Object.keys(command).sort().join("|") === "kind|size"
    )
      worker.postMessage({
        ok: true,
        kind: "compare",
        result: compareMembership(command.size),
      });
    else throw Error("INVALID_COMMAND");
  } catch {
    worker.postMessage({ ok: false });
  } finally {
    worker.close();
  }
};
