// =====================================================================
// PAN-AFRICAN + GLOBAL i18n ENGINE — 21 languages
// =====================================================================

export type SupportedLanguage =
  | "EN" | "ZU" | "XH" | "AF" | "NS" | "TN" | "ST" | "TS" | "SS" | "VE" | "NR" | "SASL"
  | "SW" | "FR" | "PT" | "HA" | "YO" | "IG" | "AM" | "DE" | "RU" | "JA" | "ZH";

export const LANGUAGE_METADATA: Record<SupportedLanguage, { name: string; englishName: string; flag: string; region: string }> = {
  EN: { name: "English", englishName: "English", flag: "🇬🇧", region: "global" },
  ZU: { name: "isiZulu", englishName: "Zulu", flag: "🇿🇦", region: "africa" },
  XH: { name: "isiXhosa", englishName: "Xhosa", flag: "🇿🇦", region: "africa" },
  AF: { name: "Afrikaans", englishName: "Afrikaans", flag: "🇿🇦", region: "africa" },
  NS: { name: "Sepedi", englishName: "Northern Sotho", flag: "🇿🇦", region: "africa" },
  TN: { name: "Setswana", englishName: "Tswana", flag: "🇿🇦", region: "africa" },
  ST: { name: "Sesotho", englishName: "Southern Sotho", flag: "🇿🇦", region: "africa" },
  TS: { name: "Xitsonga", englishName: "Tsonga", flag: "🇿🇦", region: "africa" },
  SS: { name: "siSwati", englishName: "Swati", flag: "🇿🇦", region: "africa" },
  VE: { name: "Tshivenda", englishName: "Venda", flag: "🇿🇦", region: "africa" },
  NR: { name: "isiNdebele", englishName: "Ndebele", flag: "🇿🇦", region: "africa" },
  SASL: { name: "South African Sign Language", englishName: "SASL", flag: "🇿🇦", region: "africa" },
  SW: { name: "Kiswahili", englishName: "Swahili", flag: "🇰🇪", region: "africa" },
  FR: { name: "Français", englishName: "French", flag: "🇫🇷", region: "europe" },
  PT: { name: "Português", englishName: "Portuguese", flag: "🇵🇹", region: "europe" },
  HA: { name: "Hausa", englishName: "Hausa", flag: "🇳🇬", region: "africa" },
  YO: { name: "Yorùbá", englishName: "Yoruba", flag: "🇳🇬", region: "africa" },
  IG: { name: "Igbo", englishName: "Igbo", flag: "🇳🇬", region: "africa" },
  AM: { name: "Amharic", englishName: "Amharic", flag: "🇪🇹", region: "africa" },
  DE: { name: "Deutsch", englishName: "German", flag: "🇩🇪", region: "europe" },
  RU: { name: "Русский", englishName: "Russian", flag: "🇷🇺", region: "europe" },
  JA: { name: "日本語", englishName: "Japanese", flag: "🇯🇵", region: "asia" },
  ZH: { name: "中文", englishName: "Chinese", flag: "🇨🇳", region: "asia" },
};

