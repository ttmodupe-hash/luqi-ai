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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  FileText,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  BookOpen,
  Scale,
  Shield,
  ArrowRight,
  ArrowRightLeft,
  Copy,
  Check,
  Volume2,
  Landmark,
  CreditCard,
  Home,
  Briefcase,
  Phone,
  Zap,
  Car,
  GraduationCap,
  HeartPulse,
  Info,
  DollarSign,
  Percent,
  Calendar,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";

/* Types */

interface LegalTerm {
  term_id: string;
  english: string;
  definition: string;
  category: "banking" | "insurance" | "employment" | "property" | "general" | "consumer";
  translations: Record<string, string>;
  plain_english: string;
  warning: boolean;
  example: string;
}

interface ContractClause {
  clause_id: string;
  title: string;
  original_text: string;
  plain_summary: string;
  risk_level: "safe" | "caution" | "predatory";
  risk_reason: string;
  translations: Record<string, string>;
  category: string;
}

interface ContractTemplate {
  template_id: string;
  name: string;
  type: "loan" | "employment" | "rental" | "insurance" | "service";
  description: string;
  icon: React.ElementType;
  clauses: ContractClause[];
}

interface VocabLanguage {
  code: string;
  name: string;
  nativeName: string;
}

/* Languages */

const LANGUAGES: VocabLanguage[] = [
  { code: "zu", name: "isiZulu", nativeName: "isiZulu" },
  { code: "xh", name: "isiXhosa", nativeName: "isiXhosa" },
  { code: "st", name: "Sesotho", nativeName: "Sesotho" },
  { code: "nso", name: "Sepedi", nativeName: "Sepedi" },
  { code: "tn", name: "Setswana", nativeName: "Setswana" },
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans" },
];

/* Legal Terms Database */

