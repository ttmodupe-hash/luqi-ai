import React, { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calculator,
  Receipt,
  TrendingDown,
  BarChart3,
  ClipboardCheck,
  Loader2,
  AlertTriangle,
  ChevronRight,
  Percent,
  Calendar,
  Building2,
  User,
  Users,
  CheckCircle2,
  Circle,
  TrendingUp,
  Shield,
} from "lucide-react";

/* ─────────── Types ─────────── */

interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
  base_tax: number;
}

interface TaxBracketsResponse {
  year: number;
  brackets: TaxBracket[];
  rebates: Record<string, number>;
  medical_credits: Record<string, number>;
  uif_threshold: number;
  uif_rate: number;
  sdl_rate: number;
}

interface PAYEBreakdown {
  gross_annual: number;
  gross_monthly: number;
  paye_annual: number;
  paye_monthly: number;
  uif_annual: number;
  uif_monthly: number;
  sdl_annual: number;
  sdl_monthly: number;
  medical_credit_annual: number;
  medical_credit_monthly: number;
  primary_rebate_annual: number;
  rebate_annual: number;
  rebate_monthly: number;
  net_tax_annual: number;
  net_tax_monthly: number;
  effective_rate: number;
  take_home_annual: number;
  take_home_monthly: number;
}

interface VATResult {
  amount_excl: number;
  vat_amount: number;
  amount_incl: number;
}

interface DepreciationItem {
  year: number;
  opening_balance: number;
  depreciation: number;
  closing_balance: number;
}

interface FinancialRatiosResult {
  current_ratio: number;
  debt_to_equity: number;
  return_on_equity: number;
  return_on_assets: number;
  net_profit_margin: number;
  interpretations: Record<string, string>;
}

interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  importance: "high" | "medium" | "low";
}

interface AuditChecklistResponse {
  entity_type: string;
  categories: Record<string, ChecklistItem[]>;
}

/* ─────────── Mock Data ─────────── */

const MOCK_TAX_BRACKETS: TaxBracketsResponse = {
  year: 2024,
  brackets: [
    { min: 0, max: 237100, rate: 0.18, base_tax: 0 },
    { min: 237101, max: 370500, rate: 0.26, base_tax: 42678 },
    { min: 370501, max: 512800, rate: 0.31, base_tax: 77362 },
    { min: 512801, max: 673000, rate: 0.36, base_tax: 121475 },
    { min: 673001, max: 857900, rate: 0.39, base_tax: 179147 },
    { min: 857901, max: 1817000, rate: 0.41, base_tax: 251258 },
    { min: 1817001, max: null, rate: 0.45, base_tax: 644489 },
  ],
  rebates: { primary: 17235, secondary: 9444, tertiary: 3145 },
  medical_credits: { main_member: 364, first_dependant: 364, additional_dependant: 246 },
  uif_threshold: 17712,
  uif_rate: 0.01,
  sdl_rate: 0.01,
};

const MOCK_PAYE_RESULT: PAYEBreakdown = {
  gross_annual: 600000,
  gross_monthly: 50000,
  paye_annual: 129258,
  paye_monthly: 10771.5,
  uif_annual: 2125.44,
  uif_monthly: 177.12,
  sdl_annual: 6000,
  sdl_monthly: 500,
  medical_credit_annual: 4368,
  medical_credit_monthly: 364,
  primary_rebate_annual: 17235,
  rebate_annual: 17235,
  rebate_monthly: 1436.25,
  net_tax_annual: 107748.44,
  net_tax_monthly: 8979.04,
  effective_rate: 0.1796,
  take_home_annual: 452251.56,
  take_home_monthly: 37687.63,
};

const MOCK_VAT_RESULT: VATResult = {
  amount_excl: 15789.47,
  vat_amount: 2368.42,
  amount_incl: 18157.89,
};

