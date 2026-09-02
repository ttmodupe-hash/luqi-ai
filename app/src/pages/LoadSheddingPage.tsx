import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Zap,
  ZapOff,
  Clock,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Battery,
  BatteryCharging,
  Timer,
  RefreshCw,
  Info,
  Flame,
  Snowflake,
  Tv,
  Wifi,
  Coffee,
  Refrigerator,
  WashingMachine,
  AirVent,
  Heater,
  Laptop,
  ShowerHead,
  Microwave,
} from "lucide-react";

/* Types */

interface LoadSheddingStage {
  stage: number;
  description: string;
  hours_per_day: number;
  slots_per_day: number;
  megawatts_saved: string;
  severity: "low" | "medium" | "high" | "critical";
}

interface TimeSlot {
  slot_id: string;
  start_time: string;
  end_time: string;
  stage: number;
  area: string;
  status: "active" | "upcoming" | "completed";
}

interface Area {
  area_id: string;
  name: string;
  municipality: string;
  province: string;
  current_stage: number;
  next_slot: TimeSlot | null;
}

interface ChecklistItem {
  item_id: string;
  label: string;
  category: "before" | "during" | "after";
  completed: boolean;
  priority: "high" | "medium" | "low";
}

interface Province {
  code: string;
  name: string;
  municipalities: string[];
}

/* Stage Definitions */

const LOAD_SHEDDING_STAGES: LoadSheddingStage[] = [
  { stage: 1, description: "1,000 MW offline", hours_per_day: 2, slots_per_day: 1, megawatts_saved: "1,000 MW", severity: "low" },
  { stage: 2, description: "2,000 MW offline", hours_per_day: 4, slots_per_day: 2, megawatts_saved: "2,000 MW", severity: "low" },
  { stage: 3, description: "3,000 MW offline", hours_per_day: 6, slots_per_day: 3, megawatts_saved: "3,000 MW", severity: "medium" },
  { stage: 4, description: "4,000 MW offline", hours_per_day: 8, slots_per_day: 4, megawatts_saved: "4,000 MW", severity: "medium" },
  { stage: 5, description: "5,000 MW offline", hours_per_day: 10, slots_per_day: 5, megawatts_saved: "5,000 MW", severity: "high" },
  { stage: 6, description: "6,000 MW offline", hours_per_day: 12, slots_per_day: 6, megawatts_saved: "6,000 MW", severity: "high" },
  { stage: 7, description: "7,000 MW offline", hours_per_day: 14, slots_per_day: 7, megawatts_saved: "7,000 MW", severity: "critical" },
  { stage: 8, description: "8,000 MW offline", hours_per_day: 16, slots_per_day: 8, megawatts_saved: "8,000 MW", severity: "critical" },
];

/* Mock Areas */

const MOCK_AREAS: Area[] = [
  {
    area_id: "JHB-CBD",
    name: "Johannesburg CBD",
    municipality: "City of Johannesburg",
    province: "Gauteng",
    current_stage: 4,
    next_slot: { slot_id: "S-001", start_time: "18:00", end_time: "20:30", stage: 4, area: "Johannesburg CBD", status: "upcoming" },
  },
  {
    area_id: "CPT-CENTRAL",
    name: "Cape Town Central",
    municipality: "City of Cape Town",
    province: "Western Cape",
    current_stage: 4,
    next_slot: { slot_id: "S-002", start_time: "20:00", end_time: "22:30", stage: 4, area: "Cape Town Central", status: "upcoming" },
  },
  {
    area_id: "DBN-NORTH",
    name: "Durban North",
    municipality: "eThekwini",
    province: "KwaZulu-Natal",
    current_stage: 3,
    next_slot: { slot_id: "S-003", start_time: "16:00", end_time: "18:30", stage: 3, area: "Durban North", status: "upcoming" },
  },
  {
    area_id: "PTA-EAST",
    name: "Pretoria East",
    municipality: "City of Tshwane",
    province: "Gauteng",
    current_stage: 4,
    next_slot: { slot_id: "S-004", start_time: "14:00", end_time: "16:30", stage: 4, area: "Pretoria East", status: "completed" },
  },
];

