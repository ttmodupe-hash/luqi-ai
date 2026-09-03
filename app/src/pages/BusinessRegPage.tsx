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
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  Info,
  Calculator,
  Landmark,
  MapPin,
  Phone,
  Globe,
  Users,
  Calendar,
  DollarSign,
  Shield,
  Zap,
  ArrowRight,
  ArrowDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileCheck,
  FileX,
  FileClock,
  Award,
  BookOpen,
  Briefcase,
  Scale,
  CreditCard,
  Banknote,
  TrendingUp,
  Timer,
  CircleDollarSign,
} from "lucide-react";

/* Types */

interface RegStep {
  step_id: string;
  step_number: number;
  title: string;
  description: string;
  agency: string;
  agency_abbr: string;
  estimated_time: string;
  cost: number;
  cost_label: string;
  documents_needed: string[];
  online_available: boolean;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  tips: string[];
  icon: React.ElementType;
}

interface BusinessType {
  type_id: string;
  name: string;
  legal_name: string;
  description: string;
  min_cost: number;
  max_cost: number;
  time_estimate: string;
  liability: string;
  tax_rate: string;
  best_for: string;
  registration_body: string;
  icon: React.ElementType;
}

interface DocumentItem {
  doc_id: string;
  name: string;
  category: "identity" | "address" | "financial" | "legal" | "regulatory";
  required_for: string[];
  status: "missing" | "uploaded" | "verified" | "expired";
  expiry_date: string | null;
  notes: string;
}

interface TaxEstimate {
  turnover_bracket: string;
  vat_registered: boolean;
  estimated_annual_tax: number;
  effective_rate: number;
  breakdown: { item: string; amount: number }[];
}

interface CountryAgency {
  country: string;
  agency_name: string;
  agency_abbr: string;
  website: string;
  phone: string;
  address: string;
  online_portal: string;
  processing_time: string;
  cost_range: string;
}

/* Business Types */

const BUSINESS_TYPES: BusinessType[] = [
  {
    type_id: "BT-001",
    name: "Sole Proprietor",
    legal_name: "Sole Trader",
    description: "Simplest structure. You and the business are one legal entity. No separate registration needed in SA.",
    min_cost: 0,
    max_cost: 500,
    time_estimate: "Immediate",
    liability: "Unlimited personal liability",
    tax_rate: "Personal income tax rates (18%-45%)",
    best_for: "Freelancers, consultants, small traders",
    registration_body: "SARS (tax registration only)",
    icon: Users,
  },
  {
    type_id: "BT-002",
    name: "Private Company (Pty) Ltd",
    legal_name: "Private Company",
    description: "Most common formal structure. Separate legal entity with limited liability protection.",
    min_cost: 175,
    max_cost: 3000,
    time_estimate: "5-10 business days",
    liability: "Limited to shares held",
    tax_rate: "28% corporate tax + dividends tax",
    best_for: "Growing businesses, multiple owners, investment-ready",
    registration_body: "CIPC (Companies and Intellectual Property Commission)",
    icon: Building2,
  },
  {
    type_id: "BT-003",
    name: "Non-Profit Company (NPC)",
    legal_name: "Non-Profit Company",
    description: "For organizations with a public benefit purpose. Cannot distribute profits to members.",
    min_cost: 175,
    max_cost: 1500,
    time_estimate: "10-15 business days",
    liability: "Limited liability for members",
    tax_rate: "Tax exempt if PBO registered",
    best_for: "NGOs, community organizations, charities",
    registration_body: "CIPC + SARS (PBO status)",
    icon: Award,
  },
  {
    type_id: "BT-004",
    name: "Close Corporation (CC)",
    legal_name: "Close Corporation",
    description: "Simpler alternative to Pty Ltd. No new CCs can be registered since 2011 — only existing ones remain.",
    min_cost: 0,
    max_cost: 0,
    time_estimate: "N/A — No longer available",
    liability: "Limited to members' interest",
    tax_rate: "28% corporate tax",
    best_for: "Existing CCs only — new businesses should use Pty Ltd",
    registration_body: "CIPC (legacy only)",
    icon: FileText,
  },
  {
    type_id: "BT-005",
    name: "Cooperative",
    legal_name: "Co-operative",
    description: "Owned and democratically controlled by members. Common for agricultural and community enterprises.",
    min_cost: 100,
    max_cost: 500,
    time_estimate: "10-15 business days",
    liability: "Limited liability for members",
    tax_rate: "28% corporate tax (may qualify for exemptions)",
    best_for: "Stokvels, agricultural cooperatives, community enterprises",
    registration_body: "CIPC (Co-operatives)",
    icon: Users,
  },
];