const LEGAL_TERMS: LegalTerm[] = [
  {
    term_id: "TERM-001",
    english: "Annual Percentage Rate (APR)",
    definition: "The total yearly cost of borrowing money, including interest and fees, expressed as a percentage.",
    category: "banking",
    translations: {
      zu: "Izinga Lezinyawo Lezinyembelelo (APR)",
      xh: "Izinga Lokuhlawulwa Kwemali Yeminyaka (APR)",
      st: "Tekanyo ea Tshwau ea Lemong (APR)",
      nso: "Tekanyo ya Tshelete ya Ngwaga (APR)",
      tn: "Tekanyo ya Tshwau ya Ngwaga (APR)",
      af: "Jaarlikse Persentasiekoers (APR)",
    },
    plain_english: "The total cost of borrowing per year. If APR is 30%, you pay R30 extra per R100 borrowed per year.",
    warning: true,
    example: "A R10,000 loan at 25% APR costs R2,500 per year in interest alone.",
  },
  {
    term_id: "TERM-002",
    english: "Compound Interest",
    definition: "Interest calculated on both the original amount AND the accumulated interest from previous periods.",
    category: "banking",
    translations: {
      zu: "Inzuzo Eyengeziwe",
      xh: "Inzala Eqabileyo",
      st: "Tshwau e Hlakileng",
      nso: "Tshelete e Ntshitshang",
      tn: "Tshwau e e Oketsegang",
      af: "Saamgestelde Rente",
    },
    plain_english: "Interest charged on top of interest. Your debt grows faster over time. A R10,000 loan at 25% compounded monthly becomes R12,800 in one year.",
    warning: true,
    example: "R10,000 at 25% APR compounded monthly = R12,800 after 1 year. Compounded daily = R12,850.",
  },
  {
    term_id: "TERM-003",
    english: "Collateral",
    definition: "Property or assets you pledge to a lender as security for a loan. If you can't pay, they take your property.",
    category: "banking",
    translations: {
      zu: "Isibambiso",
      xh: "Isibambiso",
      st: "Tshireletso",
      nso: "Tshireletso",
      tn: "Tshireletso",
      af: "Sekuriteit",
    },
    plain_english: "Something valuable you give the lender as backup. If you miss payments, they take it. Your house, car, or savings can be collateral.",
    warning: true,
    example: "You borrow R50,000 and use your car as collateral. Miss 3 payments — they repossess your car.",
  },
  {
    term_id: "TERM-004",
    english: "Early Settlement Penalty",
    definition: "A fee charged when you pay off a loan before the agreed end date.",
    category: "banking",
    translations: {
      zu: "Inhlawulo Yokukhokha Kwasesandleni",
      xh: "Inhlawulo Yokuhlawula Kwakuhle",
      st: "Tshwau ea ho Lefa Pele ho Nako",
      nso: "Tshwau ya go Lefa Pele ga Nako",
      tn: "Tshwau ya go Lefa Pele ga Nako",
      af: "Vroee Delgingsboete",
    },
    plain_english: "A fine for paying back your loan early. The bank loses interest money, so they charge you extra to discourage early payment.",
    warning: true,
    example: "You have R20,000 left on a loan. You pay it all at once. The bank charges you R2,000 as a penalty.",
  },
  {
    term_id: "TERM-005",
    english: "Debit Order",
    definition: "Permission you give a company to automatically take money from your bank account on a regular basis.",
    category: "banking",
    translations: {
      zu: "Umyalelo Wokhipha Imali",
      xh: "Umyalelo Wokukhupha Imali",
      st: "Taelo ea ho Hula Tshelete",
      nso: "Taelo ya go Hula Tshelete",
      tn: "Taelo ya go Hula Madi",
      af: "Debietorder",
    },
    plain_english: "A company can take money from your account automatically every month. You must give written permission. You can cancel at any time.",
    warning: false,
    example: "Your gym charges R350/month via debit order. They take it automatically on the 1st of each month.",
  },
  {
    term_id: "TERM-006",
    english: "Excess (Insurance)",
    definition: "The amount you must pay out of your own pocket before the insurance company pays for a claim.",
    category: "insurance",
    translations: {
      zu: "Isilinganiso Esingeqiwe",
      xh: "Intlawulo Yokugqithisela",
      st: "Tshwau e Hlahellang",
      nso: "Tshwau e e fetang",
      tn: "Tshwau e e fetang",
      af: "Oorskot",
    },
    plain_english: "The first amount you pay when making an insurance claim. If excess is R5,000 and damage is R20,000, insurance pays R15,000.",
    warning: false,
    example: "Your car insurance has R5,000 excess. Your car is damaged — repair cost R25,000. You pay R5,000, insurance pays R20,000.",
  },
  {
    term_id: "TERM-007",
    english: "Beneficiary",
    definition: "The person who receives money or property from a will, insurance policy, or trust.",
    category: "insurance",
    translations: {
      zu: "Umzuuzu",
      xh: "Umzuuzu",
      st: "Mohlomphehi",
      nso: "Mohlomphehi",
      tn: "Mohlomphehi",
      af: "Begunstigde",
    },
    plain_english: "The person who gets money when someone dies or when a policy pays out. You choose who this is.",
    warning: false,
    example: "Your life insurance pays R500,000 to your beneficiary (your spouse or child) when you die.",
  },
  {
    term_id: "TERM-008",
    english: "Probation Period",
    definition: "A trial period at the start of a new job during which the employer can dismiss you more easily.",
    category: "employment",
    translations: {
      zu: "Isikhathi Sokuhlola",
      xh: "Isikhathi Sokuvavanya",
      st: "Nako ea Tekanyo",
      nso: "Nako ya Tekanyo",
      tn: "Nako ya Tekanyo",
      af: "Proeftydperk",
    },
    plain_english: "The first 3-6 months of a new job. During this time, you can be dismissed with less notice and fewer legal protections.",
    warning: false,
    example: "You start a new job with a 3-month probation. During this period, you can be dismissed with 24 hours notice.",
  },
  {
    term_id: "TERM-009",
    english: "Unfair Dismissal",
    definition: "Being fired from your job without a valid reason or without following the correct legal process.",
    category: "employment",
    translations: {
      zu: "Ukukhishwa Kwemsebenzi Okungafanele",
      xh: "Ukukhutshwa Kwenggolo Engafanelekanga",
      st: "ho Lahloa ha Mosebetsi ho sa Nepahalang",
      nso: "go Lahloa ga Mosebetsi go sa Nepahalang",
      tn: "go Lahloa ga Tirelo go sa Nepahalang",
      af: "Onregverdige Ontslag",
    },
    plain_english: "Being fired unfairly. If your employer didn't follow the law, you can claim compensation or get your job back.",
    warning: false,
    example: "You are fired by SMS without warning. This is unfair dismissal. You can take your employer to the CCMA.",
  },
  {
    term_id: "TERM-010",
    english: "Deposit (Rental)",
    definition: "Money you pay upfront when renting a property. The landlord must return it when you move out, minus deductions for damage.",
    category: "property",
    translations: {
      zu: "Idiphozithi",
      xh: "Idiphozithi",
      st: "Tefo",
      nso: "Tefo",
      tn: "Tefo",
      af: "Deposito",
    },
    plain_english: "Money you give the landlord before moving in. Usually 1-2 months' rent. They must return it when you leave if the property is in good condition.",
    warning: true,
    example: "You pay R10,000 deposit. When you move out, the landlord returns R8,000 and keeps R2,000 for cleaning and damage.",
  },
  {
    term_id: "TERM-011",
    english: "Eviction Notice",
    definition: "A legal document from the landlord or court telling you to leave a property by a specific date.",
    category: "property",
    translations: {
      zu: "Isaziso Sokususwa",
      xh: "Isaziso Sokukhutshwa",
      st: "Tsebiso ea ho Tlosa",
      nso: "Tsebiso ya go Tlosa",
      tn: "Tsebiso ya go Tlosa",
      af: "Uitsettingskennisgewing",
    },
    plain_english: "A formal notice telling you to leave your home. You have legal rights — the landlord cannot just change the locks. They must go to court.",
    warning: true,
    example: "You receive a 30-day eviction notice. You have the right to challenge it in court before being forced to leave.",
  },
  {
    term_id: "TERM-012",
    english: "Cooling-Off Period",
    definition: "A legal right to cancel a contract within a specific number of days after signing, without penalty.",
    category: "consumer",
    translations: {
      zu: "Isikhathi Sokupholisa",
      xh: "Isikhathi Sokupholisa",
      st: "Nako ea ho Pholisa",
      nso: "Nako ya go Pholisa",
      tn: "Nako ya go Pholisa",
      af: "Afkoelperiode",
    },
    plain_english: "A short time (usually 5 business days) after signing a contract where you can change your mind and cancel without paying anything.",
    warning: false,
    example: "You sign a gym contract on Monday. By Friday you can cancel for free under the cooling-off period.",
  },
];

