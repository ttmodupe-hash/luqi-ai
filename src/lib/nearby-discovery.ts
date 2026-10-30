import {PROVINCES,type ProvinceCode} from './opportunity-sources';
export function parseProvince(value:unknown):ProvinceCode|null {return typeof value==='string'&&PROVINCES.some(p=>p.id===value)?value as ProvinceCode:null;}
export const NEARBY_CATEGORIES=[{id:'business',label:'Local businesses',query:'businesses'},
 {id:'food',label:'Food & restaurants',query:'restaurants'}, {id:'repairs',label:'Repairs & trades',query:'repairs plumbers electricians'},
 {id:'clinic',label:'Clinics',query:'clinics'}, {id:'tourism',label:'Visitor information',query:'tourist information centres'},
 {id:'support',label:'Public service centres',query:'Thusong service centres'}] as const;
export type NearbyCategory=typeof NEARBY_CATEGORIES[number]['id'];
export type MapProvider='google'|'apple'|'osm';
export function mapDiscoveryLink(provider:MapProvider,category:NearbyCategory,locality:string,province:ProvinceCode|null):string|null {
 const item=NEARBY_CATEGORIES.find(c=>c.id===category),name=PROVINCES.find(p=>p.id===province)?.name;
 const place=locality.trim().replace(/\s+/g,' ');
 // Locality is a deliberate external search term, never a precise GPS fix.
 if(!item||!place||locality.length>80||/[\u0000-\u001f\u007f]/.test(locality))return null;
 const query=encodeURIComponent([item.query,place,name,'South Africa'].filter(Boolean).join(', '));
 if(provider==='google')return 'https://www.google.com/maps/search/?api=1&query='+query;
 if(provider==='apple')return 'https://maps.apple.com/?q='+query;
 if(provider==='osm')return 'https://www.openstreetmap.org/search?query='+query;
 return null;
}
export function provincePath(path:'/opportunities'|'/municipalities'|'/local-pulse',province:ProvinceCode|null){return path+(province?'?province='+province:'');}