/* Schedule */

const MOCK_SCHEDULE: TimeSlot[] = [
  { slot_id: "S-001", start_time: "06:00", end_time: "08:30", stage: 4, area: "Johannesburg CBD", status: "completed" },
  { slot_id: "S-002", start_time: "14:00", end_time: "16:30", stage: 4, area: "Johannesburg CBD", status: "completed" },
  { slot_id: "S-003", start_time: "18:00", end_time: "20:30", stage: 4, area: "Johannesburg CBD", status: "upcoming" },
  { slot_id: "S-004", start_time: "22:00", end_time: "00:30", stage: 4, area: "Johannesburg CBD", status: "upcoming" },
];

/* Checklist */

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { item_id: "CHK-001", label: "Charge all devices (phones, laptops, power banks)", category: "before", completed: false, priority: "high" },
  { item_id: "CHK-002", label: "Fill water bottles and containers", category: "before", completed: false, priority: "high" },
  { item_id: "CHK-003", label: "Prepare flashlights and candles", category: "before", completed: false, priority: "medium" },
  { item_id: "CHK-004", label: "Set fridge/freezer to coldest setting", category: "before", completed: false, priority: "medium" },
  { item_id: "CHK-005", label: "Cook meals in advance if possible", category: "before", completed: false, priority: "medium" },
  { item_id: "CHK-006", label: "Fill bathtubs/buckets with water for flushing", category: "before", completed: false, priority: "low" },
  { item_id: "CHK-007", label: "Locate candles, matches, and torches", category: "before", completed: false, priority: "high" },
  { item_id: "CHK-008", label: "Ensure gas bottle is filled (if applicable)", category: "before", completed: false, priority: "medium" },
  { item_id: "CHK-009", label: "Turn off and unplug non-essential appliances", category: "during", completed: false, priority: "high" },
  { item_id: "CHK-010", label: "Keep fridge and freezer doors closed", category: "during", completed: false, priority: "high" },
  { item_id: "CHK-011", label: "Use battery-powered lights instead of candles", category: "during", completed: false, priority: "medium" },
  { item_id: "CHK-012", label: "Avoid opening electric gates manually", category: "during", completed: false, priority: "low" },
  { item_id: "CHK-013", label: "Check on elderly neighbours or family", category: "during", completed: false, priority: "medium" },
  { item_id: "CHK-014", label: "Wait 10 minutes before switching geyser back on", category: "after", completed: false, priority: "high" },
  { item_id: "CHK-015", label: "Check food in fridge for spoilage", category: "after", completed: false, priority: "medium" },
  { item_id: "CHK-016", label: "Reset alarm clocks and timers", category: "after", completed: false, priority: "low" },
  { item_id: "CHK-017", label: "Report power surges to municipality", category: "after", completed: false, priority: "medium" },
  { item_id: "CHK-018", label: "Recharge all battery packs and devices", category: "after", completed: false, priority: "high" },
];

/* Provinces */

const PROVINCES: Province[] = [
  { code: "GP", name: "Gauteng", municipalities: ["Johannesburg", "Tshwane", "Ekurhuleni"] },
  { code: "WC", name: "Western Cape", municipalities: ["Cape Town", "Stellenbosch", "George"] },
  { code: "KZN", name: "KwaZulu-Natal", municipalities: ["eThekwini", "Msunduzi", "uMhlathuze"] },
  { code: "EC", name: "Eastern Cape", municipalities: ["Nelson Mandela Bay", "Buffalo City"] },
  { code: "LP", name: "Limpopo", municipalities: ["Polokwane", "Thulamela"] },
  { code: "MP", name: "Mpumalanga", municipalities: ["Mbombela", "Emalahleni"] },
  { code: "NW", name: "North West", municipalities: ["Rustenburg", "Mahikeng"] },
  { code: "FS", name: "Free State", municipalities: ["Mangaung", "Matjhabeng"] },
  { code: "NC", name: "Northern Cape", municipalities: ["Sol Plaatje", "Namakwa"] },
];

