import { describe, expect, it } from "vitest";
import { hasMp3Header, hasMp4Header, readBoundedMedia } from "./privateMediaValidation";

describe("untrusted media download safety", () => {
  it("refuses fake containers instead of trusting file extensions", () => {
    expect(hasMp4Header(Buffer.from("fake.mp4"))).toBe(false);
    expect(hasMp3Header(Buffer.from("not audio"))).toBe(false);
    const mp4 = Buffer.alloc(2048);
    mp4.write("ftyp", 4);
    expect(hasMp4Header(mp4)).toBe(true);
    const mp3 = Buffer.alloc(700);
    mp3.write("ID3", 0);
    expect(hasMp3Header(mp3)).toBe(true);
  });

  it("enforces the declared size without reading remote bytes", async () => {
    const response = new Response("irrelevant", {
      headers: { "content-length": "100000" },
    });
    await expect(readBoundedMedia(response, 16)).rejects.toThrow(/maximum accepted size/);
  });

  it("enforces a byte limit even when content-length is withheld", async () => {
    const response = new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(12));
        controller.enqueue(new Uint8Array(12));
        controller.close();
      },
    }));
    await expect(readBoundedMedia(response, 16)).rejects.toThrow(/stream exceeds/);
  });

  it("preserves legitimate short media", async () => {
    const response = new Response(Buffer.from("LUQI"));
    const result = await readBoundedMedia(response, 16);
    expect(result.toString()).toBe("LUQI");
  });
});
