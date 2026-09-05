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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Droplets,
  Droplet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Info,
  Wrench,
  Calendar,
  Gauge,
  Container,
  Users,
  ShowerHead,
  WashingMachine,
  Coffee,
  Car,
  Leaf,
  Calculator,
  Bell,
  FileText,
  Phone,
  AlertCircle,
} from "lucide-react";

/* Types */

interface WaterSupplyZone {
  zone_id: string;
  name: string;
  municipality: string;
  province: string;
  supply_percent: number;
  status: "normal" | "restricted" | "critical" | "interrupted";
  population_served: number;
  last_updated: string;
}

interface MaintenanceWindow {
  window_id: string;
  zone: string;
  description: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  impact: "low" | "medium" | "high";
  status: "scheduled" | "in_progress" | "completed";
}

interface BurstAlert {
  alert_id: string;
  location: string;
  zone: string;
  severity: "minor" | "major" | "critical";
  reported_at: string;
  estimated_repair: string;
  status: "reported" | "repairing" | "resolved";
  affected_households: number;
}

interface WaterRestriction {
  level: number;
  title: string;
  description: string;
  rules: string[];
  active: boolean;
}

interface ConsumptionEntry {
  activity: string;
  liters_per_use: number;
  uses_per_day: number;
  icon: React.ElementType;
  essential: boolean;
}

interface TankCalculation {
  tank_size_liters: number;
  household_size: number;
  daily_consumption: number;
  days_of_supply: number;
  resilience_level: "low" | "medium" | "high";
}

interface WaterQualityReport {
  report_id: string;
  zone: string;
  date: string;
  ph_level: number;
  turbidity_ntu: number;
  chlorine_mg_l: number;
  ecoli_detected: boolean;
  status: "safe" | "caution" | "unsafe";
}

const SUPPLY_ZONES: WaterSupplyZone[] = [
  { zone_id: "JHB-N", name: "Johannesburg North", municipality: "City of Johannesburg", province: "Gauteng", supply_percent: 87, status: "normal", population_served: 450000, last_updated: "2025-01-15 08:00" },
  { zone_id: "JHB-S", name: "Johannesburg South", municipality: "City of Johannesburg", province: "Gauteng", supply_percent: 62, status: "restricted", population_served: 380000, last_updated: "2025-01-15 08:00" },
  { zone_id: "CPT-C", name: "Cape Town Central", municipality: "City of Cape Town", province: "Western Cape", supply_percent: 94, status: "normal", population_served: 520000, last_updated: "2025-01-15 07:30" },
  { zone_id: "DBN-N", name: "Durban North", municipality: "eThekwini", province: "KwaZulu-Natal", supply_percent: 45, status: "critical", population_served: 290000, last_updated: "2025-01-15 08:15" },
  { zone_id: "PTA-E", name: "Pretoria East", municipality: "City of Tshwane", province: "Gauteng", supply_percent: 78, status: "normal", population_served: 310000, last_updated: "2025-01-15 07:45" },
  { zone_id: "PE-C", name: "Gqeberha Central", municipality: "Nelson Mandela Bay", province: "Eastern Cape", supply_percent: 0, status: "interrupted", population_served: 180000, last_updated: "2025-01-15 06:00" },
];

const MAINTENANCE_WINDOWS: MaintenanceWindow[] = [
  { window_id: "MW-001", zone: "Johannesburg South", description: "Bulk water pipeline replacement", start_date: "2025-01-20", end_date: "2025-01-22", start_time: "08:00", end_time: "17:00", impact: "high", status: "scheduled" },
  { window_id: "MW-002", zone: "Cape Town Central", description: "Reservoir cleaning", start_date: "2025-01-18", end_date: "2025-01-18", start_time: "22:00", end_time: "05:00", impact: "low", status: "scheduled" },
  { window_id: "MW-003", zone: "Durban North", description: "Emergency valve repair", start_date: "2025-01-15", end_date: "2025-01-16", start_time: "06:00", end_time: "18:00", impact: "high", status: "in_progress" },
  { window_id: "MW-004", zone: "Pretoria East", description: "Pressure booster station upgrade", start_date: "2025-01-25", end_date: "2025-01-26", start_time: "07:00", end_time: "19:00", impact: "medium", status: "scheduled" },
];

