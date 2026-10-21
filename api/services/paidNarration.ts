import { constants, accessSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, isAbsolute } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { hasMp3Header, hasMp4Header, readBoundedMedia } from "./privateMediaValidation";

const execFileAsync = promisify(execFile);
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MAX_MIXED_BYTES = 45 * 1024 * 1024;
const VOICE_BASE = "https://api.elevenlabs.io/v1/text-to-speech/";

/**
 * Narration is a single known ElevenLabs voice, not uncontrolled voice cloning.
 * FFmpeg must be bundled in the deployed container and configured explicitly.
 */
export function narratedVideoAvailable(): boolean {
  const key = process.env.ELEVENLABS_API_KEY || "";
  const executable = process.env.LUQI_FFMPEG_PATH || "";
  const voiceId = process.env.LUQI_ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  if (key.length < 11 || key.includes("mock") ||
      !isAbsolute(executable) ||
      !/^[a-zA-Z0-9_-]{10,50}$/.test(voiceId)) return false;
  try {
    accessSync(executable, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function synthesizePaidNarration(text: string): Promise<Buffer> {
  if (!narratedVideoAvailable()) throw new Error("Secure narrated-video rendering is not configured.");
  if (text.trim().length === 0 || text.length > 500) throw new Error("Narration must contain 1–500 characters.");
  const voiceId = process.env.LUQI_ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  const response = await fetch(VOICE_BASE + voiceId, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.65 },
    }),
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Narration provider request failed (${response.status}).`);
  const bytes = await readBoundedMedia(response, MAX_AUDIO_BYTES);
  if (!hasMp3Header(bytes)) throw new Error("Narration provider returned invalid MP3 data.");
  return bytes;
}

/**
 * Run FFmpeg with fixed arguments, no shell, and a fresh private temp directory.
 * Keep source video intact, pad brief narration with silence, and trim to the
 * purchased clip duration. Any composition failure rejects the render.
 */
export async function combineVideoAndNarration(
  video: Buffer, voice: Buffer, durationSeconds: number,
): Promise<Buffer> {
  if (!narratedVideoAvailable()) throw new Error("Secure FFmpeg mixer is unavailable.");
  if (!hasMp4Header(video) || !hasMp3Header(voice) ||
      !Number.isSafeInteger(durationSeconds) ||
      durationSeconds < 2 || durationSeconds > 10) {
    throw new Error("Invalid media for paid narrated video.");
  }
  const directory = await mkdtemp(join(tmpdir(), "luqi-narration-"));
  try {
    const videoPath = join(directory, "video.mp4");
    const voicePath = join(directory, "voice.mp3");
    const outputPath = join(directory, "complete.mp4");
    await Promise.all([writeFile(videoPath, video, { mode: 0o600 }),
      writeFile(voicePath, voice, { mode: 0o600 })]);
    await execFileAsync(process.env.LUQI_FFMPEG_PATH!, [
      "-nostdin", "-y", "-hide_banner", "-loglevel", "error",
      "-i", videoPath, "-i", voicePath,
      "-map", "0:v:0", "-map", "1:a:0",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
      "-af", "apad", "-t", String(durationSeconds),
      "-movflags", "+faststart", outputPath,
    ], { timeout: 45000, maxBuffer: 65536, windowsHide: true });
    const result = await readFile(outputPath);
    if (result.length > MAX_MIXED_BYTES || !hasMp4Header(result)) {
      throw new Error("Narrated MP4 is invalid or too large.");
    }
    return result;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
