/** Curated official opportunity sources. Listings are NOT proof applications are open.
 * Future live discovery must fetch server-side, verify publisher and deadline, and record checkedAt.
 */
export interface OpportunitySource { id:string; name:string; url:string; region:"pan-african"|"country-specific"; themes:string[]; audience:string; notes:string; }
export const OPPORTUNITY_SOURCES:OpportunitySource[]=[
{id:"tef",name:"Tony Elumelu Foundation Entrepreneurship Programme",url:"https://www.tonyelumelufoundation.org/tef-entrepreneurship-programme",region:"pan-african",themes:["entrepreneurship","funding","mentorship"],audience:"African founders and early-stage businesses",notes:"Annual application cycle. Verify the current intake and eligibility before applying."},
{id:"mastercard",name:"Mastercard Foundation Programmes",url:"https://mastercardfdn.org/en/what-we-do/our-programs/",region:"pan-african",themes:["education","employment","entrepreneurship","funding"],audience:"Young people, learners, entrepreneurs and partner organisations",notes:"Individual programmes have different country coverage and application routes."},
{id:"growth",name:"Mastercard Foundation Africa Growth Fund",url:"https://mastercardfdn.org/en/what-we-do/our-programs/africa-growth-fund/",region:"pan-african",themes:["funding","entrepreneurship"],audience:"African investment vehicles and indirectly eligible SMEs",notes:"Not a general direct grant application for individuals; check fund intermediaries."},
{id:"afdb",name:"African Development Bank Boost Africa",url:"https://www.afdb.org/en/topics-and-sectors/initiatives-partnerships/boost-africa-empowering-young-african-entrepreneurs",region:"pan-african",themes:["entrepreneurship","funding","innovation"],audience:"Entrepreneurial ecosystem, intermediaries and startups",notes:"Programme overview, not a verified current direct application opportunity."},
];
export type OpportunityTheme="all"|"funding"|"entrepreneurship"|"education"|"employment"|"innovation"|"mentorship";
export function findOpportunitySources(theme:OpportunityTheme,term=""):OpportunitySource[]{
 const q=term.trim().toLocaleLowerCase();
 return OPPORTUNITY_SOURCES.filter(s=>(theme==="all"||s.themes.includes(theme))&&(!q||[s.name,s.audience,s.notes,...s.themes].join(" ").toLocaleLowerCase().includes(q)));
}