export const TRANSLATIONS: Record<string, Record<SupportedLanguage, string>> = {
  "ui.controls": {
    EN: "Controls", ZU: "Izilawuli", XH: "Iilawuli", AF: "Kontroles",
    NS: "Ditsamaiso", TN: "Ditsamaiso", ST: "Ditsamaiso", TS: "Ditsamaiso",
    SS: "Ditsamaiso", VE: "Ditsamaiso", NR: "Ditsamaiso", SASL: "[SIGN] Controls",
    SW: "Vidhibiti", FR: "Contrôles", PT: "Controles", HA: "Gudanarwa",
    YO: "Iṣakoso", IG: "Njikwa", AM: "ቁጥጥር", DE: "Steuerung", RU: "Управление", JA: "コントロール", ZH: "控制",
  },
  "ui.procedure": {
    EN: "Procedure", ZU: "Inqubo", XH: "Inkqubo", AF: "Prosedyre",
    NS: "Tsamaiso", TN: "Tsamaiso", ST: "Tsamaiso", TS: "Tsamaiso",
    SS: "Tsamaiso", VE: "Tsamaiso", NR: "Tsamaiso", SASL: "[SIGN] Procedure",
    SW: "Utaratibu", FR: "Procédure", PT: "Procedimento", HA: "Tsari",
    YO: "Ilana", IG: "Usoro", AM: "ሂደት", DE: "Verfahren", RU: "Процедура", JA: "手順", ZH: "程序",
  },
  "ui.results": {
    EN: "Results", ZU: "Imiphumela", XH: "Iiphumela", AF: "Resultate",
    NS: "Diphetho", TN: "Diphetho", ST: "Diphetho", TS: "Diphetho",
    SS: "Diphetho", VE: "Diphetho", NR: "Diphetho", SASL: "[SIGN] Results",
    SW: "Matokeo", FR: "Résultats", PT: "Resultados", HA: "Sakamako",
    YO: "Abajade", IG: "Nsonaazụ", AM: "ውጤቶች", DE: "Ergebnisse", RU: "Результаты", JA: "結果", ZH: "结果",
  },
  "ui.governing_laws": {
    EN: "Governing Laws", ZU: "Imithetho", XH: "Iimithetho", AF: "Beheerwette",
    NS: "Melao", TN: "Melao", ST: "Melao", TS: "Melao",
    SS: "Melao", VE: "Melao", NR: "Melao", SASL: "[SIGN] Governing Laws",
    SW: "Sheria", FR: "Lois", PT: "Leis", HA: "Dokoki",
    YO: "Ofin", IG: "Iwu", AM: "ህጎች", DE: "Gesetze", RU: "Законы", JA: "法則", ZH: "定律",
  },
  "ui.current_state": {
    EN: "Current State", ZU: "Isimo Samanje", XH: "Imeko Yangoku", AF: "Huidige Toestand",
    NS: "Tšhupelo ya Ga Mafia", TN: "Tšhupelo ya Ga Mafia", ST: "Tšhupelo ya Ga Mafia", TS: "Tšhupelo ya Ga Mafia",
    SS: "Tšhupelo ya Ga Mafia", VE: "Tšhupelo ya Ga Mafia", NR: "Tšhupelo ya Ga Mafia", SASL: "[SIGN] Current State",
    SW: "Hali ya Sasa", FR: "État Actuel", PT: "Estado Atual", HA: "Matsayin Yanzu",
    YO: "Ipo Lọwọlọwọ", IG: "Ọnọdụ Ugbu a", AM: "የአሁኑ ሁኔታ", DE: "Aktueller Zustand", RU: "Текущее состояние", JA: "現在の状態", ZH: "当前状态",
  },
  "ui.safety_protocols": {
    EN: "Safety Protocols Active", ZU: "Izindlela Zokuphepha", XH: "Iiprothokhali Zokhuseleko", AF: "Veiligheidsprotokolle",
    NS: "Ditsela tsa Tšhireletšo", TN: "Ditsela tsa Tšhireletšo", ST: "Ditsela tsa Tšhireletšo", TS: "Ditsela tsa Tšhireletšo",
    SS: "Ditsela tsa Tšhireletšo", VE: "Ditsela tsa Tšhireletšo", NR: "Ditsela tsa Tšhireletšo", SASL: "[SIGN] Safety Protocols",
    SW: "Itikadi za Usalama", FR: "Protocoles de Sécurité", PT: "Protocolos de Segurança", HA: "Ka'idojin Tsaro",
    YO: "Awọn Ilana Aabo", IG: "Usoro Nchebe", AM: "የደህንነት ፕሮቶኮሎች", DE: "Sicherheitsprotokolle", RU: "Протоколы безопасности", JA: "安全プロトコル", ZH: "安全协议",
  },
  "ui.all_safe": {
    EN: "All parameters within safe bounds", ZU: "Zonke izilinganiso ziphephile", XH: "Zonke iiparamitha zikumgangatho", AF: "Alle parameters binne veilige perke",
    NS: "Ditsamaiso tšohle di ka mo tšhireletšong", TN: "Ditsamaiso tšohle di ka mo tšhireletšong", ST: "Ditsamaiso tšohle di ka mo tšhireletšong", TS: "Ditsamaiso tšohle di ka mo tšhireletšong",
    SS: "Ditsamaiso tšohle di ka mo tšhireletšong", VE: "Ditsamaiso tšohle di ka mo tšhireletšong", NR: "Ditsamaiso tšohle di ka mo tšhireletšong", SASL: "[SIGN] All Safe",
    SW: "Vigezo vyote viko salama", FR: "Tous les paramètres sont sûrs", PT: "Todos os parâmetros estão seguros", HA: "Dukan tsararraki suna cikin aminci",
    YO: "Gbogbo awọn paramita wa lailewu", IG: "Usoro niile dị nchebe", AM: "ሁሉም መለኪያዎች ደህንነታቸው", DE: "Alle Parameter sicher", RU: "Все параметры в безопасности", JA: "すべてのパラメータが安全です", ZH: "所有参数都在安全范围内",
  },
  "ui.dismiss": {
    EN: "Dismiss", ZU: "Yeka", XH: "Yeka", AF: "Verwerp",
    NS: "Tloha", TN: "Tloha", ST: "Tloha", TS: "Tloha",
    SS: "Tloha", VE: "Tloha", NR: "Tloha", SASL: "[SIGN] Dismiss",
    SW: "Ondoa", FR: "Rejeter", PT: "Dispensar", HA: "Kore",
    YO: "Fagile", IG: "Wepu", AM: "አስወግድ", DE: "Verwerfen", RU: "Отклонить", JA: "却下", ZH: "驳回",
  },
  "ui.back_to_labs": {
    EN: "Back to Labs", ZU: "Buyela Emalabhorethri", XH: "Buyela Emalabhu", AF: "Terug na Labs",
    NS: "Boela Emalabhorethri", TN: "Boela Emalabhorethri", ST: "Boela Emalabhorethri", TS: "Boela Emalabhorethri",
    SS: "Boela Emalabhorethri", VE: "Boela Emalabhorethri", NR: "Boela Emalabhorethri", SASL: "[SIGN] Back to Labs",
    SW: "Rudi kwenye Maabara", FR: "Retour aux Laboratoires", PT: "Voltar aos Laboratórios", HA: "Komawa zuwa Dakunan Gwaji",
    YO: "Pada si Awọn ile-iṣẹ", IG: "Laghachi na Ọlaborate", AM: "ወደ ላቦራቶሪዎች ተመለስ", DE: "Zurück zu den Laboren", RU: "Назад к лабораториям", JA: "ラボに戻る", ZH: "返回实验室",
  },
  "ui.reset_defaults": {
    EN: "Reset to Defaults", ZU: "Setha kabusha", XH: "Seta kwakhona", AF: "Herstel na verstek",
    NS: "Tlhoma botlhe", TN: "Tlhoma botlhe", ST: "Tlhoma botlhe", TS: "Tlhoma botlhe",
    SS: "Tlhoma botlhe", VE: "Tlhoma botlhe", NR: "Tlhoma botlhe", SASL: "[SIGN] Reset",
    SW: "Weka upya", FR: "Réinitialiser", PT: "Redefinir", HA: "Sake saita",
    YO: "Tunṣe", IG: "Tọgharia", AM: "ዳግም አስጀምር", DE: "Zurücksetzen", RU: "Сбросить", JA: "リセット", ZH: "重置",
  },
  "ui.no_labs_match": {
    EN: "No labs match the selected filters.", ZU: "Azikho izilimi ezifanayo", XH: "Akukho zilwimi ezifanayo", AF: "Geen labs pas by die filters nie",
    NS: "Ga go na malabhorethri a masha", TN: "Ga go na malabhorethri a masha", ST: "Ga go na malabhorethri a masha", TS: "Ga go na malabhorethri a masha",
    SS: "Ga go na malabhorethri a masha", VE: "Ga go na malabhorethri a masha", NR: "Ga go na malabhorethri a masha", SASL: "[SIGN] No Labs",
    SW: "Hakuna maabara zinazolingana", FR: "Aucun laboratoire ne correspond", PT: "Nenhum laboratório corresponde", HA: "Babu dakunan gwaji da suka dace",
    YO: "Ko si ile-iṣẹ tó bámu", IG: "Enweghị Ọlaborate dabara", AM: "ምንም ላቦራቶሪዎች አይዛመዱም", DE: "Keine Labore gefunden", RU: "Лаборатории не найдены", JA: "一致するラボがありません", ZH: "没有匹配的实验室",
  },
};

