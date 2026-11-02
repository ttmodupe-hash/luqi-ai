/** Local heuristics only: flags possible risks; never certifies a sender or law. */
export function inspectForPredatoryScams(value: string): { flagged: boolean; warning?: string } {
  const text = value.normalize('NFKC').replace(/[\u200b-\u200f\u2060\ufeff]/g, '').toLowerCase();
  const rules = [
    { match: /\b(send|share|give|tell|forward|provide|confirm)\b[\s\S]{0,100}\b(pin|otp|password|cvv|one.time (?:pin|password))\b|\bsassa\b[\s\S]{0,60}\b(card|pin)\b/,
      warning: 'Never send PINs, OTPs, passwords or SASSA card details in a message. Verify requests through an independent official channel.' },
    { match: /\b(pay|payment|deposit|fee)\b[\s\S]{0,100}\b(upfront|job|employment|form\s*16|debt.review)\b|\b(job|employment|form\s*16|debt.review)\b[\s\S]{0,100}\b(fee|pay|deposit)\b/,
      warning: 'Possible fee or employment scam. Check the provider and terms independently before paying or sharing documents.' },
    { match: /\b(cipc|sars|sassa)\b[\s\S]{0,100}\b(send money|pay me|personal account|agent fee)\b/,
      warning: 'Possible impersonation. Check the request and current charges through official channels; a display name is not proof of authority.' },
  ];
  for (const rule of rules) if (rule.match.test(text)) return { flagged: true, warning: rule.warning };
  return { flagged: false };
}
