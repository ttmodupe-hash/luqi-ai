import type { QuickJSWASMModule, QuickJSHandle } from "quickjs-emscripten-core";
import {
  DRAFT_CASES,
  DRAFT_CONTRACT,
  DRAFT_LIMITS,
  draftSource,
  type DraftReport,
} from "./draft-contract";

/** Runs guest JS only inside QuickJS/WASM. No host functions or module loader are bound. */
export function executeDraft(
  module: QuickJSWASMModule,
  source: string,
  digest: string,
): DraftReport {
  draftSource.parse(source);
  const rows: DraftReport["rows"] = [];
  for (const test of DRAFT_CASES) {
    const runtime = module.newRuntime();
    runtime.setMemoryLimit(DRAFT_LIMITS.guestHeapBytes);
    runtime.setMaxStackSize(DRAFT_LIMITS.stackBytes);
    runtime.removeModuleLoader();
    let interrupted = false;
    const deadline = Date.now() + DRAFT_LIMITS.caseMs;
    runtime.setInterruptHandler(() => {
      if (Date.now() > deadline) interrupted = true;
      return interrupted;
    });
    const vm = runtime.newContext(),
      handles: QuickJSHandle[] = [];
    const hold = (h: QuickJSHandle) => {
      handles.push(h);
      return h;
    };
    let outcome: DraftReport["rows"][number]["outcome"] = "error",
      actual: string | undefined;
    try {
      // Retain the original serializer before guest code can change global builtins.
      const json = hold(vm.getProp(vm.global, "JSON"));
      const stringify = hold(vm.getProp(json, "stringify"));
      const definition = vm.evalCode(
        '"use strict";\n' +
          source +
          '\n;typeof solve === "function" ? solve : undefined',
        "draft.js",
        { type: "global" },
      );
      if (definition.error) hold(definition.error);
      else {
        const fn = hold(definition.value);
        if (vm.typeof(fn) === "function") {
          const input = hold(vm.newObject());
          for (const [k, v] of Object.entries(test.input))
            vm.setProp(
              input,
              k,
              hold(
                typeof v === "number"
                  ? vm.newNumber(v)
                  : vm.newString(String(v)),
              ),
            );
          const execution = vm.callFunction(fn, vm.undefined, input);
          if (execution.error) {
            hold(execution.error);
            outcome = "throw";
          } else {
            const value = hold(execution.value),
              serialized = vm.callFunction(stringify, json, value);
            if (serialized.error) hold(serialized.error);
            else {
              const text = hold(serialized.value);
              if (vm.typeof(text) === "string") {
                const result = vm.getString(text);
                if (result.length <= 2048) {
                  outcome = "value";
                  actual = result;
                }
              }
            }
          }
        }
      }
    } catch {
      outcome = "error";
    } finally {
      // Do not serialize guest errors, stacks or getters into host logs.
      for (const h of handles.reverse()) h.dispose();
      vm.dispose();
      runtime.dispose();
    }
    rows.push({
      id: test.id,
      outcome: interrupted ? "limit" : outcome,
      ...(actual === undefined ? {} : { actual }),
    });
  }
  return { contract: DRAFT_CONTRACT, digest, rows };
}
