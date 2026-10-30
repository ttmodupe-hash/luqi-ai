import {describe,it,expect} from 'vitest';
import {businessProfile,businessWrite,businessModeration,publicBusiness,businessSearch,businessSearchText} from '../contracts/businessConnect';
import {businessDedupeKey} from '../api/services/businessConnectStore';
import {businessFixture,ownedBusinessFixture} from './fixtures/business-connect';
import {runtimeTableContracts} from '../db/runtimeSchema';
import {expectedWebRuntimeGrants} from '../db/runtimeRole';
describe('Business Connect consent and public disclosure',()=>{
  it('accepts a home-based trader without precise location and hides private names and contacts',()=>{
    const b=ownedBusinessFixture();expect(businessProfile.safeParse(b.profile).success).toBe(true);
    const p=publicBusiness(b),serialized=JSON.stringify(p);
    expect(p.contacts).toEqual({whatsapp:'+27 82 555 0102'});expect(p.publicPoint).toBeNull();
    for(const value of ['Private Sewing Enterprise','private-owner@example.invalid','+27 82 555 0101','ownerAuthority','owner_id'])expect(serialized).not.toContain(value);
    b.profile.consent.contacts=false;b.profile.contacts.preferred='none';expect(publicBusiness(b).contacts).toEqual({});
  });
  it.each(['home_based','mobile','service_area'] as const)('rejects residential pins/addresses for %s even with purported consent',kind=>{
    for(const change of [{publicPoint:{latitude:-25.6,longitude:28.1}},{publicAddress:'Private home 123'},{landmark:'My home gate'}]){
      expect(businessProfile.safeParse({...businessFixture(),kind,...change,consent:{...businessFixture().consent,exactLocation:true}}).success).toBe(false);
    }
  });
  it('allows optional owner-approved storefront coordinates without promoting verification',()=>{
    const b=ownedBusinessFixture();b.profile.kind='storefront';b.profile.consent.exactLocation=true;
    b.profile.publicPoint={latitude:-25.6,longitude:28.1};b.profile.publicAddress='Shop 7, public market';
    expect(businessProfile.safeParse(b.profile).success).toBe(true);expect(publicBusiness(b).verification.locationReview).toBe('unreviewed');
    expect(businessProfile.safeParse({...b.profile,publicPoint:{latitude:0,longitude:0}}).success).toBe(false);
    b.profile.consent.exactLocation=false;expect(publicBusiness({...b,profile:{...b.profile,publicPoint:null,publicAddress:''}}).publicAddress).toBe('');
    expect(businessProfile.safeParse(b.profile).success).toBe(false);
  });
  it('blocks owner spoofing, verification fields, passwords, photos and invalid municipal/province combinations',()=>{
    const p=businessFixture();
    for(const input of [{...p,ownerId:3},{...p,verified:true},{...p,photos:['data:image/png;base64,abc']},{...p,password:'secret'},
      {...p,province:'WC'},{...p,consent:{...p.consent,storage:false}},{...p,consent:{...p.consent,externalSharing:true}},
      {...p,tradingName:'<script>alert(1)</script>'},{...p,description:'Hidden \u202eauthority spoof'},
      {...p,contacts:{...p.contacts,website:{value:'javascript:alert(1)',public:true}}},
      {...p,contacts:{...p.contacts,website:{value:'https://user:secret@public.example',public:true}}}]){
      expect(businessProfile.safeParse(input).success).toBe(false);
    }
    expect(businessWrite.safeParse({expectedRevision:0,profile:p,ownerId:99}).success).toBe(false);
  });
  it('supports multilingual descriptions, overnight hours and safe search without private contact matching',()=>{
    const p=businessFixture();p.hours[0]={...p.hours[0],opens:'18:00',closes:'02:00',overnight:true};
    expect(businessProfile.safeParse(p).success).toBe(true);expect(businessSearchText(p)).toContain('diaparo');
    expect(businessSearchText(p)).not.toContain(p.contacts.email.value);expect(businessSearchText(p)).not.toContain(p.ownerConfirmedName.toLowerCase());
    expect(businessProfile.safeParse({...p,translations:[...p.translations,...p.translations]}).success).toBe(false);
    expect(businessSearch.safeParse({q:'%',page:'-1'}).success).toBe(false);expect(businessSearch.safeParse({q:'Mabopane',page:'1'}).success).toBe(true);
  });
  it('requires real reviewer attestation and prevents GPS-derived or owner-set verification',()=>{
    const base={expectedRevision:2,confirm:true,decision:'approve',reason:'checked',contactConfirmed:false,locationReview:'unreviewed',method:'content_only',attested:true};
    expect(businessModeration.safeParse(base).success).toBe(true);
    for(const extra of [{attested:false},{contactConfirmed:true},{locationReview:'point_reviewed',method:'business_contact'},{providerListing:'google_verified'}]){
      expect(businessModeration.safeParse({...base,...extra}).success).toBe(false);
    }
  });
  it('normalizes duplicate names without disclosing an existing private claim',()=>{
    expect(businessDedupeKey(businessFixture('Mama’s Sewing'))).toBe(businessDedupeKey(businessFixture('MAMAS-sewing')));
    expect(businessDedupeKey(businessFixture())).not.toBe(businessDedupeKey({...businessFixture(),locality:'Soshanguve'}));
  });
  it('does not add mandatory startup tables or runtime grants until separately enabled',()=>{
    const tables=runtimeTableContracts({}),grants=expectedWebRuntimeGrants({});
    expect(Object.keys(tables).some(k=>k.includes('business'))).toBe(false);expect(Object.keys(grants).some(k=>k.includes('business'))).toBe(false);
    const enabled={LUQI_BUSINESS_CONNECT_ENABLED:'true'};
    expect(Object.keys(runtimeTableContracts(enabled)).length).toBe(Object.keys(tables).length+4);
    expect(expectedWebRuntimeGrants(enabled).luqi_business_audit_v1).toBe('SELECT, INSERT, DELETE');
  });
});
