/**
 * Browser-local, source-grounded steps for an official opportunity directory.
 * This does NOT verify an individual vacancy, determine personal eligibility,
 * browse the web, or file an application. Curated from official public guides.
 */
import { ZA_OPPORTUNITY_SOURCES, type OpportunitySource } from './opportunity-sources';

export const VERIFICATION_GUIDE_REVIEWED_ON = '2026-10-28';
export const VERIFICATION_GUIDE_RECHECK_AFTER = '2026-11-28';
export const MAX_SOURCE_QUESTION = 280;
export type SourceQuestionKind = 'is-genuine'|'who-qualifies'|'what-documents'|'how-to-apply'|'deadline'|'fees'|'general';
export interface VerificationGuide {
  sourceId: string;
  title: string;
  officialUrl: string;
  sourceType: 'directory'|'dated-notice';
  reviewedOn: string;
  verify: readonly string[];
  eligibility: string;
  documents: string;
  applicationSteps: readonly string[];
  redFlags: readonly string[];
  extraOfficialSources: readonly { name: string; url: string }[];
}
const dpsa = { name: 'DPSA public service vacancy instructions and current Z83', url: 'https://www.dpsa.gov.za/newsroom/psvc/' };
const gov = { name: 'South African Government: employment in the public service', url: 'https://www.gov.za/services/services-residents/world-work/looking-employment/employment-public-service' };
const nsfas = { name: 'NSFAS: how to apply', url: 'https://www.nsfas.org.za/content/how-to-apply.html' };
const generalVerification = [
  'Open the original publisher website. Check the actual department or organisation, not a forwarded poster, chat message or copied advertisement.',
  'Find a named post or programme, its reference or call number, and the official application channel. A directory page alone is not an open vacancy.',
  'Check the publication date, closing date AND closing time on the original notice; a website responding today does not mean applications are accepted today.',
  'Read eligibility, required documents, province or duty station and any accessibility arrangements. Confirm uncertain points directly with the publisher.',
] as const;
const scamSignals = [
  'Never pay a private person to secure a government job or an application slot.',
  'Never share a password, OTP, PIN, full ID number or medical information inside this guide or with an unsolicited recruiter.',
  'Be suspicious of personal-bank-account deposits, unsolicited WhatsApp-only adverts and links that impersonate an agency.',
] as const;
function isGovernment(source:OpportunitySource):boolean {
  return source.category==='government';
}
function isNsfas(source:OpportunitySource):boolean { return source.id==='nsfas-2027'; }
/** Reviewed, conservative source-category steps. No unique job claims. */
export function guideForOpportunity(source:OpportunitySource):VerificationGuide {
  const government=isGovernment(source), funding=isNsfas(source);
  const extraOfficialSources = government ? [dpsa,gov] : funding ? [nsfas] : [];
  const eligibility = government
    ? 'Check each advertised post: qualifications, experience, post reference, department, conditions and whether external candidates may apply. Luqi cannot assess selection or an individual candidate.'
    : funding
      ? 'Check the official NSFAS funding criteria, eligible institution and programme, household-income rules and document requirements. Disability provisions can differ; Luqi does not request or infer disability status or decide eligibility.'
      : 'Read the actual programme or vacancy rules and check the applicant category, qualification, location, dates and any exceptions with its publisher. Luqi cannot decide personal eligibility from this directory.';
  const documents = government
    ? 'Government vacancies generally require the latest Z83 and a CV; each advert may specify how to sign, attach, certify or send supporting documents. Copy the exact reference number from the actual post.'
    : funding
      ? 'Apply through your own myNSFAS account, supply only documents requested by the official portal, and retain your reference. Do not share your password or OTP.'
      : 'Check the original notice for its exact documents, format, account and submission rules. Never send identity or financial documents through this browser-local Luqi guide.';
  const applicationSteps = government ? [
    'Choose the individual post in the latest official public service vacancy circular or departmental careers page.',
    'Read the post-specific closing date and eligibility, then use the current official Z83 and a truthful CV.',
    'Enter the correct post reference and follow the advertising department’s required submission channel before its deadline.',
    'Retain your own application record and contact the advertising department, not DPSA, for post-specific enquiries.',
  ] : funding ? [
    'Open the official NSFAS website and sign in to your own myNSFAS profile.',
    'Confirm the correct application year and its precise closing date; 2027 applications were listed to close on 31 October 2026.',
    'Complete the required application fields and upload supporting documents requested by the official portal.',
    'Submit before the published cutoff, retain the reference, and track progress on the official account.',
  ] : [
    'Choose the actual opportunity or open call on the source organisation’s website.',
    'Confirm that the specific programme is accepting applications and check its eligibility and closing time.',
    'Prepare the documents listed in that notice and submit only through its official application channel.',
    'Save the official acknowledgement or reference and follow up using contact details published by the organisation.',
  ];
  return {
    sourceId:source.id,title:source.title,officialUrl:source.url,sourceType:source.type,
    reviewedOn:VERIFICATION_GUIDE_REVIEWED_ON,
    verify:generalVerification,
    eligibility,documents,applicationSteps,
    redFlags:scamSignals,extraOfficialSources,
  };
}
export function isVerificationGuideCurrent(now:Date=new Date()):boolean {
  const timestamp=now.getTime();
  return Number.isFinite(timestamp) &&
    timestamp >= Date.parse('2026-10-28T00:00:00+02:00') &&
    timestamp <= Date.parse('2026-11-28T23:59:59+02:00');
}
export interface SourceAnswer {
  sourceId:string;
  questionKind:SourceQuestionKind;
  answer:string;
  originalSource:{title:string;url:string};
  reviewedOn:string;
  sourceCheckRequired:true;
}
/** A deterministic local answer grounded only in a fixed official-source entry. */
export function answerOpportunityQuestion(sourceId:unknown,question:unknown,now:Date=new Date()):SourceAnswer|null {
  if(typeof sourceId!=='string'||typeof question!=='string'||!question.trim()||
    question.length>MAX_SOURCE_QUESTION||!isVerificationGuideCurrent(now))return null;
  const source=ZA_OPPORTUNITY_SOURCES.find(v=>v.id===sourceId);
  if(!source)return null;
  const guide=guideForOpportunity(source),q=question.trim().toLowerCase();
  const kind:SourceQuestionKind =
    /\b(deadline|closing|close|when|date|time|expired|still open)\b/u.test(q)?'deadline':
    /\b(scam|real|genuine|legit|authentic|verify|trust|official|fraud)\b/u.test(q)?'is-genuine':
    /\b(eligible|eligibility|qualif|requirements|allowed|who can|income|disab|age)\b/u.test(q)?'who-qualifies':
    /\b(documents|z83|cv|proof|certificate|id|attachments|upload)\b/u.test(q)?'what-documents':
    /\b(pay|cost|fee|charge|otp|password|pin)\b/u.test(q)?'fees':
    /\b(apply|application|submit|send|where|how)\b/u.test(q)?'how-to-apply':'general';
  let answer:string;
  if(kind==='deadline') {
    answer=source.deadline
      ? 'The dated source directory lists '+source.deadline+' for this specific call, but this is not proof the portal is accepting submissions now. Check the publisher’s original notice for the exact closing time, year, changes and any category-specific date.'
      : 'Luqi has not verified a closing date for an individual opportunity at this publisher. Open the actual advert or call: the publisher’s directory alone cannot establish an active application window.';
  } else if(kind==='is-genuine') {
    answer=guide.verify.join(' ')+' Confirm suspicious claims with the official organisation; Luqi cannot certify a screenshot or recruiter by looking at this directory.';
  } else if(kind==='who-qualifies') {
    answer=guide.eligibility;
  } else if(kind==='what-documents') {
    answer=guide.documents;
  } else if(kind==='fees') {
    answer='Government job and NSFAS applications do not require paying a private recruiter. Never share your OTP, password or PIN. For other funding or services, read the official programme’s published fee rules before deciding.';
  } else if(kind==='how-to-apply') {
    answer=guide.applicationSteps.join(' ');
  } else {
    answer='I can explain how to verify this source, check requirements, prepare documents, identify the closing date and apply through the official channel. This is reviewed local guidance, not a live personalised eligibility or vacancy finding.';
  }
  return {sourceId:source.id,questionKind:kind,answer,
    originalSource:{title:source.title,url:source.url},
    reviewedOn:VERIFICATION_GUIDE_REVIEWED_ON,sourceCheckRequired:true};
}