/* Contract Templates */

const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    template_id: "TPL-001",
    name: "Personal Loan Agreement",
    type: "loan",
    description: "Standard bank or micro-lender personal loan contract",
    icon: DollarSign,
    clauses: [
      {
        clause_id: "CLS-001",
        title: "Interest Rate and Charges",
        original_text: "The Borrower shall pay interest at the rate of 27.75% per annum, compounded monthly, on the outstanding principal balance. In addition, the Borrower shall pay an initiation fee of R1,197 and a monthly service fee of R69.",
        plain_summary: "You pay 27.75% interest per year plus R1,197 upfront plus R69 every month. On a R50,000 loan, that's about R1,387/month in interest alone plus R69 service fee.",
        risk_level: "predatory",
        risk_reason: "Interest rate above 25% is considered predatory in South Africa. Total cost of borrowing is excessive.",
        translations: {
          zu: "Ukhokha inzalo engu-27.75% ngeminyaka, uplus R1,197 ekuqaleni, kanye ne-R69 ngenyanga.",
          xh: "Uhlawula inzala engu-27.75% ngeminyaka, uplus R1,197 ekuqaleni, kunye ne-R69 ngenyanga.",
          st: "O lefa tshwau ea 27.75% ka selemo, ho akarelletsa R1,197 ea qalo le R69 ka kgwedi.",
          nso: "O lefa tshwau ya 27.75% ka ngwaga, go akarelletsa R1,197 ya mathomo le R69 ka kgwedi.",
          tn: "O duela tshwau ya 27.75% ka ngwaga, go akarelletsa R1,197 ya tshimologo le R69 ka kgwedi.",
          af: "U betaal 27.75% rente per jaar, plus R1,197 inisieringsfooi en R69 maandelikse diensfooi.",
        },
        category: "Interest & Fees",
      },
      {
        clause_id: "CLS-002",
        title: "Early Settlement Penalty",
        original_text: "Should the Borrower elect to settle the outstanding balance prior to the agreed termination date, the Borrower shall be liable for an early settlement fee equivalent to 3 months' interest calculated on the outstanding balance at the date of settlement.",
        plain_summary: "If you pay off your loan early, you must pay a penalty equal to 3 months of interest. This discourages you from getting out of debt faster.",
        risk_level: "caution",
        risk_reason: "Early settlement penalties trap borrowers in debt. You should be able to pay off debt early without punishment.",
        translations: {
          zu: "Uma ukhokha ibolo lingakanani ngaphambi kwesikhathi, kuzodingeka ukhokhe inhlawulo elinganiselwa ezinyangeni ezi-3.",
          xh: "Ukuba uhlawula ibolo lingakanani ngaphambi kwexesha, kuya kufuneka uhlawule inhlawulo elinganiselwa kwiinyanga ezi-3.",
          st: "Haeba u lefa loan pele ho nako, u tla lefa tshwau e lekanang le likgwedi tse 3.",
          nso: "Ge o lefa loan pele ga nako, o tla lefa tshwau e lekanang le dikgwedi tse 3.",
          tn: "Fa o duela loan pele ga nako, o tla duela tshwau e lekanang le dikgwedi tse 3.",
          af: "As u die lening vroeg delg, moet u 'n boete betaal gelyk aan 3 maande se rente.",
        },
        category: "Penalties",
      },
      {
        clause_id: "CLS-003",
        title: "Default and Acceleration",
        original_text: "In the event of default, the entire outstanding balance shall become immediately due and payable. The Lender reserves the right to cede, assign, or transfer this agreement to any third party without the Borrower's consent.",
        plain_summary: "If you miss a payment, the ENTIRE loan amount becomes due immediately. Also, the bank can sell your loan to another company without asking you.",
        risk_level: "predatory",
        risk_reason: "Acceleration clauses are extremely aggressive. One missed payment can trigger the entire debt becoming due instantly.",
        translations: {
          zu: "Uma ungakwazi ukukhokha, yonke imali esele iyadingeka ngokushesha. Ibhange lingathengisa ibolo lakho kwenye inkampani ngaphandle kwemvume yakho.",
          xh: "Ukuba ungakwazi ukuhlawula, yonke imali eseleyo iyafuneka ngokukhawuleza. Ibhanki linokuthengisa i-bolo yakho kwenye inkampani ngaphandle kwemvume yakho.",
          st: "Haeba u sitwa ho lefa, tsohle tse setseng li lokela ho lefshwa hanghang. Banka e ka rekisa loan ea hau ho k'hamphani e nngwe ntle le tumello ea hau.",
          nso: "Ge o palelwa ke go lefa, tsohle tse di setseng di swanetse go lefshwa ka pela. Banka e ka rekisa loan ya gago go khamphani e nngwe ntle le tumelelo ya gago.",
          tn: "Fa o palelwa ke go duela, tsohle tse di setseng di tshwanetse go duelwa ka pela. Banka e ka rekisa loan ya gago go khamphani e nngwe ntle le tumelelo ya gago.",
          af: "As u in gebreke bly, word die hele uitstaande balans onmiddellik betaalbaar. Die bank kan u lening aan 'n derde party oordra sonder u toestemming.",
        },
        category: "Default",
      },
    ],
  },
  {
    template_id: "TPL-002",
    name: "Employment Contract",
    type: "employment",
    description: "Standard employment agreement with probation and termination clauses",
    icon: Briefcase,
    clauses: [
      {
        clause_id: "CLS-004",
        title: "Probationary Period",
        original_text: "The Employee shall serve a probationary period of six (6) months from the date of commencement. During the probationary period, either party may terminate this agreement with twenty-four (24) hours' written notice.",
        plain_summary: "For your first 6 months, either you or your employer can end the contract with just 24 hours notice. After probation, the normal notice period applies.",
        risk_level: "caution",
        risk_reason: "24-hour notice during probation is very short. You could lose your job with almost no warning.",
        translations: {
          zu: "Ezinyangeni ezi-6 zokuqala, noma ngyiphi inkampani noma wena ungayeki inkontileka ngesaziso esingama-24 amahora.",
          xh: "Kwii-6 zeenyanga zokuqala, nayiphi inkampani okanye wena ungayeki i-contract ngesaziso esingama-24 amaxesha.",
          st: "Dikgweding tse 6 tsa pele, kapa k'hamphani kapa o ka emisa konteraka ka tsebiso ea dihora tse 24.",
          nso: "Dikgweding tse 6 tsa mathomo, goba khamphani goba wena o ka emisa konteraka ka tsebiso ya diiri tse 24.",
          tn: "Dikgweding tse 6 tsa ntlha, kgotsa khamphani kgotsa wena o ka emisa konteraka ka tsebiso ya diiri tse 24.",
          af: "Vir die eerste 6 maande kan enige party die kontrak beeindig met 24 uur se skriftelike kennisgewing.",
        },
        category: "Probation",
      },
      {
        clause_id: "CLS-005",
        title: "Overtime and Additional Hours",
        original_text: "The Employee may be required to work reasonable additional hours beyond the normal working hours without additional compensation, as the Employee's remuneration is deemed to include compensation for such additional hours.",
        plain_summary: "You may have to work extra hours WITHOUT extra pay. Your salary is considered to already include overtime compensation.",
        risk_level: "predatory",
        risk_reason: "This clause means unlimited unpaid overtime. In South Africa, the Basic Conditions of Employment Act limits overtime and requires payment for extra hours.",
        translations: {
          zu: "Ungadingeka ukusebenza i-overtime ngaphandle kokhokhelwa okwengeziwe. Isamba sakho sihlanganisa nalezo hora ezingeziwe.",
          xh: "Ungafuneka ukusebenza i-overtime ngaphandle kwehlawulo eyongezelelweyo. Umvuzo wakho uquka nezo xesha ezongezelelweyo.",
          st: "O ka tla be o sebetze overtime ntle le tefo e eketsehileng. Moputso oa hau o kenyeletsa tefo ea linako tseo.",
          nso: "O ka tla be o sebetse overtime ntle le tefo e oketsegang. Moputso wa gago o akaretsa tefo ya diiri tseo.",
          tn: "O ka tla be o bereka overtime ntle le tefo e oketsegang. Moputso wa gago o akaretsa tefo ya diiri tseo.",
          af: "U mag vereis word om redelike addisionele ure te werk sonder addisionele vergoeding.",
        },
        category: "Working Hours",
      },
      {
        clause_id: "CLS-006",
        title: "Restraint of Trade",
        original_text: "For a period of twelve (12) months following termination of employment, the Employee shall not directly or indirectly engage in, be employed by, or have any interest in any business that competes with the Employer within a radius of fifty (50) kilometres.",
        plain_summary: "After leaving this job, you cannot work for a competitor within 50km for 12 months. This severely limits your ability to find new employment.",
        risk_level: "caution",
        risk_reason: "Restraint of trade clauses must be reasonable to be enforceable. 50km and 12 months is aggressive but may be enforceable in SA courts.",
        translations: {
          zu: "Ezinyangeni eziyi-12 ngemva kokushiya, ngeke usebenzele umncintiswano ongaphakathi kwe-50km.",
          xh: "Kwii-12 zeenyanga emva kokushiya, awukwazi ukusebenzela umncintiswano ongaphakathi kwe-50km.",
          st: "Dikgweding tse 12 kamora ho tloha, o ke ke wa sebetsa bakeng sa ho ncintisana ka hare ho 50km.",
          nso: "Dikgweding tse 12 ka morago ga go tloga, o ka se sebetse bakeng sa kgwebo e nngwe ye e lego kgauswi le 50km.",
          tn: "Dikgwedi tse 12 morago ga go tloga, o ka se berekele kgwebo e nngwe e e lebegang ga 50km.",
          af: "Vir 12 maande na beeindiging mag u nie vir 'n mededinger binne 50km werk nie.",
        },
        category: "Post-Employment",
      },
    ],
  },
  {
    template_id: "TPL-003",
    name: "Rental / Lease Agreement",
    type: "rental",
    description: "Residential property lease with deposit, maintenance, and eviction clauses",
    icon: Home,
    clauses: [
      {
        clause_id: "CLS-007",
        title: "Security Deposit",
        original_text: "The Tenant shall pay a security deposit equivalent to two (2) months' rental, which shall be held by the Landlord in an interest-bearing account. The deposit shall be refunded within fourteen (14) days of the termination of the lease, less any deductions for damages, cleaning, or outstanding utilities.",
        plain_summary: "You pay 2 months' rent upfront as deposit. The landlord must keep it in an interest-bearing account and return it within 14 days of you moving out, minus any deductions for damage.",
        risk_level: "safe",
        risk_reason: "This is a standard and legal deposit clause. The landlord MUST return your deposit within 14 days with interest.",
        translations: {
          zu: "Ukhipha idiphozithi elinganiselwa ezinyangeni ezi-2. Umlandisi kufanele ayibuyisele ezinsukwini eziyi-14 ngemva kokuphuma.",
          xh: "Uhlawula idiphozithi elinganiselwa kwiinyanga ezi-2. Umnini kufuneka ayibuyisele kwiintsuku eziyi-14 emva kokuphuma.",
          st: "O lefa deposit e lekanang le likgwedi tse 2. Monga le o lokela ho e kgutlisa ka matsatsi a 14 ka mor'a ho tloha.",
          nso: "O lefa deposit e lekanang le dikgwedi tse 2. Monga le o swanetse go e kgutsa ka matsatsi a 14 ka morago ga go tloga.",
          tn: "O duela deposit e lekanang le dikgwedi tse 2. Monga le o tshwanetse go e busa ka matsatsi a 14 morago ga go tloga.",
          af: "U betaal 'n deposito gelyk aan 2 maande se huur. Die verhuurder moet dit binne 14 dae terugbetaal.",
        },
        category: "Deposit",
      },
      {
        clause_id: "CLS-008",
        title: "Maintenance and Repairs",
        original_text: "The Tenant shall be responsible for all maintenance and repairs to the interior of the premises, including but not limited to plumbing, electrical, and structural repairs. The Landlord shall not be liable for any maintenance costs whatsoever.",
        plain_summary: "You are responsible for ALL repairs inside the property — even major structural issues. The landlord pays nothing.",
        risk_level: "predatory",
        risk_reason: "This is ILLEGAL in South Africa. Under the Rental Housing Act, the landlord is responsible for structural maintenance. The tenant only handles minor day-to-day upkeep.",
        translations: {
          zu: "Le ndawo yontengqondo ingekho emthethweni. Umlandisi unakekelo omkhulu — ngeke bengafuni ukulungisa.",
          xh: "Le ndawo yentengqondo ayikho emthethweni. Umnini unakekelo omkhulu — akafuni ukulungisa.",
          st: "Le selekane sa thuto ha se molaong. Monga le o na le boikarabelo bo boholo — ha a bue ho lokisa.",
          nso: "Le selekane sa thuto ga se molaong. Monga le o na le boikarabelo bjo bogolo — ga a bue go lokisa.",
          tn: "Le tumalano ye e se molaong. Monga le o na le boikarabelo jojo bogolo — ga a bue go baakanya.",
          af: "Hierdie klousule is ONWETTIG in Suid-Afrika. Die verhuurder is verantwoordelik vir strukturele instandhouding.",
        },
        category: "Maintenance",
      },
    ],
  },
];

