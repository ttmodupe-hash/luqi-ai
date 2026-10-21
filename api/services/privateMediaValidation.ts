/** Bounded remote media reads prevent untrusted providers exhausting RAM. */
export async function readBoundedMedia(
  response: Response, maximumBytes: number,
): Promise<Buffer> {
  if (!response.ok || !response.body) throw new Error("Media provider returned no usable content.");
  const claimedSize = Number(response.headers.get("content-length") || "0");
  if (claimedSize > maximumBytes) throw new Error("Media exceeds the maximum accepted size.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) {
        await reader.cancel().catch(() => {});
        throw new Error("Media stream exceeds the maximum accepted size.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, length);
}

export function hasMp4Header(buffer: Uint8Array): boolean {
  return buffer.byteLength >= 1024 &&
    Buffer.from(buffer.subarray(4, 8)).toString("ascii") === "ftyp";
}

export function hasMp3Header(buffer: Uint8Array): boolean {
  if (buffer.byteLength < 512) return false;
  const prefix = Buffer.from(buffer.subarray(0, 3)).toString("ascii");
  return prefix === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
}
