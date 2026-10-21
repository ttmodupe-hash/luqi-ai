import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { combineVideoAndNarration, narratedVideoAvailable } from "./paidNarration";
import { hasMp4Header } from "./privateMediaValidation";

const integration = process.env.RUN_FFMPEG_INTEGRATION === "1" ? describe : describe.skip;
const exec = promisify(execFile);

integration("real FFmpeg narration composition — no external paid vendor", () => {
  let dir = "";
  let picture: Buffer;
  let voice: Buffer;
  let mixed: Buffer;
  const ffmpeg = "/usr/bin/ffmpeg";

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), `luqi-ffmpeg-ci-${randomUUID().slice(0, 6)}-`));
    process.env.LUQI_FFMPEG_PATH = ffmpeg;
    // This is a non-working synthetic key used only for local media mixing.
    // No provider network request is executed in this test.
    process.env.ELEVENLABS_API_KEY = "ci-test-narration-key-not-usable";
    const video = join(dir, "input.mp4");
    const audio = join(dir, "input.mp3");
    await exec(ffmpeg, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "color=c=blue:s=160x90:r=15",
      "-t", "2", "-c:v", "mpeg4", video,
    ]);
    await exec(ffmpeg, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100",
      "-t", "1.2", "-c:a", "libmp3lame", audio,
    ]);
    picture = await readFile(video);
    voice = await readFile(audio);
  }, 30000);

  afterAll(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.LUQI_FFMPEG_PATH;
  });

  it("actually combines a generated video track and spoken-audio track", async () => {
    expect(narratedVideoAvailable()).toBe(true);
    mixed = await combineVideoAndNarration(picture, voice, 2);
    expect(hasMp4Header(mixed)).toBe(true);
    const renderedFile = join(dir, "rendered.mp4");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(renderedFile, mixed);
    const { stdout } = await exec("/usr/bin/ffprobe", [
      "-v", "error", "-show_entries", "stream=codec_type",
      "-of", "csv=p=0", renderedFile,
    ]);
    expect(stdout).toContain("video");
    expect(stdout).toContain("audio");
  }, 60000);

  it("rejects MP4 bytes that contain only a fabricated header", async () => {
    await expect(combineVideoAndNarration(
      Buffer.from("not a real video"), voice, 2,
    )).rejects.toThrow(/Invalid media/);
  });
});