const MOCK_DEPRECIATION: DepreciationItem[] = [
  { year: 1, opening_balance: 100000, depreciation: 20000, closing_balance: 80000 },
  { year: 2, opening_balance: 80000, depreciation: 20000, closing_balance: 60000 },
  { year: 3, opening_balance: 60000, depreciation: 20000, closing_balance: 40000 },
  { year: 4, opening_balance: 40000, depreciation: 20000, closing_balance: 20000 },
  { year: 5, opening_balance: 20000, depreciation: 20000, closing_balance: 0 },
];

const MOCK_RATIOS: FinancialRatiosResult = {
  current_ratio: 2.14,
  debt_to_equity: 0.65,
  return_on_equity: 0.19,
  return_on_assets: 0.11,
  net_profit_margin: 0.16,
  interpretations: {
    current_ratio: "Good short-term solvency",
    debt_to_equity: "Moderate leverage, manageable risk",
    return_on_equity: "Strong returns for shareholders",
    return_on_assets: "Efficient asset utilisation",
    net_profit_margin: "Healthy profitability",
  },
};

const MOCK_CHECKLIST: AuditChecklistResponse = {
  entity_type: "company",
  categories: {
    "Financial Statements": [
      { id: "1", category: "Financial Statements", description: "Annual financial statements prepared in accordance with IFRS", importance: "high" },
      { id: "2", category: "Financial Statements", description: "Statement of financial position (balance sheet) completed", importance: "high" },
      { id: "3", category: "Financial Statements", description: "Statement of profit or loss completed", importance: "high" },
      { id: "4", category: "Financial Statements", description: "Statement of cash flows completed", importance: "high" },
      { id: "5", category: "Financial Statements", description: "Notes to the financial statements reviewed", importance: "medium" },
    ],
    "Tax Compliance": [
      { id: "6", category: "Tax Compliance", description: "Income tax return (ITR14) filed with SARS", importance: "high" },
      { id: "7", category: "Tax Compliance", description: "VAT return (VAT201) filed and paid on time", importance: "high" },
      { id: "8", category: "Tax Compliance", description: "PAYE/SDL/UIF declarations submitted monthly", importance: "high" },
      { id: "9", category: "Tax Compliance", description: "Transfer pricing documentation current", importance: "medium" },
    ],
    "Governance": [
      { id: "10", category: "Governance", description: "Annual general meeting minutes filed", importance: "high" },
      { id: "11", category: "Governance", description: "Directors' report completed", importance: "high" },
      { id: "12", category: "Governance", description: "Company secretarial records up to date", importance: "medium" },
      { id: "13", category: "Governance", description: "Internal control assessment performed", importance: "medium" },
    ],
    "Documentation": [
      { id: "14", category: "Documentation", description: "All bank statements reconciled", importance: "high" },
      { id: "15", category: "Documentation", description: "Debtors and creditors age analysis reviewed", importance: "medium" },
      { id: "16", category: "Documentation", description: "Fixed asset register verified", importance: "medium" },
      { id: "17", category: "Documentation", description: "Related party transactions disclosed", importance: "high" },
    ],
  },
};

/* ─────────── Helpers ─────────── */

function formatCurrency(value: number): string {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/* ─────────── Sub-Components ─────────── */

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card className="border-neutral-800 bg-neutral-800/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Icon className="h-5 w-5 text-emerald-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      <span className="ml-3 text-neutral-400">Calculating...</span>
    </div>
  );
}

function ErrorFallback({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-400">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div>
        <p className="font-medium">API Unavailable (503)</p>
        <p className="text-sm text-amber-400/80">{message}</p>
      </div>
    </div>
  );
}

function MockBadge() {
  return (
    <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10">
      Demo Data
    </Badge>
  );
}

/* ─────────── Tax Calculator ─────────── */

