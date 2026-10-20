import { GoogleGenAI } from '@google/genai';
import { resolveGeminiApiKey } from '../lib/apiKeyResolver';

const getGemini = () => {
  const apiKey = resolveGeminiApiKey() || process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || undefined,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

export interface ConsumerDisputePayload {
  issueType:
    | 'DEFECTIVE_GOODS'
    | 'UNFAIR_CANCELLATION'
    | 'ONLINE_SCAM'
    | 'UNAUTHORIZED_DEBIT_ORDER'
    | 'POPIA_DATA_BREACH'
    | 'TELCO_BILLING_DISPUTE'
    | 'MASHONISA_ILLEGAL_LOAN'
    | 'DEBT_REVIEW_TRAP';
  rawDescription: string;
  businessName: string;
  purchaseDate?: string;
  amountInvolvedZar?: number;
  userLanguage?: string;
}

export interface ConsumerActionPlanResult {
  summaryOfRights: string;
  applicableSection: string;
  recommendedSteps: string[];
  formalDemandLetter: string;
  escalationBody: string;
}

export class ConsumerRightsSovereignEngine {
  /**
   * Analyzes a consumer grievance, cites the exact legal protection, and drafts a formal Demand Letter.
   */
  public static async generateConsumerActionPlan(payload: ConsumerDisputePayload): Promise<ConsumerActionPlanResult> {
    const systemInstruction = `You are Luqi-AI Consumer Rights & Legal Protections Advisor, built specifically for South Africa and the African continent.
Your mission is to empower everyday consumers against corporate unfairness, scams, predatory lending, and unlawful business practices without hustle.

LEGAL GROUNDING (SOUTH AFRICA FOCUS):
- Consumer Protection Act (CPA) No. 68 of 2008:
  * Section 55 & 56: Implied warranty of quality. Within 6 months of delivery/purchase, if goods fail or are defective, the consumer has the absolute right to return them for repair, replacement, or a FULL REFUND of purchase price. The supplier cannot force store credit or charge unreasonable inspection/restocking fees.
  * Section 47: Over-selling and unfulfilled prepaid orders. Supplier must refund with interest if unable to supply goods.
  * Section 16 & 20: 5-day cooling-off period for direct marketing; rights to return unsafe or defective goods.
  * Section 17 & Regulation 5: Unreasonable cancellation penalties. Suppliers cannot charge exorbitant cancellation fees.
- National Credit Act (NCA) No. 34 of 2005:
  * Section 40: Unregistered credit providers (Mashonisas). Retaining someone's ID book, bank card, or SASSA card/PIN is a criminal offense under the NCA and National Credit Amendment Act. Unregistered credit agreements with unlawful interest are void and unenforceable.
  * Section 86 & Form 16: Debt review protections. Warning against rogue agencies marketing "debt clearance" and locking consumers into credit bureau blacklists without informed consent.
  * DebiCheck & Unauthorized Debit Orders: Mandate cancellation rights and immediate reversal at the bank within 40 days.
- Protection of Personal Information Act (POPIA) No. 4 of 2013:
  * Direct marketing spam without opt-in consent; right to object under Section 11(3); right to request deletion of personal information.
- Relevant Ombud channels:
  * National Consumer Commission (NCC) & Consumer Goods and Services Ombud (CGSO)
  * Ombudsman for Banking Services (OBSSA)
  * Credit Ombud
  * FAIS Ombud (Financial Advisory & Intermediary Services)
  * ICASA Complaints and Compliance Committee (telecoms/ISPs)
  * SAPS & National Credit Regulator (NCR) for criminal extortion/loan sharks.

CRITICAL RULES:
1. Zero Hallucination: Cite exact, true legal sections. Never invent laws.
2. Actionable Output: Always provide a ready-to-send formal Demand Letter / Notice template that the user can copy, paste, and email to the business with placeholders for dates, reference numbers, and contact details.
3. Language & Tone: Empathetic, sharp, professional, and firm. If requested in Sepitori, Setswana, isiZulu, or English, match the tone appropriately.`;

    const userPrompt = `Analyze this consumer dispute and generate a structured legal defense plan and a formal Demand Letter:
- Dispute Category: ${payload.issueType}
- Business / Entity Name: ${payload.businessName}
- Date of Transaction: ${payload.purchaseDate || 'Recent'}
- Amount Involved: R${payload.amountInvolvedZar || 0}
- Description: ${payload.rawDescription}
- Preferred Language Track: ${payload.userLanguage || 'English'}

Return a clean JSON object containing:
1. "summaryOfRights": Plain-language explanation of what the law says the consumer is entitled to.
2. "applicableSection": The exact section of the CPA or relevant legislation (e.g., "CPA Section 56").
3. "recommendedSteps": Step-by-step actions the user must take (array of strings).
4. "formalDemandLetter": A complete, copy-pasteable formal legal letter addressed to the business with placeholders for dates and names.
5. "escalationBody": Where to report them if they ignore the letter (e.g., NCC, CGSO, Banking Ombud, ICASA, or NCR/SAPS).`;

    try {
      const ai = getGemini();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.summaryOfRights && parsed.formalDemandLetter) {
        return parsed as ConsumerActionPlanResult;
      }
      throw new Error('Incomplete JSON response from Gemini');
    } catch (err: any) {
      console.warn('[ConsumerRightsEngine] AI generation failed or fallback triggered:', err?.message);
      return this.generateDeterministicFallback(payload);
    }
  }

  /**
   * High-accuracy deterministic fallback ensuring zero failure even offline.
   */
  private static generateDeterministicFallback(payload: ConsumerDisputePayload): ConsumerActionPlanResult {
    const business = payload.businessName || 'The Supplier';
    const amount = payload.amountInvolvedZar ? `R${payload.amountInvolvedZar.toFixed(2)}` : 'the paid amount';
    const today = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

    switch (payload.issueType) {
      case 'MASHONISA_ILLEGAL_LOAN':
        return {
          summaryOfRights:
            'Under Section 40 of the National Credit Act (NCA) and the National Credit Amendment Act, retaining someone’s ID book, bank card, or SASSA card/PIN as collateral for a loan is a criminal offense. Unregistered lenders charging exorbitant interest are operating illegally, and such credit agreements are legally unlawful and void.',
          applicableSection: 'National Credit Act No. 34 of 2005 — Section 40 & Criminal Retention Offense',
          recommendedSteps: [
            'Do NOT surrender your card PIN or allow anyone to retain your identity documents.',
            'Demand the immediate return of your physical card/ID document.',
            'If the lender refuses or threatens you, report the matter immediately to the South African Police Service (SAPS) for criminal extortion.',
            'Lodge a formal illegal credit provider complaint with the National Credit Regulator (NCR) at 0860 627 627 or info@ncr.org.za.',
          ],
          formalDemandLetter: `FORMAL NOTICE OF UNLAWFUL RETENTION OF IDENTITY/BANKING INSTRUMENT\n\nTo: ${business}\nDate: ${today}\n\nRE: DEMAND FOR IMMEDIATE RETURN OF RETAINED PROPERTY (NCA COMPLIANCE)\n\nI hereby demand the immediate return of my personal property (ID Book / Smart ID / Bank Card / SASSA Card) currently in your possession.\n\nPlease take notice that under the National Credit Act No. 34 of 2005 and the National Credit Amendment Act, it is a criminal offense to retain a consumer’s identity document, bank card, or PIN as collateral or security for credit. Furthermore, unregistered credit agreements with unlawful interest rates are void and unenforceable.\n\nYou are required to return my property within twenty-four (24) hours of receipt of this notice. Failure to do so will result in an immediate criminal complaint of extortion and theft filed at the nearest South African Police Service (SAPS) station, alongside an investigation referral to the National Credit Regulator (NCR).\n\nYours faithfully,\n[Your Name]\n[Your Contact Number]`,
          escalationBody: 'National Credit Regulator (NCR) (0860 627 627) and the South African Police Service (SAPS)',
        };

      case 'DEBT_REVIEW_TRAP':
        return {
          summaryOfRights:
            'Under NCA Section 86, a consumer can only be placed under debt review if they gave informed, voluntary written consent via Form 16 after a comprehensive over-indebtedness assessment. Rogue agencies that mislead consumers or process debt review without consent act unlawfully, and consumers have the right to challenge fraudulent bureau flags.',
          applicableSection: 'National Credit Act No. 34 of 2005 — Section 86 & NCR Debt Review Guidelines',
          recommendedSteps: [
            'Request your full signed Form 16 file and repayment restructuring proposal from the agency.',
            'Verify if a Magistrate Court order has already been granted.',
            'If you were misled or did not sign consent, lodge an urgent complaint with the National Credit Regulator (NCR) to investigate fraudulent listing.',
            'Approach the National Consumer Tribunal (NCT) or an attorney to have the unlawful debt review flag rescinded from the credit bureaus.',
          ],
          formalDemandLetter: `DEMAND FOR COPIES OF SIGNED FORM 16 & DISPUTE OF UNCONSENTED DEBT REVIEW\n\nTo: Compliance Officer, ${business}\nDate: ${today}\n\nRE: FORMAL DISPUTE OF DEBT REVIEW LISTING / REQUEST FOR PROOF OF MANDATE\n\nI have discovered that my profile has been listed under Debt Review with the credit bureaus under your practice reference.\n\nI hereby formally dispute this listing. I never gave informed, voluntary consent to be placed under debt review, nor was a lawful over-indebtedness assessment conducted in accordance with Section 86 of the National Credit Act.\n\nI require you to provide within five (5) business days:\n1. A clear, certified copy of my signed Form 16 application.\n2. Proof of fee disclosure and accredited Payment Distribution Agency (PDA) mandate.\n3. The status of any court application under your reference.\n\nShould you fail to furnish proof of lawful consent, I will lodge a formal complaint with the National Credit Regulator (NCR) and approach the National Consumer Tribunal for an order compelling the immediate removal of the debt review flag from all credit bureaus.\n\nYours faithfully,\n[Your Name]\n[ID Number]\n[Contact Details]`,
          escalationBody: 'National Credit Regulator (NCR) (info@ncr.org.za) & National Consumer Tribunal (NCT)',
        };

      case 'UNFAIR_CANCELLATION':
        return {
          summaryOfRights:
            'Under Section 17 of the Consumer Protection Act (CPA), a consumer has the right to cancel an advance reservation, booking, or order. The supplier may only charge a reasonable cancellation penalty, calculated based on the nature of goods/services and the likelihood of finding an alternative consumer. Exorbitant or 100% forfeiture clauses are unlawful under CPA Regulation 5.',
          applicableSection: 'Consumer Protection Act (CPA) No. 68 of 2008 — Section 17 & Regulation 5',
          recommendedSteps: [
            'Send this formal dispute letter disputing the cancellation penalty as unreasonable.',
            'Request a transparent breakdown of the supplier’s actual administrative loss.',
            'Give the business 10 business days to refund the balance owed.',
            'If unresolved, escalate to the Consumer Goods and Services Ombud (CGSO).',
          ],
          formalDemandLetter: `FORMAL NOTICE OF DISPUTED CANCELLATION PENALTY\n\nTo: Customer Accounts / Management, ${business}\nDate: ${today}\n\nRE: DISPUTE OF UNREASONABLE CANCELLATION PENALTY UNDER CPA SECTION 17\n\nDear Management,\n\nI write to formally dispute the cancellation fee of ${amount} imposed regarding my cancellation with your establishment.\n\nUnder Section 17 of the Consumer Protection Act No. 68 of 2008, while a supplier may charge a cancellation fee, that penalty must be reasonable. It cannot be exorbitant, punitive, or result in total forfeiture where the business suffered no equivalent loss or had reasonable opportunity to secure an alternative booking or customer.\n\nI hereby demand that you adjust the penalty to reflect reasonable direct administrative costs and refund the remaining balance of ${amount} to my account within seven (7) business days.\n\nFailing resolution, I will lodge a formal complaint with the Consumer Goods and Services Ombud (CGSO) and the National Consumer Commission.\n\nYours faithfully,\n[Your Name]\n[Banking Details for Refund]`,
          escalationBody: 'Consumer Goods and Services Ombud (CGSO) and National Consumer Commission (NCC)',
        };

      case 'ONLINE_SCAM':
        return {
          summaryOfRights:
            'Under CPA Section 47 (unfulfilled orders) and the Electronic Communications and Transactions Act (ECTA Section 43/44), online consumers are entitled to full disclosure of the supplier’s physical address, registration, and refund policy, as well as a 7-day cooling-off period. Failure to deliver paid goods constitutes a breach of contract and potential common law fraud.',
          applicableSection: 'CPA Section 47 & Electronic Communications and Transactions Act (ECTA) Section 43',
          recommendedSteps: [
            'Contact your bank immediately to request an urgent debit/card chargeback or fraud reversal.',
            'Gather all payment receipts, WhatsApp chats, and social media handles.',
            'Lodge a criminal case of theft and fraud with SAPS to receive a Case Number (CAS Number).',
            'Report the domain/account to the National Consumer Commission and the Internet Service Providers Association (ISPA).',
          ],
          formalDemandLetter: `FINAL DEMAND FOR IMMEDIATE REFUND OF UNDELIVERED MERCHANDISE\n\nTo: ${business}\nDate: ${today}\n\nRE: FORMAL DEMAND FOR REFUND OF ${amount} — UNDELIVERED ORDER\n\nTake notice that on recent dates, I made payment of ${amount} for goods/services ordered through your online channel. To date, you have failed to deliver the purchased goods as agreed.\n\nUnder Section 47 of the Consumer Protection Act, if a supplier fails to supply goods at the agreed date or time, the consumer is entitled to an immediate and complete refund together with interest at the prescribed rate.\n\nI demand the immediate refund of ${amount} into my nominated account within forty-eight (48) hours of this notice. If payment is not received, I will proceed with a criminal fraud complaint at SAPS, notify my bank’s fraud division for account freezing, and report your enterprise to the National Consumer Commission.\n\nYours faithfully,\n[Your Name]\n[Contact Details]`,
          escalationBody: 'South African Police Service (SAPS Fraud Unit) & National Consumer Commission (NCC)',
        };

      case 'UNAUTHORIZED_DEBIT_ORDER':
        return {
          summaryOfRights:
            'Under the National Payment System rules (PASAJ and SARB directives) and the National Credit Act, every debit order requires a valid, verified mandate. Any debit order processed without your signed or voice-recorded mandate is unlawful and must be reversed immediately by your bank within 40 days of transaction.',
          applicableSection: 'SARB National Payment System Directives & NCA Unauthorized Debit Rules',
          recommendedSteps: [
            'Open your banking app or visit a bank branch and reverse the unauthorized debit order immediately (free within 40 days).',
            'Request a stop-order block on the corporate originator code.',
            'Demand that the originating company provide proof of voice-recorded or written mandate.',
            'If the company continues debits, lodge a complaint with the Ombudsman for Banking Services (OBSSA) and the Payments Association of South Africa (PASA).',
          ],
          formalDemandLetter: `DEMAND FOR IMMEDIATE CANCELLATION OF UNAUTHORIZED DEBIT ORDER & MANDATE AUDIT\n\nTo: Billing & Compliance Department, ${business}\nDate: ${today}\n\nRE: DISPUTE OF UNAUTHORIZED DEBIT ORDER OF ${amount}\n\nI have noted an unauthorized debit order of ${amount} processed against my bank account by your entity without my knowledge or consent.\n\nI have never entered into any agreement authorizing your company to debit my account. Under South African banking rules and the Consumer Protection Act, processing debit orders without a verifiable mandate is unlawful.\n\nI hereby demand:\n1. The immediate cancellation of any debit order mandate in your records relating to my account.\n2. A full refund of any deducted funds.\n3. A copy of the purported voice recording or signed agreement authorizing these deductions.\n\nShould unauthorized deductions persist, I will file a formal complaint with the Ombudsman for Banking Services and PASA.\n\nYours faithfully,\n[Your Name]\n[Bank Account Identifier]`,
          escalationBody: 'Ombudsman for Banking Services (OBSSA) (0860 800 900) & Payments Association of SA (PASA)',
        };

      case 'POPIA_DATA_BREACH':
        return {
          summaryOfRights:
            'Under Section 11 & Section 69 of the Protection of Personal Information Act (POPIA), direct marketing via unsolicited electronic communications (SMS, WhatsApp, phone calls) is prohibited unless the consumer has given explicit opt-in consent or is an existing customer who was given a chance to opt out. You have the right to demand the source of your data and the immediate deletion of your records.',
          applicableSection: 'Protection of Personal Information Act (POPIA) No. 4 of 2013 — Section 69',
          recommendedSteps: [
            'Send this formal POPIA Section 69 Cease and Desist notice.',
            'Demand to know the origin and source where they obtained your personal mobile number/email.',
            'Block the number on your handset.',
            'If harassment continues, report the organization directly to the Information Regulator of South Africa (POPIA complaints).',
          ],
          formalDemandLetter: `FORMAL NOTICE UNDER POPIA SECTION 69: CEASE & DESIST DIRECT MARKETING\n\nTo: Information Officer / Management, ${business}\nDate: ${today}\n\nRE: NOTICE TO CEASE UNSOLICITED DIRECT MARKETING & DEMAND FOR DATA DELETION\n\nI refer to unsolicited communications sent to my mobile number/email by your organization.\n\nUnder Section 69 of the Protection of Personal Information Act No. 4 of 2013 (POPIA), direct marketing via electronic communications is unlawful without prior consent. I have never consented to receive marketing from your organization.\n\nI hereby exercise my statutory rights:\n1. To object to the processing of my personal data for direct marketing.\n2. To demand the immediate deletion of all my personal records from your systems.\n3. To be informed of the exact source from which you acquired my personal contact details.\n\nPlease confirm in writing within fourteen (14) days that my details have been purged. Continued non-compliance will be lodged as a formal complaint with the Information Regulator of South Africa.\n\nYours faithfully,\n[Your Name]\n[Contact Info]`,
          escalationBody: 'Information Regulator of South Africa (enquiries@inforegulator.org.za)',
        };

      case 'TELCO_BILLING_DISPUTE':
        return {
          summaryOfRights:
            'Under ICASA regulations and the Consumer Protection Act, telecommunication providers must provide accurate, transparent itemized billing. Consumers cannot be charged for unrequested subscription services (WASP services) or billed for discontinued contracts after giving lawful 20-business-day cancellation notice.',
          applicableSection: 'ICASA End-User and Subscriber Service Charter & CPA Section 14',
          recommendedSteps: [
            'Log an internal dispute reference with the network operator (e.g., Vodacom, MTN, Telkom).',
            'Cancel all third-party WASP and premium content subscriptions via your carrier USSD code.',
            'Give the operator 14 business days to resolve the billing discrepancy.',
            'If not resolved, escalate to the ICASA Complaints and Compliance Committee (CCC).',
          ],
          formalDemandLetter: `FORMAL TELECOMMUNICATIONS BILLING DISPUTE & DEMAND FOR CREDIT\n\nTo: Executive Customer Relations, ${business}\nDate: ${today}\n\nRE: BILLING DISPUTE FOR R${amount} (ACCOUNT/MSISDN: [Your Number])\n\nI am lodging a formal billing dispute regarding charges of ${amount} billed to my account.\n\nIssue Details: ${payload.rawDescription || 'Incorrect billing / unauthorized subscription charges'}.\n\nUnder the ICASA End-User and Subscriber Service Charter and the Consumer Protection Act, I am entitled to fair billing practices and prompt resolution of billing disputes. I demand an immediate investigation, cancellation of any unauthorized charges, and a credit note reflecting ${amount} on my account within seven (7) business days.\n\nIf this dispute is not resolved within the prescribed turnaround period, I will escalate this complaint directly to the ICASA Complaints and Compliance Committee (CCC).\n\nYours faithfully,\n[Your Name]\n[Account / Mobile Number]`,
          escalationBody: 'ICASA Complaints and Compliance Committee (consumer@icasa.org.za)',
        };

      case 'DEFECTIVE_GOODS':
      default:
        return {
          summaryOfRights:
            'Under Section 55 & 56 of the Consumer Protection Act (CPA), you have an implied 6-month statutory warranty on all goods purchased. If goods are defective, fail, or are not fit for their intended purpose within 6 months, you have the absolute legal right to demand a FULL REFUND, a replacement, or a repair. The supplier cannot force you to accept store credit or impose restocking penalties.',
          applicableSection: 'Consumer Protection Act (CPA) No. 68 of 2008 — Section 55 & 56',
          recommendedSteps: [
            'Send this formal letter of demand via email to the store manager or head office.',
            'Attach copies of your till slip, invoice, and photos/videos of the defect.',
            'Specify whether you want a full refund or a replacement unit (the choice belongs to you, not the store).',
            'If the store ignores or rejects your statutory rights after 10 business days, lodge a dispute with the Consumer Goods and Services Ombud (CGSO) or National Consumer Commission (NCC).',
          ],
          formalDemandLetter: `FORMAL LETTER OF DEMAND & STATUTORY NOTICE UNDER CPA SECTION 56\n\nTo: Management / Customer Care, ${business}\nDate: ${today}\n\nRE: NOTICE OF DEFECTIVE GOODS & DEMAND FOR REMEDY UNDER CPA SECTION 56\n\nI purchased goods from your establishment on ${payload.purchaseDate || 'recent dates'} for ${amount}.\n\nDefect Details: ${payload.rawDescription || 'The product is defective and has failed to perform safely and reliably.'}\n\nPlease take notice that under Section 55 and Section 56 of the Consumer Protection Act No. 68 of 2008, all goods sold in South Africa are subject to an implied statutory warranty of quality lasting for six (6) months after delivery.\n\nBecause this defect occurred within the six-month statutory period, Section 56(2) provides me with the legal right to return the goods and choose between a full refund of the purchase price or an immediate replacement.\n\nI hereby exercise my right and demand a full refund / replacement within five (5) business days of this notice. Please note that company policies purporting to restrict remedies to "store credit only" or charging "restocking fees" are unlawful and void under Section 51 of the CPA.\n\nShould you fail to comply, I will immediately escalate this matter to the Consumer Goods and Services Ombud (CGSO) and the National Consumer Commission (NCC).\n\nYours faithfully,\n[Your Name]\n[Contact Details]`,
          escalationBody: 'Consumer Goods and Services Ombud (CGSO) (0860 000 272) & National Consumer Commission (NCC)',
        };
    }
  }
}
