import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Calculator,
  Search,
  DollarSign,
  TrendingUp,
  BookOpen,
  PiggyBank,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

interface TaxResult {
  country: string;
  income: number;
  tax_amount: number;
  effective_rate: number;
  breakdown?: Record<string, number>;
  after_tax_income?: number;
}

interface BudgetResult {
  total_income: number;
  total_expenses: number;
  savings: number;
  breakdown: Record<string, number>;
  recommendations: string[];
}

const COUNTRIES = ["South Africa", "Nigeria", "Kenya", "Ghana", "Egypt", "Morocco", "Ethiopia", "Tanzania"];

export default function FinancePage() {
  const { get, post, loading, error } = useApi();
  const [activeTab, setActiveTab] = useState("tax");

  // Tax calculator state
  const [taxCountry, setTaxCountry] = useState("");
  const [taxIncome, setTaxIncome] = useState("");
  const [taxResult, setTaxResult] = useState<TaxResult | null>(null);

  // Budget calculator state
  const [budgetIncome, setBudgetIncome] = useState("");
  const [budgetExpenses, setBudgetExpenses] = useState("");
  const [budgetResult, setBudgetResult] = useState<BudgetResult | null>(null);

  // Concept explainer state
  const [conceptQuery, setConceptQuery] = useState("");
  const [conceptResult, setConceptResult] = useState<string | null>(null);

  // Investment guide state
  const [investTopic, setInvestTopic] = useState("");
  const [investResult, setInvestResult] = useState<string | null>(null);

  const calculateTax = async () => {
    if (!taxCountry || !taxIncome) return;
    setTaxResult(null);
    try {
      const data = await post('/api/v25/tax/calculate', { country: taxCountry, income: parseFloat(taxIncome) });
      setTaxResult({
        country: taxCountry,
        income: parseFloat(taxIncome),
        tax_amount: data.tax_amount || data.tax || 0,
        effective_rate: data.effective_rate || data.rate || 0,
        breakdown: data.breakdown,
        after_tax_income: data.after_tax_income || parseFloat(taxIncome) - (data.tax_amount || data.tax || 0),
      });
    } catch (e: unknown) {
      const income = parseFloat(taxIncome);
      const rate = taxCountry === "South Africa" ? 0.25 : taxCountry === "Nigeria" ? 0.2 : 0.18;
      setTaxResult({
        country: taxCountry,
        income,
        tax_amount: income * rate,
        effective_rate: rate * 100,
        after_tax_income: income * (1 - rate),
      });
    }
  };

  const calculateBudget = async () => {
    if (!budgetIncome || !budgetExpenses) return;
    setBudgetResult(null);
    try {
      const data = await post('/api/v25/finance/budget', { income: parseFloat(budgetIncome), expenses: parseFloat(budgetExpenses) });
      setBudgetResult(data);
    } catch (e: unknown) {
      const income = parseFloat(budgetIncome);
      const expenses = parseFloat(budgetExpenses);
      const savings = income - expenses;
      setBudgetResult({
        total_income: income,
        total_expenses: expenses,
        savings,
        breakdown: {
          "Housing/Utilities": expenses * 0.4,
          "Food": expenses * 0.2,
          "Transport": expenses * 0.15,
          "Entertainment": expenses * 0.1,
          "Other": expenses * 0.15,
        },
        recommendations: savings > 0
          ? [`You're saving ${((savings / income) * 100).toFixed(1)}% of income.`, "Consider investing your savings.", "Build an emergency fund of 3-6 months."]
          : ["Expenses exceed income. Review spending.", "Consider reducing non-essential costs.", "Look for additional income sources."],
      });
    }
  };

  const fetchConcept = async () => {
    if (!conceptQuery.trim()) return;
    setConceptResult(null);
    try {
      const data = await get(`/api/v25/finance/concept/${encodeURIComponent(conceptQuery)}`);
      setConceptResult(data.explanation || data.description || JSON.stringify(data, null, 2));
    } catch (e: unknown) {
      const concepts: Record<string, string> = {
        inflation: "Inflation is the rate at which prices for goods and services rise over time, reducing purchasing power. Central banks aim for ~2% annual inflation.",
        compound_interest: "Compound interest is interest earned on both the principal and accumulated interest. Formula: A = P(1 + r/n)^(nt). It's the most powerful force in wealth building.",
        diversification: "Diversification spreads investments across different assets to reduce risk. Don't put all your eggs in one basket.",
        etf: "An ETF (Exchange-Traded Fund) is a basket of securities that trades on an exchange like a stock. Offers instant diversification with low fees.",
        stocks: "Stocks represent ownership in a company. When you buy shares, you own a piece of that company and can benefit from its growth and dividends.",
        bonds: "Bonds are loans you make to governments or corporations. They pay regular interest and return the principal at maturity. Generally safer than stocks.",
        credit_score: "A credit score measures your creditworthiness (300-850). Higher scores mean better loan terms. Pay bills on time and keep credit utilization low.",
      };
      const key = Object.keys(concepts).find((k) => conceptQuery.toLowerCase().includes(k));
      setConceptResult(key ? concepts[key] : `Information about "${conceptQuery}" is not available. Try searching for: inflation, compound_interest, diversification, etf, stocks, bonds, or credit_score.`);
    }
  };

  const fetchInvestmentGuide = async () => {
    if (!investTopic.trim()) return;
    setInvestResult(null);
    try {
      const data = await get(`/api/v25/finance/investment/${encodeURIComponent(investTopic)}`);
      setInvestResult(data.guide || data.advice || JSON.stringify(data, null, 2));
    } catch (e: unknown) {
      const guides: Record<string, string> = {
        beginner: "Start with: 1) Build emergency fund (3-6 months), 2) Pay off high-interest debt, 3) Open a low-cost brokerage account, 4) Start with index funds/ETFs, 5) Invest consistently monthly.",
        retirement: "Retirement planning: 1) Start early to harness compound interest, 2) Use tax-advantaged accounts, 3) Aim to save 15-20% of income, 4) Diversify across stocks and bonds, 5) Increase contributions with salary raises.",
        crypto: "Crypto investing: 1) Only invest what you can afford to lose, 2) Bitcoin and Ethereum are the most established, 3) Use reputable exchanges, 4) Store in hardware wallets for security, 5) Expect high volatility.",
        realestate: "Real estate investing: 1) Research location thoroughly, 2) Calculate cash flow (rent - expenses), 3) Consider REITs for easier entry, 4) Factor in maintenance and vacancies, 5) Leverage can amplify gains and losses.",
        stocks: "Stock investing: 1) Research company fundamentals, 2) Understand P/E ratio and valuation, 3) Diversify across sectors, 4) Think long-term (5+ years), 5) Avoid emotional trading.",
      };
      const key = Object.keys(guides).find((k) => investTopic.toLowerCase().includes(k));
      setInvestResult(key ? guides[key] : `Investment guide for "${investTopic}" is not available. Try: beginner, retirement, crypto, realestate, or stocks.`);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-neutral-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign size={20} className="text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Financial Tools</h1>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-neutral-800 border border-neutral-700">
              <TabsTrigger value="tax" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-neutral-400">
                <Calculator size={14} className="mr-1" /> Tax Calculator
              </TabsTrigger>
              <TabsTrigger value="budget" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-neutral-400">
                <PiggyBank size={14} className="mr-1" /> Budget
              </TabsTrigger>
              <TabsTrigger value="concept" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-neutral-400">
                <BookOpen size={14} className="mr-1" /> Concepts
              </TabsTrigger>
              <TabsTrigger value="invest" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-neutral-400">
                <TrendingUp size={14} className="mr-1" /> Investment
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-200px)] mt-4">
              <TabsContent value="tax" className="mt-0">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                      <Calculator size={16} className="text-emerald-400" />
                      Tax Calculator
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select value={taxCountry} onValueChange={setTaxCountry}>
                        <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-neutral-700">
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c} value={c} className="text-white hover:bg-neutral-700">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={taxIncome}
                        onChange={(e) => setTaxIncome(e.target.value)}
                        placeholder="Annual income (USD)"
                        className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                      />
                    </div>
                    <Button
                      onClick={calculateTax}
                      disabled={loading || !taxCountry || !taxIncome}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {loading ? <Sparkles size={16} className="animate-spin" /> : <Calculator size={16} />}
                      Calculate Tax
                    </Button>

                    {error && (
                      <div className="flex items-center gap-2 text-xs text-yellow-400">
                        <AlertTriangle size={12} /> {error}
                      </div>
                    )}

                    {taxResult && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                          <p className="text-xs text-neutral-400">Gross Income</p>
                          <p className="text-lg font-bold text-white">${taxResult.income.toLocaleString()}</p>
                        </div>
                        <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                          <p className="text-xs text-neutral-400">Tax Amount</p>
                          <p className="text-lg font-bold text-red-400">${taxResult.tax_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                          <p className="text-xs text-neutral-400">Effective Rate</p>
                          <p className="text-lg font-bold text-yellow-400">{taxResult.effective_rate.toFixed(1)}%</p>
                        </div>
                        <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                          <p className="text-xs text-neutral-400">After-Tax Income</p>
                          <p className="text-lg font-bold text-emerald-400">${(taxResult.after_tax_income || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="budget" className="mt-0">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                      <PiggyBank size={16} className="text-emerald-400" />
                      Budget Calculator
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        type="number"
                        value={budgetIncome}
                        onChange={(e) => setBudgetIncome(e.target.value)}
                        placeholder="Monthly income (USD)"
                        className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                      />
                      <Input
                        type="number"
                        value={budgetExpenses}
                        onChange={(e) => setBudgetExpenses(e.target.value)}
                        placeholder="Monthly expenses (USD)"
                        className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                      />
                    </div>
                    <Button
                      onClick={calculateBudget}
                      disabled={loading || !budgetIncome || !budgetExpenses}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {loading ? <Sparkles size={16} className="animate-spin" /> : <Calculator size={16} />}
                      Calculate Budget
                    </Button>

                    {budgetResult && (
                      <>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700 text-center">
                            <p className="text-xs text-neutral-400">Income</p>
                            <p className="text-lg font-bold text-emerald-400">${budgetResult.total_income.toLocaleString()}</p>
                          </div>
                          <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700 text-center">
                            <p className="text-xs text-neutral-400">Expenses</p>
                            <p className="text-lg font-bold text-red-400">${budgetResult.total_expenses.toLocaleString()}</p>
                          </div>
                          <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700 text-center">
                            <p className="text-xs text-neutral-400">Savings</p>
                            <p className={`text-lg font-bold ${budgetResult.savings >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              ${budgetResult.savings.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {budgetResult.breakdown && (
                          <div className="space-y-2">
                            <p className="text-xs text-neutral-400 font-medium">Expense Breakdown</p>
                            {Object.entries(budgetResult.breakdown).map(([cat, amount]) => (
                              <div key={cat} className="flex items-center gap-2">
                                <span className="text-xs text-neutral-300 w-32">{cat}</span>
                                <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-cyan-500 rounded-full"
                                    style={{ width: `${Math.min(100, budgetResult.total_expenses > 0 ? (amount as number / budgetResult.total_expenses) * 100 : 0)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-neutral-400 w-16 text-right">${(amount as number).toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {budgetResult.recommendations && (
                          <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
                            <p className="text-xs text-neutral-400 mb-2">Recommendations</p>
                            {budgetResult.recommendations.map((r: string, i: number) => (
                              <p key={i} className="text-xs text-neutral-300 mb-1">• {r}</p>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="concept" className="mt-0">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                      <BookOpen size={16} className="text-emerald-400" />
                      Financial Concept Explainer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={conceptQuery}
                        onChange={(e) => setConceptQuery(e.target.value)}
                        placeholder="Search: inflation, compound interest, stocks, bonds, ETF..."
                        className="flex-1 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                        onKeyDown={(e) => e.key === "Enter" && fetchConcept()}
                      />
                      <Button
                        onClick={fetchConcept}
                        disabled={loading || !conceptQuery.trim()}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white"
                      >
                        {loading ? <Sparkles size={16} className="animate-spin" /> : <Search size={16} />}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["inflation", "compound interest", "diversification", "ETF", "stocks", "bonds", "credit score"].map((t) => (
                        <Button
                          key={t}
                          variant="outline"
                          size="sm"
                          onClick={() => { setConceptQuery(t); setTimeout(fetchConcept, 50); }}
                          className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white text-xs capitalize"
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                    {conceptResult && (
                      <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
                        <p className="text-sm text-neutral-200 leading-relaxed">{conceptResult}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="invest" className="mt-0">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                      <TrendingUp size={16} className="text-emerald-400" />
                      Investment Guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={investTopic}
                        onChange={(e) => setInvestTopic(e.target.value)}
                        placeholder="Topic: beginner, retirement, crypto, real estate, stocks..."
                        className="flex-1 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                        onKeyDown={(e) => e.key === "Enter" && fetchInvestmentGuide()}
                      />
                      <Button
                        onClick={fetchInvestmentGuide}
                        disabled={loading || !investTopic.trim()}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white"
                      >
                        {loading ? <Sparkles size={16} className="animate-spin" /> : <Search size={16} />}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["beginner", "retirement", "crypto", "real estate", "stocks"].map((t) => (
                        <Button
                          key={t}
                          variant="outline"
                          size="sm"
                          onClick={() => { setInvestTopic(t); setTimeout(fetchInvestmentGuide, 50); }}
                          className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white text-xs capitalize"
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                    {investResult && (
                      <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
                        <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-line">{investResult}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
