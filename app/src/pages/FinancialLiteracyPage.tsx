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
  TrendingUp,
  PiggyBank,
  CreditCard,
  Calculator,
  Target,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Users,
  Landmark,
  Percent,
  Clock,
  ShieldCheck,
  ArrowRight,
  Globe,
  Flame,
  HandCoins,
  UserPlus,
} from "lucide-react";

type CurrencyCode = "ZAR" | "NGN" | "KES" | "GHS" | "USD";

interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  country: string;
  inflation_rate: number;
  t_bill_rate: number;
}

interface LoanInput {
  principal: number;
  annual_rate: number;
  term_months: number;
  extra_monthly: number;
}

interface LoanResult {
  monthly_payment: number;
  total_paid: number;
  total_interest: number;
  months: number;
  payoff_label: string;
}

interface AccelerationComparison {
  standard: LoanResult;
  accelerated: LoanResult;
  interest_saved: number;
  months_saved: number;
  percent_time_saved: number;
}

interface InvestmentVehicle {
  vehicle_id: string;
  rank: number;
  name: string;
  category: "inflation_shield" | "currency_protection" | "community_wealth";
  description: string;
  examples: string[];
  expected_return_min: number;
  expected_return_max: number;
  risk_level: "low" | "medium" | "high";
  liquidity: "high" | "medium" | "low";
  min_investment: Record<CurrencyCode, number>;
  inflation_beating: boolean;
  how_to_start: string[];
  icon: React.ElementType;
  color: string;
  textColor: string;
  bgColor: string;
}

interface CooperativeMember {
  member_id: string;
  name: string;
  joined_date: string;
  total_contributed: number;
  total_received: number;
  status: "active" | "pending" | "completed";
  payout_order: number;
}

interface CooperativeContribution {
  contribution_id: string;
  member_id: string;
  member_name: string;
  amount: number;
  month: string;
  paid: boolean;
  paid_date: string | null;
}

interface CooperativePayout {
  payout_id: string;
  member_id: string;
  member_name: string;
  amount: number;
  month: string;
  status: "pending" | "paid" | "skipped";
}

interface CooperativeGroup {
  group_id: string;
  name: string;
  type: "stokvel" | "chama" | "susu" | "ajo" | "esusu";
  contribution_amount: number;
  frequency: "weekly" | "biweekly" | "monthly";
  currency: CurrencyCode;
  members: CooperativeMember[];
  contributions: CooperativeContribution[];
  payouts: CooperativePayout[];
  current_round: number;
  total_rounds: number;
  pool_value: number;
  start_date: string;
}

interface EmergencyFundCalc {
  monthly_expenses: number;
  target_months: number;
  target_amount: number;
  current_saved: number;
  monthly_contribution: number;
  months_to_goal: number;
}

const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand", country: "South Africa", inflation_rate: 5.5, t_bill_rate: 8.5 },
  NGN: { code: "NGN", symbol: "\u20A6", name: "Nigerian Naira", country: "Nigeria", inflation_rate: 28.9, t_bill_rate: 19.5 },
  KES: { code: "KES", symbol: "KSh", name: "Kenyan Shilling", country: "Kenya", inflation_rate: 6.8, t_bill_rate: 13.0 },
  GHS: { code: "GHS", symbol: "GH\u20B5", name: "Ghanaian Cedi", country: "Ghana", inflation_rate: 23.2, t_bill_rate: 27.0 },
  USD: { code: "USD", symbol: "$", name: "US Dollar", country: "United States", inflation_rate: 3.2, t_bill_rate: 5.3 },
};