/* Registration Steps (South Africa — CIPC) */

const REG_STEPS_SA: RegStep[] = [
  {
    step_id: "STEP-001",
    step_number: 1,
    title: "Reserve Company Name",
    description: "Submit 4 proposed company names to CIPC. One will be approved.",
    agency: "Companies and Intellectual Property Commission",
    agency_abbr: "CIPC",
    estimated_time: "1-3 business days",
    cost: 50,
    cost_label: "R50 per name reservation",
    documents_needed: ["Proposed company names (4 options)", "ID copy of applicant"],
    online_available: true,
    status: "not_started",
    tips: [
      "Choose unique names — CIPC rejects names similar to existing companies",
      "Avoid restricted words like 'Bank', 'Insurance', 'University'",
      "Check name availability on CIPC portal before submitting",
    ],
    icon: FileText,
  },
  {
    step_id: "STEP-002",
    step_number: 2,
    title: "Register Company (CoR14.1)",
    description: "Submit incorporation documents including Memorandum of Incorporation (MOI) to CIPC.",
    agency: "Companies and Intellectual Property Commission",
    agency_abbr: "CIPC",
    estimated_time: "3-5 business days",
    cost: 175,
    cost_label: "R175 standard registration",
    documents_needed: [
      "Approved name reservation certificate",
      "Memorandum of Incorporation (MOI)",
      "ID copies of all directors",
      "Registered office address proof",
    ],
    online_available: true,
    status: "not_started",
    tips: [
      "Use the standard MOI template from CIPC for fastest processing",
      "All directors must have certified ID copies",
      "The registered office address must be a physical address, not a PO Box",
    ],
    icon: Building2,
  },
  {
    step_id: "STEP-003",
    step_number: 3,
    title: "Register for Income Tax",
    description: "Register with SARS for corporate income tax. This happens automatically after CIPC registration.",
    agency: "South African Revenue Service",
    agency_abbr: "SARS",
    estimated_time: "Automatic (1-2 days after CIPC)",
    cost: 0,
    cost_label: "Free",
    documents_needed: ["CIPC registration certificate", "Company tax reference number application"],
    online_available: true,
    status: "not_started",
    tips: [
      "SARS auto-registers your company after CIPC approval",
      "You'll receive a tax reference number by email",
      "Register for eFiling to manage tax returns online",
    ],
    icon: Landmark,
  },
  {
    step_id: "STEP-004",
    step_number: 4,
    title: "Register for VAT (if applicable)",
    description: "Register for VAT if your annual turnover exceeds R1 million. Voluntary registration available for smaller businesses.",
    agency: "South African Revenue Service",
    agency_abbr: "SARS",
    estimated_time: "5-10 business days",
    cost: 0,
    cost_label: "Free",
    documents_needed: [
      "Company registration documents",
      "Bank statements showing turnover",
      "Proof of business address",
    ],
    online_available: true,
    status: "not_started",
    tips: [
      "VAT registration is mandatory above R1 million annual turnover",
      "Voluntary VAT registration lets you claim input VAT on purchases",
      "VAT returns are filed bi-monthly via SARS eFiling",
    ],
    icon: Percent,
  },
  {
    step_id: "STEP-005",
    step_number: 5,
    title: "Register for PAYE & UIF",
    description: "Register as an employer with SARS for PAYE (Pay As You Earn) and with the Department of Employment and Labour for UIF.",
    agency: "Department of Employment and Labour",
    agency_abbr: "DEL",
    estimated_time: "5-10 business days",
    cost: 0,
    cost_label: "Free",
    documents_needed: [
      "Company registration certificate",
      "Employee details (if hiring)",
      "Employer registration form (EMP101)",
    ],
    online_available: true,
    status: "not_started",
    tips: [
      "Required as soon as you hire your first employee",
      "UIF contributions are 2% of salary (1% employer + 1% employee)",
      "PAYE registration is done through SARS eFiling",
    ],
    icon: Users,
  },
  {
    step_id: "STEP-006",
    step_number: 6,
    title: "Open Business Bank Account",
    description: "Open a business bank account in the company's name to separate personal and business finances.",
    agency: "Any major SA bank",
    agency_abbr: "BANK",
    estimated_time: "1-5 business days",
    cost: 0,
    cost_label: "Free (monthly bank fees apply)",
    documents_needed: [
      "CIPC registration certificate",
      "Company tax reference number",
      "ID copies of all directors",
      "Proof of business address",
      "Resolution to open account (signed by directors)",
    ],
    online_available: true,
    status: "not_started",
    tips: [
      "Compare business banking fees across banks before choosing",
      "FNB, Standard Bank, and Capitec offer competitive SME packages",
      "You need the CIPC registration certificate before any bank will open an account",
    ],
    icon: CreditCard,
  },
  {
    step_id: "STEP-007",
    step_number: 7,
    title: "Register for COIDA (Workers Compensation)",
    description: "Register with the Compensation Fund for occupational injury and disease coverage for employees.",
    agency: "Department of Employment and Labour",
    agency_abbr: "COIDA",
    estimated_time: "10-15 business days",
    cost: 0,
    cost_label: "Free (annual assessment fees apply based on payroll)",
    documents_needed: [
      "Employer registration form",
      "Company registration certificate",
      "Estimated annual payroll",
    ],
    online_available: false,
    status: "not_started",
    tips: [
      "Mandatory if you have any employees",
      "Covers workplace injuries and occupational diseases",
      "Annual assessment fee based on your total payroll",
    ],
    icon: Shield,
  },
  {
    step_id: "STEP-008",
    step_number: 8,
    title: "Industry-Specific Licenses",
    description: "Depending on your industry, you may need additional licenses (e.g., liquor license, health permit, trading license).",
    agency: "Various (local municipality / provincial authority)",
    agency_abbr: "VARIOUS",
    estimated_time: "Varies (1 week - 3 months)",
    cost: 500,
    cost_label: "R100 - R5,000 depending on license type",
    documents_needed: [
      "Company registration documents",
      "Premises inspection reports",
      "Zoning certificate",
      "Health and safety compliance certificate",
    ],
    online_available: false,
    status: "not_started",
    tips: [
      "Check with your local municipality for trading license requirements",
      "Food businesses need health department approval",
      "Liquor licenses take 3-6 months in most provinces",
    ],
    icon: Award,
  },
];

