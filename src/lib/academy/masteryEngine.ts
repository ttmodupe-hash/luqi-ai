/** Transparent, deterministic study scheduling; no claims of exam readiness from a single quiz. */
export type CertificationTrack = "ccna-200-301-v1.1" | "itil-foundation-v5";
export interface StudyAttempt {
  topicId: string;
  timestamp: string;
  correct: boolean;
  explanationQuality: "none" | "partial" | "clear";
  practicalDemonstration: boolean;
}
export interface StudyPriority {
  topicId: string;
  attempts: number;
  accuracy: number;
  needsPracticalWork: boolean;
  priorityScore: number;
  nextReviewDays: number;
}
export function prioritizeStudy(attempts: StudyAttempt[]): StudyPriority[] {
  const byTopic = new Map<string, StudyAttempt[]>();
  for (const attempt of attempts) {
    if (!attempt.topicId.trim() || !Number.isFinite(Date.parse(attempt.timestamp))) throw new RangeError("Invalid study attempt");
    const items = byTopic.get(attempt.topicId) ?? [];
    items.push(attempt);
    byTopic.set(attempt.topicId, items);
  }
  return [...byTopic.entries()].map(([topicId, items]) => {
    const sorted = [...items].sort((a,b) => Date.parse(a.timestamp)-Date.parse(b.timestamp));
    const correct = sorted.filter(a => a.correct).length;
    const accuracy = correct / sorted.length;
    const recent = sorted.slice(-3);
    const stable = recent.length >= 3 && recent.every(a => a.correct && a.explanationQuality === "clear");
    const needsPracticalWork = !items.some(a => a.practicalDemonstration);
    const last = sorted[sorted.length-1];
    const weakExplanation = last.explanationQuality !== "clear";
    const priorityScore = Math.round(100 * (0.5 * (1-accuracy) + 0.25 * Number(weakExplanation) + 0.25 * Number(needsPracticalWork)));
    return { topicId, attempts: items.length, accuracy, needsPracticalWork, priorityScore, nextReviewDays: stable && !needsPracticalWork ? 7 : last.correct && !weakExplanation ? 3 : 1 };
  }).sort((a,b) => b.priorityScore-a.priorityScore || a.topicId.localeCompare(b.topicId));
}

export interface NetworkNode { id: string; name: string; ipv4: string; maskBits: number; }
export interface NetworkLink { from: string; to: string; }
function parseIpv4(address: string): number {
  const parts = address.split(".");
  if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p) || Number(p) > 255)) throw new RangeError("Invalid IPv4 address");
  return parts.reduce((acc,p) => ((acc << 8) | Number(p)) >>> 0, 0);
}
export function sameSubnet(a: NetworkNode, b: NetworkNode): boolean {
  if (!Number.isInteger(a.maskBits) || a.maskBits < 0 || a.maskBits > 32 || a.maskBits !== b.maskBits) throw new RangeError("Incompatible prefix lengths");
  const mask = a.maskBits === 0 ? 0 : (0xffffffff << (32-a.maskBits)) >>> 0;
  return (parseIpv4(a.ipv4) & mask) === (parseIpv4(b.ipv4) & mask);
}
/** Deliberately limited to a single broadcast domain: no routing, VLANs or protocol emulation. */
export function diagnoseSimpleLan(nodes: NetworkNode[], links: NetworkLink[], source: string, destination: string): string[] {
  const errors: string[] = [];
  const byId = new Map(nodes.map(n => [n.id,n]));
  if (byId.size !== nodes.length) return ["Duplicate node identifiers"];
  if (!byId.has(source) || !byId.has(destination)) return ["Missing source or destination"];
  const adjacency = new Map(nodes.map(n => [n.id, [] as string[]]));
  for (const link of links) {
    if (!byId.has(link.from) || !byId.has(link.to)) { errors.push("Link references unknown node"); continue; }
    adjacency.get(link.from)!.push(link.to);
    adjacency.get(link.to)!.push(link.from);
  }
  const visited = new Set([source]); const queue = [source];
  while (queue.length) for (const neighbor of adjacency.get(queue.shift()!) ?? []) if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
  if (!visited.has(destination)) errors.push("No physical path between endpoints");
  try { if (!sameSubnet(byId.get(source)!,byId.get(destination)!)) errors.push("Endpoints are not in the same IPv4 subnet; routing is not modeled"); }
  catch { errors.push("Invalid or incompatible IPv4 configuration"); }
  return errors;
}