const fmt = (amount: number, code: CurrencyCode): string => {
  const cfg = CURRENCIES[code];
  if (Math.abs(amount) >= 1000000) return `${cfg.symbol}${(amount / 1000000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1000) return `${cfg.symbol}${(amount / 1000).toFixed(1)}k`;
  return `${cfg.symbol}${Math.round(amount).toLocaleString()}`;
};

const fmtFull = (amount: number, code: CurrencyCode): string => {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

function calcMonthlyPayment(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function calcLoanResult(principal: number, annualRate: number, termMonths: number, extraMonthly: number): LoanResult {
  const basePayment = calcMonthlyPayment(principal, annualRate, termMonths);
  const totalPayment = basePayment + extraMonthly;
  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    const months = Math.ceil(principal / totalPayment);
    return {
      monthly_payment: totalPayment,
      total_paid: principal,
      total_interest: 0,
      months,
      payoff_label: months <= 12 ? `${months} months` : `${Math.floor(months / 12)}y ${months % 12}m`,
    };
  }

  let balance = principal;
  let totalPaid = 0;
  let months = 0;

  while (balance > 0 && months < 600) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(totalPayment - interest, balance);
    if (principalPaid <= 0) break;
    balance -= principalPaid;
    totalPaid += interest + principalPaid;
    months++;
  }

  const totalInterest = totalPaid - principal;

  return {
    monthly_payment: totalPayment,
    total_paid: Math.round(totalPaid),
    total_interest: Math.round(totalInterest),
    months,
    payoff_label: months <= 12 ? `${months} months` : `${Math.floor(months / 12)}y ${months % 12}m`,
  };
}

function calcAcceleration(input: LoanInput): AccelerationComparison {
  const standard = calcLoanResult(input.principal, input.annual_rate, input.term_months, 0);
  const accelerated = calcLoanResult(input.principal, input.annual_rate, input.term_months, input.extra_monthly);
  const interestSaved = standard.total_interest - accelerated.total_interest;
  const monthsSaved = standard.months - accelerated.months;
  const pctTime = standard.months > 0 ? Math.round((monthsSaved / standard.months) * 100) : 0;
  return {
    standard,
    accelerated,
    interest_saved: Math.max(0, interestSaved),
    months_saved: Math.max(0, monthsSaved),
    percent_time_saved: pctTime,
  };
}

const INVESTMENT_VEHICLES: InvestmentVehicle[] = [
  {
    vehicle_id: "INV-001",
    rank: 1,
    name: "Local Treasury Bills & Sovereign Bonds",
    category: "inflation_shield",
    description: "Government-backed short-term securities paying guaranteed local-currency returns above the central bank rate. Zero default risk.",
    examples: [
      "SA Retail Savings Bonds (RSA) — 8.5%-11.5% p.a. fixed",
      "Nigeria FGN Treasury Bills — 19.5%-22% p.a.",
      "Kenya Infrastructure Bonds (IFB) — 13%-18% p.a. tax-free",
      "Ghana Treasury Notes — 25%-28% p.a.",
    ],
    expected_return_min: 8,
    expected_return_max: 28,
    risk_level: "low",
    liquidity: "medium",
    min_investment: { ZAR: 1000, NGN: 50000, KES: 50000, GHS: 500, USD: 100 },
    inflation_beating: true,
    how_to_start: [
      "Open an account with your national treasury or central bank portal",
      "Start with the minimum denomination for your country",
      "Choose 91-day, 182-day, or 364-day bills depending on your horizon",
      "Reinvest returns automatically to compound",
    ],
    icon: Landmark,
    color: "bg-blue-500",
    textColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    vehicle_id: "INV-002",
    rank: 2,
    name: "Global Index Funds & USD/EUR ETFs",
    category: "currency_protection",
    description: "Low-cost, globally diversified funds tracking international markets in hard currency. Protects purchasing power against local currency devaluation.",
    examples: [
      "Vanguard S&P 500 ETF (VOO) — ~10% avg annual USD return",
      "Satrix MSCI World ETF (JSE-listed) — ZAR-denominated global exposure",
      "Stanbic IBTC Dollar Fund (Nigeria) — NGN-to-USD hedge",
      "Absa Global Equity Fund (Kenya) — KES-denominated global equities",
    ],
    expected_return_min: 8,
    expected_return_max: 15,
    risk_level: "medium",
    liquidity: "high",
    min_investment: { ZAR: 500, NGN: 25000, KES: 10000, GHS: 300, USD: 50 },
    inflation_beating: true,
    how_to_start: [
      "Open a brokerage account with a licensed local broker",
      "Choose a fund with expense ratio below 0.5%",
      "Set up monthly automatic investments (dollar-cost averaging)",
      "Hold for minimum 5 years to ride out volatility",
    ],
    icon: Globe,
    color: "bg-emerald-500",
    textColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    vehicle_id: "INV-003",
    rank: 3,
    name: "Agricultural Crowdfunding & Cooperative Pools",
    category: "community_wealth",
    description: "Community-driven investment vehicles pooling resources for agricultural projects, small business lending, and collective savings. Rooted in African financial tradition.",
    examples: [
      "ThriveAgric (Nigeria) — 15%-25% per farming cycle",
      "Farmcrowdy (Nigeria/Ghana) — 12%-20% per season",
      "Stokvel investment clubs (SA) — pooled savings with rotating payouts",
      "Chama cooperatives (Kenya) — group investments in land, livestock, trade",
    ],
    expected_return_min: 10,
    expected_return_max: 25,
    risk_level: "medium",
    liquidity: "low",
    min_investment: { ZAR: 500, NGN: 10000, KES: 5000, GHS: 200, USD: 25 },
    inflation_beating: true,
    how_to_start: [
      "Join or form a registered stokvel/chama with trusted members",
      "Define clear contribution amounts, frequency, and payout rules in writing",
      "Open a group bank account with dual signatories",
      "Consider regulated agri-crowdfunding platforms for higher yields",
    ],
    icon: Users,
    color: "bg-amber-500",
    textColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
];

const MOCK_COOPERATIVE: CooperativeGroup = {
  group_id: "COOP-001",
  name: "Ubuntu Wealth Circle",
  type: "stokvel",
  contribution_amount: 1000,
  frequency: "monthly",
  currency: "ZAR",
  current_round: 4,
  total_rounds: 8,
  pool_value: 32000,
  start_date: "2024-10-01",
  members: [
    { member_id: "MEM-001", name: "Thandi M.", joined_date: "2024-10-01", total_contributed: 4000, total_received: 8000, status: "completed", payout_order: 1 },
    { member_id: "MEM-002", name: "Sipho N.", joined_date: "2024-10-01", total_contributed: 4000, total_received: 8000, status: "completed", payout_order: 2 },
    { member_id: "MEM-003", name: "Lerato K.", joined_date: "2024-10-01", total_contributed: 4000, total_received: 8000, status: "completed", payout_order: 3 },
    { member_id: "MEM-004", name: "Bongani D.", joined_date: "2024-10-01", total_contributed: 4000, total_received: 8000, status: "completed", payout_order: 4 },
    { member_id: "MEM-005", name: "Naledi P.", joined_date: "2024-10-01", total_contributed: 3000, total_received: 0, status: "active", payout_order: 5 },
    { member_id: "MEM-006", name: "Kagiso T.", joined_date: "2024-10-01", total_contributed: 3000, total_received: 0, status: "active", payout_order: 6 },
    { member_id: "MEM-007", name: "Ayanda Z.", joined_date: "2024-10-01", total_contributed: 3000, total_received: 0, status: "active", payout_order: 7 },
    { member_id: "MEM-008", name: "Mpho R.", joined_date: "2024-10-01", total_contributed: 3000, total_received: 0, status: "active", payout_order: 8 },
  ],
  contributions: [
    { contribution_id: "CON-001", member_id: "MEM-001", member_name: "Thandi M.", amount: 1000, month: "2025-01", paid: true, paid_date: "2025-01-01" },
    { contribution_id: "CON-002", member_id: "MEM-002", member_name: "Sipho N.", amount: 1000, month: "2025-01", paid: true, paid_date: "2025-01-01" },
    { contribution_id: "CON-003", member_id: "MEM-003", member_name: "Lerato K.", amount: 1000, month: "2025-01", paid: true, paid_date: "2025-01-02" },
    { contribution_id: "CON-004", member_id: "MEM-004", member_name: "Bongani D.", amount: 1000, month: "2025-01", paid: true, paid_date: "2025-01-03" },
    { contribution_id: "CON-005", member_id: "MEM-005", member_name: "Naledi P.", amount: 1000, month: "2025-01", paid: true, paid_date: "2025-01-01" },
    { contribution_id: "CON-006", member_id: "MEM-006", member_name: "Kagiso T.", amount: 1000, month: "2025-01", paid: true, paid_date: "2025-01-05" },
    { contribution_id: "CON-007", member_id: "MEM-007", member_name: "Ayanda Z.", amount: 1000, month: "2025-01", paid: false, paid_date: null },
    { contribution_id: "CON-008", member_id: "MEM-008", member_name: "Mpho R.", amount: 1000, month: "2025-01", paid: false, paid_date: null },
  ],
  payouts: [
    { payout_id: "PAY-001", member_id: "MEM-001", member_name: "Thandi M.", amount: 8000, month: "2024-10", status: "paid" },
    { payout_id: "PAY-002", member_id: "MEM-002", member_name: "Sipho N.", amount: 8000, month: "2024-11", status: "paid" },
    { payout_id: "PAY-003", member_id: "MEM-003", member_name: "Lerato K.", amount: 8000, month: "2024-12", status: "paid" },
    { payout_id: "PAY-004", member_id: "MEM-004", member_name: "Bongani D.", amount: 8000, month: "2025-01", status: "paid" },
    { payout_id: "PAY-005", member_id: "MEM-005", member_name: "Naledi P.", amount: 8000, month: "2025-02", status: "pending" },
    { payout_id: "PAY-006", member_id: "MEM-006", member_name: "Kagiso T.", amount: 8000, month: "2025-03", status: "pending" },
    { payout_id: "PAY-007", member_id: "MEM-007", member_name: "Ayanda Z.", amount: 8000, month: "2025-04", status: "pending" },
    { payout_id: "PAY-008", member_id: "MEM-008", member_name: "Mpho R.", amount: 8000, month: "2025-05", status: "pending" },
  ],
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const getCategoryColor = (cat: string) => {
  switch (cat) {
    case "inflation_shield": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "currency_protection": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "community_wealth": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const getMemberStatusColor = (status: string) => {
  switch (status) {
    case "active": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "completed": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const getPayoutStatusColor = (status: string) => {
  switch (status) {
    case "paid": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "skipped": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

export default function FinancialLiteracyPage() {
  const [activeTab, setActiveTab] = useState("triage");
  const [currency, setCurrency] = useState<CurrencyCode>("ZAR");

  const [loanPrincipal, setLoanPrincipal] = useState("250000");
  const [loanRate, setLoanRate] = useState("21");
  const [loanTerm, setLoanTerm] = useState("60");
  const [extraMonthly, setExtraMonthly] = useState("500");
  const [comparison, setComparison] = useState<AccelerationComparison | null>(null);

  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const [coop, setCoop] = useState<CooperativeGroup>(MOCK_COOPERATIVE);
  const [newMemberName, setNewMemberName] = useState("");

  const [monthlyExpenses, setMonthlyExpenses] = useState("8000");
  const [currentSaved, setCurrentSaved] = useState("5000");
  const [monthlyContribution, setMonthlyContribution] = useState("1500");
  const [emergencyCalc, setEmergencyCalc] = useState<EmergencyFundCalc | null>(null);

  const currencyCfg = CURRENCIES[currency];

  const handleLoanCalc = useCallback(() => {
    const input: LoanInput = {
      principal: parseFloat(loanPrincipal) || 0,
      annual_rate: parseFloat(loanRate) || 0,
      term_months: parseInt(loanTerm) || 0,
      extra_monthly: parseFloat(extraMonthly) || 0,
    };
    if (input.principal <= 0 || input.term_months <= 0) return;
    setComparison(calcAcceleration(input));
  }, [loanPrincipal, loanRate, loanTerm, extraMonthly]);

  const handleEmergencyCalc = useCallback(() => {
    const expenses = parseFloat(monthlyExpenses) || 0;
    const saved = parseFloat(currentSaved) || 0;
    const monthly = parseFloat(monthlyContribution) || 0;
    const target = expenses * 3;
    const remaining = target - saved;
    const months = monthly > 0 ? Math.ceil(remaining / monthly) : 0;
    setEmergencyCalc({
      monthly_expenses: expenses,
      target_months: 3,
      target_amount: target,
      current_saved: saved,
      monthly_contribution: monthly,
      months_to_goal: Math.max(0, months),
    });
  }, [monthlyExpenses, currentSaved, monthlyContribution]);

  const toggleContributionPaid = useCallback((contributionId: string) => {
    setCoop((prev) => ({
      ...prev,
      contributions: prev.contributions.map((c) =>
        c.contribution_id === contributionId
          ? { ...c, paid: !c.paid, paid_date: !c.paid ? new Date().toISOString().split("T")[0] : null }
          : c
      ),
    }));
  }, []);

  const addMember = useCallback(() => {
    if (!newMemberName.trim()) return;
    const newMember: CooperativeMember = {
      member_id: `MEM-${Date.now()}`,
      name: newMemberName.trim(),
      joined_date: new Date().toISOString().split("T")[0],
      total_contributed: 0,
      total_received: 0,
      status: "active",
      payout_order: coop.members.length + 1,
    };
    setCoop((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
      total_rounds: prev.members.length + 1,
    }));
    setNewMemberName("");
  }, [newMemberName, coop.members.length]);

  const coopStats = useMemo(() => {
    const paidCount = coop.contributions.filter((c) => c.paid).length;
    const totalCollected = coop.contributions.filter((c) => c.paid).reduce((acc, c) => acc + c.amount, 0);
    const pendingPayouts = coop.payouts.filter((p) => p.status === "pending").length;
    const completedPayouts = coop.payouts.filter((p) => p.status === "paid").length;
    const collectionRate = coop.contributions.length > 0 ? Math.round((paidCount / coop.contributions.length) * 100) : 0;
    return { paidCount, totalCollected, pendingPayouts, completedPayouts, collectionRate };
  }, [coop]);

  const emergencyProgress = useMemo(() => {
    if (!emergencyCalc) return 0;
    return Math.min(100, Math.round((emergencyCalc.current_saved / emergencyCalc.target_amount) * 100));
  }, [emergencyCalc]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <ShieldCheck className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Financial Freedom Engine</h1>
                <p className="text-neutral-400 text-sm">Break free from high-interest debt. Build sovereign wealth.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-400">Currency:</label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                <SelectTrigger className="w-[140px] bg-neutral-900 border-neutral-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                    <SelectItem key={code} value={code}>{CURRENCIES[code].symbol} {code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Card className="bg-neutral-900 border-neutral-800 mb-6">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-neutral-400">{currencyCfg.name} ({currencyCfg.country})</span>
              <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">Inflation: {currencyCfg.inflation_rate}%</Badge>
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">T-Bill Rate: {currencyCfg.t_bill_rate}%</Badge>
              <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Real Return: {(currencyCfg.t_bill_rate - currencyCfg.inflation_rate).toFixed(1)}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-neutral-900 border border-neutral-800 p-1 w-full overflow-x-auto">
            <TabsTrigger value="triage" className="data-[state=active]:bg-neutral-800">Step 1: Emergency Fund</TabsTrigger>
            <TabsTrigger value="accelerator" className="data-[state=active]:bg-neutral-800">Step 2: Debt Killer</TabsTrigger>
            <TabsTrigger value="investments" className="data-[state=active]:bg-neutral-800">Step 3: Wealth Building</TabsTrigger>
            <TabsTrigger value="cooperative" className="data-[state=active]:bg-neutral-800">Cooperative Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="triage" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <ShieldCheck className="h-5 w-5 text-blue-400" />
                    Emergency Fund Calculator
                  </CardTitle>
                  <CardDescription>Build a 3-month survival fund to avoid predatory payday loans</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-neutral-400 mb-2 block">Monthly Essential Expenses ({currencyCfg.symbol})</label>
                      <Input type="number" value={monthlyExpenses} onChange={(e) => setMonthlyExpenses(e.target.value)} className="bg-neutral-800 border-neutral-700" />
                    </div>
                    <div>
                      <label className="text-sm text-neutral-400 mb-2 block">Already Saved ({currencyCfg.symbol})</label>
                      <Input type="number" value={currentSaved} onChange={(e) => setCurrentSaved(e.target.value)} className="bg-neutral-800 border-neutral-700" />
                    </div>
                    <div>
                      <label className="text-sm text-neutral-400 mb-2 block">Monthly Savings ({currencyCfg.symbol})</label>
                      <Input type="number" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} className="bg-neutral-800 border-neutral-700" />
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleEmergencyCalc}>
                      <Calculator className="h-4 w-4 mr-2" />Calculate Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Target className="h-5 w-5 text-emerald-400" />
                    Your Emergency Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {emergencyCalc ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-blue-400 mb-1">{fmtFull(emergencyCalc.target_amount, currency)}</p>
                        <p className="text-sm text-neutral-400">3-month emergency fund target</p>
                      </div>
                      <div className="w-full bg-neutral-800 rounded-full h-4">
                        <div className="bg-blue-500 h-4 rounded-full transition-all" style={{ width: `${emergencyProgress}%` }} />
                      </div>
                      <p className="text-center text-sm text-neutral-400">
                        {emergencyProgress}% funded — {fmtFull(emergencyCalc.current_saved, currency)} of {fmtFull(emergencyCalc.target_amount, currency)}
                      </p>
                      <div className="space-y-3">
                        <div className="flex justify-between p-3 bg-neutral-800 rounded-lg">
                          <span className="text-neutral-400">Remaining</span>
                          <span className="text-white font-medium">{fmtFull(Math.max(0, emergencyCalc.target_amount - emergencyCalc.current_saved), currency)}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-neutral-800 rounded-lg">
                          <span className="text-neutral-400">Monthly Savings</span>
                          <span className="text-blue-400 font-medium">{fmtFull(emergencyCalc.monthly_contribution, currency)}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                          <span className="text-neutral-300">Months to Full Fund</span>
                          <span className="text-emerald-400 font-bold">{emergencyCalc.months_to_goal} months</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-500">
                      <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-neutral-600" />
                      <p>Enter your expenses to build your emergency plan</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Lightbulb className="h-5 w-5 text-yellow-400" />
                  Why Emergency Fund Before Investing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { title: "Avoid Payday Loans", desc: "Without savings, a single emergency forces you into micro-loans at 30-60% APR.", icon: AlertTriangle, color: "text-red-400" },
                    { title: "Negotiate from Strength", desc: "With 3 months of expenses saved, you can walk away from exploitative employers.", icon: ShieldCheck, color: "text-blue-400" },
                    { title: "Compound Without Interruption", desc: "Your fund ensures you never touch investments prematurely.", icon: TrendingUp, color: "text-emerald-400" },
                  ].map((item, i) => (
                    <div key={i} className="bg-neutral-800 rounded-lg p-4">
                      <item.icon className={`h-6 w-6 ${item.color} mb-2`} />
                      <h4 className="font-medium text-white mb-2">{item.title}</h4>
                      <p className="text-sm text-neutral-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accelerator" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Flame className="h-5 w-5 text-red-400" />
                    Bank Interest Deconstructor
                  </CardTitle>
                  <CardDescription>See how much the bank profits — and destroy it with extra payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-neutral-400">Loan Principal</label>
                        <span className="text-white font-bold">{fmtFull(parseFloat(loanPrincipal) || 0, currency)}</span>
                      </div>
                      <input type="range" min="1000" max="1000000" step="1000" value={loanPrincipal} onChange={(e) => setLoanPrincipal(e.target.value)} className="w-full accent-red-500" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-neutral-400">Annual Interest Rate</label>
                        <span className="text-red-400 font-bold">{loanRate}%</span>
                      </div>
                      <input type="range" min="10" max="35" step="0.5" value={loanRate} onChange={(e) => setLoanRate(e.target.value)} className="w-full accent-red-500" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-neutral-400">Term (Months)</label>
                        <span className="text-white font-bold">{loanTerm} months</span>
                      </div>
                      <input type="range" min="6" max="240" step="6" value={loanTerm} onChange={(e) => setLoanTerm(e.target.value)} className="w-full accent-blue-500" />
                    </div>
                    <div className="border-t border-neutral-700 pt-4">
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-emerald-400 font-medium">Extra Monthly Principal</label>
                        <span className="text-emerald-400 font-bold">{fmtFull(parseFloat(extraMonthly) || 0, currency)}</span>
                      </div>
                      <input type="range" min="0" max="10000" step="100" value={extraMonthly} onChange={(e) => setExtraMonthly(e.target.value)} className="w-full accent-emerald-500" />
                    </div>
                    <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleLoanCalc}>
                      <Calculator className="h-4 w-4 mr-2" />Deconstruct This Loan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Target className="h-5 w-5 text-emerald-400" />
                    Accelerated Payoff Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {comparison ? (
                    <div className="space-y-4">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                        <p className="text-sm text-neutral-400 mb-1">Total Interest Destroyed</p>
                        <p className="text-4xl font-bold text-emerald-400">{fmtFull(comparison.interest_saved, currency)}</p>
                        <p className="text-sm text-neutral-400 mt-1">+ {comparison.months_saved} months cut ({comparison.percent_time_saved}% faster)</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                          <p className="text-xs text-red-400 mb-1">BANK'S PLAN</p>
                          <p className="text-lg font-bold text-white">{comparison.standard.payoff_label}</p>
                          <p className="text-xs text-neutral-400 mt-1">Interest: {fmtFull(comparison.standard.total_interest, currency)}</p>
                          <p className="text-xs text-neutral-400">Total: {fmtFull(comparison.standard.total_paid, currency)}</p>
                          <p className="text-xs text-neutral-500 mt-1">{fmtFull(comparison.standard.monthly_payment, currency)}/mo</p>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                          <p className="text-xs text-emerald-400 mb-1">YOUR PLAN</p>
                          <p className="text-lg font-bold text-emerald-400">{comparison.accelerated.payoff_label}</p>
                          <p className="text-xs text-neutral-400 mt-1">Interest: {fmtFull(comparison.accelerated.total_interest, currency)}</p>
                          <p className="text-xs text-neutral-400">Total: {fmtFull(comparison.accelerated.total_paid, currency)}</p>
                          <p className="text-xs text-emerald-400 mt-1">{fmtFull(comparison.accelerated.monthly_payment, currency)}/mo</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-500">
                      <Flame className="h-12 w-12 mx-auto mb-4 text-neutral-600" />
                      <p>Adjust sliders and click Deconstruct to see the bank's true profit</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-red-500/10 border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-400">Predatory Lending Alert</p>
                    <p className="text-sm text-neutral-300 mt-1">Micro-lenders in Africa charge 30-60% APR. Always compare the true cost before signing.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investments" className="space-y-6">
            {INVESTMENT_VEHICLES.map((vehicle) => {
              const VehicleIcon = vehicle.icon;
              const isSelected = selectedVehicle === vehicle.vehicle_id;
              return (
                <Card key={vehicle.vehicle_id} className={`bg-neutral-900 border-neutral-800 transition-all ${isSelected ? "ring-2 ring-emerald-500" : "hover:border-neutral-700"}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${vehicle.bgColor}`}>
                          <VehicleIcon className={`h-8 w-8 ${vehicle.textColor}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-bold text-neutral-600">#{vehicle.rank}</span>
                            <h3 className="text-xl font-bold text-white">{vehicle.name}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getCategoryColor(vehicle.category)}>{vehicle.category.replace("_", " ")}</Badge>
                            <Badge variant="outline" className={getRiskColor(vehicle.risk_level)}>{vehicle.risk_level} risk</Badge>
                            {vehicle.inflation_beating && <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Beats Inflation</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-400">{vehicle.expected_return_min}-{vehicle.expected_return_max}%</p>
                        <p className="text-xs text-neutral-500">expected return p.a.</p>
                      </div>
                    </div>
                    <p className="text-neutral-300 mb-4">{vehicle.description}</p>
                    <div className="bg-neutral-800 rounded-lg p-4 mb-4">
                      <p className="text-xs text-neutral-500 mb-2">Verified Examples:</p>
                      <div className="grid md:grid-cols-2 gap-2">
                        {vehicle.examples.map((ex, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            {ex}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" className="w-full text-neutral-400 hover:text-white" onClick={() => setSelectedVehicle(isSelected ? null : vehicle.vehicle_id)}>
                      {isSelected ? "Hide Details" : "How to Start"}
                      <ArrowRight className={`h-4 w-4 ml-2 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                    </Button>
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-neutral-800 space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="bg-neutral-800 rounded-lg p-3 text-center">
                            <p className="text-xs text-neutral-500 mb-1">Min. Investment</p>
                            <p className="text-lg font-bold text-white">{fmtFull(vehicle.min_investment[currency], currency)}</p>
                          </div>
                          <div className="bg-neutral-800 rounded-lg p-3 text-center">
                            <p className="text-xs text-neutral-500 mb-1">Liquidity</p>
                            <p className="text-lg font-bold text-white capitalize">{vehicle.liquidity}</p>
                          </div>
                          <div className="bg-neutral-800 rounded-lg p-3 text-center">
                            <p className="text-xs text-neutral-500 mb-1">vs {currencyCfg.name} Inflation</p>
                            <p className={`text-lg font-bold ${vehicle.inflation_beating ? "text-emerald-400" : "text-red-400"}`}>{vehicle.inflation_beating ? "OUTPACES" : "LOSES TO"}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white mb-2">How to Start:</p>
                          <ol className="space-y-2">
                            {vehicle.how_to_start.map((step, i) => (
                              <li key={i} className="flex items-start gap-3 text-sm text-neutral-300">
                                <span className={`w-6 h-6 rounded-full ${vehicle.bgColor} ${vehicle.textColor} flex items-center justify-center text-xs font-bold flex-shrink-0`}>{i + 1}</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BarChart3 className="h-5 w-5 text-red-400" />
                  Inflation vs. Your Money ({currencyCfg.country})
                </CardTitle>
                <CardDescription>Cash loses {currencyCfg.inflation_rate}% of purchasing power every year</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 3, 5].map((years) => {
                    const futureValue = Math.round(100000 * Math.pow(1 - currencyCfg.inflation_rate / 100, years));
                    const lost = 100000 - futureValue;
                    return (
                      <div key={years} className="bg-neutral-800 rounded-lg p-4 text-center">
                        <p className="text-xs text-neutral-500 mb-1">{years} year{years > 1 ? "s" : ""}</p>
                        <p className="text-lg font-bold text-white">{fmtFull(futureValue, currency)}</p>
                        <p className="text-sm text-red-400">-{fmt(lost, currency)} lost</p>
                        <p className="text-xs text-neutral-500 mt-1">of {fmt(100000, currency)} cash</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cooperative" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Users className="h-5 w-5 text-amber-400" />
                      {coop.name}
                    </CardTitle>
                    <CardDescription>
                      {coop.type.charAt(0).toUpperCase() + coop.type.slice(1)} • {fmtFull(coop.contribution_amount, coop.currency)} {coop.frequency} • Round {coop.current_round} of {coop.total_rounds}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pool: {fmtFull(coop.pool_value, coop.currency)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-neutral-800 rounded-lg p-3 text-center">
                    <Users className="h-5 w-5 mx-auto mb-1 text-amber-400" />
                    <p className="text-xl font-bold text-white">{coop.members.length}</p>
                    <p className="text-xs text-neutral-500">Members</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-3 text-center">
                    <HandCoins className="h-5 w-5 mx-auto mb-1 text-emerald-400" />
                    <p className="text-xl font-bold text-white">{fmt(coopStats.totalCollected, coop.currency)}</p>
                    <p className="text-xs text-neutral-500">Collected</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-3 text-center">
                    <Percent className="h-5 w-5 mx-auto mb-1 text-blue-400" />
                    <p className="text-xl font-bold text-white">{coopStats.collectionRate}%</p>
                    <p className="text-xs text-neutral-500">Collection Rate</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-3 text-center">
                    <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-400" />
                    <p className="text-xl font-bold text-white">{coopStats.completedPayouts}/{coop.total_rounds}</p>
                    <p className="text-xs text-neutral-500">Payouts Done</p>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-400">Round {coop.current_round} Progress</span>
                    <span className="text-white">{coopStats.collectionRate}% collected</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-3">
                    <div className="bg-amber-500 h-3 rounded-full transition-all" style={{ width: `${coopStats.collectionRate}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="members" className="w-full">
              <TabsList className="bg-neutral-900 border border-neutral-800 p-1 w-full">
                <TabsTrigger value="members" className="data-[state=active]:bg-neutral-800 flex-1">Members ({coop.members.length})</TabsTrigger>
                <TabsTrigger value="contributions" className="data-[state=active]:bg-neutral-800 flex-1">Contributions</TabsTrigger>
                <TabsTrigger value="payouts" className="data-[state=active]:bg-neutral-800 flex-1">Payout Rotation</TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="space-y-4 mt-4">
                <div className="flex gap-4 mb-4">
                  <Input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="New member name..." className="flex-1 bg-neutral-800 border-neutral-700" />
                  <Button className="bg-amber-600 hover:bg-amber-700" onClick={addMember}>
                    <UserPlus className="h-4 w-4 mr-2" />Add Member
                  </Button>
                </div>
                <div className="space-y-3">
                  {coop.members.sort((a, b) => a.payout_order - b.payout_order).map((member) => (
                    <div key={member.member_id} className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center font-bold text-amber-400">{member.payout_order}</div>
                        <div>
                          <p className="font-medium text-white">{member.name}</p>
                          <p className="text-xs text-neutral-500">Joined: {member.joined_date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-neutral-400">Contributed</p>
                          <p className="text-white font-medium">{fmtFull(member.total_contributed, coop.currency)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-neutral-400">Received</p>
                          <p className="text-emerald-400 font-medium">{fmtFull(member.total_received, coop.currency)}</p>
                        </div>
                        <Badge variant="outline" className={getMemberStatusColor(member.status)}>{member.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="contributions" className="space-y-4 mt-4">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Current Round Contributions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {coop.contributions.map((contribution) => (
                        <button key={contribution.contribution_id} onClick={() => toggleContributionPaid(contribution.contribution_id)} className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${contribution.paid ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-neutral-800 hover:bg-neutral-750 border border-transparent"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${contribution.paid ? "bg-emerald-500 border-emerald-500" : "border-neutral-600"}`}>
                              {contribution.paid && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                            <div>
                              <p className={`font-medium ${contribution.paid ? "text-emerald-400" : "text-white"}`}>{contribution.member_name}</p>
                              <p className="text-xs text-neutral-500">{contribution.month}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${contribution.paid ? "text-emerald-400" : "text-white"}`}>{fmtFull(contribution.amount, coop.currency)}</p>
                            {contribution.paid_date && <p className="text-xs text-neutral-500">{contribution.paid_date}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payouts" className="space-y-4 mt-4">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Payout Rotation Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {coop.payouts.map((payout) => (
                        <div key={payout.payout_id} className={`flex items-center justify-between p-4 rounded-lg border ${payout.status === "paid" ? "bg-emerald-500/5 border-emerald-500/20" : payout.status === "pending" ? "bg-neutral-800 border-neutral-700" : "bg-red-500/5 border-red-500/20"}`}>
                          <div className="flex items-center gap-3">
                            {payout.status === "paid" ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Clock className="h-5 w-5 text-yellow-400" />}
                            <div>
                              <p className="font-medium text-white">{payout.member_name}</p>
                              <p className="text-xs text-neutral-500">{payout.month}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-white">{fmtFull(payout.amount, coop.currency)}</p>
                            <Badge variant="outline" className={getPayoutStatusColor(payout.status)}>{payout.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BookOpen className="h-5 w-5 text-amber-400" />
                  Cooperative Savings Traditions Across Africa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { name: "Stokvel", country: "South Africa", desc: "Rotating savings clubs where members contribute monthly and take turns receiving the pool", est: "R50 billion pooled annually" },
                    { name: "Chama", country: "Kenya/East Africa", desc: "Investment groups that pool savings for land, business, or education", est: "KES 300 billion in circulation" },
                    { name: "Susu / Esusu", country: "West Africa", desc: "Daily or weekly collection pools managed by a trusted collector", est: "Over 40% of informal savings" },
                    { name: "Ajo / Adashe", country: "Nigeria", desc: "Rotating credit associations for market traders and small business owners", est: "\u20A6200 billion+ in informal credit" },
                  ].map((tradition, i) => (
                    <div key={i} className="bg-neutral-800 rounded-lg p-4">
                      <h4 className="font-medium text-amber-400 mb-1">{tradition.name}</h4>
                      <p className="text-xs text-neutral-500 mb-2">{tradition.country}</p>
                      <p className="text-sm text-neutral-300 mb-2">{tradition.desc}</p>
                      <Badge variant="outline" className="bg-neutral-700 text-neutral-400 text-xs">{tradition.est}</Badge>
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