export function translate(key: string, lang: SupportedLanguage): string {
  const dict = TRANSLATIONS[key];
  if (!dict) return key;
  return dict[lang] ?? dict["EN"] ?? key;
}

export function translateLabContent(blueprint: any, lang: SupportedLanguage): any {
  return {
    ...blueprint,
    title: translate(blueprint.slug + ".title", lang),
    description: translate(blueprint.slug + ".desc", lang),
    practicalSteps: blueprint.practicalSteps.map((step: string) => translate(step, lang)),
    governingLaws: blueprint.governingLaws.map((law: string) => translate(law, lang)),
  };
}

export function translateUI(keys: string[], lang: SupportedLanguage): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    result[key] = translate(key, lang);
  }
  return result;
}

export function listSupportedLanguages(): Array<{ code: SupportedLanguage; name: string; englishName: string; flag: string; region: string }> {
  return Object.entries(LANGUAGE_METADATA).map(([code, meta]) => ({
    code: code as SupportedLanguage,
    ...meta,
  }));
}

export function getLanguageForFramework(frameworkKey: string): SupportedLanguage[] {
  const map: Record<string, SupportedLanguage[]> = {
    SOUTH_AFRICA_CAPS: ["EN", "ZU", "XH", "AF", "NS", "TN", "ST", "TS", "SS", "VE", "NR", "SASL"],
    KENYA_CBC: ["EN", "SW"],
    NIGERIA_NERDC: ["EN", "HA", "YO", "IG"],
    GHANA_NACCA: ["EN"],
    RWANDA_REB: ["EN", "FR"],
    ZIMBABWE_ZIMSEC: ["EN"],
    GERMANY_ABITUR: ["EN", "DE"],
    UK_CAMBRIDGE: ["EN"],
    RUSSIA_MIPT: ["EN", "RU"],
    JAPAN_SSH: ["EN", "JA"],
    CHINA_NATIONAL: ["EN", "ZH"],
    EUROPE_CAMBRIDGE: ["EN", "FR", "PT", "DE"],
    USA_ABET: ["EN"],
  };
  return map[frameworkKey] || ["EN"];
}
