/**
 * Curated original-publisher destinations for Luqi Local Pulse.
 * These are directory links, NOT fetched headlines, live stream integrations,
 * station endorsements, verified events or licensed audio reproductions.
 */
export const PULSE_REVIEWED_ON = "30 October 2026";
export const PULSE_RECHECK_BY = "2026-12-15";

export type PulseRegion = "all" | "GP" | "WC" | "other";
export type PulseKind = "all" | "talk" | "news" | "languages";
export type PublisherRegion = "GP" | "WC" | "ZA";

export type PulseSource = {
  id: string;
  name: string;
  publisher: string;
  region: PublisherRegion;
  kind: Exclude<PulseKind, "all">;
  languages: string;
  description: string;
  url: string;
  action: string;
};

export const PULSE_SOURCES: readonly PulseSource[] = [
  {
    id: "702", name: "702", publisher: "Primedia", region: "GP", kind: "talk",
    languages: "English",
    description: "Gauteng talk radio: public affairs, interviews, civic questions and consumer conversations.",
    url: "https://www.primediaplus.com/station/702/",
    action: "Open 702 on Primedia+",
  },
  {
    id: "capetalk", name: "CapeTalk", publisher: "Primedia", region: "WC", kind: "talk",
    languages: "English",
    description: "Western Cape talk radio with community, public-service and current-affairs discussions.",
    url: "https://www.primediaplus.com/station/capetalk/",
    action: "Open CapeTalk on Primedia+",
  },
  {
    id: "safm", name: "SAfm", publisher: "SABC", region: "ZA", kind: "talk",
    languages: "English",
    description: "National public-service talk radio. Find the broadcaster's stations and listening options.",
    url: "https://www.sabc.co.za/sabc/radio/",
    action: "Find SAfm on SABC Radio",
  },
  {
    id: "kaya959", name: "Kaya 959", publisher: "Kaya 959", region: "GP", kind: "talk",
    languages: "English and multilingual discussions",
    description: "Gauteng programmes and original podcasts covering business, personal finance and daily issues.",
    url: "https://www.kaya959.co.za/podcasts/",
    action: "Browse Kaya 959 podcasts",
  },
  {
    id: "ewn", name: "Eyewitness News", publisher: "EWN / Primedia", region: "ZA", kind: "news",
    languages: "English",
    description: "Original news reporting connected to 702, CapeTalk and wider South African developments.",
    url: "https://www.ewn.co.za/latest",
    action: "Browse EWN's latest reporting",
  },
  {
    id: "sabc-news", name: "SABC News", publisher: "SABC", region: "ZA", kind: "news",
    languages: "English and broadcaster language services",
    description: "Original national and provincial reporting by South Africa's public broadcaster.",
    url: "https://www.sabcnews.com/sabcnews/",
    action: "Browse SABC News",
  },
  {
    id: "sabc-languages", name: "SABC African-language radio", publisher: "SABC", region: "ZA", kind: "languages",
    languages: "Multiple South African languages",
    description: "Discover SABC's African-language radio stations on the official broadcaster directory.",
    url: "https://www.sabc.co.za/sabc/radio/",
    action: "Explore SABC language stations",
  },
] as const;

export const PULSE_REGIONS: readonly {value: PulseRegion; label: string}[] = [
  {value:"all",label:"All South Africa"},
  {value:"GP",label:"Gauteng"},
  {value:"WC",label:"Western Cape"},
  {value:"other",label:"Other provinces (national sources)"},
];

export const PULSE_KINDS: readonly {value: PulseKind; label: string}[] = [
  {value:"all",label:"All trusted publishers"},
  {value:"talk",label:"Talk radio & podcasts"},
  {value:"news",label:"Newsrooms"},
  {value:"languages",label:"African-language radio"},
];

export const PULSE_TOPICS = [
  "Municipal water, electricity and service changes",
  "Jobs, internships and skills opportunities",
  "Consumer rights and public accountability",
  "Local business, grants and funding",
  "Travel, roads and community information",
] as const;

export const PULSE_LANGUAGES = ["English","isiZulu","isiXhosa","Setswana","Afrikaans"] as const;

export function filterPulseSources(region: PulseRegion, kind: PulseKind, search: string): PulseSource[] {
  const words = search.trim().toLocaleLowerCase().slice(0, 100).split(/\s+/u).filter(Boolean);
  return PULSE_SOURCES.filter(source =>
    (region === "all" || source.region === "ZA" || (region !== "other" && source.region === region)) &&
    (kind === "all" || source.kind === kind) &&
    words.every(word =>
      [source.name, source.publisher, source.description, source.languages, source.region]
        .join(" ").toLocaleLowerCase().includes(word)
    )
  );
}

/** A question to COPY and review, never automatically submitted to paid AI. */
export function pulseQuestion(
  sourceId: string,
  topic: (typeof PULSE_TOPICS)[number],
  language: (typeof PULSE_LANGUAGES)[number],
  region: PulseRegion,
): string {
  const source = PULSE_SOURCES.find(item => item.id === sourceId) ?? PULSE_SOURCES[0]!;
  const location = PULSE_REGIONS.find(item => item.value === region)?.label ?? "South Africa";
  return [
    "Luqi, help me understand recent reporting about " + topic.toLowerCase() + " in " + location + ".",
    "I want to check the original reporting from " + source.name + ": " + source.url,
    "Please distinguish verified facts from presenters' or callers' opinions; check the current date,",
    "refer me to primary government or municipal notices where appropriate, and say when something cannot be confirmed.",
    "Explain in " + language + " if you can. Do not assume an incident or opportunity exists just because I selected this topic.",
  ].join(" ");
}
