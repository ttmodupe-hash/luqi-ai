// =====================================================================
// MEDIA PIPELINE — real image generation → real file → real URL
// Provider chain: OpenAI gpt-image-1 (OPENAI_API_KEY) → Gemini Imagen
// (GEMINI_API_KEY). Without either, callers get an honest 503.
//
// Storage: dist/public/generated/ on local disk — served instantly by the
// static middleware. NOTE: Railway's filesystem is ephemeral (files are
// lost on redeploy). To make storage durable, swap saveImage() for an
// S3/R2 upload — the swap point is marked below.
// =====================================================================

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import OpenAI from "openai";

export interface GeneratedImage {
  imageUrl: string;
  provider: "openai" | "google";
  model: string;
}

function generatedDir(): string {
  const dir = path.resolve("dist/public/generated");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveImage(buf: Buffer): string {
  const name = `${crypto.randomUUID()}.png`;
  // ── S3/R2 SWAP POINT ── replace this local write with a PutObject call
  // (and return the CDN URL) when durable object storage is provisioned.
  fs.writeFileSync(path.join(generatedDir(), name), buf);
  return `/generated/${name}`;
}

export function imageProviderAvailable(): boolean {
  const openaiKey = process.env.OPENAI_API_KEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || "";
  return (openaiKey.length > 10 && !openaiKey.includes("mock")) ||
         (geminiKey.length > 10 && !geminiKey.includes("mock"));
}

export async function generateImage(prompt: string): Promise<GeneratedImage | null> {
  const openaiKey = process.env.OPENAI_API_KEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || "";

  // 1. OpenAI gpt-image-1
  if (openaiKey.length > 10 && !openaiKey.includes("mock")) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      const res = await client.images.generate({
        model: "gpt-image-1",
        prompt: prompt.slice(0, 1000),
        size: "1024x1024",
      });
      const b64 = res.data?.[0]?.b64_json;
      if (b64) {
        return { imageUrl: saveImage(Buffer.from(b64, "base64")), provider: "openai", model: "gpt-image-1" };
      }
      const url = res.data?.[0]?.url;
      if (url) {
        const resp = await fetch(url);
        if (resp.ok) {
          return { imageUrl: saveImage(Buffer.from(await resp.arrayBuffer())), provider: "openai", model: "gpt-image-1" };
        }
      }
    } catch (e) {
      console.warn("[Media] OpenAI image generation failed:", (e as Error)?.message);
    }
  }

  // 2. Gemini Imagen
  if (geminiKey.length > 10 && !geminiKey.includes("mock")) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey: geminiKey });
      const res = await client.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: prompt.slice(0, 1000),
        config: { numberOfImages: 1 },
      });
      const imgBytes = res.generatedImages?.[0]?.image?.imageBytes;
      if (imgBytes) {
        return { imageUrl: saveImage(Buffer.from(imgBytes, "base64")), provider: "google", model: "imagen-3.0-generate-002" };
      }
    } catch (e) {
      console.warn("[Media] Gemini image generation failed:", (e as Error)?.message);
    }
  }

  return null;
}
