import { z } from "zod";
import historyJson from "../data/omega/african_history.json";
import heritageJson from "../data/omega/heritage_archive.json";
import iksJson from "../data/omega/iks_archive.json";

/**
 * Curated public educational content from ttmodupe-hash/omega-super-ai.
 * We NEVER import account, credential, payment, or private health records.
 * No external AI call or database fallback can silently invent an entry.
 */
export const archiveKinds = ["history", "heritage", "iks"] as const;
export type ArchiveKind = (typeof archiveKinds)[number];

const nonBlank = z.string().trim().min(1);
const cited = z.array(nonBlank).min(2);

const historyEntry = z.object({
  id: nonBlank, title: nonBlank, category: nonBlank, region: nonBlank,
  start_year: z.number().int().nullable(), period: nonBlank,
  summary: nonBlank, significance: nonBlank, sources: cited,
});
const heritageEntry = z.object({
  id: nonBlank, tradition: nonBlank, title: nonBlank, era: nonBlank,
  region: nonBlank, summary: nonBlank, key_points: z.array(nonBlank).min(1),
  primary_sources: cited, scholarly_note: z.string().optional(),
  see_also: z.array(z.string()).optional(),
});
const iksEntry = z.object({
  id: nonBlank, category: nonBlank, title: nonBlank, latin_name: nonBlank,
  region: nonBlank, summary: nonBlank, traditional_use: z.array(nonBlank).min(1),
  modern_research_note: nonBlank, cautions: z.array(nonBlank).min(1),
  key_points: z.array(nonBlank).min(1),
  sources: cited, vernacular_names: z.array(nonBlank).optional(),
  scam_alert: z.string().optional(), see_also: z.array(z.string()).optional(),
});

const historyData = z.object({
  version: nonBlank, updated: nonBlank, description: nonBlank,
  categories: z.array(nonBlank).min(1), regions: z.array(nonBlank).min(1),
  entries: z.array(historyEntry).min(1),
}).parse(historyJson);
const heritageData = z.object({
  name: nonBlank, version: nonBlank, updated: nonBlank, description: nonBlank,
  disclaimer: nonBlank, traditions: z.array(nonBlank).min(1),
  entries: z.array(heritageEntry).min(1),
}).parse(heritageJson);
const iksData = z.object({
  name: nonBlank, version: nonBlank, updated: nonBlank, description: nonBlank,
  disclaimer: nonBlank, guardrails: z.array(nonBlank).min(1),
  categories: z.array(nonBlank).min(1), entries: z.array(iksEntry).min(1),
}).parse(iksJson);

const repoUrl = "https://github.com/ttmodupe-hash/omega-super-ai";
const sources: Record<ArchiveKind, string> = {
  history: "core/data/african_history.json",
  heritage: "core/data/heritage_archive.json",
  iks: "core/data/iks_archive.json",
};

/** This is the source's bibliography, not independent external verification. */
export const editorialNote =
  "Imported educational source catalogue from OMEGA Super AI. Bibliographic references " +
  "are preserved but have not been independently verified for this LUQI release. " +
  "Use the cited works to check claims; contested history remains open to scholarly review.";
export const traditionalKnowledgeNote =
  "Historical ethnobotanical documentation only, never individual medical advice, diagnosis, " +
  "prescriptions, dosing or proof of efficacy. Respect community intellectual-property rights; " +
  "consult qualified healthcare professionals for health decisions.";

export type CuratedSummary = {
  id: string;
  archive: ArchiveKind;
  title: string;
  topic: string;
  region: string;
  summary: string;
  period?: string;
  year?: number | null;
  referenceCount: number;
};

export type CuratedDetail = CuratedSummary & {
  references: string[];
  description: string;
  caution?: string[];
  researchNote?: string;
  scholarlyNote?: string;
  keyPoints?: string[];
  traditionalUse?: string[];
  vernacularNames?: string[];
  seeAlso?: string[];
  sourcePath: string;
  sourceVersion: string;
  editorialNote: string;
  traditionalKnowledgeNote?: string;
};

function ensureValidIndex(archive: ArchiveKind, entries: CuratedDetail[]) {
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.id)) throw new Error(`Duplicate ${archive} entry: ${e.id}`);
    if (!e.references.every((r) => r.trim()) || e.references.length < 2) {
      throw new Error(`Unsourced ${archive} entry: ${e.id}`);
    }
    if (e.archive === "iks" && (!e.caution?.length || !e.researchNote)) {
      throw new Error(`Ethnobotanical entry missing safety context: ${e.id}`);
    }
    seen.add(e.id);
  }
  return entries;
}

