import { useState, useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Languages,
  Globe,
  BookOpen,
  MessageSquare,
  Volume2,
  Copy,
  Check,
  RefreshCw,
  History,
  Trash2,
  ArrowRightLeft,
  GraduationCap,
  Users,
  Heart,
  MapPin,
  Sparkles,
  Play,
  BookmarkPlus,
  Bookmark,
  HelpCircle,
} from "lucide-react";

/* Types */

interface Language {
  code: string;
  name: string;
  nativeName: string;
  speakers: string;
  regions: string[];
  difficulty: "easy" | "medium" | "hard";
  family: string;
}

interface Phrase {
  phrase_id: string;
  english: string;
  translations: Record<string, string>;
  pronunciation: Record<string, string>;
  category: string;
}

interface PhraseCategory {
  category_id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface TranslationRecord {
  id: string;
  source: string;
  sourceLang: string;
  target: string;
  targetLang: string;
  timestamp: Date;
}

interface SavedPhrase {
  id: string;
  phrase: Phrase;
  language: string;
  savedAt: Date;
}

/* Languages */

const LANGUAGES: Language[] = [
  { code: "zu", name: "isiZulu", nativeName: "isiZulu", speakers: "12.1 million", regions: ["KwaZulu-Natal", "Gauteng", "Mpumalanga"], difficulty: "medium", family: "Nguni" },
  { code: "xh", name: "isiXhosa", nativeName: "isiXhosa", speakers: "8.2 million", regions: ["Eastern Cape", "Western Cape", "Free State"], difficulty: "medium", family: "Nguni" },
  { code: "nso", name: "Sepedi", nativeName: "Sepedi", speakers: "4.7 million", regions: ["Limpopo", "Gauteng", "Mpumalanga"], difficulty: "easy", family: "Sotho-Tswana" },
  { code: "tn", name: "Setswana", nativeName: "Setswana", speakers: "4.5 million", regions: ["North West", "Northern Cape", "Gauteng"], difficulty: "easy", family: "Sotho-Tswana" },
  { code: "st", name: "Sesotho", nativeName: "Sesotho", speakers: "3.8 million", regions: ["Free State", "Gauteng", "Lesotho"], difficulty: "easy", family: "Sotho-Tswana" },
  { code: "ts", name: "Xitsonga", nativeName: "Xitsonga", speakers: "2.3 million", regions: ["Limpopo", "Mpumalanga"], difficulty: "medium", family: "Tswa-Ronga" },
  { code: "ss", name: "siSwati", nativeName: "siSwati", speakers: "1.3 million", regions: ["Mpumalanga", "Eswatini"], difficulty: "medium", family: "Nguni" },
  { code: "ve", name: "Tshivenda", nativeName: "Tshivenda", speakers: "1.2 million", regions: ["Limpopo"], difficulty: "medium", family: "Venda" },
  { code: "nr", name: "isiNdebele", nativeName: "isiNdebele", speakers: "1.1 million", regions: ["Mpumalanga", "Gauteng"], difficulty: "medium", family: "Nguni" },
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans", speakers: "7.2 million", regions: ["Western Cape", "Northern Cape", "Gauteng"], difficulty: "easy", family: "Germanic" },
];

/* Categories */

const CATEGORIES: PhraseCategory[] = [
  { category_id: "greetings", name: "Greetings", icon: Heart, color: "text-red-400", bgColor: "bg-red-500/20" },
  { category_id: "courtesy", name: "Courtesy", icon: Sparkles, color: "text-yellow-400", bgColor: "bg-yellow-500/20" },
  { category_id: "basics", name: "Basics", icon: MessageSquare, color: "text-blue-400", bgColor: "bg-blue-500/20" },
  { category_id: "questions", name: "Questions", icon: HelpCircle, color: "text-purple-400", bgColor: "bg-purple-500/20" },
  { category_id: "directions", name: "Directions", icon: MapPin, color: "text-green-400", bgColor: "bg-green-500/20" },
  { category_id: "numbers", name: "Numbers", icon: GraduationCap, color: "text-indigo-400", bgColor: "bg-indigo-500/20" },
  { category_id: "food", name: "Food & Drink", icon: Globe, color: "text-orange-400", bgColor: "bg-orange-500/20" },
  { category_id: "family", name: "Family", icon: Users, color: "text-pink-400", bgColor: "bg-pink-500/20" },
];

/* Phrases Database */

const PHRASES: Phrase[] = [
  {
    phrase_id: "PHR-001",
    english: "Hello (to one person)",
    category: "greetings",
    translations: {
      zu: "Sawubona", xh: "Molo", nso: "Thobela", tn: "Dumela", st: "Dumela",
      ts: "Avuxeni", ss: "Sawubona", ve: "Ndaa", nr: "Lotjhani", af: "Hallo",
    },
    pronunciation: {
      zu: "sah-woo-BOH-nah", xh: "MOH-loh", nso: "toh-BEH-lah", tn: "doo-MEH-lah",
      st: "doo-MEH-lah", ts: "ah-voo-HEH-nee", ss: "sah-woo-BOH-nah", ve: "N-DAH",
      nr: "loh-TJAH-nee", af: "HAH-loh",
    },
  },
  {
    phrase_id: "PHR-002",
    english: "Hello (to multiple people)",
    category: "greetings",
    translations: {
      zu: "Sanibonani", xh: "Molweni", nso: "Thobelang", tn: "Dumelang", st: "Dumelang",
      ts: "Avuxeni hinkwenu", ss: "Sanibonani", ve: "Ndaa vhothe", nr: "Lotjhanini", af: "Hallo almal",
    },
    pronunciation: {
      zu: "sah-nee-boh-NAH-nee", xh: "moh-LWEH-nee", nso: "toh-beh-LAHNG", tn: "doo-meh-LAHNG",
      st: "doo-meh-LAHNG", ts: "ah-voo-HEH-nee-heen-KWEH-noo", ss: "sah-nee-boh-NAH-nee",
      ve: "N-DAH-voh-THEH", nr: "loh-tjah-NEE-nee", af: "HAH-loh-AHL-mahl",
    },
  },
  {
    phrase_id: "PHR-003",
    english: "Good morning",
    category: "greetings",
    translations: {
      zu: "Sawubona ekuseni", xh: "Molo kusasa", nso: "Dumela mosong", tn: "Dumela mosong",
      st: "Dumela hoseng", ts: "Avuxeni", ss: "Sawubona ekuseni", ve: "Ndi matsheloni",
      nr: "Lotjhani ekuseni", af: "Goeie more",
    },
    pronunciation: {
      zu: "sah-woo-BOH-nah-eh-koo-SEH-nee", xh: "MOH-loh-koo-SAH-sah", nso: "doo-MEH-lah-moh-SOHNG",
      tn: "doo-MEH-lah-moh-SOHNG", st: "doo-MEH-lah-hoh-SEHNG", ts: "ah-voo-HEH-nee",
      ss: "sah-woo-BOH-nah-eh-koo-SEH-nee", ve: "n-dee-maht-sheh-LOH-nee",
      nr: "loh-TJAH-nee-eh-koo-SEH-nee", af: "HOO-eh-MOH-reh",
    },
  },
  {
    phrase_id: "PHR-004",
    english: "Good evening",
    category: "greetings",
    translations: {
      zu: "Sawubona kusihlwa", xh: "Molo ngokuhlwa", nso: "Dumela mantsibua", tn: "Dumela motshegare",
      st: "Dumela mantsiboya", ts: "Avuxeni ni vhukanyi", ss: "Sawubona kusihlwa", ve: "Ndi madekwana",
      nr: "Lotjhani kusihlwa", af: "Goeie naand",
    },
    pronunciation: {
      zu: "sah-woo-BOH-nah-koo-see-HLWAH", xh: "MOH-loh-ngoh-koo-HLWAH", nso: "doo-MEH-lah-mahn-tsee-BOO-ah",
      tn: "doo-MEH-lah-moh-tseh-HAH-reh", st: "doo-MEH-lah-mahn-tsee-BOH-yah",
      ts: "ah-voo-HEH-nee-nee-vhoo-KAH-nyee", ss: "sah-woo-BOH-nah-koo-see-HLWAH",
      ve: "n-dee-mah-deh-KWAH-nah", nr: "loh-TJAH-nee-koo-see-HLWAH", af: "HOO-eh-NAHNT",
    },
  },
  {
    phrase_id: "PHR-005",
    english: "How are you?",
    category: "greetings",
    translations: {
      zu: "Unjani?", xh: "Unjani?", nso: "O kae?", tn: "O kae?", st: "O phela jwang?",
      ts: "Ku njhani?", ss: "Unjani?", ve: "Vho hawe?", nr: "Unjani?", af: "Hoe gaan dit?",
    },
    pronunciation: {
      zu: "oon-JAH-nee", xh: "oon-JAH-nee", nso: "oh-KAH-eh", tn: "oh-KAH-eh",
      st: "oh-PEH-lah-JWAHNG", ts: "koo-NJAH-nee", ss: "oon-JAH-nee", ve: "voh-HAH-weh",
      nr: "oon-JAH-nee", af: "hoo-HAHN-dit",
    },
  },
  {
    phrase_id: "PHR-006",
    english: "I am fine, thank you",
    category: "greetings",
    translations: {
      zu: "Ngiyaphila, ngiyabonga", xh: "Ndiphilile, enkosi", nso: "Ke gona, ke a leboga",
      tn: "Ke tsogile, ke a leboga", st: "Ke phela hantle, ke a leboha",
      ts: "Ndzi hanye kahle, ndza khensa", ss: "Ngiyaphila, ngiyabonga",
      ve: "Ndi a di farela, ndo livhuwa", nr: "Ngiyaphila, ngiyathokoza", af: "Dit gaan goed, dankie",
    },
    pronunciation: {
      zu: "ngee-yah-PEE-lah-ngee-yah-BOH-ngah", xh: "n-dee-PEE-lee-leh-en-KOH-see",
      nso: "keh-HOH-nah-keh-ah-leh-BOH-hah", tn: "keh-tsoh-HEE-leh-keh-ah-leh-BOH-hah",
      st: "keh-PEH-lah-HAHN-tleh-keh-ah-leh-BOH-hah",
      ts: "n-dzee-HAH-nyeh-KAH-hleh-n-dzah-KEHN-sah",
      ss: "ngee-yah-PEE-lah-ngee-yah-BOH-ngah",
      ve: "n-dee-ah-dee-fah-REH-lah-n-doh-lee-VOO-wah",
      nr: "ngee-yah-PEE-lah-ngee-yah-toh-KOH-zah", af: "dit-HAHN-HOOT-DAHN-kee",
    },
  },
  {
    phrase_id: "PHR-007",
    english: "Goodbye (stay well)",
    category: "greetings",
    translations: {
      zu: "Sala kahle", xh: "Sala kakuhle", nso: "Sala gabotse", tn: "Sala sentle",
      st: "Sala hantle", ts: "Sala kahle", ss: "Sala kahle", ve: "Sala zwavhudi",
      nr: "Sala kuhle", af: "Bly lekker",
    },
    pronunciation: {
      zu: "SAH-lah-KAH-hleh", xh: "SAH-lah-kah-KOO-hleh", nso: "SAH-lah-hah-BOH-tseh",
      tn: "SAH-lah-SEHN-tleh", st: "SAH-lah-HAHN-tleh", ts: "SAH-lah-KAH-hleh",
      ss: "SAH-lah-KAH-hleh", ve: "SAH-lah-zvah-VOO-dee", nr: "SAH-lah-KOO-hleh", af: "blay-LEH-ker",
    },
  },
  {
    phrase_id: "PHR-008",
    english: "Goodbye (go well)",
    category: "greetings",
    translations: {
      zu: "Hamba kahle", xh: "Hamba kakuhle", nso: "Sepela gabotse", tn: "Tsamaya sentle",
      st: "Tsamaya hantle", ts: "Famba kahle", ss: "Hamba kahle", ve: "Famba zwavhudi",
      nr: "Hamba kuhle", af: "Gaan lekker",
    },
    pronunciation: {
      zu: "HAHM-bah-KAH-hleh", xh: "HAHM-bah-kah-KOO-hleh", nso: "seh-PEH-lah-hah-BOH-tseh",
      tn: "tsah-MAH-yah-SEHN-tleh", st: "tsah-MAH-yah-HAHN-tleh", ts: "FAHM-bah-KAH-hleh",
      ss: "HAHM-bah-KAH-hleh", ve: "FAHM-bah-zvah-VOO-dee", nr: "HAHM-bah-KOO-hleh", af: "HAHN-LEH-ker",
    },
  },
  {
    phrase_id: "PHR-009",
    english: "Thank you",
    category: "courtesy",
    translations: {
      zu: "Ngiyabonga", xh: "Enkosi", nso: "Ke a leboga", tn: "Ke a leboga",
      st: "Ke a leboha", ts: "Ndza khensa", ss: "Ngiyabonga", ve: "Ndo livhuwa",
      nr: "Ngiyathokoza", af: "Dankie",
    },
    pronunciation: {
      zu: "ngee-yah-BOH-ngah", xh: "en-KOH-see", nso: "keh-ah-leh-BOH-hah", tn: "keh-ah-leh-BOH-hah",
      st: "keh-ah-leh-BOH-hah", ts: "n-dzah-KEHN-sah", ss: "ngee-yah-BOH-ngah",
      ve: "n-doh-lee-VOO-wah", nr: "ngee-yah-toh-KOH-zah", af: "DAHN-kee",
    },
  },
  {
    phrase_id: "PHR-010",
    english: "Thank you very much",
    category: "courtesy",
    translations: {
      zu: "Ngiyabonga kakhulu", xh: "Enkosi kakhulu", nso: "Ke a leboga kudu",
      tn: "Ke a leboga thata", st: "Ke leboha haholo", ts: "Ndza khensa swinene",
      ss: "Ngiyabonga kakhulu", ve: "Ndo livhuwa nga maanda", nr: "Ngiyathokoza kakhulu", af: "Baie dankie",
    },
    pronunciation: {
      zu: "ngee-yah-BOH-ngah-kah-KOO-loo", xh: "en-KOH-see-kah-KOO-loo",
      nso: "keh-ah-leh-BOH-hah-KOO-doo", tn: "keh-ah-leh-BOH-hah-THAH-tah",
      st: "keh-leh-BOH-hah-hah-HOH-loh", ts: "n-dzah-KEHN-sah-swee-NEH-neh",
      ss: "ngee-yah-BOH-ngah-kah-KOO-loo", ve: "n-doh-lee-VOO-wah-ngah-mah-AHN-dah",
      nr: "ngee-yah-toh-KOH-zah-kah-KOO-loo", af: "BAY-DAHN-kee",
    },
  },
  {
    phrase_id: "PHR-011",
    english: "Please",
    category: "courtesy",
    translations: {
      zu: "Ngicela", xh: "Nceda", nso: "Ka kgopelo", tn: "Tsweetswee", st: "Ka kopo",
      ts: "Ndza kombela", ss: "Ngicela", ve: "Ndi khou humbela", nr: "Ngiyacela", af: "Asseblief",
    },
    pronunciation: {
      zu: "ngee-CHEH-lah", xh: "N-CEH-dah", nso: "kah-khoh-PEH-loh", tn: "tsweh-eh-TSWEH-eh",
      st: "kah-KOH-poh", ts: "n-dzah-koh-MBEH-lah", ss: "ngee-CHEH-lah",
      ve: "n-dee-khoh-hoo-MBEH-lah", nr: "ngee-yah-CHEH-lah", af: "ahs-seh-BLEEF",
    },
  },
  {
    phrase_id: "PHR-012",
    english: "Excuse me / Sorry",
    category: "courtesy",
    translations: {
      zu: "Uxolo", xh: "Uxolo", nso: "Tshwarelo", tn: "Intshwarele", st: "Ntshwarele",
      ts: "Ndzi rivalela", ss: "Ngiyacolisa", ve: "Pfarelo", nr: "Uxolo", af: "Verskoon my",
    },
    pronunciation: {
      zu: "oo-KSOH-loh", xh: "oo-KSOH-loh", nso: "tshwah-REH-loh", tn: "een-tshwah-REH-leh",
      st: "n-tshwah-REH-leh", ts: "n-dzee-ree-vah-LEH-lah", ss: "ngee-yah-choh-LEE-sah",
      ve: "pfah-REH-loh", nr: "oo-KSOH-loh", af: "fer-SKOHN-may",
    },
  },
  {
    phrase_id: "PHR-013",
    english: "Yes",
    category: "basics",
    translations: {
      zu: "Yebo", xh: "Ewe", nso: "Ee", tn: "Ee", st: "Ee",
      ts: "Ina", ss: "Yebo", ve: "Ee", nr: "Ija", af: "Ja",
    },
    pronunciation: {
      zu: "YEH-boh", xh: "EH-weh", nso: "EH-eh", tn: "EH-eh", st: "EH-eh",
      ts: "EE-nah", ss: "YEH-boh", ve: "EH-eh", nr: "EE-jah", af: "YAH",
    },
  },
  {
    phrase_id: "PHR-014",
    english: "No",
    category: "basics",
    translations: {
      zu: "Cha", xh: "Hayi", nso: "Aowa", tn: "Nnyaa", st: "Tjhe",
      ts: "E-e", ss: "Cha", ve: "Ahee", nr: "Awa", af: "Nee",
    },
    pronunciation: {
      zu: "CHAH", xh: "HAH-yee", nso: "ah-OH-wah", tn: "NNYAH", st: "TJEH",
      ts: "EH-eh", ss: "CHAH", ve: "ah-HEH-eh", nr: "AH-wah", af: "NEH-eh",
    },
  },
  {
    phrase_id: "PHR-015",
    english: "I don't understand",
    category: "basics",
    translations: {
      zu: "Angiqondi", xh: "Andiqondi", nso: "Ga ke kwesise", tn: "Ga ke tlhaloganye",
      st: "Ha ke utlwisise", ts: "A ndzi twisisi", ss: "Angiva", ve: "A thi pfesi",
      nr: "Angizwisissi", af: "Ek verstaan nie",
    },
    pronunciation: {
      zu: "ah-nghee-QOHN-dee", xh: "ahn-dee-QOHN-dee", nso: "hah-keh-kweh-SHEE-sheh",
      tn: "hah-keh-tlhah-loh-HAH-nyeh", st: "hah-keh-oot-lwee-SEE-seh",
      ts: "ah-n-dzee-twee-SEE-see", ss: "ah-nghee-VAH", ve: "ah-thee-PFEH-see",
      nr: "ah-nghee-zwee-SEE-see", af: "ehk-fer-STAHN-nee",
    },
  },
  {
    phrase_id: "PHR-016",
    english: "Do you speak English?",
    category: "basics",
    translations: {
      zu: "Ukhuluma isiNgisi na?", xh: "Ukuluma isiNgesi?", nso: "Na o bolela Seisimane?",
      tn: "A o bua Sekgoa?", st: "Na o bua Senyesemane?", ts: "Xana u vulavula Xinghezi?",
      ss: "Ukhuluma Singisi?", ve: "Vho amba Luisimane?", nr: "Ukhuluma isiNgisi?", af: "Praat jy Engels?",
    },
    pronunciation: {
      zu: "oo-koo-LOO-mah-ee-see-NGHEE-see-nah", xh: "oo-koo-LOO-mah-ee-seh-NGEH-see",
      nso: "nah-oh-boh-LEH-lah-seh-ee-see-MAH-neh", tn: "ah-oh-BOO-ah-seh-KHOH-ah",
      st: "nah-oh-BOO-ah-seh-nyeh-seh-MAH-neh", ts: "HAH-nah-oo-voo-lah-VOO-lah-hee-NGHEH-zee",
      ss: "oo-koo-LOO-mah-see-NGHEE-see", ve: "voh-AHM-bah-loo-ee-see-MAH-neh",
      nr: "oo-koo-LOO-mah-ee-see-NGHEE-see", af: "prah-tay-ENG-els",
    },
  },
  {
    phrase_id: "PHR-017",
    english: "What is your name?",
    category: "questions",
    translations: {
      zu: "Ubani igama lakho?", xh: "Ngubani igama lakho?", nso: "Ke mang leina la gago?",
      tn: "Leina la gago ke mang?", st: "Lebitso la hao ke mang?", ts: "Hi mani vito ra wena?",
      ss: "Ungubani ligama lakho?", ve: "Dzina lavho ndi nnyi?", nr: "Ubani igama lakho?", af: "Wat is jou naam?",
    },
    pronunciation: {
      zu: "oo-BAH-nee-ee-GAH-mah-LAH-khoh", xh: "ngoo-BAH-nee-ee-GAH-mah-LAH-khoh",
      nso: "keh-MAHNG-leh-EE-nah-lah-HAH-hoh", tn: "leh-EE-nah-lah-HAH-hoh-keh-MAHNG",
      st: "leh-BEE-tsoh-lah-HAH-oh-keh-MAHNG", ts: "hee-MAH-nee-VEE-toh-rah-WEH-nah",
      ss: "oo-ngoo-BAH-nee-lee-GAH-mah-LAH-khoh", ve: "dzee-NAH-lah-VOH-n-dee-NNYEE",
      nr: "oo-BAH-nee-ee-GAH-mah-LAH-khoh", af: "vaht-ees-yoh-NAHM",
    },
  },
  {
    phrase_id: "PHR-018",
    english: "Where are you from?",
    category: "questions",
    translations: {
      zu: "Uphuma kuphi?", xh: "Uphuma phi?", nso: "O tswa kae?", tn: "O tswa kae?",
      st: "O tswa kae?", ts: "U huma kwihi?", ss: "Uphuma kuphi?", ve: "Vho bva ngafhi?",
      nr: "Uphuma kuphi?", af: "Waarvandaan kom jy?",
    },
    pronunciation: {
      zu: "oo-POO-mah-KOO-pee", xh: "oo-POO-mah-PEE", nso: "oh-TSHWAH-KAH-eh",
      tn: "oh-TSWAH-KAH-eh", st: "oh-TSWAH-KAH-eh", ts: "oo-HOO-mah-KWEE-hee",
      ss: "oo-POO-mah-KOO-pee", ve: "voh-BVAH-ngah-FEE", nr: "oo-POO-mah-KOO-pee",
      af: "vahr-fahn-DAHN-koh-may",
    },
  },
  {
    phrase_id: "PHR-019",
    english: "How much does this cost?",
    category: "questions",
    translations: {
      zu: "Kubiza malini?", xh: "Yimalini le nto?", nso: "Ke bokae?", tn: "Ke bokae?",
      st: "Ke bokae?", ts: "Xi durha mali muni?", ss: "Kubita malini?", ve: "Zwi dura zwingani?",
      nr: "Yimalini le nto?", af: "Hoeveel kos dit?",
    },
    pronunciation: {
      zu: "koo-BEE-zah-mah-LEE-nee", xh: "yee-mah-LEE-nee-leh-N-toh", nso: "keh-boh-KAH-eh",
      tn: "keh-boh-KAH-eh", st: "keh-boh-KAH-eh", ts: "ksee-DOO-rhah-MAH-lee-MOO-nee",
      ss: "koo-BEE-tah-mah-LEE-nee", ve: "zwee-DOO-rah-zwee-NGAH-nee",
      nr: "yee-mah-LEE-nee-leh-N-toh", af: "HOO-feel-kos-dit",
    },
  },
  {
    phrase_id: "PHR-020",
    english: "Where is the bathroom?",
    category: "directions",
    translations: {
      zu: "Ikuphi ithoyilethi?", xh: "Iphi igumbi lokuhlambela?", nso: "Bathroom e kae?",
      tn: "Bathroom e kae?", st: "Bathroom e kae?", ts: "Bathroom yi kwihi?",
      ss: "Iphi indlu yangasese?", ve: "Bathroom i ngafhi?", nr: "Ikuphi ithoyilethi?",
      af: "Waar is die badkamer?",
    },
    pronunciation: {
      zu: "ee-KOO-pee-ee-toh-yee-LEH-tee", xh: "ee-PEE-ee-GOOM-bee-loh-koo-hlahm-BEH-lah",
      nso: "bathroom-eh-KAH-eh", tn: "bathroom-eh-KAH-eh", st: "bathroom-eh-KAH-eh",
      ts: "bathroom-yee-KWEE-hee", ss: "ee-PEE-een-dloo-yah-ngah-SEH-seh",
      ve: "bathroom-ee-ngah-FEE", nr: "ee-KOO-pee-ee-toh-yee-LEH-tee", af: "vahr-ees-dee-BAHD-kah-mer",
    },
  },
  {
    phrase_id: "PHR-021",
    english: "I need help",
    category: "directions",
    translations: {
      zu: "Ngidinga usizo", xh: "Ndifuna uncedo", nso: "Ke hloka thuso", tn: "Ke batla thuso",
      st: "Ke hloka thuso", ts: "Ndzi lava mpfuneko", ss: "Ngidinga lusito", ve: "Ndi toda thuso",
      nr: "Ngidinga uncedo", af: "Ek het hulp nodig",
    },
    pronunciation: {
      zu: "ngee-DEE-ngah-oo-SEE-zoh", xh: "n-dee-FOO-nah-oon-CEH-doh", nso: "keh-HLOH-kah-THOO-shoh",
      tn: "keh-BAH-tlah-THOO-soh", st: "keh-HLOH-kah-THOO-soh", ts: "n-dzee-LAH-vah-m-pfoo-NEH-koh",
      ss: "ngee-DEE-ngah-loo-SEE-toh", ve: "n-dee-TOH-dah-THOO-soh",
      nr: "ngee-DEE-ngah-oon-CEH-doh", af: "ehk-het-hulp-NOH-dih",
    },
  },
  {
    phrase_id: "PHR-022",
    english: "One, Two, Three",
    category: "numbers",
    translations: {
      zu: "Kunye, kubili, kuthathu", xh: "Inye, ezimbini, ezintathu", nso: "Tee, pedi, tharo",
      tn: "Nngwe, pedi, tharo", st: "Nngwe, pedi, tharo", ts: "N'we, mbili, nharhu",
      ss: "Kunye, kubili, kutsatfu", ve: "Thihi, muvhili, muraru", nr: "Kunye, kubili, kuthathu",
      af: "Een, twee, drie",
    },
    pronunciation: {
      zu: "koo-NYEH-koo-BEE-lee-koo-THAH-thoo", xh: "ee-NYEH-eh-zeem-BEE-nee-eh-zeen-THAH-thoo",
      nso: "TEH-eh-PEH-dee-THAH-roh", tn: "NNGWEH-PEH-dee-THAH-roh",
      st: "NNGWEH-PEH-dee-THAH-roh", ts: "N-WEH-m-BEE-lee-NHAH-rhoo",
      ss: "koo-NYEH-koo-BEE-lee-koo-TSAH-tfoo", ve: "THEE-hee-moo-VEE-lee-moo-RAH-roo",
      nr: "koo-NYEH-koo-BEE-lee-koo-THAH-thoo", af: "ehn-tveh-dree",
    },
  },
];

/* Mock History */

const MOCK_HISTORY: TranslationRecord[] = [
  { id: "TR-001", source: "Good morning, how are you?", sourceLang: "en", target: "Sawubona, unjani?", targetLang: "zu", timestamp: new Date(Date.now() - 3600000) },
  { id: "TR-002", source: "Thank you very much", sourceLang: "en", target: "Ke a leboga kudu", targetLang: "nso", timestamp: new Date(Date.now() - 7200000) },
  { id: "TR-003", source: "Where is the market?", sourceLang: "en", target: "Iphi imakethe?", targetLang: "xh", timestamp: new Date(Date.now() - 86400000) },
];

/* Helpers */

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "easy": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "hard": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const getLanguageByCode = (code: string): Language | undefined =>
  LANGUAGES.find((l) => l.code === code);

/* Main Component */

export default function AfricanLanguagesPage() {
  const [activeTab, setActiveTab] = useState("translate");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("zu");
  const [selectedCategory, setSelectedCategory] = useState("greetings");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [history, setHistory] = useState<TranslationRecord[]>(MOCK_HISTORY);
  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>([]);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const currentTargetLanguage = useMemo(
    () => getLanguageByCode(targetLang) || LANGUAGES[0],
    [targetLang]
  );

  const filteredPhrases = useMemo(() => {
    let result = PHRASES;
    if (selectedCategory !== "all") result = result.filter((p) => p.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.english.toLowerCase().includes(q) ||
          Object.values(p.translations).some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [selectedCategory, searchQuery]);

  const handleTranslate = useCallback(() => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);

    setTimeout(() => {
      const match = PHRASES.find(
        (p) => p.english.toLowerCase().trim() === sourceText.toLowerCase().trim()
      );
      const result =
        match?.translations[targetLang] ||
        `[${currentTargetLanguage.name}] Translation for: "${sourceText}"`;
      setTranslatedText(result);

      const record: TranslationRecord = {
        id: `TR-${Date.now()}`,
        source: sourceText,
        sourceLang,
        target: result,
        targetLang,
        timestamp: new Date(),
      };
      setHistory((prev) => [record, ...prev.slice(0, 9)]);
      setIsTranslating(false);
    }, 1200);
  }, [sourceText, sourceLang, targetLang, currentTargetLanguage]);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }, []);

  const handlePlayAudio = useCallback((text: string, phraseId: string) => {
    setPlayingAudio(phraseId);
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.onend = () => setPlayingAudio(null);
      speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setPlayingAudio(null), 2000);
    }
  }, []);

  const handleSavePhrase = useCallback(
    (phrase: Phrase) => {
      const newSaved: SavedPhrase = {
        id: `SAV-${Date.now()}`,
        phrase,
        language: targetLang,
        savedAt: new Date(),
      };
      setSavedPhrases((prev) => [...prev, newSaved]);
    },
    [targetLang]
  );

  const handleRemoveSaved = useCallback((savedId: string) => {
    setSavedPhrases((prev) => prev.filter((p) => p.id !== savedId));
  }, []);

  const swapLanguages = useCallback(() => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  }, [sourceLang, targetLang, sourceText, translatedText]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Languages className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">African Languages Hub</h1>
              <p className="text-neutral-400 text-sm">
                Learn and translate South Africa's official languages
              </p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Globe className="h-6 w-6 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold text-white">{LANGUAGES.length}</p>
              <p className="text-xs text-neutral-500">Languages</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-bold text-white">{PHRASES.length}</p>
              <p className="text-xs text-neutral-500">Phrases</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Bookmark className="h-6 w-6 mx-auto mb-2 text-yellow-400" />
              <p className="text-2xl font-bold text-white">{savedPhrases.length}</p>
              <p className="text-xs text-neutral-500">Saved</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <History className="h-6 w-6 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-bold text-white">{history.length}</p>
              <p className="text-xs text-neutral-500">Translations</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-neutral-900 border border-neutral-800 p-1 w-full overflow-x-auto">
            <TabsTrigger value="translate" className="data-[state=active]:bg-neutral-800">Translator</TabsTrigger>
            <TabsTrigger value="phrases" className="data-[state=active]:bg-neutral-800">Phrase Book</TabsTrigger>
            <TabsTrigger value="languages" className="data-[state=active]:bg-neutral-800">Languages</TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-neutral-800">Saved</TabsTrigger>
          </TabsList>

          {/* TRANSLATOR TAB */}
          <TabsContent value="translate" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ArrowRightLeft className="h-5 w-5 text-purple-400" />
                  Quick Translator
                </CardTitle>
                <CardDescription>Translate between English and African languages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1">
                    <label className="text-sm text-neutral-400 mb-2 block">From</label>
                    <Select value={sourceLang} onValueChange={setSourceLang}>
                      <SelectTrigger className="bg-neutral-800 border-neutral-700">
                        <SelectValue placeholder="Source" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        <SelectItem value="en">English</SelectItem>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="icon" className="border-neutral-700 mt-6" onClick={swapLanguages}>
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1">
                    <label className="text-sm text-neutral-400 mb-2 block">To</label>
                    <Select value={targetLang} onValueChange={setTargetLang}>
                      <SelectTrigger className="bg-neutral-800 border-neutral-700">
                        <SelectValue placeholder="Target" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-700">
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-neutral-400 mb-2 block">Enter text</label>
                    <Textarea
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      placeholder="Type English text here..."
                      className="bg-neutral-800 border-neutral-700 min-h-[120px] resize-none"
                    />
                    <p className="text-xs text-neutral-500 mt-1">{sourceText.length} characters</p>
                  </div>
                  <div>
                    <label className="text-sm text-neutral-400 mb-2 block">Translation</label>
                    <div className="bg-neutral-800 border border-neutral-700 rounded-md min-h-[120px] p-3">
                      {isTranslating ? (
                        <div className="flex items-center justify-center h-full">
                          <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
                        </div>
                      ) : translatedText ? (
                        <div>
                          <p className="text-white">{translatedText}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <Button variant="ghost" size="sm" onClick={() => handleCopy(translatedText, "translation")}>
                              {copiedId === "translation" ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handlePlayAudio(translatedText, "translation")}>
                              <Volume2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-neutral-500">Translation appears here...</p>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                  onClick={handleTranslate}
                  disabled={!sourceText.trim() || isTranslating}
                >
                  {isTranslating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <Languages className="h-4 w-4 mr-2" />
                      Translate
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <History className="h-5 w-5 text-blue-400" />
                  Recent Translations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-neutral-500 text-center py-6">No translations yet</p>
                ) : (
                  <div className="space-y-3">
                    {history.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-white truncate">{item.source}</p>
                          <p className="text-sm text-purple-400 truncate">{item.target}</p>
                        </div>
                        <Badge variant="outline" className="bg-neutral-700 text-neutral-300 ml-3">
                          {item.sourceLang.toUpperCase()} → {item.targetLang.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PHRASE BOOK TAB */}
          <TabsContent value="phrases" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search phrases..."
                  className="bg-neutral-900 border-neutral-700"
                />
              </div>
              <Select value={targetLang} onValueChange={setTargetLang}>
                <SelectTrigger className="w-full md:w-[180px] bg-neutral-900 border-neutral-700">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === "all"
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                }`}
              >
                All Phrases
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.category_id}
                  onClick={() => setSelectedCategory(cat.category_id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    selectedCategory === cat.category_id
                      ? `${cat.bgColor} ${cat.color} border border-current`
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                  }`}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {filteredPhrases.map((phrase) => (
                <Card key={phrase.phrase_id} className="bg-neutral-900 border-neutral-800">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">English</p>
                        <p className="text-lg font-medium text-white">{phrase.english}</p>
                      </div>
                      <Badge variant="outline" className="bg-neutral-800 text-neutral-400">
                        {CATEGORIES.find((c) => c.category_id === phrase.category)?.name || phrase.category}
                      </Badge>
                    </div>

                    <div className="bg-neutral-800 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-purple-400 mb-1">{currentTargetLanguage.name}</p>
                          <p className="text-2xl font-bold text-white">
                            {phrase.translations[targetLang] || "—"}
                          </p>
                          {phrase.pronunciation[targetLang] && (
                            <p className="text-sm text-neutral-500 italic mt-1">
                              [{phrase.pronunciation[targetLang]}]
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePlayAudio(phrase.translations[targetLang], phrase.phrase_id)}
                            disabled={playingAudio === phrase.phrase_id}
                          >
                            {playingAudio === phrase.phrase_id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(phrase.translations[targetLang], phrase.phrase_id)}
                          >
                            {copiedId === phrase.phrase_id ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleSavePhrase(phrase)}>
                            <BookmarkPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-neutral-800">
                      <p className="text-xs text-neutral-500 mb-2">Also in:</p>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGES.filter((l) => l.code !== targetLang).slice(0, 5).map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => setTargetLang(lang.code)}
                            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs text-neutral-300 transition-colors"
                          >
                            {lang.name}: {phrase.translations[lang.code]?.slice(0, 15)}
                            {(phrase.translations[lang.code]?.length || 0) > 15 && "..."}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* LANGUAGES TAB */}
          <TabsContent value="languages" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {LANGUAGES.map((lang) => (
                <Card
                  key={lang.code}
                  className={`bg-neutral-900 border-neutral-800 cursor-pointer transition-all hover:border-neutral-700 ${
                    targetLang === lang.code ? "ring-2 ring-purple-500" : ""
                  }`}
                  onClick={() => setTargetLang(lang.code)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{lang.name}</h3>
                        <p className="text-sm text-neutral-500">{lang.nativeName}</p>
                      </div>
                      <Badge variant="outline" className={getDifficultyColor(lang.difficulty)}>
                        {lang.difficulty}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Speakers:</span>
                        <span className="text-white">{lang.speakers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Family:</span>
                        <span className="text-white">{lang.family}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-neutral-800">
                      <p className="text-xs text-neutral-500 mb-2">Regions:</p>
                      <div className="flex flex-wrap gap-1">
                        {lang.regions.map((r) => (
                          <Badge key={r} variant="outline" className="bg-neutral-800 text-neutral-400 text-xs">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetLang(lang.code);
                        setActiveTab("phrases");
                      }}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Learn {lang.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* SAVED TAB */}
          <TabsContent value="saved" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bookmark className="h-5 w-5 text-yellow-400" />
                  Saved Phrases
                </CardTitle>
                <CardDescription>Your personal phrase collection</CardDescription>
              </CardHeader>
              <CardContent>
                {savedPhrases.length === 0 ? (
                  <div className="text-center py-12">
                    <Bookmark className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
                    <p className="text-neutral-500 mb-2">No saved phrases yet</p>
                    <p className="text-neutral-600 text-sm mb-4">
                      Save phrases from the phrase book for quick access
                    </p>
                    <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setActiveTab("phrases")}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Browse Phrases
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedPhrases.map((saved) => (
                      <div key={saved.id} className="bg-neutral-800 rounded-lg p-4 flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-neutral-500">{saved.phrase.english}</p>
                          <p className="text-lg font-medium text-white">
                            {saved.phrase.translations[saved.language]}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="bg-neutral-700 text-neutral-300">
                              {getLanguageByCode(saved.language)?.name}
                            </Badge>
                            <span className="text-xs text-neutral-500">
                              {saved.savedAt.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(saved.phrase.translations[saved.language], saved.id)}
                          >
                            {copiedId === saved.id ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveSaved(saved.id)}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
