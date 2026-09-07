// =====================================================================
// LEGAL ANALYZER — real predatory/unfair clause detection
// Deterministic curated lexicon (no AI key required) + optional AI deep
// review when a provider is configured. Every finding carries the matched
// excerpt as evidence, a plain-language explanation, and a legal reference.
// Patterns target South African law context (NCA, BCEA, CPA, POPIA).
// =====================================================================

export type Severity = "safe" | "caution" | "predatory";

export interface LegalFinding {
  id: string;
  title: string;
  severity: Severity;
  excerpt: string;
  explanation: string;
  reference: string;
}

interface LexiconRule {
  id: string;
  title: string;
  severity: Severity;
  pattern: RegExp;
  explanation: string;
  reference: string;
}

const LEXICON: LexiconRule[] = [
  {
    id: "short_cycle_interest",
    title: "Interest charged per week/month (annualizes to extreme APR)",
    severity: "predatory",
    pattern: /(\d{1,2}(?:\.\d+)?)\s*%\s*(per\s*(week|month)|p\.?\s?[wm]\.?|weekly|monthly)/i,
    explanation:
      "A rate quoted per week or month hides a massive annual cost. South Africa's National Credit Act caps what registered lenders may charge — short-cycle pricing is how predatory lenders disguise illegal rates.",
    reference: "National Credit Act 34 of 2005 (cost of credit caps)",
  },
  {
    id: "high_apr",
    title: "Very high stated interest rate",
    severity: "predatory",
    pattern: /(?:APR|annual(ly)?|per\s*annum|p\.?\s?a\.?)[^0-9]{0,12}(\d{2,3}(?:\.\d+)?)\s*%/i,
    explanation:
      "Check this rate against the legal maximum for your loan type. Above roughly 40% APR is beyond what registered lenders may charge in South Africa, and anything above ~25% deserves hard scrutiny.",
    reference: "National Credit Act 34 of 2005",
  },
  {
    id: "acceleration_clause",
    title: "Acceleration clause — one missed payment makes the entire debt due",
    severity: "predatory",
    pattern: /(accelerat|entire (balance|debt|amount|loan)[^.]{0,60}(immediately\s+)?(due|payable))/i,
    explanation:
      "If you miss one payment, the WHOLE remaining loan becomes due instantly. This is one of the most aggressive collection tools and traps borrowers in sudden default.",
    reference: "Common-law contract review — negotiable; ask for a cure period (e.g. 14 days) instead",
  },
  {
    id: "prepayment_penalty",
    title: "Penalty for paying off your debt early",
    severity: "predatory",
    pattern: /((early (repayment|settlement)|prepay)[^.]{0,80}(fee|penalty|charge|cost))/i,
    explanation:
      "You should always be allowed to escape debt early. A fee for early repayment exists to keep you paying interest. In South Africa, early settlement of credit is a right under the NCA.",
    reference: "National Credit Act — right to early settlement",
  },
  {
    id: "wage_assignment",
    title: "Direct assignment of your wages/salary",
    severity: "predatory",
    pattern: /(assign|deduct|attach)[^.]{0,50}(wages|salary|pay\s?check|income)/i,
    explanation:
      "This lets the lender take money straight from your salary before you see it. Courts treat wage assignments for consumer credit as heavily restricted — you may be signing away control of your income.",
    reference: "NCA + wage protection principles",
  },
  {
    id: "confession_of_judgment",
    title: "Confession of judgment — you surrender court defences in advance",
    severity: "predatory",
    pattern: /(confession of judgment|cognovit)/i,
    explanation:
      "You agree IN ADVANCE to lose any court case without a hearing. This is banned or void in many jurisdictions because it removes your right to defend yourself.",
    reference: "Void/unenforceable in many jurisdictions; never sign this",
  },
  {
    id: "arbitration_waiver",
    title: "Forced arbitration / waiver of court rights",
    severity: "caution",
    pattern: /((waive|forfeit|give up|surrender)[^.]{0,50}right to (sue|court|legal action|trial)|binding arbitration[^.]{0,60}(only|exclusive|waive))/i,
    explanation:
      "You give up the option of ordinary courts. Arbitration can be faster, but a clause forcing it as your ONLY option removes your choice. Read what forum and costs it imposes.",
    reference: "Consumer fairness principles",
  },
  {
    id: "auto_renewal",
    title: "Automatic renewal with narrow cancellation window",
    severity: "caution",
    pattern: /(auto(matic)?(ally)?[ -](renew|extend|roll))/i,
    explanation:
      "The contract renews itself unless you cancel inside a small window. Diarize the cancellation date the day you sign, and ask for renewal reminders in writing.",
    reference: "CPA (Consumer Protection Act) — renewal notice expectations",
  },
  {
    id: "unpaid_overtime",
    title: "Unlimited or unpaid overtime",
    severity: "predatory",
    pattern: /((unlimited|as (required|needed))[^.]{0,30}overtime|overtime[^.]{0,40}(without (pay|compensation|additional (pay|compensation))))/i,
    explanation:
      "South Africa's Basic Conditions of Employment Act limits overtime hours and requires compensation. A clause making overtime unlimited and unpaid is not lawful for covered employees.",
    reference: "BCEA 1997 — working time & overtime",
  },
  {
    id: "restraint_of_trade",
    title: "Restraint of trade / non-compete",
    severity: "caution",
    pattern: /(restraint of trade|non-?compete|not (to )?(work|engage)[^.]{0,40}(competitor|competing))/i,
    explanation:
      "This limits where you may work after leaving. SA courts only enforce restraints that are REASONABLE in time, area, and scope. Check the radius and months — 12+ months or wide geography is aggressive.",
    reference: "SA common law — reasonableness test for restraints",
  },
  {
    id: "unilateral_variation",
    title: "They may change the terms without your consent",
    severity: "predatory",
    pattern: /((we|the (company|lender|landlord|employer))\s+(may|can|reserve the right to)\s+(change|vary|amend|modify|alter)[^.]{0,50}(terms|fees|rates|conditions)[^.]{0,30}(without (notice|consent)|at (our|their) (sole )?discretion))/i,
    explanation:
      "One side can rewrite the deal alone, at any time, possibly without telling you. A fair contract requires written notice and your consent for material changes.",
    reference: "CPA — unfair contract terms",
  },
  {
    id: "blank_signing",
    title: "Signing blank or incomplete documents",
    severity: "predatory",
    pattern: /(sign|signing|signature)[^.]{0,40}(blank|incomplete|to be completed later)|____{3,}/,
    explanation:
      "Never sign anything with blank spaces — the terms can be filled in AFTER your signature. Cross out or complete every field first.",
    reference: "Universal contract safety rule",
  },
  {
    id: "data_selling",
    title: "Your personal data may be shared or sold",
    severity: "caution",
    pattern: /(share|sell|transfer|disclose)[^.]{0,40}(personal (data|information))[^.]{0,40}(third part|partner|affiliate)/i,
    explanation:
      "Your personal information can flow to unnamed third parties. Under POPIA you have rights over your data — ask who receives it and opt out where possible.",
    reference: "POPIA (Protection of Personal Information Act)",
  },
  {
    id: "home_security_small_debt",
    title: "Your home secures a small debt",
    severity: "predatory",
    pattern: /(mortgage|security interest|charge|lien)[^.]{0,50}(home|house|property|residence)/i,
    explanation:
      "Putting your home up as security for a small loan risks losing the roof over your head over a minor debt. This disproportion is a classic predatory-lending signal.",
    reference: "NCA proportionality principles",
  },
  {
    id: "guarantor_unlimited",
    title: "Unlimited guarantor liability",
    severity: "caution",
    pattern: /guarantor[^.]{0,80}(all|any|every)[^.]{0,30}(debt|obligation|liabilit|amount)/i,
    explanation:
      "If you are the guarantor, you may be covering EVERYTHING the borrower owes — present and future — without limits. Cap the guarantee to a fixed amount in writing.",
    reference: "Guarantee law — scope limitation",
  },
];

function excerptAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + length + 40);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? "…" : "");
}

export interface LegalAnalysis {
  overallRisk: Severity;
  riskScore: number;
  findings: LegalFinding[];
  analyzedChars: number;
  aiEnhanced: boolean;
  aiReview?: string;
}

export function analyzeContractText(text: string): Omit<LegalAnalysis, "aiEnhanced" | "aiReview"> {
  // Normalize whitespace so patterns match across line wraps in pasted contracts
  const normalized = text.replace(/\s+/g, " ");
  const findings: LegalFinding[] = [];

  for (const rule of LEXICON) {
    const m = rule.pattern.exec(normalized);
    if (m) {
      findings.push({
        id: rule.id,
        title: rule.title,
        severity: rule.severity,
        excerpt: excerptAround(normalized, m.index, m[0].length),
        explanation: rule.explanation,
        reference: rule.reference,
      });
    }
  }

  const score = findings.reduce((sum, f) => sum + (f.severity === "predatory" ? 25 : f.severity === "caution" ? 10 : 0), 0);
  const overallRisk: Severity = findings.some((f) => f.severity === "predatory")
    ? "predatory"
    : findings.some((f) => f.severity === "caution")
      ? "caution"
      : "safe";

  return {
    overallRisk,
    riskScore: Math.min(100, score),
    findings,
    analyzedChars: text.length,
  };
}