const entries: Record<ArchiveKind, CuratedDetail[]> = {
  history: ensureValidIndex("history", historyData.entries.map((e) => ({
    id: e.id, archive: "history", title: e.title, topic: e.category,
    region: e.region, summary: e.summary, period: e.period, year: e.start_year,
    referenceCount: e.sources.length, references: e.sources,
    description: e.significance, sourcePath: sources.history,
    sourceVersion: historyData.version, editorialNote,
  }))),
  heritage: ensureValidIndex("heritage", heritageData.entries.map((e) => ({
    id: e.id, archive: "heritage", title: e.title, topic: e.tradition,
    region: e.region, summary: e.summary, period: e.era,
    referenceCount: e.primary_sources.length, references: e.primary_sources,
    description: e.summary, keyPoints: e.key_points, scholarlyNote: e.scholarly_note,
    seeAlso: e.see_also, sourcePath: sources.heritage,
    sourceVersion: heritageData.version, editorialNote,
  }))),
  iks: ensureValidIndex("iks", iksData.entries.map((e) => ({
    id: e.id, archive: "iks", title: e.title, topic: e.category,
    region: e.region, summary: e.summary,
    referenceCount: e.sources.length, references: e.sources,
    description: e.summary, keyPoints: e.key_points,
    researchNote: e.modern_research_note, caution: [
      ...e.cautions, ...(e.scam_alert ? [e.scam_alert] : []),
    ], traditionalUse: e.traditional_use, vernacularNames: e.vernacular_names,
    seeAlso: e.see_also, sourcePath: sources.iks,
    sourceVersion: iksData.version, editorialNote, traditionalKnowledgeNote,
  }))),
};

const allEntries = archiveKinds.flatMap((kind) => entries[kind]);

export function omegaArchiveOverview() {
  return {
    sourceRepository: repoUrl,
    license: "MIT (copyright © 2026 Luqi-AI Consortium)",
    editorialNote,
    entryCount: allEntries.length,
    archives: [
      { kind: "history" as const, count: entries.history.length,
        version: historyData.version, updated: historyData.updated,
        description: historyData.description, sourcePath: sources.history },
      { kind: "heritage" as const, count: entries.heritage.length,
        version: heritageData.version, updated: heritageData.updated,
        description: heritageData.description, sourcePath: sources.heritage,
        disclaimer: heritageData.disclaimer },
      { kind: "iks" as const, count: entries.iks.length,
        version: iksData.version, updated: iksData.updated,
        description: iksData.description, sourcePath: sources.iks,
        disclaimer: iksData.disclaimer, guardrails: iksData.guardrails },
    ],
  };
}

const stopWords = new Set([
  "the", "and", "for", "with", "from", "that", "this", "what",
  "when", "where", "was", "were", "how", "why", "are", "who",
  "is", "of", "in", "on", "an", "to", "tell", "about", "show",
]);

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en");
}

function rank(entry: CuratedDetail, terms: string[]): number {
  if (!terms.length) return 0;
  const title = normalize(entry.title);
  const topic = normalize(entry.topic + " " + entry.region);
  const searchable = normalize([
    entry.title, entry.topic, entry.region, entry.summary, entry.description,
    entry.period ?? "", entry.researchNote ?? "", entry.scholarlyNote ?? "",
    ...(entry.keyPoints ?? []), ...(entry.vernacularNames ?? []),
  ].join(" "));
  return terms.reduce((score, word) => score + (
    title.includes(word) ? 5 : topic.includes(word) ? 3 : searchable.includes(word) ? 1 : 0
  ), 0);
}

export type ArchiveListInput = {
  archive?: ArchiveKind;
  topic?: string;
  query?: string;
  limit?: number;
  offset?: number;
  timeline?: boolean;
};

export function listOmegaArchive(input: ArchiveListInput = {}) {
  const pool = input.archive ? entries[input.archive] : allEntries;
  const topic = input.topic ? normalize(input.topic.trim()) : "";
  const terms = (input.query ?? "").normalize("NFKC").toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 2 && !stopWords.has(word));
  const found = pool
    .filter((e) => !topic || normalize(e.topic) === topic)
    .map((entry) => ({ entry, score: rank(entry, terms) }))
    .filter(({ score }) => !input.query?.trim() || score > 0)
    .sort((a, b) => input.timeline
      ? (a.entry.year ?? 9999) - (b.entry.year ?? 9999) ||
        a.entry.title.localeCompare(b.entry.title)
      : terms.length
        ? b.score - a.score || a.entry.title.localeCompare(b.entry.title)
        : a.entry.title.localeCompare(b.entry.title));
  const offset = Math.min(Math.max(input.offset ?? 0, 0), 300);
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  return {
    total: found.length,
    entries: found.slice(offset, offset + limit).map(({ entry }) => ({
      id: entry.id, archive: entry.archive, title: entry.title, topic: entry.topic,
      region: entry.region, summary: entry.summary,
      period: entry.period, year: entry.year, referenceCount: entry.referenceCount,
    })),
    editorialNote,
    ...(input.archive === "iks" || !input.archive
      ? { traditionalKnowledgeNote } : {}),
  };
}

export function getOmegaArchiveDetail(archive: ArchiveKind, id: string) {
  return entries[archive].find((e) => e.id === id) ?? null;
}