/* Helpers */

const getStageColor = (stage: number): string => {
  if (stage <= 2) return "bg-green-500";
  if (stage <= 4) return "bg-yellow-500";
  if (stage <= 6) return "bg-orange-500";
  return "bg-red-500";
};

const getStageTextColor = (stage: number): string => {
  if (stage <= 2) return "text-green-400";
  if (stage <= 4) return "text-yellow-400";
  if (stage <= 6) return "text-orange-400";
  return "text-red-400";
};

const getStageBgColor = (stage: number): string => {
  if (stage <= 2) return "bg-green-500/10";
  if (stage <= 4) return "bg-yellow-500/10";
  if (stage <= 6) return "bg-orange-500/10";
  return "bg-red-500/10";
};

const getStageBorderColor = (stage: number): string => {
  if (stage <= 2) return "border-green-500/30";
  if (stage <= 4) return "border-yellow-500/30";
  if (stage <= 6) return "border-orange-500/30";
  return "border-red-500/30";
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "upcoming": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "completed": return "bg-neutral-700 text-neutral-400 border-neutral-600";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

/* Countdown Hook */

function useCountdown(targetTime: string | null) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!targetTime) return;

    const calculate = () => {
      const now = new Date();
      const [h, m] = targetTime.split(":").map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);

      const diff = target.getTime() - now.getTime();
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  return timeLeft;
}

/* Sub-Components */

const StageIndicator = ({ stage, size = "md" }: { stage: number; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-12 h-12 text-lg", lg: "w-16 h-16 text-2xl" };
  return (
    <div className={`${sizeClasses[size]} ${getStageColor(stage)} rounded-full flex items-center justify-center font-bold text-white`}>
      {stage}
    </div>
  );
};

const SlotCard = ({ slot }: { slot: TimeSlot }) => (
  <div className={`flex items-center justify-between p-3 rounded-lg border ${
    slot.status === "active" ? "bg-red-500/10 border-red-500/30"
    : slot.status === "upcoming" ? "bg-yellow-500/10 border-yellow-500/20"
    : "bg-neutral-800 border-neutral-700"
  }`}>
    <div className="flex items-center gap-3">
      {slot.status === "active" ? <ZapOff className="h-5 w-5 text-red-400" />
      : slot.status === "upcoming" ? <Timer className="h-5 w-5 text-yellow-400" />
      : <CheckCircle2 className="h-5 w-5 text-neutral-500" />}
      <div>
        <p className={`font-medium ${slot.status === "completed" ? "text-neutral-500 line-through" : "text-white"}`}>
          {slot.start_time} — {slot.end_time}
        </p>
        <p className="text-xs text-neutral-500">{slot.area}</p>
      </div>
    </div>
    <Badge variant="outline" className={getStatusBadge(slot.status)}>
      {slot.status === "active" ? "ACTIVE" : slot.status === "upcoming" ? "Upcoming" : "Done"}
    </Badge>
  </div>
);

const ChecklistItemRow = ({ item, onToggle }: { item: ChecklistItem; onToggle: (id: string) => void }) => (
  <button
    onClick={() => onToggle(item.item_id)}
    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
      item.completed ? "bg-green-500/10 border border-green-500/20" : "bg-neutral-800 hover:bg-neutral-750 border border-transparent"
    }`}
  >
    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
      item.completed ? "bg-green-500 border-green-500" : "border-neutral-600"
    }`}>
      {item.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
    </div>
    <span className={`flex-1 text-sm ${item.completed ? "text-green-400 line-through" : "text-white"}`}>
      {item.label}
    </span>
    <Badge variant="outline" className={
      item.priority === "high" ? "bg-red-500/20 text-red-400 border-red-500/30"
      : item.priority === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      : "bg-green-500/20 text-green-400 border-green-500/30"
    }>
      {item.priority}
    </Badge>
  </button>
);