/* Document Checklist */

const DOCUMENT_CHECKLIST: DocumentItem[] = [
  { doc_id: "DOC-001", name: "Certified ID Copy (All Directors)", category: "identity", required_for: ["CIPC Registration", "Bank Account", "SARS"], status: "missing", expiry_date: null, notes: "Must be certified within last 3 months" },
  { doc_id: "DOC-002", name: "Proof of Address (Business)", category: "address", required_for: ["CIPC Registration", "Bank Account"], status: "missing", expiry_date: null, notes: "Utility bill or lease agreement in company name" },
  { doc_id: "DOC-003", name: "Proof of Address (Personal)", category: "address", required_for: ["Bank Account", "SARS"], status: "missing", expiry_date: null, notes: "Utility bill or bank statement in your name" },
  { doc_id: "DOC-004", name: "CIPC Registration Certificate", category: "legal", required_for: ["Bank Account", "SARS", "COIDA"], status: "missing", expiry_date: null, notes: "Received after company registration" },
  { doc_id: "DOC-005", name: "Memorandum of Incorporation (MOI)", category: "legal", required_for: ["CIPC Registration", "Bank Account"], status: "missing", expiry_date: null, notes: "Use CIPC standard template or custom MOI" },
  { doc_id: "DOC-006", name: "Tax Reference Number (Company)", category: "financial", required_for: ["Bank Account", "VAT Registration"], status: "missing", expiry_date: null, notes: "Issued by SARS after CIPC registration" },
  { doc_id: "DOC-007", name: "Bank Account Confirmation Letter", category: "financial", required_for: ["SARS", "COIDA"], status: "missing", expiry_date: null, notes: "From your business bank" },
  { doc_id: "DOC-008", name: "Share Certificates", category: "legal", required_for: ["CIPC Annual Return"], status: "missing", expiry_date: null, notes: "Issued to shareholders after registration" },
  { doc_id: "DOC-009", name: "Company Resolution (Bank Account)", category: "legal", required_for: ["Bank Account"], status: "missing", expiry_date: null, notes: "Signed by all directors authorizing account opening" },
  { doc_id: "DOC-010", name: "BEE Certificate / Affidavit", category: "regulatory", required_for: ["Government Tenders", "Some Bank Accounts"], status: "missing", expiry_date: "2025-12-31", notes: "EME affidavit for companies with turnover < R10m" },
];