/* Helpers */

const getRiskColor = (risk: string) => {
  switch (risk) {
    case "safe": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "caution": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "predatory": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const getCategoryIcon = (category: string): React.ElementType => {
  const icons: Record<string, React.ElementType> = {
    banking: Landmark,
    insurance: Shield,
    employment: Briefcase,
    property: Home,
    general: FileText,
    consumer: CreditCard,
  };
  return icons[category] || FileText;
};

/* Main Component */

export default function BilingualPage() {
  const [activeTab, setActiveTab] = useState("contracts");
  const [selectedLang, setSelectedLang] = useState("zu");
  const [selectedTemplate, setSelectedTemplate] = useState("TPL-001");
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);

  const currentTemplate = useMemo(
    () => CONTRACT_TEMPLATES.find((t) => t.template_id === selectedTemplate) || CONTRACT_TEMPLATES[0],
    [selectedTemplate]
  );

  const predatoryCount = useMemo(
    () => currentTemplate.clauses.filter((c) => c.risk_level === "predatory").length,
    [currentTemplate]
  );

  const filteredTerms = useMemo(() => {
    if (!searchTerms.trim()) return LEGAL_TERMS;
    const q = searchTerms.toLowerCase();
    return LEGAL_TERMS.filter(
      (t) =>
        t.english.toLowerCase().includes(q) ||
        t.plain_english.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        Object.values(t.translations).some((tr) => tr.toLowerCase().includes(q))
    );
  }, [searchTerms]);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }, []);

  const currentLangName = useMemo(
    () => LANGUAGES.find((l) => l.code === selectedLang)?.name || "isiZulu",
    [selectedLang]
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Scale className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Sovereign Document Assistant
                </h1>
                <p className="text-neutral-400 text-sm">
                  Deconstruct contracts into plain language — in your language
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-400">Language:</label>
              <Select value={selectedLang} onValueChange={setSelectedLang}>
                <SelectTrigger className="w-[160px] bg-neutral-900 border-neutral-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <FileText className="h-6 w-6 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-bold text-white">{CONTRACT_TEMPLATES.length}</p>
              <p className="text-xs text-neutral-500">Contract Templates</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold text-white">{LEGAL_TERMS.length}</p>
              <p className="text-xs text-neutral-500">Legal Terms Defined</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-400" />
              <p className="text-2xl font-bold text-white">{predatoryCount}</p>
              <p className="text-xs text-neutral-500">Predatory Clauses Found</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Languages className="h-6 w-6 mx-auto mb-2 text-emerald-400" />
              <p className="text-2xl font-bold text-white">{LANGUAGES.length}</p>
              <p className="text-xs text-neutral-500">Languages Available</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-neutral-900 border border-neutral-800 p-1 w-full overflow-x-auto">
            <TabsTrigger value="contracts" className="data-[state=active]:bg-neutral-800">Contract Analyzer</TabsTrigger>
            <TabsTrigger value="terms" className="data-[state=active]:bg-neutral-800">Legal Dictionary</TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-neutral-800">Contract Types</TabsTrigger>
          </TabsList>

          {/* CONTRACT ANALYZER TAB */}
          <TabsContent value="contracts" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <label className="text-sm text-neutral-400 mb-2 block">Select Contract Type</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="bg-neutral-900 border-neutral-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-700">
                    {CONTRACT_TEMPLATES.map((t) => (
                      <SelectItem key={t.template_id} value={t.template_id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  className="border-neutral-700"
                  onClick={() => setShowOriginal(!showOriginal)}
                >
                  {showOriginal ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showOriginal ? "Hide Original" : "Show Original"}
                </Button>
              </div>
            </div>

            <Card className="bg-neutral-900 border-neutral-800 mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <currentTemplate.icon className="h-8 w-8 text-purple-400" />
                  <div>
                    <h2 className="text-lg font-bold text-white">{currentTemplate.name}</h2>
                    <p className="text-sm text-neutral-400">{currentTemplate.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {currentTemplate.clauses.map((clause) => (
              <Card
                key={clause.clause_id}
                className={`bg-neutral-900 border-neutral-800 ${
                  clause.risk_level === "predatory" ? "ring-1 ring-red-500/30" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-neutral-500">{clause.category}</span>
                        <Badge variant="outline" className={getRiskColor(clause.risk_level)}>
                          {clause.risk_level === "predatory" ? "PREDATORY" : clause.risk_level === "caution" ? "CAUTION" : "SAFE"}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-bold text-white">{clause.title}</h3>
                    </div>
                  </div>

                  {showOriginal && (
                    <div className="bg-neutral-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-neutral-500 font-medium">ORIGINAL CONTRACT TEXT</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(clause.original_text, clause.clause_id)}
                        >
                          {copiedId === clause.clause_id ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-neutral-300 leading-relaxed font-mono">
                        "{clause.original_text}"
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-blue-400" />
                      <p className="text-xs text-blue-400 font-medium">PLAIN ENGLISH SUMMARY</p>
                    </div>
                    <p className="text-sm text-neutral-200">{clause.plain_summary}</p>
                  </div>

                  {clause.risk_level !== "safe" && (
                    <div className={`rounded-lg p-4 mb-4 ${
                      clause.risk_level === "predatory"
                        ? "bg-red-500/10 border border-red-500/20"
                        : "bg-yellow-500/10 border border-yellow-500/20"
                    }`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                          clause.risk_level === "predatory" ? "text-red-400" : "text-yellow-400"
                        }`} />
                        <div>
                          <p className={`font-medium ${
                            clause.risk_level === "predatory" ? "text-red-400" : "text-yellow-400"
                          }`}>
                            {clause.risk_level === "predatory" ? "Predatory Clause Detected" : "Caution Advised"}
                          </p>
                          <p className="text-sm text-neutral-300 mt-1">{clause.risk_reason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Languages className="h-4 w-4 text-emerald-400" />
                      <p className="text-xs text-emerald-400 font-medium">
                        {currentLangName.toUpperCase()} TRANSLATION
                      </p>
                    </div>
                    <p className="text-sm text-neutral-200">
                      {clause.translations[selectedLang] || clause.translations["zu"] || "Translation not available"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* LEGAL DICTIONARY TAB */}
          <TabsContent value="terms" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  value={searchTerms}
                  onChange={(e) => setSearchTerms(e.target.value)}
                  placeholder="Search legal terms..."
                  className="bg-neutral-900 border-neutral-700"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {filteredTerms.map((term) => {
                const CatIcon = getCategoryIcon(term.category);
                const isExpanded = selectedTerm === term.term_id;
                return (
                  <Card
                    key={term.term_id}
                    className={`bg-neutral-900 border-neutral-800 cursor-pointer transition-all ${
                      isExpanded ? "ring-2 ring-purple-500" : "hover:border-neutral-700"
                    } ${term.warning ? "border-l-4 border-l-red-500" : ""}`}
                    onClick={() => setSelectedTerm(isExpanded ? null : term.term_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <CatIcon className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">{term.english}</h3>
                            <Badge variant="outline" className="bg-neutral-800 text-neutral-400">
                              {term.category}
                            </Badge>
                          </div>
                        </div>
                        {term.warning && (
                          <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                            Watch Out
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-neutral-400 mb-3">{term.definition}</p>

                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-3">
                        <p className="text-xs text-blue-400 font-medium mb-1">IN PLAIN LANGUAGE:</p>
                        <p className="text-sm text-neutral-200">{term.plain_english}</p>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3">
                          <div className="bg-neutral-800 rounded-lg p-3">
                            <p className="text-xs text-neutral-500 mb-1">EXAMPLE:</p>
                            <p className="text-sm text-neutral-300">{term.example}</p>
                          </div>

                          <div>
                            <p className="text-xs text-neutral-500 mb-2">TRANSLATIONS:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {LANGUAGES.map((lang) => (
                                <div key={lang.code} className="bg-neutral-800 rounded-lg p-2">
                                  <p className="text-xs text-neutral-500">{lang.name}</p>
                                  <p className="text-sm text-white font-medium">
                                    {term.translations[lang.code] || "—"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* CONTRACT TYPES TAB */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {CONTRACT_TEMPLATES.map((template) => {
                const TemplateIcon = template.icon;
                const predatoryInTemplate = template.clauses.filter((c) => c.risk_level === "predatory").length;
                return (
                  <Card
                    key={template.template_id}
                    className={`bg-neutral-900 border-neutral-800 cursor-pointer transition-all ${
                      selectedTemplate === template.template_id ? "ring-2 ring-purple-500" : "hover:border-neutral-700"
                    }`}
                    onClick={() => {
                      setSelectedTemplate(template.template_id);
                      setActiveTab("contracts");
                    }}
                  >
                    <CardContent className="p-6 text-center">
                      <TemplateIcon className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                      <h3 className="text-lg font-bold text-white mb-2">{template.name}</h3>
                      <p className="text-sm text-neutral-400 mb-4">{template.description}</p>
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="outline" className="bg-neutral-800 text-neutral-400">
                          {template.clauses.length} clauses
                        </Badge>
                        {predatoryInTemplate > 0 && (
                          <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                            {predatoryInTemplate} predatory
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BookOpen className="h-5 w-5 text-purple-400" />
                  How to Use This Tool
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    {
                      step: "1",
                      title: "Choose Contract Type",
                      desc: "Select the type of contract you're dealing with — loan, employment, or rental.",
                    },
                    {
                      step: "2",
                      title: "Review Each Clause",
                      desc: "Read the original text, then the plain English summary. Check for red warning badges.",
                    },
                    {
                      step: "3",
                      title: "Read in Your Language",
                      desc: "Switch the language selector to read the translation in your preferred African language.",
                    },
                  ].map((item) => (
                    <div key={item.step} className="bg-neutral-800 rounded-lg p-4">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold mb-3">
                        {item.step}
                      </div>
                      <h4 className="font-medium text-white mb-2">{item.title}</h4>
                      <p className="text-sm text-neutral-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Shield className="h-5 w-5 text-emerald-400" />
                  Know Your Rights — South Africa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { right: "National Credit Act", desc: "Lenders must disclose total cost of credit. Interest above 27.75% + fees may be unlawful.", contact: "NCR: 0860 627 627" },
                    { right: "Consumer Protection Act", desc: "You can cancel fixed-term contracts with 20 business days notice. Cooling-off period applies.", contact: "Consumer Tribunal: 012 683 8140" },
                    { right: "Rental Housing Act", desc: "Landlord must maintain the property. Deposit must be returned within 14 days with interest.", contact: "Rental Housing Tribunal: 0860 106 166" },
                    { right: "Basic Conditions of Employment", desc: "Max 45 hours/week, overtime must be paid at 1.5x rate. Minimum notice period is 1 week.", contact: "CCMA: 0861 16 16 16" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start justify-between p-3 bg-neutral-800 rounded-lg">
                      <div>
                        <p className="font-medium text-white">{item.right}</p>
                        <p className="text-sm text-neutral-400 mt-1">{item.desc}</p>
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-4 flex-shrink-0">
                        {item.contact}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
