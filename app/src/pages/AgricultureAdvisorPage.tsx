import { useState, useEffect, useCallback, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
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
  Sprout,
  CloudSun,
  Droplets,
  Thermometer,
  Wind,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  Loader2,
  Bug,
  Beaker,
  BarChart3,
  MessageSquare,
  Send,
  RefreshCw,
  Sun,
  CloudRain,
  Wheat,
  Carrot,
  Flower2,
} from "lucide-react";

interface CropRecommendation {
  crop_id: string;
  name: string;
  suitability_score: number;
  planting_window: string;
  harvest_time: string;
  water_requirements: string;
  soil_type: string;
  expected_yield: string;
  market_price: string;
  price_trend: "up" | "down" | "stable";
  tips: string[];
}

interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  condition: string;
  forecast: {
    day: string;
    high: number;
    low: number;
    condition: string;
    precipitation_chance: number;
  }[];
}

interface SoilAnalysis {
  ph_level: number;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  organic_matter: string;
  recommendations: string[];
}

interface PestAlert {
  pest_id: string;
  name: string;
  severity: "low" | "medium" | "high" | "critical";
  affected_crops: string[];
  description: string;
  treatment: string;
  prevention: string[];
}

interface MarketPrice {
  commodity: string;
  current_price: number;
  unit: string;
  change_percent: number;
  trend: "up" | "down" | "stable";
  last_updated: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface FarmingTask {
  task_id: string;
  title: string;
  description: string;
  due_date: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed";
  category: string;
}

const MOCK_CROPS: CropRecommendation[] = [
  {
    crop_id: "CROP-001",
    name: "Maize (White)",
    suitability_score: 92,
    planting_window: "Oct - Dec",
    harvest_time: "Apr - Jun",
    water_requirements: "500-800mm/season",
    soil_type: "Well-drained loamy",
    expected_yield: "6-8 tonnes/ha",
    market_price: "R4,200/tonne",
    price_trend: "up",
    tips: [
      "Plant after first spring rains",
      "Apply nitrogen fertilizer at 6 weeks",
      "Monitor for fall armyworm",
    ],
  },
  {
    crop_id: "CROP-002",
    name: "Sunflower",
    suitability_score: 88,
    planting_window: "Nov - Jan",
    harvest_time: "Mar - May",
    water_requirements: "400-600mm/season",
    soil_type: "Sandy loam to clay",
    expected_yield: "2-3 tonnes/ha",
    market_price: "R8,500/tonne",
    price_trend: "stable",
    tips: [
      "Tolerant to drought conditions",
      "Rotate with cereals",
      "Harvest when back of head turns yellow",
    ],
  },
  {
    crop_id: "CROP-003",
    name: "Soybeans",
    suitability_score: 85,
    planting_window: "Nov - Dec",
    harvest_time: "Apr - May",
    water_requirements: "450-700mm/season",
    soil_type: "Well-drained, pH 6.0-6.8",
    expected_yield: "2.5-3.5 tonnes/ha",
    market_price: "R9,800/tonne",
    price_trend: "up",
    tips: [
      "Inoculate seeds before planting",
      "Fix nitrogen naturally",
      "Good rotation crop after maize",
    ],
  },
  {
    crop_id: "CROP-004",
    name: "Dry Beans",
    suitability_score: 78,
    planting_window: "Oct - Nov",
    harvest_time: "Feb - Apr",
    water_requirements: "350-500mm/season",
    soil_type: "Loamy, well-drained",
    expected_yield: "1.5-2 tonnes/ha",
    market_price: "R15,000/tonne",
    price_trend: "up",
    tips: [
      "Avoid waterlogged soils",
      "Short growing season (90-120 days)",
      "High protein content",
    ],
  },
];

const MOCK_WEATHER: WeatherData = {
  location: "Johannesburg, Gauteng",
  temperature: 24,
  humidity: 45,
  wind_speed: 12,
  condition: "Partly Cloudy",
  forecast: [
    { day: "Today", high: 26, low: 14, condition: "Partly Cloudy", precipitation_chance: 10 },
    { day: "Tomorrow", high: 28, low: 16, condition: "Sunny", precipitation_chance: 5 },
    { day: "Wednesday", high: 25, low: 15, condition: "Scattered Showers", precipitation_chance: 60 },
    { day: "Thursday", high: 22, low: 12, condition: "Rain", precipitation_chance: 85 },
    { day: "Friday", high: 24, low: 13, condition: "Clearing", precipitation_chance: 30 },
  ],
};

const MOCK_SOIL: SoilAnalysis = {
  ph_level: 6.2,
  nitrogen: "Medium",
  phosphorus: "High",
  potassium: "Medium",
  organic_matter: "2.8%",
  recommendations: [
    "Add lime to raise pH to 6.5 for optimal maize growth",
    "Nitrogen levels adequate for current season",
    "Consider adding compost to increase organic matter",
    "Phosphorus levels excellent - reduce P fertilizer",
  ],
};

const MOCK_PESTS: PestAlert[] = [
  {
    pest_id: "PEST-001",
    name: "Fall Armyworm",
    severity: "high",
    affected_crops: ["Maize", "Sorghum", "Wheat"],
    description: "Active in your region. Larvae feed on leaves and can destroy entire crops if untreated.",
    treatment: "Apply registered insecticides containing emamectin benzoate or chlorantraniliprole.",
    prevention: [
      "Scout fields twice weekly",
      "Use pheromone traps for monitoring",
      "Encourage natural predators",
      "Practice crop rotation",
    ],
  },
  {
    pest_id: "PEST-002",
    name: "Aphids",
    severity: "medium",
    affected_crops: ["Vegetables", "Legumes", "Citrus"],
    description: "Small sap-sucking insects that can transmit viral diseases.",
    treatment: "Neem oil or insecticidal soap for organic control. Systemic insecticides for severe infestations.",
    prevention: [
      "Plant companion crops like marigolds",
      "Maintain healthy plant nutrition",
      "Use reflective mulches",
    ],
  },
  {
    pest_id: "PEST-003",
    name: "Cutworm",
    severity: "low",
    affected_crops: ["Seedlings", "Vegetables"],
    description: "Nocturnal larvae that cut seedlings at soil level.",
    treatment: "Bacillus thuringiensis (Bt) for biological control.",
    prevention: [
      "Till soil before planting",
      "Use collars around seedlings",
      "Remove plant debris",
    ],
  },
];

const MOCK_MARKET: MarketPrice[] = [
  { commodity: "White Maize", current_price: 4200, unit: "R/tonne", change_percent: 2.5, trend: "up", last_updated: "2025-01-15" },
  { commodity: "Yellow Maize", current_price: 4150, unit: "R/tonne", change_percent: 1.8, trend: "up", last_updated: "2025-01-15" },
  { commodity: "Sunflower", current_price: 8500, unit: "R/tonne", change_percent: 0.3, trend: "stable", last_updated: "2025-01-15" },
  { commodity: "Soybeans", current_price: 9800, unit: "R/tonne", change_percent: 3.2, trend: "up", last_updated: "2025-01-15" },
  { commodity: "Wheat", current_price: 6800, unit: "R/tonne", change_percent: -1.2, trend: "down", last_updated: "2025-01-15" },
  { commodity: "Dry Beans", current_price: 15000, unit: "R/tonne", change_percent: 5.8, trend: "up", last_updated: "2025-01-15" },
];

const MOCK_TASKS: FarmingTask[] = [
  {
    task_id: "TASK-001",
    title: "Soil Testing - North Field",
    description: "Collect soil samples for pH and nutrient analysis",
    due_date: "2025-01-20",
    priority: "high",
    status: "pending",
    category: "Soil Management",
  },
  {
    task_id: "TASK-002",
    title: "Order Seeds for Summer Planting",
    description: "Order certified maize and sunflower seeds",
    due_date: "2025-01-25",
    priority: "urgent",
    status: "in_progress",
    category: "Planting",
  },
  {
    task_id: "TASK-003",
    title: "Service Tractor",
    description: "Annual maintenance and oil change",
    due_date: "2025-02-01",
    priority: "medium",
    status: "pending",
    category: "Equipment",
  },
  {
    task_id: "TASK-004",
    title: "Scout for Fall Armyworm",
    description: "Check maize fields for early signs of infestation",
    due_date: "2025-01-18",
    priority: "high",
    status: "pending",
    category: "Pest Control",
  },
];

const severityColor = (s: string) => {
  switch (s) {
    case "critical":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "low":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const priorityColor = (p: string) => {
  switch (p) {
    case "urgent":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "low":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const trendIcon = (trend: string) => {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-400" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-400" />;
    default:
      return <span className="h-4 w-4 text-neutral-400">—</span>;
  }
};

const cropIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("maize") || lower.includes("corn")) return <Wheat className="h-5 w-5" />;
  if (lower.includes("sunflower")) return <Flower2 className="h-5 w-5" />;
  if (lower.includes("bean")) return <Carrot className="h-5 w-5" />;
  return <Sprout className="h-5 w-5" />;
};

export default function AgricultureAdvisorPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "MSG-001",
      role: "assistant",
      content: "Hello! I'm your AI Agriculture Advisor. I can help you with crop selection, pest management, soil health, weather planning, and market analysis. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("gauteng");
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);

