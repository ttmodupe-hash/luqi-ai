import { GetObjectCommand, PutObjectCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { hasMp4Header, readBoundedMedia } from "./privateMediaValidation";
import { narratedVideoAvailable, synthesizePaidNarration, combineVideoAndNarration } from "./paidNarration";

const MAX_MP4_BYTES = 45 * 1024 * 1024;
const MODEL_ENDPOINT = "https://api.replicate.com/v1/models/wan-video/wan-2.1-720p/predictions";

export function isTrustedReplicateUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      (url.hostname === "replicate.delivery" ||
       url.hostname.endsWith(".replicate.delivery") ||
       url.hostname === "api.replicate.com") && url.port === "";
  } catch {
    return false;
  }
}

function storageSettings() {
  const bucket = process.env.LUQI_VIDEO_BUCKET || "";
  const region = process.env.AWS_REGION || "us-east-1";
  const r2Account = process.env.R2_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,62}$/.test(bucket)) return null;
  if (r2Account && !/^[a-z0-9]{32}$/.test(r2Account)) return null;
  if (r2Account && (!accessKey || !secretKey)) return null;
  // On Cloud Run there is no implicit AWS instance role. Require explicit
  // static credentials, verified web-identity, or container identity before
  // charging for a render. Never spend API credits then discover S3 is blank.
  const hasCredentials = Boolean((accessKey && secretKey) ||
    (process.env.AWS_ROLE_ARN && process.env.AWS_WEB_IDENTITY_TOKEN_FILE) ||
    process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ||
    process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI);
  if (!hasCredentials) return null;
  return {
    bucket, region,
    config: {
      region: r2Account ? "auto" : region,
      ...(r2Account ? { endpoint: `https://${r2Account}.r2.cloudflarestorage.com`, forcePathStyle: true } : {}),
      ...(accessKey && secretKey ? { credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } } : {}),
    },
  };
}

/** Real video must never be replaced with a fake MP4 or transient disk file. */
export function paidVideoAvailable(mode: "silent_mp4" | "narrated_mp4" = "silent_mp4"): boolean {
  const key = process.env.REPLICATE_API_TOKEN || "";
  return Boolean(key.length > 10 && !key.includes("mock") && storageSettings() &&
    (mode === "silent_mp4" || narratedVideoAvailable()));
}

function videoClient() {
  const settings = storageSettings();
  if (!settings) throw new Error("Durable private video storage is unavailable.");
  return { bucket: settings.bucket, client: new S3Client(settings.config) };
}

async function readApiResponse(res: Response): Promise<any> {
  if (!res.ok) throw new Error(`Video provider HTTP ${res.status}.`);
  return res.json();
}

function extractOutputUrl(job: any): string {
  const value = Array.isArray(job?.output) ? job.output[0] : job?.output;
  if (typeof value !== "string" || !isTrustedReplicateUrl(value)) {
    throw new Error("Provider did not return an approved video asset.");
  }
  return value;
}

export async function renderPaidVideo(
  request: { userId: number; requestKey: string; prompt: string; durationSeconds: number;
    mode?: "silent_mp4" | "narrated_mp4"; narration?: string },
): Promise<{ objectKey: string; provider: string }> {
  const mode = request.mode ?? "silent_mp4";
  if (!paidVideoAvailable(mode)) throw new Error("Paid video, narration provider, or permanent storage is not configured.");
  if ((mode === "narrated_mp4" && (!request.narration?.trim() || request.narration.length > 500)) ||
      (mode === "silent_mp4" && request.narration)) {
    throw new Error("The requested video and narration mode do not match.");
  }
  if (!Number.isSafeInteger(request.userId) || request.userId < 1 ||
      !/^[a-f0-9-]{36}$/i.test(request.requestKey) ||
      !Number.isSafeInteger(request.durationSeconds) ||
      request.durationSeconds < 2 || request.durationSeconds > 10) {
    throw new Error("Invalid video rendering request.");
  }
  // Verify the voice provider first; no silent fallback when narration was paid for.
  const narrationAudio = mode === "narrated_mp4"
    ? await synthesizePaidNarration(request.narration!) : null;
  const token = process.env.REPLICATE_API_TOKEN!;
  const createResponse = await fetch(MODEL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      input: {
        prompt: request.prompt.slice(0, 1000),
        duration: request.durationSeconds,
        aspect_ratio: "16:9",
      },
    }),
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  });
  let prediction = await readApiResponse(createResponse);
  if (prediction?.status !== "succeeded") {
    const pollingUrl = prediction?.urls?.get;
    if (typeof pollingUrl !== "string" || !isTrustedReplicateUrl(pollingUrl) ||
        new URL(pollingUrl).hostname !== "api.replicate.com") {
      throw new Error("Video provider returned an invalid polling URL.");
    }
    for (let i = 0; i < 15; i++) {
      if (["failed", "canceled", "cancelled"].includes(prediction?.status)) {
        throw new Error("Video provider could not complete the job.");
      }
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const response = await fetch(pollingUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
      prediction = await readApiResponse(response);
      if (prediction?.status === "succeeded") break;
    }
  }
  if (prediction?.status !== "succeeded") throw new Error("Video provider timed out.");
  const sourceUrl = extractOutputUrl(prediction);
  const download = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000), redirect: "error" });
  if (!download.ok) throw new Error("Generated video could not be retrieved.");
  const sourceBytes = await readBoundedMedia(download, MAX_MP4_BYTES);
  if (!hasMp4Header(sourceBytes)) throw new Error("Provider returned a non-MP4 asset.");
  const bytes = narrationAudio
    ? await combineVideoAndNarration(sourceBytes, narrationAudio, request.durationSeconds)
    : sourceBytes;
  const { bucket, client } = videoClient();
  const objectKey = `video/${request.userId}/${request.requestKey}.mp4`;
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket, Key: objectKey, Body: bytes,
      ContentType: "video/mp4",
      Metadata: { source: "replicate", mode },
    }), { abortSignal: AbortSignal.timeout(30000) });
  } finally {
    client.destroy();
  }
  return { objectKey, provider: mode === "narrated_mp4" ? "Replicate WAN 2.1 + ElevenLabs + FFmpeg" : "Replicate WAN 2.1" };
}

/**
 * Read-only private object-store preflight; no paid generation, upload, or
 * customer content. Used by the manual staging readiness workflow.
 */
export async function checkPrivateVideoStorage(): Promise<boolean> {
  const { bucket, client } = videoClient();
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }), {
      abortSignal: AbortSignal.timeout(10000),
    });
    return true;
  } finally {
    client.destroy();
  }
}

/**
 * Read only a server-derived, owner-scoped object key; no arbitrary bucket
 * name, URL or object path is accepted from the client.
 */
export async function readPaidVideoAsset(
  userId: number, requestKey: string,
): Promise<Uint8Array> {
  const { bucket, client } = videoClient();
  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: `video/${userId}/${requestKey}.mp4`,
    }), { abortSignal: AbortSignal.timeout(30000) });
    if (response.ContentLength && response.ContentLength > MAX_MP4_BYTES) {
      throw new Error("Stored video exceeds size limit.");
    }
    if (!response.Body) throw new Error("Video object missing.");
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      const data = Buffer.from(chunk);
      total += data.length;
      if (total > MAX_MP4_BYTES) throw new Error("Stored video exceeds size limit.");
      chunks.push(data);
    }
    const bytes = Buffer.concat(chunks, total);
    if (!hasMp4Header(bytes)) throw new Error("Stored video is not a valid MP4.");
    return bytes;
  } finally {
    client.destroy();
  }
}
