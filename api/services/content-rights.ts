/**
 * External learning content may only be ingested after a license review.
 * A publicly accessible URL is NOT proof of permission to republish.
 */
export type ContentLicense = "cc0" | "cc-by-4.0" | "cc-by-sa-4.0" | "proprietary-permission" | "unknown" | "noncommercial";
export type ContentCandidate = {
  title: string;
  sourceUrl: string;
  license: ContentLicense;
  permissionReference?: string;
  attribution?: string;
  commercialUseApproved?: boolean;
  languages: string[];
  subjects: string[];
};

export function reviewContentForCommercialUse(candidate: ContentCandidate): {
  approved: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!/^https:\/\//i.test(candidate.sourceUrl)) reasons.push("Source URL must use HTTPS.");
  if (!candidate.title.trim()) reasons.push("A title is required.");
  if (!candidate.languages.length || !candidate.subjects.length) reasons.push("Language and subject metadata are required.");
  if (candidate.license === "unknown" || candidate.license === "noncommercial") {
    reasons.push("Commercial redistribution rights are not established.");
  }
  if (candidate.license === "proprietary-permission" && !candidate.permissionReference?.trim()) {
    reasons.push("Written permission reference is required.");
  }
  if (candidate.license === "cc-by-4.0" || candidate.license === "cc-by-sa-4.0") {
    if (!candidate.attribution?.trim()) reasons.push("License attribution is required.");
  }
  if (candidate.commercialUseApproved !== true) reasons.push("Human commercial-use approval is required.");
  return { approved: reasons.length === 0, reasons };
}
