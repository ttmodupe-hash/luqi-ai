export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  region: string;
}

const SOUTH_AFRICAN_REGION = "South Africa (11 Official)";
const PAN_AFRICA_REGION = "Pan-Africa";
const GLOBAL_REGION = "Global";

export const LANGUAGES: LanguageInfo[] = [
  { code: "en-ZA", name: "English", nativeName: "English", region: SOUTH_AFRICAN_REGION },
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans", region: SOUTH_AFRICAN_REGION },
  { code: "zu", name: "isiZulu", nativeName: "isiZulu", region: SOUTH_AFRICAN_REGION },
  { code: "xh", name: "isiXhosa", nativeName: "isiXhosa", region: SOUTH_AFRICAN_REGION },
  { code: "nso", name: "Sepedi", nativeName: "Sesotho sa Leboa", region: SOUTH_AFRICAN_REGION },
  { code: "st", name: "Sesotho", nativeName: "Sesotho", region: SOUTH_AFRICAN_REGION },
  { code: "tn", name: "Setswana", nativeName: "Setswana", region: SOUTH_AFRICAN_REGION },
  { code: "ss", name: "siSwati", nativeName: "siSwati", region: SOUTH_AFRICAN_REGION },
  { code: "ve", name: "Tshivenda", nativeName: "Tshivenḓa", region: SOUTH_AFRICAN_REGION },
  { code: "ts", name: "Xitsonga", nativeName: "Xitsonga", region: SOUTH_AFRICAN_REGION },
  { code: "nr", name: "isiNdebele", nativeName: "isiNdebele", region: SOUTH_AFRICAN_REGION },
  { code: "sw", name: "Kiswahili", nativeName: "Kiswahili", region: PAN_AFRICA_REGION },
  { code: "yo", name: "Yorùbá", nativeName: "Yorùbá", region: PAN_AFRICA_REGION },
  { code: "ig", name: "Igbo", nativeName: "Igbo", region: PAN_AFRICA_REGION },
  { code: "ha", name: "Hausa", nativeName: "Hausa", region: PAN_AFRICA_REGION },
  { code: "am", name: "Amharic", nativeName: "አማርኛ", region: PAN_AFRICA_REGION },
  { code: "so", name: "Somali", nativeName: "Soomaali", region: PAN_AFRICA_REGION },
  { code: "rw", name: "Kinyarwanda", nativeName: "Ikinyarwanda", region: PAN_AFRICA_REGION },
  { code: "fr", name: "French", nativeName: "Français", region: GLOBAL_REGION },
  { code: "pt", name: "Portuguese", nativeName: "Português", region: GLOBAL_REGION },
  { code: "es", name: "Spanish", nativeName: "Español", region: GLOBAL_REGION },
  { code: "ar", name: "Arabic", nativeName: "العربية", region: GLOBAL_REGION },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", region: GLOBAL_REGION },
  { code: "zh", name: "Chinese", nativeName: "中文", region: GLOBAL_REGION },
  { code: "ja", name: "Japanese", nativeName: "日本語", region: GLOBAL_REGION },
];

const DEFAULT_LANGUAGE = LANGUAGES[0];

export function getStoredLanguage(): LanguageInfo {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem("luqi_language");
    if (!stored) return DEFAULT_LANGUAGE;
    const parsed = JSON.parse(stored) as Partial<LanguageInfo>;
    return LANGUAGES.find((language) => language.code === parsed.code) || DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function setStoredLanguage(language: LanguageInfo): void {
  if (typeof window === "undefined") return;
  const knownLanguage = LANGUAGES.find((item) => item.code === language.code);
  if (!knownLanguage) return;
  try {
    window.localStorage.setItem("luqi_language", JSON.stringify(knownLanguage));
  } catch {
    // Language remains active for the current component session.
  }
  window.dispatchEvent(new CustomEvent("luqi:language-changed", { detail: { language: knownLanguage } }));
}