const BURST_ALERTS: BurstAlert[] = [
  { alert_id: "BA-001", location: "Corner of Main Rd & 5th Ave, Sandton", zone: "Johannesburg North", severity: "major", reported_at: "2025-01-15 06:30", estimated_repair: "2025-01-15 18:00", status: "repairing", affected_households: 2500 },
  { alert_id: "BA-002", location: "N12 Highway, near Gillooly's Interchange", zone: "Johannesburg South", severity: "critical", reported_at: "2025-01-15 04:15", estimated_repair: "2025-01-16 12:00", status: "repairing", affected_households: 12000 },
  { alert_id: "BA-003", location: "Church Street, Pretoria East", zone: "Pretoria East", severity: "minor", reported_at: "2025-01-14 14:20", estimated_repair: "2025-01-15 10:00", status: "resolved", affected_households: 300 },
  { alert_id: "BA-004", location: "Umhlanga Rocks Drive, Durban North", zone: "Durban North", severity: "major", reported_at: "2025-01-15 07:45", estimated_repair: "2025-01-16 20:00", status: "reported", affected_households: 5000 },
];

const RESTRICTIONS: WaterRestriction[] = [
  { level: 1, title: "Level 1 — Voluntary Conservation", description: "Residents asked to reduce non-essential water use voluntarily", rules: ["Water gardens before 06:00 or after 18:00", "Fix leaking taps and pipes promptly", "Use a bucket instead of hosepipe to wash cars"], active: false },
  { level: 2, title: "Level 2 — Moderate Restrictions", description: "Mandatory restrictions on non-essential water use", rules: ["No hosepipe use for gardens or cars", "No filling of swimming pools", "Showers limited to 5 minutes", "No washing of paved surfaces"], active: true },
  { level: 3, title: "Level 3 — Severe Restrictions", description: "Strict water rationing in effect", rules: ["All Level 2 restrictions apply", "Water supply reduced to 12 hours per day", "Industrial users must reduce consumption by 30%", "No irrigation of sports fields", "Car washes closed"], active: false },
  { level: 4, title: "Level 4 — Emergency Measures", description: "Critical water emergency — essential use only", rules: ["Water available 6 hours per day only", "Collection points activated for drinking water", "All commercial car washes and laundromats closed", "Construction sites must use recycled water", "Fines for non-compliance: R5,000-R50,000"], active: false },
];

const CONSUMPTION_ACTIVITIES: ConsumptionEntry[] = [
  { activity: "Shower (5 min)", liters_per_use: 50, uses_per_day: 1, icon: ShowerHead, essential: true },
  { activity: "Toilet Flush", liters_per_use: 9, uses_per_day: 5, icon: Droplets, essential: true },
  { activity: "Drinking & Cooking", liters_per_use: 3, uses_per_day: 3, icon: Coffee, essential: true },
  { activity: "Washing Machine (load)", liters_per_use: 70, uses_per_day: 0.5, icon: WashingMachine, essential: true },
  { activity: "Dishwashing (by hand)", liters_per_use: 20, uses_per_day: 2, icon: Droplet, essential: true },
  { activity: "Garden Watering (10 min)", liters_per_use: 150, uses_per_day: 0, icon: Leaf, essential: false },
  { activity: "Car Wash (bucket)", liters_per_use: 40, uses_per_day: 0, icon: Car, essential: false },
  { activity: "Swimming Pool Top-up", liters_per_use: 500, uses_per_day: 0, icon: Container, essential: false },
];

