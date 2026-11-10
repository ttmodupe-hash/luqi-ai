/** Source navigation only: no inferred ward, party affiliation or live leadership. */
export default function CivicWardGuide() {
  const links = [
    ['Party directory and official party websites','https://www.gov.za/links/political-parties-organisations-0','Read each party’s own manifesto as its stated position, rather than independent proof of an outcome. This directory is not a complete Luqi encyclopedia.'],
    ['IEC election and by-election results','https://results.elections.org.za/','Compare the correct election, ballot, ward and declaration date. A seat result does not establish today’s mayor or governing coalition.'],
    ['Municipal Demarcation Board','https://www.demarcation.org.za/','Check the applicable boundary edition and effective date. A highway or township can cross several wards and municipalities.'],
    ['Tshwane official ward councillor directory','https://www.tshwane.gov.za/?page_id=17228','For a Tshwane location, confirm the ward and current representative with the municipality. This is a Tshwane-specific channel, not national coverage.'],
    ['Constitution: political rights','https://www.gov.za/documents/constitution/chapter-2-bill-rights','Section 19 protects political choice and participation. Luqi does not recommend a party or collect voting preferences.'],
    ['Municipal Structures Act','https://www.gov.za/documents/local-government-municipal-structures-act','Use the applicable amended legislation and municipal procedures to check responsibilities; a councillor is not a personal guarantee of service delivery.'],
    ['Auditor-General records','https://www.agsa.co.za/','Use a dated audit for its municipality and financial year. An audit outcome alone does not prove a party caused a particular service-delivery result.'],
  ];
  return <section aria-labelledby="civic-ward-guide-title" className="my-6 min-w-0 rounded-xl border border-slate-500 bg-slate-950 p-4 text-slate-100" style={{overflowWrap:'anywhere'}}>
    <h2 id="civic-ward-guide-title" className="text-xl font-bold">Party and ward verification guide</h2>
    <p className="my-3">Official-source guide reviewed 9 November 2026. Links are not continuously monitored. Current ward, councillor and governing coalition are not inferred from a route preview or device location.</p>
    <p className="my-3">Use the same evidence standard for every party, including smaller parties and independents. Separate manifesto promises, independently documented contributions, election results and current office-holders. A constructive contribution needs a dated record, a clear attribution and any relevant joint participants or limitations.</p>
    <ol className="space-y-3">{links.map(([title,url,note])=><li key={url}><a className="inline-flex min-h-12 items-center text-cyan-200 underline" href={url} target="_blank" rel="noopener noreferrer">{title}</a><p>{note}</p></li>)}</ol>
    <p className="mt-4">To verify a place: establish the municipality and boundary edition, identify the ward from official boundaries, check the IEC result and then confirm current representation and leadership with the municipality. Use council notices and minutes for changes after an election. Luqi does not request your identity number, store a political profile or transmit location from this guide.</p>
  </section>;
}
