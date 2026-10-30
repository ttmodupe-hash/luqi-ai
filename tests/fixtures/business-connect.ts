import type { BusinessProfile, OwnedBusiness } from '../../contracts/businessConnect';
export function businessFixture(name='Mabopane Sewing Studio'):BusinessProfile {
  return {ownerConfirmedName:'Private Sewing Enterprise',tradingName:name,categories:['repairs'],description:'Clothing repairs and school uniform alterations.',
    descriptionLanguage:'en',translations:[{language:'tn',description:'Re roka diaparo le go baakanya diaparo tsa sekolo.'}],
    services:[{name:'School uniform repairs',price:'From R50'}],province:'GP',municipality:'City of Tshwane Metropolitan Municipality',
    locality:'Mabopane',kind:'home_based',serviceArea:'Mabopane and Soshanguve',deliveryRadiusKm:10,publicAddress:'',landmark:'',publicPoint:null,
    contacts:{phone:{value:'+27 82 555 0101',public:false},whatsapp:{value:'+27 82 555 0102',public:true},email:{value:'private-owner@example.invalid',public:false},website:{value:'',public:false},preferred:'whatsapp'},
    hours:['mon','tue','wed','thu','fri','sat','sun'].map(day=>({day:day as BusinessProfile['hours'][number]['day'],closed:day==='sun',opens:'08:00',closes:'18:00',overnight:false})),
    languages:['en','tn'],accessibility:['delivery'],consent:{version:'2026-10-30.v1',storage:true,ownerAuthority:true,publicListing:true,contacts:true,exactLocation:false}};
}
export function ownedBusinessFixture(name?:string):OwnedBusiness {
  return {id:'4f147685-bad5-46dd-8520-1167d22bd41a',revision:1,state:'draft',profile:businessFixture(name),
    verification:{ownerApproved:false,contactConfirmed:false,locationReview:'unreviewed',providerListing:'not_checked'},updatedAt:'2026-10-30T12:00:00.000000Z'};
}
