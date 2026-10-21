import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const MAX_MP4_BYTES = 40 * 1024 * 1024;
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
export function paidVideoAvailable(): boolean {
  const key = process.env.REPLICATE_API_TOKEN || "";
  return Boolean(key.length > 10 && !key.includes("mock") && storageSettings());
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
  request: { userId: number; requestKey: string; prompt: string; durationSeconds: number },
): Promise<{ objectKey: string; provider: string }> {
  if (!paidVideoAvailable()) throw new Error("Paid video provider or permanent storage is not configured.");
  if (!Number.isSafeInteger(request.userId) || request.userId < 1 ||
      !/^[a-f0-9-]{36}$/i.test(request.requestKey) ||
      !Number.isSafeInteger(request.durationSeconds) ||
      request.durationSeconds < 2 || request.durationSeconds > 10) {
    throw new Error("Invalid video rendering request.");
  }
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
      });
      prediction = await readApiResponse(response);
      if (prediction?.status === "succeeded") break;
    }
  }
  if (prediction?.status !== "succeeded") throw new Error("Video provider timed out.");
  const sourceUrl = extractOutputUrl(prediction);
  const download = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) });
  if (!download.ok) throw new Error("Generated video could not be retrieved.");
  const declaredLength = Number(download.headers.get("content-length") || "0");
  if (declaredLength > MAX_MP4_BYTES) throw new Error("Generated video exceeds size limit.");
  const bytes = Buffer.from(await download.arrayBuffer());
  if (bytes.length < 1024 || bytes.length > MAX_MP4_BYTES) {
    throw new Error("Generated video is empty, invalid, or too large.");
  }
  // A valid MP4 contains an ftyp brand box in the initial bytes.
  if (bytes.subarray(4, 8).toString("ascii") !== "ftyp") {
    throw new Error("Provider returned a non-MP4 asset.");
  }
  const { bucket, client } = videoClient();
  const objectKey = `video/${request.userId}/${request.requestKey}.mp4`;
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket, Key: objectKey, Body: bytes,
      ContentType: "video/mp4",
      Metadata: { source: "replicate" },
    }));
  } finally {
    client.destroy();
  }
  return { objectKey, provider: "Replicate WAN 2.1" };
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
    }));
    if (response.ContentLength && response.ContentLength > MAX_MP4_BYTES) {
      throw new Error("Stored video exceeds size limit.");
    }
    if (!response.Body) throw new Error("Video object missing.");
    const bytes = await response.Body.transformToByteArray();
    if (bytes.length > MAX_MP4_BYTES) throw new Error("Stored video exceeds size limit.");
    return bytes;
  } finally {
    client.destroy();
  }
}
