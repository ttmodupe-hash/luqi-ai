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
  NGN: { code: "NGN", symbol: "₦", name: "Nigerian Naira", country: "Nigeria", inflation_rate: 28.9, t_bill_rate: 19.5 },
  KES: { code: "KES", symbol: "KSh", name: "Kenyan Shilling", country: "Kenya", inflation_rate: 6.8, t_bill_rate: 13.0 },
  GHS: { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi", country: "Ghana", inflation_rate: 23.2, t_bill_rate: 27.0 },
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


/* =====================================================================
   Part 2 — the page itself.
   Every figure on this page is pure arithmetic on the visitor's own
   inputs. No market predictions, no "guaranteed returns", no hype.
   That honesty is the product.
   ===================================================================== */

interface FinlitToolState {
  currency: CurrencyCode;
  principal: string;
  annualRate: string;
  termMonths: string;
  extraMonthly: string;
  monthlyExpenses: string;
  targetMonths: string;
  currentSaved: string;
  monthlyContribution: string;
}

const FINLIT_STATE_KEY = "financial-literacy-tools";

const DEFAULT_STATE: FinlitToolState = {
  currency: "ZAR",
  principal: "50000",
  annualRate: "24",
  termMonths: "36",
  extraMonthly: "500",
  monthlyExpenses: "8000",
  targetMonths: "3",
  currentSaved: "5000",
  monthlyContribution: "1000",
};

function toNum(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const MONEY_TRUTHS = [
  {
    icon: ShieldCheck,
    title: "If it is “guaranteed”, it is a scam",
    body: "Every real investment carries risk. Anyone promising fixed, guaranteed returns — especially weekly or monthly — is showing you the oldest red flag there is.",
  },
  {
    icon: AlertTriangle,
    title: "Pressure means no",
    body: "“Only 3 spots left”, “the offer closes tonight” — urgency exists to stop you from thinking. A real opportunity survives a good night’s sleep.",
  },
  {
    icon: PiggyBank,
    title: "Pay yourself first",
    body: "Move something to savings the day money arrives, not with whatever is left over. What is left after spending is usually nothing.",
  },
  {
    icon: TrendingUp,
    title: "Time beats timing",
    body: "Small, regular amounts compounding over years beat any hot tip. Boring, consistent investing is what actually builds wealth.",
  },
  {
    icon: Landmark,
    title: "Learn the account rules",
    body: "Tax-free and retirement accounts have real rules and real limits. Knowing those rules is worth more than any stock tip you will ever get.",
  },
  {
    icon: Users,
    title: "Community is strength — with trust",
    body: "Stokvels and savings clubs work because of discipline and trust between people who know each other. Keep records, and never mix your savings with a stranger’s “investment scheme”.",
  },
];

export default function FinancialLiteracyPage() {
  const [state, setState] = useState<FinlitToolState>(DEFAULT_STATE);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadLocalState<FinlitToolState>(FINLIT_STATE_KEY).then((saved) => {
      if (!cancelled && saved) setState({ ...DEFAULT_STATE, ...saved });
      hydrated.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hydrated.current) void saveLocalState(FINLIT_STATE_KEY, state);
  }, [state]);

  const currency = state.currency;

  const loan = useMemo(() => {
    const input: LoanInput = {
      principal: toNum(state.principal),
      annual_rate: toNum(state.annualRate),
      term_months: Math.max(1, Math.round(toNum(state.termMonths))),
      extra_monthly: toNum(state.extraMonthly),
    };
    if (input.principal <= 0) return null;
    return calcAcceleration(input);
  }, [state.principal, state.annualRate, state.termMonths, state.extraMonthly]);

  const fund: EmergencyFundCalc | null = useMemo(() => {
    const expenses = toNum(state.monthlyExpenses);
    if (expenses <= 0) return null;
    const targetMonths = Math.max(1, Math.round(toNum(state.targetMonths) || 3));
    const target = expenses * targetMonths;
    const saved = toNum(state.currentSaved);
    const contribution = toNum(state.monthlyContribution);
    const remaining = Math.max(0, target - saved);
    const monthsToGoal = contribution > 0 ? Math.ceil(remaining / contribution) : 0;
    return {
      monthly_expenses: expenses,
      target_months: targetMonths,
      target_amount: target,
      current_saved: saved,
      monthly_contribution: contribution,
      months_to_goal: monthsToGoal,
    };
  }, [state.monthlyExpenses, state.targetMonths, state.currentSaved, state.monthlyContribution]);

  const fundProgress =
    fund && fund.target_amount > 0
      ? Math.min(100, Math.round((fund.current_saved / fund.target_amount) * 100))
      : 0;

  const field = (label: string, key: keyof FinlitToolState, hint?: string) => (
    <div className="space-y-1.5" key={key}>
      <label className="text-sm font-medium">{label}</label>
      <Input
        inputMode="decimal"
        value={state[key]}
        onChange={(e) => setState((s) => ({ ...s, [key]: e.target.value }))}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="space-y-3">
        <Badge variant="secondary">Free money tools</Badge>
        <h1 className="text-3xl font-bold tracking-tight">
          Financial literacy that tells you the truth
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Every figure below is arithmetic on your own numbers — not a prediction,
          not a promise, and definitely not a &ldquo;guaranteed return&rdquo;.
          Your inputs stay on your device and work offline.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <Select
            value={state.currency}
            onValueChange={(v) => setState((s) => ({ ...s, currency: v as CurrencyCode }))}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(CURRENCIES).map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="loan" className="space-y-4">
        <TabsList>
          <TabsTrigger value="loan">
            <Calculator className="h-4 w-4 mr-1.5" />
            Loan freedom
          </TabsTrigger>
          <TabsTrigger value="emergency">
            <PiggyBank className="h-4 w-4 mr-1.5" />
            Emergency fund
          </TabsTrigger>
          <TabsTrigger value="truths">
            <BookOpen className="h-4 w-4 mr-1.5" />
            Money truths
          </TabsTrigger>
        </TabsList>

        <TabsContent value="loan" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Your loan
                </CardTitle>
                <CardDescription>
                  See what an extra monthly payment does to your debt.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {field(`Loan amount (${CURRENCIES[currency].symbol})`, "principal")}
                {field("Interest rate (% per year)", "annualRate")}
                {field("Term (months)", "termMonths")}
                {field(
                  `Extra you could pay monthly (${CURRENCIES[currency].symbol})`,
                  "extraMonthly",
                  "Even a small extra amount attacks the principal directly."
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              {loan ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Standard vs accelerated
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Standard payment</span>
                        <span className="font-medium">
                          {fmtFull(loan.standard.monthly_payment, currency)} / month
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Standard payoff</span>
                        <span className="font-medium">{loan.standard.payoff_label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">With extra payment</span>
                        <span className="font-medium">
                          {fmtFull(loan.accelerated.monthly_payment, currency)} / month
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">New payoff</span>
                        <span className="font-medium">{loan.accelerated.payoff_label}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {loan.interest_saved > 0 ? (
                    <Card className="border-green-600/40">
                      <CardContent className="pt-6 space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                          <span className="font-semibold">
                            You save {fmtFull(loan.interest_saved, currency)} in interest
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          and finish {loan.months_saved} months earlier — that is{" "}
                          {loan.percent_time_saved}% less time in debt.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="pt-6 text-sm text-muted-foreground">
                        Add an extra monthly amount to see what you save in interest
                        and time.
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    Enter a loan amount to run the numbers.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            These figures are arithmetic on your inputs, not financial advice.
            Your actual loan may calculate interest differently — ask your lender
            for an amortisation schedule and compare.
          </p>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Your safety net
                </CardTitle>
                <CardDescription>
                  An emergency fund is what stands between one bad month and a loan
                  shark.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {field(`Monthly expenses (${CURRENCIES[currency].symbol})`, "monthlyExpenses")}
                {field("Months of cover you want", "targetMonths", "3 months is a solid first goal.")}
                {field(`Already saved (${CURRENCIES[currency].symbol})`, "currentSaved")}
                {field(`You can put away monthly (${CURRENCIES[currency].symbol})`, "monthlyContribution")}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Your progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fund ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Target</span>
                      <span className="font-medium">{fmtFull(fund.target_amount, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Saved so far</span>
                      <span className="font-medium">{fmtFull(fund.current_saved, currency)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${fundProgress}%` }}
                      />
                    </div>
                    <p className="text-sm font-medium">{fundProgress}% there</p>
                    {fund.current_saved >= fund.target_amount ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-semibold">Goal reached — well done.</span>
                      </div>
                    ) : fund.monthly_contribution > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        At {fmtFull(fund.monthly_contribution, currency)} per month you
                        reach your goal in about {fund.months_to_goal}{" "}
                        {fund.months_to_goal === 1 ? "month" : "months"}.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Add a monthly contribution to see your finish date.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Enter your monthly expenses to set a target.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="truths" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MONEY_TRUTHS.map((truth) => (
              <Card key={truth.title}>
                <CardContent className="pt-6 space-y-2">
                  <truth.icon className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold">{truth.title}</h3>
                  <p className="text-sm text-muted-foreground">{truth.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="pt-6 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-none mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Been offered an &ldquo;investment opportunity&rdquo;?</p>
                <p className="text-sm text-muted-foreground">
                  Ask three questions before anything else: Who regulates this company —
                  and can you find their licence number on the regulator&apos;s own
                  website? Can you withdraw your money at any time? And are the returns
                  &ldquo;guaranteed&rdquo;? If the answers are vague, no, or yes — keep
                  your money.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
