export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region: "South Africa (11 Official)" | "Pan-Africa" | "Global";
}

/** UI language preferences. AI translation still depends on an enabled model provider. */
export const LANGUAGES: LanguageInfo[] = [
  { code:"en", name:"English", nativeName:"English", flag:"🇿🇦", region:"South Africa (11 Official)" },
  { code:"af", name:"Afrikaans", nativeName:"Afrikaans", flag:"🇿🇦", region:"South Africa (11 Official)" },
  { code:"zu", name:"Zulu", nativeName:"isiZulu", flag:"🇿🇦", region:"South Africa (11 Official)" },
  { code:"xh", name:"Xhosa", nativeName:"isiXhosa", flag:"🇿🇦", region:"South Africa (11 Official)" },
  { code:"st", name:"Southern Sotho", nativeName:"Sesotho", flag:"🇿🇦", region:"South Africa (11 Official)" },
  { code:"tn", name:"Tswana", nativeName:"Setswana", flag:"🇿🇦", region:"South Africa (11 Official)" },
  { code:"nso", name:"Northern Sotho", nativeName:"Sepedi", flag:"🇿🇦", region:"South Africa (11 Official)" },
  { code:"ss", name:"Swati", nativeName:"siSwati", flag:"🇿🇦", region:"South Africa (11 Official)" },
  { code:"nr", name:"Southern Ndebele", nativeName:"isiNdebele", flag:"🇿🇦", region:"South Africa (11 Official)" },
  { code:"ve", name:"Venda", nativeName:"Tshivenda", flag:"🇿🇦", region:"South Africa (11 Official)" },
  { code:"ts", name:"Tsonga", nativeName:"itsonga", flag:"🇿🇦", region:"South Africa (11 Official)" },
  { code:"sw", name:"Swahili", nativeName:"Kiswahili", flag:"🌍", region:"Pan-Africa" },
  { code:"yo", name:"Yoruba", nativeName:"Yorùbá", flag:"🇳🇬", region:"Pan-Africa" },
  { code:"ig", name:"Igbo", nativeName:"Igbo", flag:"🇳🇬", region:"Pan-Africa" },
  { code:"ha", name:"Hausa", nativeName:"Hausa", flag:"🌍", region:"Pan-Africa" },
  { code:"am", name:"Amharic", nativeName:"አማርኛ", flag:"🇪🇹", region:"Pan-Africa" },
  { code:"ar", name:"Arabic", nativeName:"العربية", flag:"🌍", region:"Pan-Africa" },
  { code:"fr", name:"French", nativeName:"Français", flag:"🇫🇷", region:"Global" },
  { code:"pt", name:"Portuguese", nativeName:"Português", flag:"🇵🇹", region:"Global" },
  { code:"es", name:"Spanish", nativeName:"Español", flag:"🇪🇸", region:"Global" },
  { code:"zh", name:"Mandarin Chinese", nativeName:"中文", flag:"🇨🇳", region:"Global" },
  { code:"hi", name:"Hindi", nativeName:"हिन्दी", flag:"🇮🇳", region:"Global" },
];

const STORAGE_KEY = "luqi_language";
export function getStoredLanguage(): LanguageInfo {
  try {
    const code = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
  } catch {
    return LANGUAGES[0];
  }
}
export function setStoredLanguage(language: LanguageInfo): void {
  const selected = LANGUAGES.find(({code}) => code === language.code) ?? LANGUAGES[0];
  try {
    localStorage.setItem(STORAGE_KEY, selected.code);
    window.dispatchEvent(new CustomEvent("luqi:language-changed", { detail: { language: selected } }));
  } catch {
    // Unavailable storage does not prevent use of the current selection.
  }
}
