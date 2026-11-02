import{describe,it,expect}from'vitest';
import{CURATED_TENDER_NOTICES}from'../src/lib/tender-sources';
import{EMPTY_TENDER_DRAFT,EMPTY_TENDER_APPROVALS,TENDER_HUMAN_GATES,assessTenderDraft,buildTenderWorksheet,detectTenderDocumentMentions,tenderDraftFileName}from'../src/lib/tender-workflow';
const notice=CURATED_TENDER_NOTICES.find(x=>x.id==='ekurhuleni-ps-redp17')!;
const now=new Date('2026-10-29T09:00:00+02:00');
const draft={...EMPTY_TENDER_DRAFT,supplierName:'Example Consulting (test)',
 tenderReference:'PS-REDP 17-2026',scopeResponse:'Programme design, delivery and support',
 deliveryApproach:'A documented implementation plan',pastExperience:'Two actual prior completed projects (subject to evidence)',
 pricingSummary:'Budget assumptions, exclusions and taxes checked',offeredTotalZar:'120000',submissionMethod:'physical' as const};
const approved={...EMPTY_TENDER_APPROVALS,readOriginal:true,checkedEligibility:true,approvedSupplierFacts:true,
 approvedPrice:true,signedOfficialForms:true,reviewedMethodAndDeadline:true,authorisedRelease:true};
describe('90% assistance with mandatory human bid control',()=>{
 it('never conflates an automatic draft with application submission, signing or offer acceptance',()=>{
  expect(assessTenderDraft(notice,draft,EMPTY_TENDER_APPROVALS,now)).toMatchObject({status:'human-review-required',submissionConnected:false});
  expect(assessTenderDraft(notice,draft,approved,now)).toMatchObject({status:'ready-for-manual-submission',submissionConnected:false});
  expect(TENDER_HUMAN_GATES).toHaveLength(7);
 });
 it('keeps issuer reference, pricing and original method as non-negotiable checks',()=>{
  expect(assessTenderDraft(notice,{...draft,tenderReference:'fake'},approved,now).status).toBe('missing-draft');
  expect(assessTenderDraft(notice,{...draft,offeredTotalZar:'-3'},approved,now).status).toBe('missing-draft');
  expect(assessTenderDraft(notice,{...draft,submissionMethod:'confirm-original'},approved,now).status).toBe('missing-draft');
 });
 it('refuses missed compulsory briefings, expired deadlines and stale original-source checks',()=>{
  const missed=CURATED_TENDER_NOTICES.find(x=>x.id==='tshwane-gpm04')!;
  expect(assessTenderDraft(missed,draft,approved,now).status).toBe('check-briefing');
  expect(assessTenderDraft(notice,draft,approved,new Date('2026-12-01T09:00:00+02:00')).status).toBe('withdrawn-or-expired');
  expect(assessTenderDraft(notice,draft,approved,new Date('2026-11-10T09:00:00+02:00')).missing.some(m=>m.includes('older than 48 hours'))).toBe(true);
 });
 it('produces a purely local worksheet, NOT an official SBD or a submitted tender',()=>{
  const text=buildTenderWorksheet(notice,draft,approved,now);
  expect(text).toContain('NOT AN OFFICIAL TENDER FORM');
  expect(text).toContain('Luqi has NOT applied');
  expect(text).toContain(notice.officialUrl);
  expect(text).toContain('Final tender submission');
  expect(tenderDraftFileName(notice)).toMatch(/^luqi-tender-preparation-/);
 });
 it('extracts cautious requirement hints without uploading or claiming completeness',()=>{
  expect(detectTenderDocumentMentions('Complete SBD 1, SBD 4, MBD 6.1, CSD, CIDB. Compulsory briefing.'))
   .toEqual(expect.arrayContaining(['SBD/MBD 1 (invitation)','SBD/MBD 4 (declarations)','CIDB eligibility','Possibly compulsory briefing / site visit']));
  expect(detectTenderDocumentMentions('x'.repeat(6001))).toEqual([]);
 });
});