/* Main Component */

export default function LoadSheddingPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProvince, setSelectedProvince] = useState("GP");
  const [selectedArea, setSelectedArea] = useState("JHB-CBD");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);

  const currentArea = useMemo(
    () => MOCK_AREAS.find((a) => a.area_id === selectedArea) || MOCK_AREAS[0],
    [selectedArea]
  );

  const currentStage = useMemo(
    () => LOAD_SHEDDING_STAGES.find((s) => s.stage === currentArea.current_stage) || LOAD_SHEDDING_STAGES[0],
    [currentArea]
  );

  const nextSlot = currentArea.next_slot;
  const countdown = useCountdown(nextSlot?.start_time || null);

  const checklistProgress = useMemo(() => {
    const done = checklist.filter((i) => i.completed).length;
    return Math.round((done / checklist.length) * 100);
  }, [checklist]);

  const groupedChecklist = useMemo(() => ({
    before: checklist.filter((i) => i.category === "before"),
    during: checklist.filter((i) => i.category === "during"),
    after: checklist.filter((i) => i.category === "after"),
  }), [checklist]);

  const toggleChecklistItem = useCallback((itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) => item.item_id === itemId ? { ...item, completed: !item.completed } : item)
    );
  }, []);

  const resetChecklist = useCallback(() => {
    setChecklist(DEFAULT_CHECKLIST.map((i) => ({ ...i, completed: false })));
  }, []);

  const todaySlots = useMemo(
    () => MOCK_SCHEDULE.filter((s) => s.area === currentArea.name),
    [currentArea]
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${getStageBgColor(currentStage.stage)}`}>
                <Zap className={`h-8 w-8 ${getStageTextColor(currentStage.stage)}`} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Load Shedding Tracker</h1>
                <p className="text-neutral-400 text-sm">South Africa • Real-time Eskom schedules</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StageIndicator stage={currentStage.stage} size="lg" />
              <div className="text-right">
                <p className={`text-lg font-bold ${getStageTextColor(currentStage.stage)}`}>
                  Stage {currentStage.stage}
                </p>
                <p className="text-xs text-neutral-500">{currentStage.megawatts_saved}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Countdown Banner */}
        {nextSlot && (
          <Card className={`${getStageBgColor(currentStage.stage)} ${getStageBorderColor(currentStage.stage)} mb-6`}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-6 w-6 ${getStageTextColor(currentStage.stage)}`} />
                  <div>
                    <p className="font-medium text-white">
                      Next outage: {nextSlot.start_time} — {nextSlot.end_time}
                    </p>
                    <p className="text-sm text-neutral-400">{nextSlot.area}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-3xl font-bold text-white">{String(countdown.hours).padStart(2, "0")}</span>
                  <span className="text-neutral-400">:</span>
                  <span className="text-3xl font-bold text-white">{String(countdown.minutes).padStart(2, "0")}</span>
                  <span className="text-neutral-400">:</span>
                  <span className={`text-3xl font-bold ${getStageTextColor(currentStage.stage)}`}>
                    {String(countdown.seconds).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Zap className={`h-6 w-6 mx-auto mb-2 ${getStageTextColor(currentStage.stage)}`} />
              <p className="text-2xl font-bold text-white">{currentStage.hours_per_day}h</p>
              <p className="text-xs text-neutral-500">Hours Without Power</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold text-white">{currentStage.slots_per_day}</p>
              <p className="text-xs text-neutral-500">Outages Today</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-bold text-white">{checklistProgress}%</p>
              <p className="text-xs text-neutral-500">Checklist Done</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <MapPin className="h-6 w-6 mx-auto mb-2 text-purple-400" />
              <p className="text-lg font-bold text-white truncate">{currentArea.name}</p>
              <p className="text-xs text-neutral-500">{currentArea.province}</p>
            </CardContent>
          </Card>
        </div>

        {/* Area Selection */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="text-sm text-neutral-400 mb-2 block">Province</label>
            <Select value={selectedProvince} onValueChange={setSelectedProvince}>
              <SelectTrigger className="bg-neutral-900 border-neutral-700">
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                {PROVINCES.map((p) => (
                  <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm text-neutral-400 mb-2 block">Area / Suburb</label>
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger className="bg-neutral-900 border-neutral-700">
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                {MOCK_AREAS.map((area) => (
                  <SelectItem key={area.area_id} value={area.area_id}>
                    {area.name} — {area.municipality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-neutral-900 border border-neutral-800 p-1 w-full overflow-x-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-neutral-800">Overview</TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-neutral-800">Schedule</TabsTrigger>
            <TabsTrigger value="stages" className="data-[state=active]:bg-neutral-800">Stage Guide</TabsTrigger>
            <TabsTrigger value="checklist" className="data-[state=active]:bg-neutral-800">Checklist</TabsTrigger>
            <TabsTrigger value="savings" className="data-[state=active]:bg-neutral-800">Energy Tips</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  Today's Outages — {currentArea.name}
                </CardTitle>
                <CardDescription>
                  Stage {currentStage.stage} • {todaySlots.length} slots scheduled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todaySlots.length > 0 ? (
                    todaySlots.map((slot) => <SlotCard key={slot.slot_id} slot={slot} />)
                  ) : (
                    <div className="text-center py-8 text-neutral-500">
                      <Zap className="h-12 w-12 mx-auto mb-2 text-green-400" />
                      <p>No load shedding scheduled today</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Lightbulb className="h-5 w-5 text-yellow-400" />
                  Quick Preparation Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { icon: Battery, text: "Charge all devices before outage", color: "text-green-400" },
                    { icon: Flame, text: "Use gas for cooking and heating", color: "text-orange-400" },
                    { icon: Snowflake, text: "Keep fridge closed to preserve food", color: "text-blue-400" },
                  ].map((tip, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-neutral-800 rounded-lg">
                      <tip.icon className={`h-6 w-6 ${tip.color}`} />
                      <p className="text-sm text-neutral-300">{tip.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCHEDULE TAB */}
          <TabsContent value="schedule" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  7-Day Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="text-left py-3 px-4 text-neutral-400 font-medium">Day</th>
                        <th className="text-center py-3 px-4 text-neutral-400 font-medium">Stage</th>
                        <th className="text-center py-3 px-4 text-neutral-400 font-medium">Outages</th>
                        <th className="text-left py-3 px-4 text-neutral-400 font-medium">Time Slots</th>
                        <th className="text-center py-3 px-4 text-neutral-400 font-medium">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["Today", "Tomorrow", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => {
                        const stage = idx === 0 ? currentStage.stage : Math.max(1, currentStage.stage - idx);
                        const slots = idx === 0 ? todaySlots.length : Math.min(4, stage);
                        const hours = idx === 0 ? currentStage.hours_per_day : stage * 2;
                        return (
                          <tr key={day} className={`border-b border-neutral-800 ${idx === 0 ? getStageBgColor(stage) : ""}`}>
                            <td className={`py-3 px-4 font-medium ${idx === 0 ? getStageTextColor(stage) : "text-white"}`}>{day}</td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant="outline" className={`${getStageBgColor(stage)} ${getStageTextColor(stage)} ${getStageBorderColor(stage)}`}>
                                Stage {stage}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center text-white">{slots}</td>
                            <td className="py-3 px-4 text-sm text-neutral-400">
                              {slots > 0
                                ? ["06:00–08:30", "14:00–16:30", "18:00–20:30", "22:00–00:30"].slice(0, slots).join(" • ")
                                : "No outages"}
                            </td>
                            <td className="py-3 px-4 text-center text-white">{hours}h</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">Compare Areas</CardTitle>
                <CardDescription>Load shedding across major metros</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {MOCK_AREAS.map((area) => (
                    <div
                      key={area.area_id}
                      className={`p-4 rounded-lg cursor-pointer transition-all border ${
                        area.area_id === selectedArea
                          ? `${getStageBgColor(area.current_stage)} ${getStageBorderColor(area.current_stage)}`
                          : "bg-neutral-800 border-neutral-700 hover:border-neutral-600"
                      }`}
                      onClick={() => setSelectedArea(area.area_id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-neutral-400" />
                          <span className="font-medium text-white">{area.name}</span>
                        </div>
                        <StageIndicator stage={area.current_stage} size="sm" />
                      </div>
                      <p className="text-sm text-neutral-400">{area.municipality}, {area.province}</p>
                      {area.next_slot && (
                        <p className="text-xs text-neutral-500 mt-2">
                          Next: {area.next_slot.start_time} — {area.next_slot.end_time}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* STAGES GUIDE TAB */}
          <TabsContent value="stages" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {LOAD_SHEDDING_STAGES.map((stage) => (
                <Card
                  key={stage.stage}
                  className={`bg-neutral-900 border-neutral-800 ${
                    stage.stage === currentStage.stage ? "ring-2 ring-yellow-500" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <StageIndicator stage={stage.stage} size="md" />
                      {stage.stage === currentStage.stage && (
                        <Badge className={`${getStageBgColor(stage.stage)} ${getStageTextColor(stage.stage)}`}>
                          ACTIVE
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-white mb-1">Stage {stage.stage}</h3>
                    <p className="text-xs text-neutral-400 mb-3">{stage.description}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Hours/Day:</span>
                        <span className="text-white">{stage.hours_per_day}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Slots/Day:</span>
                        <span className="text-white">{stage.slots_per_day}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">MW Offline:</span>
                        <span className="text-white">{stage.megawatts_saved}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Info className="h-5 w-5 text-blue-400" />
                  How Load Shedding Works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-neutral-300">
                  <p>
                    Load shedding prevents a total national blackout when electricity demand exceeds supply.
                    Eskom cuts power to different areas in rotation, with each stage representing 1,000 MW offline.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-neutral-800 rounded-lg p-4">
                      <h4 className="font-medium text-green-400 mb-2">Stages 1–4</h4>
                      <p className="text-sm text-neutral-400">
                        Routine outages. 2–4 slots per day of 2–4 hours each. Hospitals and critical infrastructure remain online.
                      </p>
                    </div>
                    <div className="bg-neutral-800 rounded-lg p-4">
                      <h4 className="font-medium text-red-400 mb-2">Stages 5–8</h4>
                      <p className="text-sm text-neutral-400">
                        Emergency outages. Extended 4+ hour slots up to 8 times per day. Water supply may be affected.
                      </p>
                    </div>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-400 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Important
                    </h4>
                    <p className="text-sm text-neutral-300">
                      Wait 5–10 minutes after power returns before switching on geysers, stoves, or aircons to prevent surge damage.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHECKLIST TAB */}
          <TabsContent value="checklist" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                      Preparedness Checklist
                    </CardTitle>
                    <CardDescription>Complete these tasks to stay prepared</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-400">{checklistProgress}%</p>
                    <p className="text-xs text-neutral-500">Complete</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-neutral-800 rounded-full h-2 mb-6">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>

                <Tabs defaultValue="before" className="w-full">
                  <TabsList className="bg-neutral-800 border border-neutral-700 p-1 mb-4 w-full">
                    <TabsTrigger value="before" className="data-[state=active]:bg-neutral-700 flex-1">
                      Before ({groupedChecklist.before.filter((i) => i.completed).length}/{groupedChecklist.before.length})
                    </TabsTrigger>
                    <TabsTrigger value="during" className="data-[state=active]:bg-neutral-700 flex-1">
                      During ({groupedChecklist.during.filter((i) => i.completed).length}/{groupedChecklist.during.length})
                    </TabsTrigger>
                    <TabsTrigger value="after" className="data-[state=active]:bg-neutral-700 flex-1">
                      After ({groupedChecklist.after.filter((i) => i.completed).length}/{groupedChecklist.after.length})
                    </TabsTrigger>
                  </TabsList>

                  {(["before", "during", "after"] as const).map((cat) => (
                    <TabsContent key={cat} value={cat} className="space-y-2">
                      {groupedChecklist[cat].map((item) => (
                        <ChecklistItemRow key={item.item_id} item={item} onToggle={toggleChecklistItem} />
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>

                <div className="flex gap-4 mt-6">
                  <Button variant="outline" className="flex-1 border-neutral-700" onClick={resetChecklist}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => setChecklist((prev) => prev.map((i) => ({ ...i, completed: true })))}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark All Done
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ENERGY TIPS TAB */}
          <TabsContent value="savings" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Battery className="h-5 w-5 text-yellow-400" />
                  Appliance Power Consumption Guide
                </CardTitle>
                <CardDescription>Know which appliances draw the most power</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { name: "Geyser", watts: 3000, icon: ShowerHead, priority: "high" },
                    { name: "Air Conditioner", watts: 2500, icon: AirVent, priority: "high" },
                    { name: "Stove/Oven", watts: 2400, icon: Flame, priority: "high" },
                    { name: "Tumble Dryer", watts: 2500, icon: WashingMachine, priority: "high" },
                    { name: "Kettle", watts: 2200, icon: Coffee, priority: "medium" },
                    { name: "Hairdryer", watts: 1800, icon: Heater, priority: "medium" },
                    { name: "Microwave", watts: 1200, icon: Microwave, priority: "medium" },
                    { name: "Iron", watts: 1500, icon: Heater, priority: "medium" },
                    { name: "Fridge", watts: 150, icon: Refrigerator, priority: "essential" },
                    { name: "TV", watts: 150, icon: Tv, priority: "low" },
                    { name: "Laptop", watts: 65, icon: Laptop, priority: "essential" },
                    { name: "WiFi Router", watts: 15, icon: Wifi, priority: "essential" },
                  ].map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <div key={i} className="bg-neutral-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm font-medium text-white">{a.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-yellow-400 font-bold">{a.watts}W</span>
                          <Badge variant="outline" className={
                            a.priority === "high" ? "bg-red-500/20 text-red-400 border-red-500/30 text-xs"
                            : a.priority === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs"
                            : "bg-green-500/20 text-green-400 border-green-500/30 text-xs"
                          }>
                            {a.priority}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BatteryCharging className="h-5 w-5 text-green-400" />
                  Backup Power Solutions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "UPS (Computer)", runtime: "10–30 min", price: "R1,500–R5,000", bestFor: "PC, WiFi, alarm" },
                    { name: "Inverter + Battery", runtime: "2–8 hrs", price: "R8,000–R25,000", bestFor: "Lights, TV, fridge" },
                    { name: "Portable Power Station", runtime: "4–12 hrs", price: "R5,000–R30,000", bestFor: "Camping, remote work" },
                    { name: "Petrol Generator", runtime: "Unlimited", price: "R5,000–R50,000", bestFor: "Whole house, business" },
                    { name: "Solar + Battery", runtime: "Continuous", price: "R50,000–R200,000", bestFor: "Long-term off-grid" },
                  ].map((sol, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{sol.name}</h4>
                        <p className="text-sm text-neutral-400">{sol.bestFor}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-medium">{sol.price}</p>
                        <p className="text-xs text-neutral-500">{sol.runtime}</p>
                      </div>
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
