import {describe,expect,it} from 'vitest';
import {strFromU8,unzipSync} from 'fflate';
import {VERIFIED_SBD1,SBD1_FIELDS} from '../src/lib/tender-document-contract';
import {buildTenderOriginalArchive,mappedContactChecklist,tenderDigest,
  ORIGINAL_FORM_GATES,type PreparedTenderPacket,type OriginalFormApprovals} from '../src/lib/tender-document-review';

describe('SBD 1 private partial-export contact checklist',()=>{
  it('lists the seven mapped fields only and treats optional blanks as gaps, not failures',()=>{
    const lines=mappedContactChecklist(['bidderName','email','not-a-form-field']);
    expect(lines.filter(line=>line.startsWith('[x] ')||line.startsWith('[ ] '))).toHaveLength(SBD1_FIELDS.length);
    expect(lines.join(' ')).toContain('[x] Name of bidder: entered in the partial original');
    expect(lines.join(' ')).toContain('[x] Email address: entered in the partial original');
    expect(lines.join(' ')).toContain('[ ] Postal address: left blank; accepted by Luqi partial export');
    expect(lines.join(' ')).toContain('not the complete official form');
    expect(lines.join(' ')).not.toContain('not-a-form-field');
  });

  it('includes gap checks in an approved synthetic ZIP without copying applicant facts into README',async()=>{
    // Deliberately synthetic byte fixtures: not an official form, not an applicant.
    // Exercise only the archive builder's applicant-approved output contract.
    const original=new TextEncoder().encode('SYNTHETIC-ORIGINAL-DATA');
    const filled=new TextEncoder().encode('SYNTHETIC-FILLED-DATA');
    const files=[{name:'original.docx',bytes:original},{name:'filled-sbd1-partial.docx',bytes:filled}];
    const preparedAt='2026-11-13T03:00:00.000Z';
    const context={
      reference:'TEST-REF',issuer:'Synthetic Authority',deadline:'2090-11-13T14:00+02:00',
      method:'physical' as const,destination:'Synthetic tender box',
      priceZar:'123.00',principal:'Synthetic Representative',
    };
    const body={
      format:'luqi.tender.partial-original.v1' as const,
      revision:7,preparedAt,
      template:{id:VERIFIED_SBD1.id,mappingVersion:VERIFIED_SBD1.mappingVersion,
        officialSource:VERIFIED_SBD1.source,sourceCheckedOn:VERIFIED_SBD1.checkedOn},
      context,
      files:[
        {name:'original.docx',sha256:await tenderDigest(original),size:original.length,role:'original' as const},
        {name:'filled-sbd1-partial.docx',sha256:await tenderDigest(filled),size:filled.length,role:'filled-partial' as const},
      ],
      enteredFieldIds:['bidderName','email'],
      status:'partial-form-for-manual-completion' as const,
      submissionConnected:false as const,legallySigned:false as const,
    };
    const packet:PreparedTenderPacket={...body,digest:await tenderDigest(JSON.stringify(body))};
    const approvals=Object.fromEntries(ORIGINAL_FORM_GATES.map(g=>[g.id,true])) as OriginalFormApprovals;
    const archive=await buildTenderOriginalArchive(packet,7,approvals,files,[],new Date('2026-11-13T03:05:00.000Z'));
    const entries=unzipSync(archive);
    const readme=strFromU8(entries['READ-ME.txt']);
    expect(readme).toContain('Mapped SBD 1 supplier contacts only');
    expect(readme).toContain('[x] Name of bidder: entered in the partial original');
    expect(readme).toContain('[ ] Street address: left blank');
    expect(readme).toContain('not the complete official form');
    expect(readme).toContain('This checklist cannot establish which fields your particular issuer requires.');
    expect(readme).not.toContain(context.principal);
    expect(readme).not.toContain(context.priceZar);
    expect(readme).toContain('No document has been sent to any procuring authority.');
    expect(strFromU8(entries['original.docx'])).toBe('SYNTHETIC-ORIGINAL-DATA');
    expect(strFromU8(entries['filled-sbd1-partial.docx'])).toBe('SYNTHETIC-FILLED-DATA');
    expect(JSON.parse(strFromU8(entries['luqi-review-record.json'])).status)
      .toBe('partial-form-for-manual-completion');
  });
});
