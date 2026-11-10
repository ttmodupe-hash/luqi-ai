/// <reference types="vite/client" />
import RELEASE_SYNC from "@jitl/quickjs-wasmfile-release-sync";
import wasmUrl from "@jitl/quickjs-wasmfile-release-sync/wasm?url";
import {
  newVariant,
  newQuickJSWASMModuleFromVariant,
} from "quickjs-emscripten-core";
import { DRAFT_CONTRACT, draftSource, sourceDigest } from "./draft-contract";
import { executeDraft } from "./draft-runner";
const scope = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage: (value: unknown) => void;
};
let started = false;
scope.onmessage = async (e) => {
  if (started) return;
  started = true;
  try {
    if (
      e.data?.contract !== DRAFT_CONTRACT ||
      typeof e.data?.digest !== "string"
    )
      throw Error();
    const source = draftSource.parse(e.data.source);
    if ((await sourceDigest(source)) !== e.data.digest) throw Error();
    const module = await newQuickJSWASMModuleFromVariant(
      newVariant(RELEASE_SYNC, { wasmLocation: wasmUrl }),
    );
    scope.postMessage({
      ok: true,
      result: executeDraft(module, source, e.data.digest),
    });
  } catch {
    scope.postMessage({ ok: false });
  }
};
