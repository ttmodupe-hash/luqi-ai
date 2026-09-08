import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { saveLocalState, loadLocalState } from "@/lib/localDb";
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