/* Tax Estimator Data */

const TAX_BRACKETS: TaxEstimate[] = [
  {
    turnover_bracket: "R0 — R87,300",
    vat_registered: false,
    estimated_annual_tax: 0,
    effective_rate: 0,
    breakdown: [
      { item: "Corporate Income Tax", amount: 0 },
      { item: "SBC Rate (first R87,300)", amount: 0 },
    ],
  },
  {
    turnover_bracket: "R87,301 — R365,000",
    vat_registered: false,
    estimated_annual_tax: 7350,
    effective_rate: 7,
    breakdown: [
      { item: "SBC Rate (7% on excess above R87,300)", amount: 7350 },
    ],
  },
  {
    turnover_bracket: "R365,001 — R550,000",
    vat_registered: false,
    estimated_annual_tax: 24500,
    effective_rate: 14,
    breakdown: [
      { item: "SBC Rate (R19,250 + 21% on excess)", amount: 24500 },
    ],
  },
  {
    turnover_bracket: "R550,001 — R750,000",
    vat_registered: true,
    estimated_annual_tax: 52500,
    effective_rate: 21,
    breakdown: [
      { item: "SBC Rate (R19,250 + R38,850 + 28%)", amount: 52500 },
      { item: "VAT Output (15% on taxable supplies)", amount: 0 },
    ],
  },
  {
    turnover_bracket: "R750,001 — R1,000,000",
    vat_registered: true,
    estimated_annual_tax: 87500,
    effective_rate: 28,
    breakdown: [
      { item: "Standard Corporate Rate (28%)", amount: 87500 },
      { item: "VAT Output (15% on taxable supplies)", amount: 0 },
    ],
  },
  {
    turnover_bracket: "R1,000,001+",
    vat_registered: true,
    estimated_annual_tax: 280000,
    effective_rate: 28,
    breakdown: [
      { item: "Standard Corporate Rate (28%)", amount: 280000 },
      { item: "VAT Registration Required", amount: 0 },
      { item: "Dividends Tax (20% on distributions)", amount: 0 },
    ],
  },
];

/* Country Agencies */

const COUNTRY_AGENCIES: CountryAgency[] = [
  {
    country: "South Africa",
    agency_name: "Companies and Intellectual Property Commission",
    agency_abbr: "CIPC",
    website: "www.cipc.co.za",
    phone: "086 100 2472",
    address: "The DTI Campus, 77 Meintjies Street, Sunnyside, Pretoria",
    online_portal: "eservices.cipc.co.za",
    processing_time: "5-10 business days",
    cost_range: "R175 — R3,000",
  },
  {
    country: "Nigeria",
    agency_name: "Corporate Affairs Commission",
    agency_abbr: "CAC",
    website: "www.cac.gov.ng",
    phone: "+234 9 461 7680",
    address: "Plot 420, Tigris Crescent, Maitama, Abuja",
    online_portal: "pre.cac.gov.ng",
    processing_time: "3-7 business days",
    cost_range: "₦10,000 — ₦50,000",
  },
  {
    country: "Kenya",
    agency_name: "Business Registration Service",
    agency_abbr: "BRS",
    website: "www.brs.go.ke",
    phone: "+254 20 222 4022",
    address: "Sheria House, Harambee Avenue, Nairobi",
    online_portal: "ecitizen.go.ke",
    processing_time: "1-5 business days",
    cost_range: "KSh 1,000 — KSh 10,000",
  },
  {
    country: "Ghana",
    agency_name: "Registrar General's Department",
    agency_abbr: "RGD",
    website: "www.rgd.gov.gh",
    phone: "+233 302 664 691",
    address: "28th February Road, Accra",
    online_portal: "rgd.gov.gh/online",
    processing_time: "3-10 business days",
    cost_range: "GH₵ 100 — GH₵ 500",
  },
];