  const api = useApi();

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: `MSG-${Date.now()}`,
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsLoading(true);

    setTimeout(() => {
      const responses = [
        "Based on your location and current season, I recommend planting maize within the next 2 weeks. The soil temperature is optimal, and weather forecasts show adequate rainfall for germination.",
        "For Fall Armyworm control, I suggest implementing an integrated pest management approach. Start with pheromone traps for monitoring, and consider biological controls like Telenomus remus wasps before resorting to chemical treatments.",
        "Your soil pH of 6.2 is slightly acidic for maize. Apply agricultural lime at 2-3 tonnes per hectare to raise it to the optimal range of 6.5-7.0. This will improve nutrient availability.",
        "Current market prices for maize are trending upward due to increased export demand. Consider forward contracting 30-40% of your expected harvest to lock in favorable prices.",
      ];
      
      const assistantMessage: ChatMessage = {
        id: `MSG-${Date.now()}-AI`,
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };
      
      setChatMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  }, [chatInput]);

  const stats = useMemo(() => ({
    activeCrops: MOCK_CROPS.length,
    pendingTasks: MOCK_TASKS.filter((t) => t.status !== "completed").length,
    activeAlerts: MOCK_PESTS.filter((p) => p.severity === "high" || p.severity === "critical").length,
    avgSuitability: Math.round(MOCK_CROPS.reduce((acc, c) => acc + c.suitability_score, 0) / MOCK_CROPS.length),
  }), []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Sprout className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Agriculture Advisor
            </h1>
            <p className="text-neutral-400 text-sm">
              AI-powered farming insights and recommendations
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm">Recommended Crops</p>
                <p className="text-2xl font-bold text-white">{stats.activeCrops}</p>
              </div>
              <Wheat className="h-8 w-8 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm">Pending Tasks</p>
                <p className="text-2xl font-bold text-white">{stats.pendingTasks}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm">Active Alerts</p>
                <p className="text-2xl font-bold text-white">{stats.activeAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-400 text-sm">Avg. Suitability</p>
                <p className="text-2xl font-bold text-white">{stats.avgSuitability}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-neutral-900 border border-neutral-800 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-neutral-800">
            Overview
          </TabsTrigger>
          <TabsTrigger value="crops" className="data-[state=active]:bg-neutral-800">
            Crops
          </TabsTrigger>
          <TabsTrigger value="weather" className="data-[state=active]:bg-neutral-800">
            Weather
          </TabsTrigger>
          <TabsTrigger value="soil" className="data-[state=active]:bg-neutral-800">
            Soil
          </TabsTrigger>
          <TabsTrigger value="pests" className="data-[state=active]:bg-neutral-800">
            Pests
          </TabsTrigger>
          <TabsTrigger value="market" className="data-[state=active]:bg-neutral-800">
            Market
          </TabsTrigger>
          <TabsTrigger value="chat" className="data-[state=active]:bg-neutral-800">
            AI Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CloudSun className="h-5 w-5 text-yellow-400" />
                  Current Weather
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-3xl font-bold text-white">{MOCK_WEATHER.temperature}°C</p>
                    <p className="text-neutral-400">{MOCK_WEATHER.condition}</p>
                    <p className="text-sm text-neutral-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {MOCK_WEATHER.location}
                    </p>
                  </div>
                  <CloudSun className="h-16 w-16 text-yellow-400 opacity-50" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-neutral-800 rounded-lg p-3">
                    <Droplets className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                    <p className="text-sm text-neutral-400">Humidity</p>
                    <p className="font-semibold text-white">{MOCK_WEATHER.humidity}%</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-3">
                    <Wind className="h-5 w-5 text-neutral-400 mx-auto mb-1" />
                    <p className="text-sm text-neutral-400">Wind</p>
                    <p className="font-semibold text-white">{MOCK_WEATHER.wind_speed} km/h</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-3">
                    <Thermometer className="h-5 w-5 text-red-400 mx-auto mb-1" />
                    <p className="text-sm text-neutral-400">Feels Like</p>
                    <p className="font-semibold text-white">{MOCK_WEATHER.temperature + 2}°C</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calendar className="h-5 w-5 text-green-400" />
                  Upcoming Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {MOCK_TASKS.slice(0, 4).map((task) => (
                      <div
                        key={task.task_id}
                        className="flex items-start gap-3 p-3 bg-neutral-800 rounded-lg"
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          task.priority === "urgent" ? "bg-red-500" :
                          task.priority === "high" ? "bg-orange-500" :
                          task.priority === "medium" ? "bg-yellow-500" : "bg-green-500"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{task.title}</p>
                          <p className="text-sm text-neutral-400 truncate">{task.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={priorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-neutral-500">{task.due_date}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sprout className="h-5 w-5 text-green-400" />
                Top Crop Recommendations
              </CardTitle>
              <CardDescription>
                Based on soil conditions, climate, and market trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {MOCK_CROPS.map((crop) => (
                  <div
                    key={crop.crop_id}
                    className="bg-neutral-800 rounded-lg p-4 hover:bg-neutral-750 transition-colors cursor-pointer"
                    onClick={() => setSelectedCrop(crop.crop_id)}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      {cropIcon(crop.name)}
                      <span className="font-medium text-white">{crop.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-neutral-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${crop.suitability_score}%` }}
                        />
                      </div>
                      <span className="text-sm text-green-400 font-medium">
                        {crop.suitability_score}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-400">{crop.market_price}</span>
                      {trendIcon(crop.price_trend)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Bug className="h-5 w-5 text-orange-400" />
                Active Pest Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_PESTS.filter((p) => p.severity === "high" || p.severity === "critical").map((pest) => (
                  <div
                    key={pest.pest_id}
                    className="flex items-start gap-4 p-4 bg-neutral-800 rounded-lg border-l-4 border-orange-500"
                  >
                    <AlertTriangle className="h-6 w-6 text-orange-400 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{pest.name}</span>
                        <Badge variant="outline" className={severityColor(pest.severity)}>
                          {pest.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-400 mb-2">{pest.description}</p>
                      <p className="text-sm text-neutral-300">
                        <strong className="text-white">Treatment:</strong> {pest.treatment}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crops" className="space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[200px] bg-neutral-900 border-neutral-700">
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                <SelectItem value="gauteng">Gauteng</SelectItem>
                <SelectItem value="limpopo">Limpopo</SelectItem>
                <SelectItem value="mpumalanga">Mpumalanga</SelectItem>
                <SelectItem value="northwest">North West</SelectItem>
                <SelectItem value="freestate">Free State</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="border-neutral-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {MOCK_CROPS.map((crop) => (
              <Card key={crop.crop_id} className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        {cropIcon(crop.name)}
                      </div>
                      <div>
                        <CardTitle className="text-white">{crop.name}</CardTitle>
                        <CardDescription>Suitability: {crop.suitability_score}%</CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-400">{crop.market_price}</p>
                      <div className="flex items-center gap-1 justify-end">
                        {trendIcon(crop.price_trend)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-neutral-800 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Planting</p>
                      <p className="font-medium text-white">{crop.planting_window}</p>
                    </div>
                    <div className="bg-neutral-800 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Harvest</p>
                      <p className="font-medium text-white">{crop.harvest_time}</p>
                    </div>
                    <div className="bg-neutral-800 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Water</p>
                      <p className="font-medium text-white">{crop.water_requirements}</p>
                    </div>
                    <div className="bg-neutral-800 rounded-lg p-3">
                      <p className="text-xs text-neutral-400 mb-1">Yield</p>
                      <p className="font-medium text-white">{crop.expected_yield}</p>
                    </div>
                  </div>
                  <div className="border-t border-neutral-800 pt-4">
                    <p className="text-sm font-medium text-white mb-2">Tips:</p>
                    <ul className="space-y-1">
                      {crop.tips.map((tip, i) => (
                        <li key={i} className="text-sm text-neutral-400 flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="weather" className="space-y-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CloudSun className="h-5 w-5 text-yellow-400" />
                5-Day Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {MOCK_WEATHER.forecast.map((day, index) => (
                  <div
                    key={index}
                    className={`bg-neutral-800 rounded-lg p-4 text-center ${
                      index === 0 ? "ring-2 ring-green-500" : ""
                    }`}
                  >
                    <p className="font-medium text-white mb-2">{day.day}</p>
                    <div className="flex justify-center mb-3">
                      {day.condition.includes("Rain") || day.condition.includes("Showers") ? (
                        <CloudRain className="h-10 w-10 text-blue-400" />
                      ) : day.condition.includes("Sunny") || day.condition.includes("Clearing") ? (
                        <Sun className="h-10 w-10 text-yellow-400" />
                      ) : (
                        <CloudSun className="h-10 w-10 text-neutral-400" />
                      )}
                    </div>
                    <p className="text-sm text-neutral-400 mb-2">{day.condition}</p>
                    <div className="flex justify-center gap-2 text-sm">
                      <span className="text-white font-medium">{day.high}°</span>
                      <span className="text-neutral-500">/</span>
                      <span className="text-neutral-400">{day.low}°</span>
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-1">
                      <Droplets className="h-3 w-3 text-blue-400" />
                      <span className="text-xs text-blue-400">{day.precipitation_chance}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="soil" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Beaker className="h-5 w-5 text-purple-400" />
                  Soil Analysis
                </CardTitle>
                <CardDescription>
                  Last tested: January 10, 2025
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-neutral-800 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-neutral-400">pH Level</span>
                      <span className="text-2xl font-bold text-white">{MOCK_SOIL.ph_level}</span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(MOCK_SOIL.ph_level / 14) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-neutral-800 rounded-lg p-3 text-center">
                      <p className="text-xs text-neutral-400 mb-1">Nitrogen</p>
                      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        {MOCK_SOIL.nitrogen}
                      </Badge>
                    </div>
                    <div className="bg-neutral-800 rounded-lg p-3 text-center">
                      <p className="text-xs text-neutral-400 mb-1">Phosphorus</p>
                      <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                        {MOCK_SOIL.phosphorus}
                      </Badge>
                    </div>
                    <div className="bg-neutral-800 rounded-lg p-3 text-center">
                      <p className="text-xs text-neutral-400 mb-1">Potassium</p>
                      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        {MOCK_SOIL.potassium}
                      </Badge>
                    </div>
                  </div>

                  <div className="bg-neutral-800 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-400">Organic Matter</span>
                      <span className="font-medium text-white">{MOCK_SOIL.organic_matter}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_SOIL.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-neutral-800 rounded-lg"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-neutral-300">{rec}</p>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-6 bg-green-600 hover:bg-green-700">
                  <Beaker className="h-4 w-4 mr-2" />
                  Schedule Soil Test
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pests" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {MOCK_PESTS.map((pest) => (
              <Card key={pest.pest_id} className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        pest.severity === "critical" ? "bg-red-500/20" :
                        pest.severity === "high" ? "bg-orange-500/20" :
                        pest.severity === "medium" ? "bg-yellow-500/20" : "bg-green-500/20"
                      }`}>
                        <Bug className={`h-5 w-5 ${
                          pest.severity === "critical" ? "text-red-400" :
                          pest.severity === "high" ? "text-orange-400" :
                          pest.severity === "medium" ? "text-yellow-400" : "text-green-400"
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-white">{pest.name}</CardTitle>
                        <CardDescription>
                          Affects: {pest.affected_crops.join(", ")}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className={severityColor(pest.severity)}>
                      {pest.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-300 mb-4">{pest.description}</p>
                  
                  <div className="bg-neutral-800 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-white mb-2">Treatment:</p>
                    <p className="text-sm text-neutral-400">{pest.treatment}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white mb-2">Prevention:</p>
                    <ul className="space-y-1">
                      {pest.prevention.map((prev, i) => (
                        <li key={i} className="text-sm text-neutral-400 flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                          {prev}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BarChart3 className="h-5 w-5 text-green-400" />
                    Commodity Prices
                  </CardTitle>
                  <CardDescription>
                    SAFEX - Last updated: Jan 15, 2025
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="border-neutral-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-800">
                      <th className="text-left py-3 px-4 text-neutral-400 font-medium">Commodity</th>
                      <th className="text-right py-3 px-4 text-neutral-400 font-medium">Price</th>
                      <th className="text-right py-3 px-4 text-neutral-400 font-medium">Change</th>
                      <th className="text-center py-3 px-4 text-neutral-400 font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_MARKET.map((item, index) => (
                      <tr key={index} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                        <td className="py-3 px-4">
                          <span className="font-medium text-white">{item.commodity}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-white">R{item.current_price.toLocaleString()}</span>
                          <span className="text-neutral-500 text-sm ml-1">{item.unit}</span>
                        </td>
                        <td className={`py-3 px-4 text-right ${
                          item.change_percent > 0 ? "text-green-400" :
                          item.change_percent < 0 ? "text-red-400" : "text-neutral-400"
                        }`}>
                          {item.change_percent > 0 ? "+" : ""}{item.change_percent}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          {trendIcon(item.trend)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          <Card className="bg-neutral-900 border-neutral-800 h-[600px] flex flex-col">
            <CardHeader className="border-b border-neutral-800">
              <CardTitle className="flex items-center gap-2 text-white">
                <MessageSquare className="h-5 w-5 text-green-400" />
                AI Agriculture Assistant
              </CardTitle>
              <CardDescription>
                Ask about crops, pests, soil, weather, or market prices
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === "user"
                            ? "bg-green-600 text-white"
                            : "bg-neutral-800 text-neutral-100"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-50 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-neutral-800 rounded-lg p-3">
                        <Loader2 className="h-5 w-5 animate-spin text-green-400" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-neutral-800">
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about farming..."
                    className="flex-1 bg-neutral-800 border-neutral-700"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !chatInput.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-neutral-700 text-xs"
                    onClick={() => setChatInput("What crops should I plant this season?")}
                  >
                    Crop recommendations
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-neutral-700 text-xs"
                    onClick={() => setChatInput("How do I control Fall Armyworm?")}
                  >
                    Pest control
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-neutral-700 text-xs"
                    onClick={() => setChatInput("When is the best time to sell maize?")}
                  >
                    Market timing
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