function TaxCalculator() {
  const { post, loading, error } = useApi();
  const [salary, setSalary] = useState<number>(600000);
  const [age, setAge] = useState<number>(35);
  const [dependants, setDependants] = useState<number>(0);
  const [result, setResult] = useState<PAYEBreakdown | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  const calculate = async () => {
    setUsingMock(false);
    try {
      const res = await post<PAYEBreakdown>("/api/v25/ca/calculate-paye", {
        annual_salary: salary,
        age,
        deductions: { medical_aid_dependants: dependants },
      });
      setResult(res);
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      if (apiError.status === 503 || apiError.status === undefined) {
        setResult({ ...MOCK_PAYE_RESULT, gross_annual: salary, gross_monthly: salary / 12 });
        setUsingMock(true);
      }
    }
  };

  useEffect(() => {
    calculate();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-400">Annual Salary (R)</label>
          <Input
            type="number"
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            className="border-neutral-700 bg-neutral-800 text-white"
            min={0}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-400">Age</label>
          <Input
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="border-neutral-700 bg-neutral-800 text-white"
            min={0}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-400">Medical Aid Dependants</label>
          <Input
            type="number"
            value={dependants}
            onChange={(e) => setDependants(Number(e.target.value))}
            className="border-neutral-700 bg-neutral-800 text-white"
            min={0}
          />
        </div>
      </div>
      <Button onClick={calculate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Calculate PAYE
      </Button>

      {usingMock && <MockBadge />}

      {result && (
        <div className="space-y-4">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-400">Monthly Take-Home</p>
                  <p className="text-3xl font-bold text-emerald-400">{formatCurrency(result.take_home_monthly)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-neutral-400">Effective Tax Rate</p>
                  <p className="text-xl font-semibold text-white">{formatPercent(result.effective_rate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-neutral-800 bg-neutral-800/50">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="px-4 py-3 text-left font-medium text-neutral-400">Component</th>
                    <th className="px-4 py-3 text-right font-medium text-neutral-400">Monthly</th>
                    <th className="px-4 py-3 text-right font-medium text-neutral-400">Annual</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  <tr className="border-b border-neutral-800">
                    <td className="px-4 py-3 text-emerald-400">Gross Income</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(result.gross_monthly)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(result.gross_annual)}</td>
                  </tr>
                  <tr className="border-b border-neutral-800">
                    <td className="px-4 py-3 text-red-400">PAYE</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(result.paye_monthly)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(result.paye_annual)}</td>
                  </tr>
                  <tr className="border-b border-neutral-800">
                    <td className="px-4 py-3 text-red-400">UIF (1%)</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(result.uif_monthly)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(result.uif_annual)}</td>
                  </tr>
                  <tr className="border-b border-neutral-800">
                    <td className="px-4 py-3 text-red-400">SDL (1%)</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(result.sdl_monthly)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(result.sdl_annual)}</td>
                  </tr>
                  <tr className="border-b border-neutral-800">
                    <td className="px-4 py-3 text-emerald-400">Medical Credit</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-400">({formatCurrency(result.medical_credit_monthly)})</td>
                    <td className="px-4 py-3 text-right text-emerald-400">({formatCurrency(result.medical_credit_annual)})</td>
                  </tr>
                  <tr className="border-b border-neutral-800">
                    <td className="px-4 py-3 text-emerald-400">Tax Rebate</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-400">({formatCurrency(result.rebate_monthly)})</td>
                    <td className="px-4 py-3 text-right text-emerald-400">({formatCurrency(result.rebate_annual)})</td>
                  </tr>
                  <tr className="border-b border-neutral-700 bg-neutral-800/80">
                    <td className="px-4 py-3 font-semibold text-red-400">Total Tax Payable</td>
                    <td className="px-4 py-3 text-right font-bold text-red-400">{formatCurrency(result.net_tax_monthly)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-400">{formatCurrency(result.net_tax_annual)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-emerald-400">Net Take-Home</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400">{formatCurrency(result.take_home_monthly)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400">{formatCurrency(result.take_home_annual)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─────────── VAT Calculator ─────────── */

function VATCalculator() {
  const { post, loading, error } = useApi();
  const [amount, setAmount] = useState<number>(18157.89);
  const [vatType, setVatType] = useState<string>("inclusive");
  const [result, setResult] = useState<VATResult | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  const calculate = async () => {
    setUsingMock(false);
    try {
      const res = await post<VATResult>("/api/v25/ca/calculate-vat", {
        amount,
        vat_type: vatType,
      });
      setResult(res);
    } catch (err: unknown) {
      const apiError = err as { status?: number };
      if (apiError.status === 503 || apiError.status === undefined) {
        const vatRate = 0.15;
        if (vatType === "inclusive") {
          const excl = amount / (1 + vatRate);
          setResult({ amount_excl: excl, vat_amount: amount - excl, amount_incl: amount });
        } else {
          const vat = amount * vatRate;
          setResult({ amount_excl: amount, vat_amount: vat, amount_incl: amount + vat });
        }
        setUsingMock(true);
      }
    }
  };

  useEffect(() => {
    calculate();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-400">Amount (R)</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="border-neutral-700 bg-neutral-800 text-white"
            min={0}
            step={0.01}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-400">VAT Type</label>
          <Select value={vatType} onValueChange={setVatType}>
            <SelectTrigger className="border-neutral-700 bg-neutral-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-neutral-700 bg-neutral-800">
              <SelectItem value="inclusive" className="text-white focus:bg-neutral-700 focus:text-white">VAT Inclusive (15%)</SelectItem>
              <SelectItem value="exclusive" className="text-white focus:bg-neutral-700 focus:text-white">VAT Exclusive (15%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={calculate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Calculate VAT
      </Button>

      {usingMock && <MockBadge />}

      {result && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-neutral-800 bg-neutral-800/50">
            <CardContent className="pt-6">
              <p className="text-sm text-neutral-400">Amount Excl. VAT</p>
              <p className="mt-1 text-2xl font-bold text-white">{formatCurrency(result.amount_excl)}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-400">VAT Amount (15%)</p>
              <p className="mt-1 text-2xl font-bold text-blue-400">{formatCurrency(result.vat_amount)}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="pt-6">
              <p className="text-sm text-emerald-400">Amount Incl. VAT</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">{formatCurrency(result.amount_incl)}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─────────── Depreciation ─────────── */

function DepreciationCalculator() {
  const { post, loading, error } = useApi();
  const [cost, setCost] = useState<number>(100000);
  const [method, setMethod] = useState<string>("straight_line");
  const [years, setYears] = useState<number>(5);
  const [result, setResult] = useState<DepreciationItem[]>([]);
  const [usingMock, setUsingMock] = useState(false);

  const calculate = async () => {
    setUsingMock(false);
    try {
      const res = await post<DepreciationItem[]>("/api/v25/ca/depreciation", {
        cost,
        method,
        rate: method === "straight_line" ? 1 / years : 0.2,
      });
      setResult(res);
    } catch (err: unknown) {
      const apiError = err as { status?: number };
      if (apiError.status === 503 || apiError.status === undefined) {
        const schedule: DepreciationItem[] = [];
        let balance = cost;
        const rate = method === "straight_line" ? 1 / years : 0.2;
        for (let y = 1; y <= years; y++) {
          const dep = method === "reducing_balance" ? balance * rate : cost * rate;
          const actualDep = y === years ? balance : dep;
          schedule.push({
            year: y,
            opening_balance: balance,
            depreciation: Math.round(actualDep * 100) / 100,
            closing_balance: Math.round((balance - actualDep) * 100) / 100,
          });
          balance -= actualDep;
          if (balance <= 0.01) break;
        }
        setResult(schedule);
        setUsingMock(true);
      }
    }
  };

  useEffect(() => {
    calculate();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-400">Asset Cost (R)</label>
          <Input
            type="number"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
            className="border-neutral-700 bg-neutral-800 text-white"
            min={0}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-400">Method</label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="border-neutral-700 bg-neutral-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-neutral-700 bg-neutral-800">
              <SelectItem value="straight_line" className="text-white focus:bg-neutral-700 focus:text-white">Straight-Line</SelectItem>
              <SelectItem value="reducing_balance" className="text-white focus:bg-neutral-700 focus:text-white">Reducing Balance (20%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-400">Useful Life (Years)</label>
          <Input
            type="number"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="border-neutral-700 bg-neutral-800 text-white"
            min={1}
            max={50}
          />
        </div>
      </div>
      <Button onClick={calculate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Generate Schedule
      </Button>

      {usingMock && <MockBadge />}

      {result.length > 0 && (
        <Card className="border-neutral-800 bg-neutral-800/50">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="px-4 py-3 text-left font-medium text-neutral-400">Year</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-400">Opening Balance</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-400">Depreciation</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-400">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {result.map((row) => (
                  <tr key={row.year} className="border-b border-neutral-800 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-neutral-500" />
                        Year {row.year}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(row.opening_balance)}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-400">{formatCurrency(row.depreciation)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(row.closing_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─────────── Financial Ratios ─────────── */

function FinancialRatiosCalculator() {
  const { post, loading, error } = useApi();
  const [inputs, setInputs] = useState({
    current_assets: 150000,
    current_liabilities: 70000,
    total_assets: 850000,
    total_liabilities: 350000,
    net_income: 95000,
    revenue: 600000,
    equity: 500000,
  });
  const [result, setResult] = useState<FinancialRatiosResult | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  const handleChange = (field: string, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const calculate = async () => {
    setUsingMock(false);
    try {
      const res = await post<FinancialRatiosResult>("/api/v25/ca/financial-ratios", inputs);
      setResult(res);
    } catch (err: unknown) {
      const apiError = err as { status?: number };
      if (apiError.status === 503 || apiError.status === undefined) {
        const cr = inputs.current_assets / inputs.current_liabilities;
        const de = inputs.equity > 0 ? inputs.total_liabilities / inputs.equity : 0;
        const roe = inputs.equity > 0 ? inputs.net_income / inputs.equity : 0;
        const roa = inputs.total_assets > 0 ? inputs.net_income / inputs.total_assets : 0;
        const npm = inputs.revenue > 0 ? inputs.net_income / inputs.revenue : 0;
        setResult({
          current_ratio: Math.round(cr * 100) / 100,
          debt_to_equity: Math.round(de * 100) / 100,
          return_on_equity: Math.round(roe * 100) / 100,
          return_on_assets: Math.round(roa * 100) / 100,
          net_profit_margin: Math.round(npm * 100) / 100,
          interpretations: {
            current_ratio: cr >= 1.5 ? "Good short-term solvency" : cr >= 1 ? "Adequate liquidity" : "Potential liquidity risk",
            debt_to_equity: de <= 0.5 ? "Conservative leverage" : de <= 1 ? "Moderate leverage" : "High leverage risk",
            return_on_equity: roe >= 0.15 ? "Strong shareholder returns" : roe >= 0.1 ? "Adequate returns" : "Low returns",
            return_on_assets: roa >= 0.1 ? "Efficient asset use" : roa >= 0.05 ? "Moderate efficiency" : "Poor asset utilisation",
            net_profit_margin: npm >= 0.15 ? "Strong profitability" : npm >= 0.1 ? "Healthy margins" : "Thin margins",
          },
        });
        setUsingMock(true);
      }
    }
  };

  useEffect(() => {
    calculate();
  }, []);

  const inputFields = [
    { key: "current_assets", label: "Current Assets (R)", icon: TrendingUp },
    { key: "current_liabilities", label: "Current Liabilities (R)", icon: TrendingDown },
    { key: "total_assets", label: "Total Assets (R)", icon: Building2 },
    { key: "total_liabilities", label: "Total Liabilities (R)", icon: Shield },
    { key: "net_income", label: "Net Income (R)", icon: Receipt },
    { key: "revenue", label: "Revenue (R)", icon: BarChart3 },
    { key: "equity", label: "Shareholders' Equity (R)", icon: Users },
  ];

  const ratioCards = [
    { key: "current_ratio", label: "Current Ratio", goodThreshold: 1.5 },
    { key: "debt_to_equity", label: "Debt-to-Equity", goodThreshold: 0.5 },
    { key: "return_on_equity", label: "Return on Equity", goodThreshold: 0.15 },
    { key: "return_on_assets", label: "Return on Assets", goodThreshold: 0.1 },
    { key: "net_profit_margin", label: "Net Profit Margin", goodThreshold: 0.15 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {inputFields.map(({ key, label, icon: Icon }) => (
          <div key={key}>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-400">
              <Icon className="h-4 w-4" />
              {label}
            </label>
            <Input
              type="number"
              value={inputs[key as keyof typeof inputs]}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              className="border-neutral-700 bg-neutral-800 text-white"
              min={0}
            />
          </div>
        ))}
      </div>
      <Button onClick={calculate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Calculate Ratios
      </Button>

      {usingMock && <MockBadge />}

      {result && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ratioCards.map(({ key, label, goodThreshold }) => {
              const value = result[key as keyof FinancialRatiosResult] as number;
              const isGood = value >= goodThreshold;
              return (
                <Card key={key} className={`border-neutral-800 ${isGood ? "bg-emerald-500/5" : "bg-red-500/5"}`}>
                  <CardContent className="pt-6">
                    <p className="text-sm text-neutral-400">{label}</p>
                    <p className={`mt-1 text-2xl font-bold ${isGood ? "text-emerald-400" : "text-red-400"}`}>
                      {key.includes("margin") || key.includes("return") ? formatPercent(value) : value.toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {result.interpretations[key] || ""}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border-neutral-800 bg-neutral-800/50">
            <CardContent className="pt-6">
              <h4 className="mb-3 text-sm font-medium text-neutral-400">Ratio Interpretation Guide</h4>
              <div className="space-y-2 text-sm text-neutral-300">
                <div className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span><strong className="text-white">Current Ratio &gt; 1.5:</strong> Strong liquidity position, able to meet short-term obligations comfortably.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span><strong className="text-white">Debt-to-Equity &lt; 0.5:</strong> Conservative capital structure, lower financial risk.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span><strong className="text-white">ROE &gt; 15%:</strong> Efficient use of shareholders' capital, strong returns.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span><strong className="text-white">Net Margin &gt; 15%:</strong> Healthy bottom-line profitability per rand of revenue.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─────────── Audit Checklist ─────────── */

function AuditChecklist() {
  const { get, loading, error } = useApi();
  const [entityType, setEntityType] = useState<string>("company");
  const [result, setResult] = useState<AuditChecklistResponse | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const fetchChecklist = async () => {
    setUsingMock(false);
    try {
      const res = await get<AuditChecklistResponse>(`/api/v25/ca/audit-checklist?entity_type=${entityType}`);
      setResult(res);
    } catch (err: unknown) {
      const apiError = err as { status?: number };
      if (apiError.status === 503 || apiError.status === undefined) {
        setResult({ ...MOCK_CHECKLIST, entity_type: entityType });
        setUsingMock(true);
      }
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, [entityType]);

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const importanceColor = (importance: string) => {
    switch (importance) {
      case "high": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      default: return "bg-neutral-500/10 text-neutral-400 border-neutral-500/30";
    }
  };

  const totalItems = result ? Object.values(result.categories).flat().length : 0;
  const checkedCount = checkedItems.size;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="sm:w-72">
          <label className="mb-1.5 block text-sm font-medium text-neutral-400">Entity Type</label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="border-neutral-700 bg-neutral-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-neutral-700 bg-neutral-800">
              <SelectItem value="company" className="text-white focus:bg-neutral-700 focus:text-white">
                <div className="flex items-center gap-2"><Building2 className="h-4 w-4" />Company</div>
              </SelectItem>
              <SelectItem value="individual" className="text-white focus:bg-neutral-700 focus:text-white">
                <div className="flex items-center gap-2"><User className="h-4 w-4" />Individual</div>
              </SelectItem>
              <SelectItem value="trust" className="text-white focus:bg-neutral-700 focus:text-white">
                <div className="flex items-center gap-2"><Shield className="h-4 w-4" />Trust</div>
              </SelectItem>
              <SelectItem value="partnership" className="text-white focus:bg-neutral-700 focus:text-white">
                <div className="flex items-center gap-2"><Users className="h-4 w-4" />Partnership</div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {usingMock && <MockBadge />}
      </div>

      {result && (
        <>
          <Card className="border-neutral-800 bg-neutral-800/50">
            <CardContent className="pt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-neutral-400">Progress</span>
                <span className="text-sm font-medium text-white">{checkedCount} / {totalItems} ({Math.round(progress)}%)</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-700">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="max-h-[600px]">
            <div className="space-y-4">
              {Object.entries(result.categories).map(([category, items]) => (
                <Card key={category} className="border-neutral-800 bg-neutral-800/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                      <ClipboardCheck className="h-4 w-4 text-emerald-400" />
                      {category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {items.map((item) => {
                      const isChecked = checkedItems.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                            isChecked
                              ? "border-emerald-500/30 bg-emerald-500/5"
                              : "border-neutral-700 bg-neutral-800/50 hover:bg-neutral-700/50"
                          }`}
                        >
                          {isChecked ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                          ) : (
                            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500" />
                          )}
                          <div className="flex-1">
                            <p className={`text-sm ${isChecked ? "text-neutral-400 line-through" : "text-white"}`}>
                              {item.description}
                            </p>
                          </div>
                          <Badge variant="outline" className={`shrink-0 text-xs ${importanceColor(item.importance)}`}>
                            {item.importance}
                          </Badge>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}

/* ─────────── Main Page ─────────── */

export default function AccountantPage() {
  const { get, loading: bracketsLoading, error: bracketsError } = useApi();
  const [brackets, setBrackets] = useState<TaxBracketsResponse | null>(null);

  useEffect(() => {
    get<TaxBracketsResponse>("/api/v25/ca/tax-brackets")
      .then(setBrackets)
      .catch(() => setBrackets(MOCK_TAX_BRACKETS));
  }, []);

  const tabs = [
    { value: "tax", label: "Tax Calculator", icon: Calculator },
    { value: "vat", label: "VAT Calculator", icon: Receipt },
    { value: "depreciation", label: "Depreciation", icon: TrendingDown },
    { value: "ratios", label: "Financial Ratios", icon: BarChart3 },
    { value: "audit", label: "Audit Checklist", icon: ClipboardCheck },
  ];

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Calculator className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Chartered Accountant</h1>
            <p className="text-sm text-neutral-400">
              SARS-compliant tax, VAT, depreciation, ratios &amp; audit tools
            </p>
          </div>
          {brackets && (
            <Badge variant="outline" className="ml-auto border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              Tax Year {brackets.year}
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tax" className="space-y-6">
          <TabsList className="border border-neutral-800 bg-neutral-800/80 p-1">
            {tabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-neutral-400 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="tax">
            <SectionCard icon={Calculator} title="PAYE Tax Calculator">
              <TaxCalculator />
            </SectionCard>
          </TabsContent>

          <TabsContent value="vat">
            <SectionCard icon={Receipt} title="VAT Calculator (15%)">
              <VATCalculator />
            </SectionCard>
          </TabsContent>

          <TabsContent value="depreciation">
            <SectionCard icon={TrendingDown} title="Asset Depreciation Schedule">
              <DepreciationCalculator />
            </SectionCard>
          </TabsContent>

          <TabsContent value="ratios">
            <SectionCard icon={BarChart3} title="Financial Ratio Analysis">
              <FinancialRatiosCalculator />
            </SectionCard>
          </TabsContent>

          <TabsContent value="audit">
            <SectionCard icon={ClipboardCheck} title="Year-End Audit Checklist">
              <AuditChecklist />
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