const QUALITY_REPORTS: WaterQualityReport[] = [
  { report_id: "WQ-001", zone: "Johannesburg North", date: "2025-01-14", ph_level: 7.2, turbidity_ntu: 0.8, chlorine_mg_l: 0.5, ecoli_detected: false, status: "safe" },
  { report_id: "WQ-002", zone: "Johannesburg South", date: "2025-01-14", ph_level: 7.4, turbidity_ntu: 1.2, chlorine_mg_l: 0.4, ecoli_detected: false, status: "safe" },
  { report_id: "WQ-003", zone: "Durban North", date: "2025-01-14", ph_level: 6.8, turbidity_ntu: 4.5, chlorine_mg_l: 0.2, ecoli_detected: true, status: "unsafe" },
  { report_id: "WQ-004", zone: "Cape Town Central", date: "2025-01-14", ph_level: 7.0, turbidity_ntu: 0.3, chlorine_mg_l: 0.6, ecoli_detected: false, status: "safe" },
  { report_id: "WQ-005", zone: "Gqeberha Central", date: "2025-01-14", ph_level: 6.5, turbidity_ntu: 8.2, chlorine_mg_l: 0.1, ecoli_detected: true, status: "unsafe" },
];

/* Helpers */

const getStatusColor = (status: string) => {
  switch (status) {
    case "normal": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "restricted": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "critical": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "interrupted": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const getSupplyBarColor = (percent: number): string => {
  if (percent >= 80) return "bg-blue-500";
  if (percent >= 60) return "bg-cyan-500";
  if (percent >= 40) return "bg-yellow-500";
  if (percent >= 20) return "bg-orange-500";
  return "bg-red-500";
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "minor": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "major": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const getQualityColor = (status: string) => {
  switch (status) {
    case "safe": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "caution": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "unsafe": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const getImpactColor = (impact: string) => {
  switch (impact) {
    case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const SupplyGauge = ({ percent, label }: { percent: number; label: string }) => (
  <div className="text-center">
    <div className="relative w-24 h-24 mx-auto mb-2">
      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#262626" strokeWidth="3" />
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={percent >= 60 ? "#3b82f6" : percent >= 40 ? "#eab308" : "#ef4444"} strokeWidth="3" strokeDasharray={`${percent}, 100`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-white">{percent}%</span>
      </div>
    </div>
    <p className="text-xs text-neutral-400">{label}</p>
  </div>
);

/* Main Component */

export default function WaterPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedZone, setSelectedZone] = useState("JHB-N");
  const [tankSize, setTankSize] = useState("");
  const [householdSize, setHouseholdSize] = useState("4");
  const [dailyUsage, setDailyUsage] = useState("");
  const [calcResult, setCalcResult] = useState<TankCalculation | null>(null);

  const currentZone = useMemo(() => SUPPLY_ZONES.find((z) => z.zone_id === selectedZone) || SUPPLY_ZONES[0], [selectedZone]);
  const activeBursts = useMemo(() => BURST_ALERTS.filter((a) => a.status !== "resolved"), []);
  const activeRestriction = useMemo(() => RESTRICTIONS.find((r) => r.active), []);
  const overallSupply = useMemo(() => Math.round(SUPPLY_ZONES.reduce((acc, z) => acc + z.supply_percent, 0) / SUPPLY_ZONES.length), []);
  const totalAffected = useMemo(() => activeBursts.reduce((acc, a) => acc + a.affected_households, 0), [activeBursts]);

  const handleCalculate = useCallback(() => {
    const tank = parseFloat(tankSize);
    const people = parseInt(householdSize);
    const usage = parseFloat(dailyUsage);
    if (!tank || !people || !usage || tank <= 0 || people <= 0 || usage <= 0) return;
    const totalDailyConsumption = usage * people;
    const daysSupply = Math.floor(tank / totalDailyConsumption);
    let resilience: "low" | "medium" | "high" = "low";
    if (daysSupply >= 7) resilience = "high";
    else if (daysSupply >= 3) resilience = "medium";
    setCalcResult({ tank_size_liters: tank, household_size: people, daily_consumption: totalDailyConsumption, days_of_supply: daysSupply, resilience_level: resilience });
  }, [tankSize, householdSize, dailyUsage]);

  const essentialDailyLitres = useMemo(() => CONSUMPTION_ACTIVITIES.filter((a) => a.essential).reduce((acc, a) => acc + a.liters_per_use * a.uses_per_day, 0), []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Droplets className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Water Services Dashboard</h1>
                <p className="text-neutral-400 text-sm">Municipal water supply monitoring for South Africa</p>
              </div>
            </div>
            <SupplyGauge percent={overallSupply} label="National Avg" />
          </div>
        </div>

        {activeRestriction && (
          <Card className="bg-yellow-500/10 border-yellow-500/30 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-400">{activeRestriction.title}</p>
                  <p className="text-sm text-neutral-300 mt-1">{activeRestriction.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Gauge className="h-6 w-6 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold text-white">{overallSupply}%</p>
              <p className="text-xs text-neutral-500">Avg Supply Level</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Wrench className="h-6 w-6 mx-auto mb-2 text-orange-400" />
              <p className="text-2xl font-bold text-white">{activeBursts.length}</p>
              <p className="text-xs text-neutral-500">Active Repairs</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-yellow-400" />
              <p className="text-2xl font-bold text-white">{totalAffected.toLocaleString()}</p>
              <p className="text-xs text-neutral-500">Households Affected</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-cyan-400" />
              <p className="text-2xl font-bold text-white">{MAINTENANCE_WINDOWS.length}</p>
              <p className="text-xs text-neutral-500">Scheduled Maintenance</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="text-sm text-neutral-400 mb-2 block">Select Supply Zone</label>
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger className="bg-neutral-900 border-neutral-700">
                <SelectValue placeholder="Select zone" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                {SUPPLY_ZONES.map((zone) => (
                  <SelectItem key={zone.zone_id} value={zone.zone_id}>{zone.name} — {zone.municipality}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" className="border-neutral-700"><Bell className="h-4 w-4 mr-2" />Alerts</Button>
            <Button className="bg-blue-600 hover:bg-blue-700"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-neutral-900 border border-neutral-800 p-1 w-full overflow-x-auto">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-neutral-800">Dashboard</TabsTrigger>
            <TabsTrigger value="maintenance" className="data-[state=active]:bg-neutral-800">Maintenance</TabsTrigger>
            <TabsTrigger value="bursts" className="data-[state=active]:bg-neutral-800">Burst Alerts</TabsTrigger>
            <TabsTrigger value="restrictions" className="data-[state=active]:bg-neutral-800">Restrictions</TabsTrigger>
            <TabsTrigger value="calculator" className="data-[state=active]:bg-neutral-800">Calculator</TabsTrigger>
            <TabsTrigger value="quality" className="data-[state=active]:bg-neutral-800">Quality</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SUPPLY_ZONES.map((zone) => (
                <Card key={zone.zone_id} className={`bg-neutral-900 border-neutral-800 cursor-pointer transition-all ${zone.zone_id === selectedZone ? "ring-2 ring-blue-500" : "hover:border-neutral-700"}`} onClick={() => setSelectedZone(zone.zone_id)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-neutral-400" />
                        <span className="font-medium text-white">{zone.name}</span>
                      </div>
                      <Badge variant="outline" className={getStatusColor(zone.status)}>{zone.status}</Badge>
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-neutral-400">Supply Level</span>
                        <span className="text-white font-medium">{zone.supply_percent}%</span>
                      </div>
                      <div className="w-full bg-neutral-800 rounded-full h-3">
                        <div className={`h-3 rounded-full transition-all ${getSupplyBarColor(zone.supply_percent)}`} style={{ width: `${zone.supply_percent}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-neutral-500">
                      <span>{zone.province}</span>
                      <span>{(zone.population_served / 1000).toFixed(0)}k people</span>
                    </div>
                    <p className="text-xs text-neutral-600 mt-2">Updated: {zone.last_updated}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Gauge className="h-5 w-5 text-blue-400" />
                  {currentZone.name} — Detailed Status
                </CardTitle>
                <CardDescription>{currentZone.municipality} • {currentZone.province}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-neutral-800 rounded-lg p-4 text-center">
                    <Droplets className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                    <p className="text-3xl font-bold text-white">{currentZone.supply_percent}%</p>
                    <p className="text-sm text-neutral-400">Current Supply</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-4 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-cyan-400" />
                    <p className="text-3xl font-bold text-white">{(currentZone.population_served / 1000).toFixed(0)}k</p>
                    <p className="text-sm text-neutral-400">People Served</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-4 text-center">
                    {currentZone.status === "normal" ? <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" /> : currentZone.status === "interrupted" ? <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" /> : <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-400" />}
                    <p className="text-lg font-bold text-white capitalize">{currentZone.status}</p>
                    <p className="text-sm text-neutral-400">Supply Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Wrench className="h-5 w-5 text-orange-400" />
                  Active Repairs in {currentZone.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {BURST_ALERTS.filter((a) => a.zone === currentZone.name && a.status !== "resolved").length === 0 ? (
                  <div className="text-center py-6 text-neutral-500">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-400" />
                    <p>No active repairs in this zone</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {BURST_ALERTS.filter((a) => a.zone === currentZone.name && a.status !== "resolved").map((alert) => (
                      <div key={alert.alert_id} className="flex items-start gap-3 p-4 bg-neutral-800 rounded-lg border-l-4 border-orange-500">
                        <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-white">{alert.location}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-neutral-400">
                            <span>Reported: {alert.reported_at}</span>
                            <span>Est. Repair: {alert.estimated_repair}</span>
                            <span>{alert.affected_households.toLocaleString()} households</span>
                          </div>
                        </div>
                        <Badge variant="outline" className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calendar className="h-5 w-5 text-cyan-400" />
                  Scheduled Maintenance Windows
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {MAINTENANCE_WINDOWS.map((mw) => (
                    <div key={mw.window_id} className={`p-4 rounded-lg border ${mw.status === "in_progress" ? "bg-orange-500/10 border-orange-500/30" : "bg-neutral-800 border-neutral-700"}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Wrench className={`h-5 w-5 ${mw.status === "in_progress" ? "text-orange-400" : "text-neutral-400"}`} />
                          <div>
                            <p className="font-medium text-white">{mw.description}</p>
                            <p className="text-sm text-neutral-400">{mw.zone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getImpactColor(mw.impact)}>{mw.impact} impact</Badge>
                          <Badge variant="outline" className={mw.status === "in_progress" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : mw.status === "completed" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}>{mw.status === "in_progress" ? "In Progress" : mw.status}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 mt-3 text-sm text-neutral-400">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{mw.start_date} — {mw.end_date}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{mw.start_time} — {mw.end_time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bursts" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  Infrastructure Burst Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {BURST_ALERTS.map((alert) => (
                    <div key={alert.alert_id} className={`p-4 rounded-lg border-l-4 ${alert.severity === "critical" ? "border-red-500 bg-red-500/5" : alert.severity === "major" ? "border-orange-500 bg-orange-500/5" : "border-yellow-500 bg-yellow-500/5"}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-white">{alert.location}</p>
                          <p className="text-sm text-neutral-400">{alert.zone}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                          <Badge variant="outline" className={alert.status === "resolved" ? "bg-green-500/20 text-green-400 border-green-500/30" : alert.status === "repairing" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>{alert.status}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                        <div><p className="text-neutral-500">Reported</p><p className="text-white">{alert.reported_at}</p></div>
                        <div><p className="text-neutral-500">Est. Repair</p><p className="text-white">{alert.estimated_repair}</p></div>
                        <div><p className="text-neutral-500">Households</p><p className="text-white">{alert.affected_households.toLocaleString()}</p></div>
                        <div><p className="text-neutral-500">Zone</p><p className="text-white">{alert.zone}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Phone className="h-5 w-5 text-blue-400" />
                  Report a Water Issue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { name: "Joburg Water", phone: "011 688 1400" },
                    { name: "Cape Town Water", phone: "0860 103 089" },
                    { name: "eThekwini Water", phone: "031 311 1111" },
                    { name: "Tshwane Water", phone: "012 358 9999" },
                  ].map((contact, i) => (
                    <div key={i} className="bg-neutral-800 rounded-lg p-4 text-center">
                      <Phone className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                      <p className="font-medium text-white">{contact.name}</p>
                      <p className="text-lg text-blue-400 font-bold">{contact.phone}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restrictions" className="space-y-6">
            {RESTRICTIONS.map((r) => (
              <Card key={r.level} className={`bg-neutral-900 border-neutral-800 ${r.active ? "ring-2 ring-yellow-500" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${r.level <= 1 ? "bg-green-500" : r.level <= 2 ? "bg-yellow-500" : r.level <= 3 ? "bg-orange-500" : "bg-red-500"}`}>{r.level}</div>
                      <div>
                        <h3 className="font-bold text-white">{r.title}</h3>
                        <p className="text-sm text-neutral-400">{r.description}</p>
                      </div>
                    </div>
                    {r.active && <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">CURRENTLY ACTIVE</Badge>}
                  </div>
                  <div className="mt-3 pt-3 border-t border-neutral-800">
                    <p className="text-xs text-neutral-500 mb-2">Rules:</p>
                    <ul className="space-y-1">
                      {r.rules.map((rule, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                          <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="calculator" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Calculator className="h-5 w-5 text-blue-400" />
                    Water Resilience Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-neutral-400 mb-2 block">Tank Size (Litres)</label>
                      <Input type="number" value={tankSize} onChange={(e) => setTankSize(e.target.value)} placeholder="e.g., 5000" className="bg-neutral-800 border-neutral-700" />
                      <p className="text-xs text-neutral-500 mt-1">Common: 2,500L / 5,000L / 10,000L</p>
                    </div>
                    <div>
                      <label className="text-sm text-neutral-400 mb-2 block">Household Size</label>
                      <Select value={householdSize} onValueChange={setHouseholdSize}>
                        <SelectTrigger className="bg-neutral-800 border-neutral-700"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-neutral-900 border-neutral-700">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n} {n === 1 ? "person" : "people"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-neutral-400 mb-2 block">Daily Usage per Person (L)</label>
                      <Input type="number" value={dailyUsage} onChange={(e) => setDailyUsage(e.target.value)} placeholder={`Recommended: ${Math.round(essentialDailyLitres)}`} className="bg-neutral-800 border-neutral-700" />
                      <p className="text-xs text-neutral-500 mt-1">Essential only: ~{Math.round(essentialDailyLitres)}L per person/day</p>
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleCalculate} disabled={!tankSize || !dailyUsage}>
                      <Calculator className="h-4 w-4 mr-2" />Calculate Supply Duration
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Gauge className="h-5 w-5 text-cyan-400" />Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {calcResult ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-5xl font-bold text-blue-400 mb-2">{calcResult.days_of_supply}</p>
                        <p className="text-neutral-400">Days of Supply</p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between p-3 bg-neutral-800 rounded-lg">
                          <span className="text-neutral-400">Tank Size</span>
                          <span className="text-white font-medium">{calcResult.tank_size_liters.toLocaleString()}L</span>
                        </div>
                        <div className="flex justify-between p-3 bg-neutral-800 rounded-lg">
                          <span className="text-neutral-400">Household</span>
                          <span className="text-white font-medium">{calcResult.household_size} people</span>
                        </div>
                        <div className="flex justify-between p-3 bg-neutral-800 rounded-lg">
                          <span className="text-neutral-400">Daily Use</span>
                          <span className="text-white font-medium">{calcResult.daily_consumption.toLocaleString()}L/day</span>
                        </div>
                        <div className={`flex justify-between p-3 rounded-lg ${calcResult.resilience_level === "high" ? "bg-green-500/10 border border-green-500/20" : calcResult.resilience_level === "medium" ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                          <span className="text-neutral-300">Resilience</span>
                          <Badge className={calcResult.resilience_level === "high" ? "bg-green-500/20 text-green-400" : calcResult.resilience_level === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}>{calcResult.resilience_level.toUpperCase()}</Badge>
                        </div>
                      </div>
                      {calcResult.days_of_supply < 3 && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                          <p className="text-sm text-red-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Consider a larger tank or reduce daily consumption</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-500">
                      <Container className="h-12 w-12 mx-auto mb-4 text-neutral-600" />
                      <p>Enter tank details to calculate supply duration</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Info className="h-5 w-5 text-blue-400" />
                  Daily Water Consumption Reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {CONSUMPTION_ACTIVITIES.map((activity, i) => {
                    const Icon = activity.icon;
                    return (
                      <div key={i} className="bg-neutral-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-medium text-white">{activity.activity}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-blue-400 font-bold">{activity.liters_per_use}L</span>
                          <Badge variant="outline" className={activity.essential ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs" : "bg-neutral-700 text-neutral-400 border-neutral-600 text-xs"}>{activity.essential ? "essential" : "optional"}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="h-5 w-5 text-blue-400" />
                  Water Quality Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {QUALITY_REPORTS.map((report) => (
                    <div key={report.report_id} className={`p-4 rounded-lg border ${report.status === "safe" ? "bg-green-500/5 border-green-500/20" : report.status === "unsafe" ? "bg-red-500/5 border-red-500/20" : "bg-yellow-500/5 border-yellow-500/20"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-neutral-400" />
                          <span className="font-medium text-white">{report.zone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getQualityColor(report.status)}>{report.status.toUpperCase()}</Badge>
                          <span className="text-xs text-neutral-500">{report.date}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div className="bg-neutral-800 rounded-lg p-2 text-center">
                          <p className="text-neutral-500 text-xs">pH Level</p>
                          <p className="text-white font-medium">{report.ph_level}</p>
                        </div>
                        <div className="bg-neutral-800 rounded-lg p-2 text-center">
                          <p className="text-neutral-500 text-xs">Turbidity (NTU)</p>
                          <p className="text-white font-medium">{report.turbidity_ntu}</p>
                        </div>
                        <div className="bg-neutral-800 rounded-lg p-2 text-center">
                          <p className="text-neutral-500 text-xs">Chlorine (mg/L)</p>
                          <p className="text-white font-medium">{report.chlorine_mg_l}</p>
                        </div>
                        <div className="bg-neutral-800 rounded-lg p-2 text-center">
                          <p className="text-neutral-500 text-xs">E. Coli</p>
                          <p className={`font-medium ${report.ecoli_detected ? "text-red-400" : "text-green-400"}`}>{report.ecoli_detected ? "DETECTED" : "None"}</p>
                        </div>
                        <div className="bg-neutral-800 rounded-lg p-2 text-center">
                          <p className="text-neutral-500 text-xs">Status</p>
                          <p className={`font-medium ${report.status === "safe" ? "text-green-400" : report.status === "unsafe" ? "text-red-400" : "text-yellow-400"}`}>{report.status.toUpperCase()}</p>
                        </div>
                      </div>
                      {report.status === "unsafe" && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-sm text-red-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Do not drink tap water. Boil for at least 1 minute before use.</p>
                        </div>
                      )}
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