/* Helpers */

const getStepStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "in_progress": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "blocked": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "not_started": return "bg-neutral-700 text-neutral-400 border-neutral-600";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const getStepStatusIcon = (status: string): React.ElementType => {
  switch (status) {
    case "completed": return CheckCircle2;
    case "in_progress": return Clock;
    case "blocked": return AlertTriangle;
    default: return CircleDollarSign;
  }
};

const getDocStatusColor = (status: string) => {
  switch (status) {
    case "verified": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "uploaded": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "missing": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "expired": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const getDocStatusIcon = (status: string): React.ElementType => {
  switch (status) {
    case "verified": return FileCheck;
    case "uploaded": return FileClock;
    case "missing": return FileX;
    case "expired": return AlertTriangle;
    default: return FileText;
  }
};

const formatZAR = (amount: number): string => {
  return `R${amount.toLocaleString()}`;
};

/* Main Component */

export default function BusinessRegPage() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [steps, setSteps] = useState<RegStep[]>(REG_STEPS_SA);
  const [documents, setDocuments] = useState<DocumentItem[]>(DOCUMENT_CHECKLIST);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchDocs, setSearchDocs] = useState("");
  const [filterDocStatus, setFilterDocStatus] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("South Africa");

  const toggleStepStatus = useCallback((stepId: string) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.step_id !== stepId) return s;
        const nextStatus: Record<string, "not_started" | "in_progress" | "completed"> = {
          not_started: "in_progress",
          in_progress: "completed",
          completed: "not_started",
        };
        return { ...s, status: nextStatus[s.status] || "not_started" };
      })
    );
  }, []);

  const toggleDocStatus = useCallback((docId: string) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.doc_id !== docId) return d;
        const nextStatus: Record<string, "missing" | "uploaded" | "verified"> = {
          missing: "uploaded",
          uploaded: "verified",
          verified: "missing",
        };
        return { ...d, status: nextStatus[d.status] || "missing" };
      })
    );
  }, []);

  const pipelineProgress = useMemo(() => {
    const completed = steps.filter((s) => s.status === "completed").length;
    return Math.round((completed / steps.length) * 100);
  }, [steps]);

  const totalEstimatedCost = useMemo(() => {
    return steps.reduce((acc, s) => acc + s.cost, 0);
  }, [steps]);

  const docsProgress = useMemo(() => {
    const ready = documents.filter((d) => d.status === "verified" || d.status === "uploaded").length;
    return Math.round((ready / documents.length) * 100);
  }, [documents]);

  const filteredDocs = useMemo(() => {
    let result = documents;
    if (filterDocStatus !== "all") result = result.filter((d) => d.status === filterDocStatus);
    if (searchDocs.trim()) {
      const q = searchDocs.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.required_for.some((r) => r.toLowerCase().includes(q))
      );
    }
    return result;
  }, [documents, filterDocStatus, searchDocs]);

  const currentAgency = useMemo(
    () => COUNTRY_AGENCIES.find((a) => a.country === selectedCountry) || COUNTRY_AGENCIES[0],
    [selectedCountry]
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Building2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Business Registration Engine
                </h1>
                <p className="text-neutral-400 text-sm">
                  Start your business — step-by-step regulatory pipeline
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-400">Country:</label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[160px] bg-neutral-900 border-neutral-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {COUNTRY_AGENCIES.map((a) => (
                    <SelectItem key={a.country} value={a.country}>
                      {a.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Agency Info Banner */}
        <Card className="bg-neutral-900 border-neutral-800 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Landmark className="h-6 w-6 text-blue-400" />
                <div>
                  <p className="font-medium text-white">{currentAgency.agency_name}</p>
                  <p className="text-sm text-neutral-400">{currentAgency.country} — {currentAgency.agency_abbr}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1 text-neutral-400">
                  <Globe className="h-3 w-3" />
                  {currentAgency.website}
                </div>
                <div className="flex items-center gap-1 text-neutral-400">
                  <Phone className="h-3 w-3" />
                  {currentAgency.phone}
                </div>
                <div className="flex items-center gap-1 text-neutral-400">
                  <Clock className="h-3 w-3" />
                  {currentAgency.processing_time}
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <DollarSign className="h-3 w-3" />
                  {currentAgency.cost_range}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-emerald-400" />
              <p className="text-2xl font-bold text-white">{pipelineProgress}%</p>
              <p className="text-xs text-neutral-500">Pipeline Complete</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <CircleDollarSign className="h-6 w-6 mx-auto mb-2 text-yellow-400" />
              <p className="text-2xl font-bold text-white">{formatZAR(totalEstimatedCost)}</p>
              <p className="text-xs text-neutral-500">Est. Total Cost</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <FileCheck className="h-6 w-6 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold text-white">{docsProgress}%</p>
              <p className="text-xs text-neutral-500">Documents Ready</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Building2 className="h-6 w-6 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-bold text-white">{BUSINESS_TYPES.length}</p>
              <p className="text-xs text-neutral-500">Business Types</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-neutral-900 border border-neutral-800 p-1 w-full overflow-x-auto">
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-neutral-800">Registration Pipeline</TabsTrigger>
            <TabsTrigger value="types" className="data-[state=active]:bg-neutral-800">Business Types</TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-neutral-800">Document Checklist</TabsTrigger>
            <TabsTrigger value="tax" className="data-[state=active]:bg-neutral-800">Tax Estimator</TabsTrigger>
            <TabsTrigger value="agencies" className="data-[state=active]:bg-neutral-800">Agencies</TabsTrigger>
          </TabsList>

          {/* PIPELINE TAB */}
          <TabsContent value="pipeline" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-400">Overall Progress</span>
                  <span className="text-sm text-emerald-400 font-bold">{pipelineProgress}%</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-3">
                  <div
                    className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${pipelineProgress}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  {steps.filter((s) => s.status === "completed").length} of {steps.length} steps completed
                </p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {steps.map((step) => {
                const StepIcon = step.icon;
                const StatusIcon = getStepStatusIcon(step.status);
                return (
                  <Card
                    key={step.step_id}
                    className={`bg-neutral-900 border-neutral-800 transition-all ${
                      step.status === "completed" ? "border-l-4 border-l-emerald-500" :
                      step.status === "in_progress" ? "border-l-4 border-l-blue-500" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => toggleStepStatus(step.step_id)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white cursor-pointer transition-colors ${
                              step.status === "completed" ? "bg-emerald-500" :
                              step.status === "in_progress" ? "bg-blue-500" :
                              "bg-neutral-700 hover:bg-neutral-600"
                            }`}
                          >
                            {step.status === "completed" ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              step.step_number
                            )}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <StepIcon className="h-5 w-5 text-emerald-400" />
                              <h3 className="font-bold text-white">{step.title}</h3>
                              <Badge variant="outline" className={getStepStatusColor(step.status)}>
                                {step.status.replace("_", " ")}
                              </Badge>
                            </div>
                            <p className="text-sm text-neutral-400">{step.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                        <div className="bg-neutral-800 rounded-lg p-2">
                          <p className="text-neutral-500 text-xs">Agency</p>
                          <p className="text-white font-medium">{step.agency_abbr}</p>
                        </div>
                        <div className="bg-neutral-800 rounded-lg p-2">
                          <p className="text-neutral-500 text-xs">Est. Time</p>
                          <p className="text-white font-medium">{step.estimated_time}</p>
                        </div>
                        <div className="bg-neutral-800 rounded-lg p-2">
                          <p className="text-neutral-500 text-xs">Cost</p>
                          <p className="text-emerald-400 font-medium">{step.cost_label}</p>
                        </div>
                        <div className="bg-neutral-800 rounded-lg p-2">
                          <p className="text-neutral-500 text-xs">Online</p>
                          <p className={`font-medium ${step.online_available ? "text-green-400" : "text-red-400"}`}>
                            {step.online_available ? "Available" : "In-person only"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-neutral-800">
                        <p className="text-xs text-neutral-500 mb-2">Documents Needed:</p>
                        <div className="flex flex-wrap gap-1">
                          {step.documents_needed.map((doc, i) => (
                            <Badge key={i} variant="outline" className="bg-neutral-800 text-neutral-400 text-xs">
                              {doc}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {step.tips.length > 0 && (
                        <div className="mt-3 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                          <p className="text-xs text-blue-400 font-medium mb-1">Tips:</p>
                          <ul className="space-y-1">
                            {step.tips.map((tip, i) => (
                              <li key={i} className="text-sm text-neutral-300 flex items-start gap-2">
                                <Info className="h-3 w-3 text-blue-400 flex-shrink-0 mt-1" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* BUSINESS TYPES TAB */}
          <TabsContent value="types" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {BUSINESS_TYPES.map((bt) => {
                const TypeIcon = bt.icon;
                const isSelected = selectedType === bt.type_id;
                return (
                  <Card
                    key={bt.type_id}
                    className={`bg-neutral-900 border-neutral-800 cursor-pointer transition-all ${
                      isSelected ? "ring-2 ring-emerald-500" : "hover:border-neutral-700"
                    }`}
                    onClick={() => setSelectedType(isSelected ? null : bt.type_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                          <TypeIcon className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{bt.name}</h3>
                          <p className="text-sm text-neutral-500">{bt.legal_name}</p>
                        </div>
                      </div>

                      <p className="text-sm text-neutral-400 mb-4">{bt.description}</p>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-neutral-800 rounded-lg p-2">
                          <p className="text-neutral-500 text-xs">Cost</p>
                          <p className="text-emerald-400 font-medium">
                            {bt.min_cost === 0 ? "Free" : `${formatZAR(bt.min_cost)} — ${formatZAR(bt.max_cost)}`}
                          </p>
                        </div>
                        <div className="bg-neutral-800 rounded-lg p-2">
                          <p className="text-neutral-500 text-xs">Time</p>
                          <p className="text-white font-medium">{bt.time_estimate}</p>
                        </div>
                        <div className="bg-neutral-800 rounded-lg p-2">
                          <p className="text-neutral-500 text-xs">Liability</p>
                          <p className="text-white font-medium">{bt.liability}</p>
                        </div>
                        <div className="bg-neutral-800 rounded-lg p-2">
                          <p className="text-neutral-500 text-xs">Tax</p>
                          <p className="text-white font-medium">{bt.tax_rate}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3">
                          <div className="bg-neutral-800 rounded-lg p-3">
                            <p className="text-xs text-neutral-500 mb-1">Best For:</p>
                            <p className="text-sm text-white">{bt.best_for}</p>
                          </div>
                          <div className="bg-neutral-800 rounded-lg p-3">
                            <p className="text-xs text-neutral-500 mb-1">Registration Body:</p>
                            <p className="text-sm text-white">{bt.registration_body}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* DOCUMENT CHECKLIST TAB */}
          <TabsContent value="documents" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  value={searchDocs}
                  onChange={(e) => setSearchDocs(e.target.value)}
                  placeholder="Search documents..."
                  className="bg-neutral-900 border-neutral-700"
                />
              </div>
              <Select value={filterDocStatus} onValueChange={setFilterDocStatus}>
                <SelectTrigger className="w-full md:w-[160px] bg-neutral-900 border-neutral-700">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                  <SelectItem value="uploaded">Uploaded</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-neutral-900 border-neutral-800 mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-400">Documents Ready</span>
                  <span className="text-sm text-blue-400 font-bold">{docsProgress}%</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${docsProgress}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {filteredDocs.map((doc) => {
                const DocIcon = getDocStatusIcon(doc.status);
                return (
                  <button
                    key={doc.doc_id}
                    onClick={() => toggleDocStatus(doc.doc_id)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors text-left ${
                      doc.status === "verified"
                        ? "bg-emerald-500/10 border border-emerald-500/20"
                        : doc.status === "uploaded"
                        ? "bg-blue-500/10 border border-blue-500/20"
                        : "bg-neutral-800 hover:bg-neutral-750 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        doc.status === "verified" ? "bg-emerald-500/20" :
                        doc.status === "uploaded" ? "bg-blue-500/20" : "bg-neutral-700"
                      }`}>
                        <DocIcon className={`h-4 w-4 ${
                          doc.status === "verified" ? "text-emerald-400" :
                          doc.status === "uploaded" ? "text-blue-400" : "text-neutral-400"
                        }`} />
                      </div>
                      <div>
                        <p className={`font-medium ${doc.status === "verified" ? "text-emerald-400" : "text-white"}`}>
                          {doc.name}
                        </p>
                        <p className="text-xs text-neutral-500">{doc.notes}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        {doc.required_for.map((r) => (
                          <Badge key={r} variant="outline" className="bg-neutral-700 text-neutral-400 text-xs">
                            {r}
                          </Badge>
                        ))}
                      </div>
                      <Badge variant="outline" className={getDocStatusColor(doc.status)}>
                        {doc.status}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* TAX ESTIMATOR TAB */}
          <TabsContent value="tax" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calculator className="h-5 w-5 text-emerald-400" />
                  Corporate Tax Estimator (South Africa)
                </CardTitle>
                <CardDescription>
                  Estimated annual tax liability by turnover bracket — Small Business Corporation (SBC) rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="text-left py-3 px-4 text-neutral-400 font-medium">Turnover Bracket</th>
                        <th className="text-center py-3 px-4 text-neutral-400 font-medium">VAT Registered</th>
                        <th className="text-right py-3 px-4 text-neutral-400 font-medium">Est. Annual Tax</th>
                        <th className="text-center py-3 px-4 text-neutral-400 font-medium">Effective Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TAX_BRACKETS.map((bracket, i) => (
                        <tr key={i} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                          <td className="py-3 px-4">
                            <span className="text-white font-medium">{bracket.turnover_bracket}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline" className={bracket.vat_registered ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-neutral-700 text-neutral-400 border-neutral-600"}>
                              {bracket.vat_registered ? "Required" : "Optional"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-emerald-400 font-bold">{formatZAR(bracket.estimated_annual_tax)}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-white">{bracket.effective_rate}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-400">Small Business Corporation (SBC) Rates</p>
                      <p className="text-sm text-neutral-300 mt-1">
                        Companies with turnover below R20 million qualify for reduced SBC rates. The first R87,300 of taxable income is taxed at 0%, providing significant savings for small businesses. Above R550,000, the standard 28% corporate rate applies.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AGENCIES TAB */}
          <TabsContent value="agencies" className="space-y-6">
            <div className="space-y-4">
              {COUNTRY_AGENCIES.map((agency) => (
                <Card
                  key={agency.country}
                  className={`bg-neutral-900 border-neutral-800 ${
                    agency.country === selectedCountry ? "ring-2 ring-emerald-500" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <Landmark className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{agency.agency_name}</h3>
                          <p className="text-sm text-neutral-400">{agency.country} — {agency.agency_abbr}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {agency.agency_abbr}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-neutral-800 rounded-lg p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <Globe className="h-3 w-3 text-neutral-500" />
                          <p className="text-neutral-500 text-xs">Website</p>
                        </div>
                        <p className="text-white font-medium">{agency.website}</p>
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <Phone className="h-3 w-3 text-neutral-500" />
                          <p className="text-neutral-500 text-xs">Phone</p>
                        </div>
                        <p className="text-white font-medium">{agency.phone}</p>
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="h-3 w-3 text-neutral-500" />
                          <p className="text-neutral-500 text-xs">Processing Time</p>
                        </div>
                        <p className="text-white font-medium">{agency.processing_time}</p>
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <DollarSign className="h-3 w-3 text-neutral-500" />
                          <p className="text-neutral-500 text-xs">Cost Range</p>
                        </div>
                        <p className="text-emerald-400 font-medium">{agency.cost_range}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-neutral-400">
                        <MapPin className="h-3 w-3" />
                        {agency.address}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-blue-400">
                        <ExternalLink className="h-3 w-3" />
                        {agency.online_portal}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
