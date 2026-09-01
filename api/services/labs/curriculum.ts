// =====================================================================
// PAN-AFRICAN & GLOBAL CURRICULUM REGISTRY
// Maps 6 African countries + China, Europe, USA to their frameworks
// =====================================================================

export interface CurriculumFramework {
  key: string;
  countryCode: string;
  countryName: string;
  region: string;
  primaryHigh: string;
  tvetUniversity: string;
  accreditationBody: string;
  languages: string[];
  currencySymbol: string;
}

export const CURRICULUM_REGISTRY: Record<string, Omit<CurriculumFramework, "key">> = {
  SOUTH_AFRICA_CAPS: {
    countryCode: "ZA",
    countryName: "South Africa",
    region: "southern_africa",
    primaryHigh: "DBE CAPS / Umalusi Matric Standard (Grades R-12)",
    tvetUniversity: "DHET TVET Nated (N1-N6) & CHE Higher Education Framework",
    accreditationBody: "Umalusi / DHET",
    languages: ["English", "Afrikaans", "isiZulu", "isiXhosa"],
    currencySymbol: "R",
  },
  KENYA_CBC: {
    countryCode: "KE",
    countryName: "Kenya",
    region: "east_africa",
    primaryHigh: "CBC (Competency Based Curriculum) & KICD Standards",
    tvetUniversity: "TVETA TVET Framework & CUE University Standards",
    accreditationBody: "KICD / TVETA",
    languages: ["English", "Kiswahili"],
    currencySymbol: "KSh",
  },
  NIGERIA_NERDC: {
    countryCode: "NG",
    countryName: "Nigeria",
    region: "west_africa",
    primaryHigh: "NERDC National Curriculum & WAEC SSCE Standard",
    tvetUniversity: "NBTE TVET Framework & NUC University Standards",
    accreditationBody: "NERDC / NBTE / WAEC",
    languages: ["English", "Hausa", "Yoruba", "Igbo"],
    currencySymbol: "₦",
  },
  GHANA_NACCA: {
    countryCode: "GH",
    countryName: "Ghana",
    region: "west_africa",
    primaryHigh: "NaCCA Standards-Based Curriculum & WASSCE",
    tvetUniversity: "CTVET TVET Framework & GTEC University Standards",
    accreditationBody: "NaCCA / CTVET",
    languages: ["English"],
    currencySymbol: "₵",
  },
  RWANDA_REB: {
    countryCode: "RW",
    countryName: "Rwanda",
    region: "east_africa",
    primaryHigh: "REB Competence-Based Curriculum & Cambridge O/A Levels",
    tvetUniversity: "RTB TVET Framework & HEC University Standards",
    accreditationBody: "REB / RTB",
    languages: ["English", "French", "Kinyarwanda"],
    currencySymbol: "FRw",
  },
  ZIMBABWE_ZIMSEC: {
    countryCode: "ZW",
    countryName: "Zimbabwe",
    region: "southern_africa",
    primaryHigh: "ZIMSEC O & A Level Curriculum Framework",
    tvetUniversity: "HEXCO TVET Standards & ZIMCHE University Framework",
    accreditationBody: "ZIMSEC / HEXCO",
    languages: ["English", "Shona", "Ndebele"],
    currencySymbol: "Z$",
  },
  GERMANY_ABITUR: {
    countryCode: "DE",
    countryName: "Germany",
    region: "global",
    primaryHigh: "Kultusministerkonferenz (KMK) Abitur / MINT Excellence Network",
    tvetUniversity: "German Dual VET Apprenticeship (Ausbildung) & TU9",
    accreditationBody: "KMK / TU9 / DAAD",
    languages: ["German", "English"],
    currencySymbol: "€",
  },
  UK_CAMBRIDGE: {
    countryCode: "GB",
    countryName: "United Kingdom",
    region: "global",
    primaryHigh: "Cambridge Assessment International Education (CAIE) A-Levels & Oxford IB Diploma",
    tvetUniversity: "UK Russell Group TEF Standards & Pearson BTEC HND/HNC",
    accreditationBody: "Ofqual / Pearson / Cambridge",
    languages: ["English"],
    currencySymbol: "£",
  },
  RUSSIA_MIPT: {
    countryCode: "RU",
    countryName: "Russia",
    region: "global",
    primaryHigh: "Russian Federal State Educational Standard (FGOS) & State Physics Olympiad",
    tvetUniversity: "Moscow Institute of Physics & Technology (MIPT) / Skolkovo Innovation Centre",
    accreditationBody: "Ministry of Education RF / MIPT",
    languages: ["Russian", "English"],
    currencySymbol: "₽",
  },
  JAPAN_SSH: {
    countryCode: "JP",
    countryName: "Japan",
    region: "global",
    primaryHigh: "Super Science High School (SSH) Framework & MEXT Course of Study",
    tvetUniversity: "National Institute of Technology (KOSEN) & University of Tokyo Engineering",
    accreditationBody: "MEXT / JABEE",
    languages: ["Japanese", "English"],
    currencySymbol: "¥",
  },
  CHINA_NATIONAL: {
    countryCode: "CN",
    countryName: "China",
    region: "global",
    primaryHigh: "Chinese National Curriculum (Gaokao) & MOE STEM Standards",
    tvetUniversity: "National Vocational Education Standards & C9 League Universities",
    accreditationBody: "MOE / C9 League",
    languages: ["Chinese", "English"],
    currencySymbol: "¥",
  },
  EUROPE_CAMBRIDGE: {
    countryCode: "EU",
    countryName: "Europe",
    region: "global",
    primaryHigh: "Cambridge International (CAIE) & International Baccalaureate (IB)",
    tvetUniversity: "European Credit Transfer System (ECTS) & Bologna Process",
    accreditationBody: "Cambridge / IBO / EU Commission",
    languages: ["English", "French", "German", "Portuguese"],
    currencySymbol: "€",
  },
  USA_ABET: {
    countryCode: "US",
    countryName: "United States",
    region: "global",
    primaryHigh: "Common Core / Next Generation Science Standards (NGSS)",
    tvetUniversity: "ABET Engineering Accreditation Rules & NSF STEM Architecture",
    accreditationBody: "ABET / NGSS",
    languages: ["English"],
    currencySymbol: "$",
  },
};

export function getFramework(key: string): CurriculumFramework {
  const fw = CURRICULUM_REGISTRY[key] || CURRICULUM_REGISTRY.SOUTH_AFRICA_CAPS;
  return { ...fw, key };
}

export function listAfricanFrameworks(): CurriculumFramework[] {
  return Object.entries(CURRICULUM_REGISTRY)
    .filter(([, f]) => f.region !== "global")
    .map(([key, f]) => ({ ...f, key }));
}

export function listAllFrameworks(): CurriculumFramework[] {
  return Object.entries(CURRICULUM_REGISTRY).map(([key, f]) => ({ ...f, key }));
}
