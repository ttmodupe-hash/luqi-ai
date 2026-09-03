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
  HeartPulse,
  Stethoscope,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Search,
  RefreshCw,
  Info,
  Pill,
  Calendar,
  Activity,
  Shield,
  Syringe,
  Hospital,
  User,
  Bell,
  FileText,
  Droplets,
  Wind,
  Sun,
  Bug,
  Zap,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  Timer,
  AlertCircle,
} from "lucide-react";

/* Types */

interface Symptom {
  symptom_id: string;
  name: string;
  body_area: string;
  severity_options: string[];
  duration_options: string[];
}

interface Condition {
  condition_id: string;
  name: string;
  category: "tropical" | "waterborne" | "respiratory" | "chronic" | "emergency" | "general";
  symptoms: string[];
  severity_match: Record<string, number>;
  description: string;
  urgency: "self_care" | "clinic_visit" | "urgent_care" | "emergency";
  first_steps: string[];
  warning_signs: string[];
  common_in: string[];
  icon: React.ElementType;
}

interface Medication {
  med_id: string;
  name: string;
  dosage: string;
  frequency: string;
  times_per_day: number;
  remaining_doses: number;
  total_doses: number;
  next_dose_time: string;
  condition: string;
  prescribed_by: string;
  refill_date: string;
}

interface Clinic {
  clinic_id: string;
  name: string;
  type: "public" | "private" | "community" | "mobile";
  address: string;
  city: string;
  province: string;
  phone: string;
  services: string[];
  wait_time: string;
  open_hours: string;
  accepts_uninsured: boolean;
  distance_km: number;
}

interface HealthAlert {
  alert_id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "outbreak" | "emergency";
  region: string;
  disease: string;
  issued_date: string;
  source: string;
  actions: string[];
}

interface TriageResult {
  condition: Condition;
  match_score: number;
  matched_symptoms: string[];
}

/* Symptom Database */

const SYMPTOMS: Symptom[] = [
  { symptom_id: "SYM-001", name: "Fever", body_area: "General", severity_options: ["Mild", "Moderate", "High", "Very High"], duration_options: ["< 24h", "1-3 days", "3-7 days", "> 7 days"] },
  { symptom_id: "SYM-002", name: "Headache", body_area: "Head", severity_options: ["Mild", "Moderate", "Severe"], duration_options: ["< 24h", "1-3 days", "3-7 days", "> 7 days"] },
  { symptom_id: "SYM-003", name: "Nausea / Vomiting", body_area: "Stomach", severity_options: ["Mild", "Moderate", "Severe"], duration_options: ["< 24h", "1-3 days", "3-7 days", "> 7 days"] },
  { symptom_id: "SYM-004", name: "Diarrhea", body_area: "Stomach", severity_options: ["Mild", "Moderate", "Severe"], duration_options: ["< 24h", "1-3 days", "3-7 days", "> 7 days"] },
  { symptom_id: "SYM-005", name: "Cough", body_area: "Chest", severity_options: ["Dry", "Wet", "Severe"], duration_options: ["< 24h", "1-3 days", "1-2 weeks", "> 2 weeks"] },
  { symptom_id: "SYM-006", name: "Body Aches", body_area: "General", severity_options: ["Mild", "Moderate", "Severe"], duration_options: ["< 24h", "1-3 days", "3-7 days", "> 7 days"] },
  { symptom_id: "SYM-007", name: "Fatigue", body_area: "General", severity_options: ["Mild", "Moderate", "Severe"], duration_options: ["< 24h", "1-3 days", "1-2 weeks", "> 2 weeks"] },
  { symptom_id: "SYM-008", name: "Skin Rash", body_area: "Skin", severity_options: ["Mild", "Moderate", "Severe"], duration_options: ["< 24h", "1-3 days", "3-7 days", "> 7 days"] },
  { symptom_id: "SYM-009", name: "Sore Throat", body_area: "Throat", severity_options: ["Mild", "Moderate", "Severe"], duration_options: ["< 24h", "1-3 days", "3-7 days", "> 7 days"] },
  { symptom_id: "SYM-010", name: "Difficulty Breathing", body_area: "Chest", severity_options: ["Mild", "Moderate", "Severe"], duration_options: ["< 1h", "1-6h", "6-24h", "> 24h"] },
  { symptom_id: "SYM-011", name: "Abdominal Pain", body_area: "Stomach", severity_options: ["Mild", "Moderate", "Severe"], duration_options: ["< 24h", "1-3 days", "3-7 days", "> 7 days"] },
  { symptom_id: "SYM-012", name: "Dizziness", body_area: "Head", severity_options: ["Mild", "Moderate", "Severe"], duration_options: ["< 1h", "1-6h", "6-24h", "> 24h"] },
  { symptom_id: "SYM-013", name: "Joint Pain", body_area: "Joints", severity_options: ["Mild", "Moderate", "Severe"], duration_options: ["< 24h", "1-3 days", "1-2 weeks", "> 2 weeks"] },
  { symptom_id: "SYM-014", name: "Chills / Sweating", body_area: "General", severity_options: ["Mild", "Moderate", "Severe"], duration_options: ["< 24h", "1-3 days", "3-7 days", "> 7 days"] },
  { symptom_id: "SYM-015", name: "Loss of Appetite", body_area: "General", severity_options: ["Mild", "Moderate", "Severe"], duration_options: ["< 24h", "1-3 days", "3-7 days", "> 7 days"] },
];

/* Condition Database */

const CONDITIONS: Condition[] = [
  {
    condition_id: "COND-001",
    name: "Malaria",
    category: "tropical",
    symptoms: ["Fever", "Headache", "Chills / Sweating", "Nausea / Vomiting", "Body Aches", "Fatigue"],
    severity_match: { "High": 95, "Very High": 98, "Moderate": 75, "Severe": 85 },
    description: "Mosquito-borne parasitic infection common in sub-Saharan Africa. Causes cyclical fever, chills, and flu-like symptoms.",
    urgency: "urgent_care",
    first_steps: ["Get a blood test immediately", "Start antimalarial treatment if confirmed", "Stay hydrated", "Rest in a cool environment"],
    warning_signs: ["Fever above 40°C", "Confusion or altered consciousness", "Seizures", "Severe vomiting unable to keep fluids down"],
    common_in: ["Limpopo", "Mpumalanga", "KwaZulu-Natal", "Mozambique", "Nigeria", "Ghana", "Kenya"],
    icon: Bug,
  },
  {
    condition_id: "COND-002",
    name: "Typhoid Fever",
    category: "waterborne",
    symptoms: ["Fever", "Headache", "Abdominal Pain", "Loss of Appetite", "Fatigue", "Diarrhea"],
    severity_match: { "High": 90, "Very High": 95, "Moderate": 70, "Severe": 80 },
    description: "Bacterial infection from contaminated water or food. Common in areas with poor sanitation infrastructure.",
    urgency: "clinic_visit",
    first_steps: ["Visit a clinic for blood and stool tests", "Start antibiotic treatment", "Drink only boiled or bottled water", "Avoid raw food"],
    warning_signs: ["Intestinal bleeding", "Severe abdominal pain", "High fever persisting > 5 days", "Delirium"],
    common_in: ["Informal settlements", "Rural areas", "Post-flood zones", "Areas with water interruptions"],
    icon: Droplets,
  },
  {
    condition_id: "COND-003",
    name: "Cholera",
    category: "waterborne",
    symptoms: ["Diarrhea", "Nausea / Vomiting", "Fatigue", "Dizziness", "Fever"],
    severity_match: { "Severe": 95, "Very High": 98, "Moderate": 70 },
    description: "Acute diarrheal disease from contaminated water. Can cause rapid dehydration and death within hours if untreated.",
    urgency: "emergency",
    first_steps: ["Start oral rehydration solution immediately", "Go to nearest hospital emergency room", "Do not wait — this is life-threatening", "Isolate from others to prevent spread"],
    warning_signs: ["Rice-water stools", "Sunken eyes", "Rapid pulse", "Little to no urine output", "Skin loses elasticity"],
    common_in: ["Flood-affected areas", "Informal settlements", "Areas with broken water infrastructure"],
    icon: AlertTriangle,
  },
  {
    condition_id: "COND-004",
    name: "Tuberculosis (TB)",
    category: "respiratory",
    symptoms: ["Cough", "Fever", "Fatigue", "Loss of Appetite", "Body Aches", "Chills / Sweating"],
    severity_match: { "Moderate": 80, "Severe": 90, "High": 85 },
    description: "Bacterial lung infection. South Africa has one of the highest TB burdens globally. Highly treatable with 6-month antibiotic course.",
    urgency: "clinic_visit",
    first_steps: ["Visit a clinic for sputum test and chest X-ray", "Start DOTS (Directly Observed Treatment)", "Complete the full 6-month course", "Wear a mask around others"],
    warning_signs: ["Coughing blood", "Night sweats for weeks", "Unexplained weight loss", "Cough lasting > 2 weeks"],
    common_in: ["Crowded housing", "Mining communities", "Informal settlements", "HIV-positive individuals"],
    icon: Wind,
  },
  {
    condition_id: "COND-005",
    name: "Upper Respiratory Infection (Flu)",
    category: "respiratory",
    symptoms: ["Cough", "Sore Throat", "Fever", "Headache", "Body Aches", "Fatigue"],
    severity_match: { "Mild": 85, "Moderate": 75 },
    description: "Common viral infection. Usually self-limiting within 7-10 days. Rest and hydration are the primary treatment.",
    urgency: "self_care",
    first_steps: ["Rest and stay hydrated", "Take paracetamol for fever and pain", "Gargle with warm salt water for sore throat", "Monitor symptoms for worsening"],
    warning_signs: ["Difficulty breathing", "Fever above 39.5°C for > 3 days", "Chest pain", "Symptoms worsening after 7 days"],
    common_in: ["Winter months (May-Aug)", "Crowded spaces", "Schools and offices"],
    icon: Thermometer,
  },
  {
    condition_id: "COND-006",
    name: "Hypertension Crisis",
    category: "chronic",
    symptoms: ["Headache", "Dizziness", "Difficulty Breathing", "Fatigue"],
    severity_match: { "Severe": 90, "Very High": 95 },
    description: "Dangerously high blood pressure requiring immediate attention. Common in adults over 40 in high-stress urban environments.",
    urgency: "emergency",
    first_steps: ["Sit down and remain calm", "Take prescribed blood pressure medication if available", "Call emergency services if symptoms persist", "Avoid caffeine and salt"],
    warning_signs: ["Blood pressure above 180/120", "Blurred vision", "Chest pain", "Numbness or weakness on one side"],
    common_in: ["Adults 40+", "High-stress occupations", "High-sodium diets", "Family history of hypertension"],
    icon: HeartPulse,
  },
  {
    condition_id: "COND-007",
    name: "Diabetes Emergency (Hyperglycemia)",
    category: "chronic",
    symptoms: ["Fatigue", "Dizziness", "Nausea / Vomiting", "Loss of Appetite", "Headache"],
    severity_match: { "Severe": 92, "Very High": 97 },
    description: "Dangerously high blood sugar levels. Can lead to diabetic ketoacidosis (DKA) which is life-threatening without insulin.",
    urgency: "emergency",
    first_steps: ["Check blood sugar immediately if meter available", "Take rapid-acting insulin if prescribed", "Drink water to flush ketones", "Go to emergency if vomiting or confused"],
    warning_signs: ["Blood sugar above 20 mmol/L", "Fruity breath odor", "Rapid breathing", "Confusion or drowsiness"],
    common_in: ["Type 1 diabetics", "Type 2 diabetics on insulin", "Missed medication doses", "Illness or infection"],
    icon: Activity,
  },
  {
    condition_id: "COND-008",
    name: "Heat Exhaustion",
    category: "general",
    symptoms: ["Dizziness", "Headache", "Nausea / Vomiting", "Fatigue", "Chills / Sweating", "Body Aches"],
    severity_match: { "Moderate": 80, "Severe": 90 },
    description: "Heat-related illness from prolonged exposure to high temperatures. Common during African summers and in outdoor labor.",
    urgency: "clinic_visit",
    first_steps: ["Move to a cool, shaded area", "Drink cool water or oral rehydration solution", "Remove excess clothing", "Apply cool wet cloths to skin"],
    warning_signs: ["Body temperature above 40°C", "Confusion or slurred speech", "Hot, dry skin (no sweating)", "Loss of consciousness"],
    common_in: ["Summer months (Nov-Mar)", "Outdoor workers", "Elderly and children", "Areas without air conditioning"],
    icon: Sun,
  },
  {
    condition_id: "COND-009",
    name: "Gastroenteritis (Food Poisoning)",
    category: "waterborne",
    symptoms: ["Nausea / Vomiting", "Diarrhea", "Abdominal Pain", "Fever", "Loss of Appetite", "Fatigue"],
    severity_match: { "Moderate": 85, "Severe": 90 },
    description: "Stomach and intestinal infection from contaminated food or water. Usually resolves in 1-3 days with proper hydration.",
    urgency: "self_care",
    first_steps: ["Drink oral rehydration solution or diluted sports drinks", "Eat bland foods (rice, toast, bananas)", "Avoid dairy, caffeine, and alcohol", "Rest and monitor symptoms"],
    warning_signs: ["Blood in vomit or stool", "Signs of dehydration (dark urine, no tears)", "Fever above 39°C", "Symptoms lasting > 3 days"],
    common_in: ["Street food vendors", "Areas with water interruptions", "Post-flood zones", "Large gatherings with catering"],
    icon: AlertCircle,
  },
  {
    condition_id: "COND-010",
    name: "Dengue Fever",
    category: "tropical",
    symptoms: ["Fever", "Headache", "Joint Pain", "Body Aches", "Skin Rash", "Fatigue", "Nausea / Vomiting"],
    severity_match: { "High": 92, "Very High": 96, "Severe": 88 },
    description: "Mosquito-borne viral infection causing severe joint and muscle pain ('breakbone fever'). No specific treatment — supportive care only.",
    urgency: "clinic_visit",
    first_steps: ["Get a blood test to confirm", "Take paracetamol for pain (NOT ibuprofen or aspirin)", "Stay well hydrated", "Rest and monitor for warning signs"],
    warning_signs: ["Severe abdominal pain", "Persistent vomiting", "Bleeding from gums or nose", "Blood in vomit or stool", "Rapid breathing"],
    common_in: ["Coastal KwaZulu-Natal", "Tropical regions", "Areas with standing water", "Post-rainy season"],
    icon: Bug,
  },
];

/* Medication Tracker */

const MOCK_MEDICATIONS: Medication[] = [
  { med_id: "MED-001", name: "Paracetamol 500mg", dosage: "500mg", frequency: "Every 6 hours", times_per_day: 4, remaining_doses: 18, total_doses: 24, next_dose_time: "14:00", condition: "Fever/Pain", prescribed_by: "Dr. Nkosi", refill_date: "2025-01-20" },
  { med_id: "MED-002", name: "Amoxicillin 250mg", dosage: "250mg", frequency: "Every 8 hours", times_per_day: 3, remaining_doses: 12, total_doses: 21, next_dose_time: "16:00", condition: "Upper Respiratory Infection", prescribed_by: "Dr. Patel", refill_date: "2025-01-22" },
  { med_id: "MED-003", name: "Oral Rehydration Salts", dosage: "1 sachet", frequency: "After each loose stool", times_per_day: 6, remaining_doses: 8, total_doses: 10, next_dose_time: "As needed", condition: "Gastroenteritis", prescribed_by: "Pharmacist", refill_date: "2025-01-18" },
  { med_id: "MED-004", name: "Amlodipine 5mg", dosage: "5mg", frequency: "Once daily", times_per_day: 1, remaining_doses: 25, total_doses: 30, next_dose_time: "08:00", condition: "Hypertension", prescribed_by: "Dr. Botha", refill_date: "2025-02-10" },
];

/* Clinic Directory */

const MOCK_CLINICS: Clinic[] = [
  { clinic_id: "CLN-001", name: "Johannesburg Community Health Centre", type: "public", address: "45 Jorissen Street, Braamfontein", city: "Johannesburg", province: "Gauteng", phone: "011 677 6000", services: ["General Practice", "TB Treatment", "HIV Testing", "Vaccinations", "Maternal Health"], wait_time: "45-90 min", open_hours: "07:00-16:00 Mon-Fri", accepts_uninsured: true, distance_km: 2.5 },
  { clinic_id: "CLN-002", name: "Cape Town Day Hospital", type: "public", address: "12 Portswood Road, V&A Waterfront", city: "Cape Town", province: "Western Cape", phone: "021 402 1000", services: ["General Practice", "Emergency Care", "X-Ray", "Pharmacy", "Mental Health"], wait_time: "30-60 min", open_hours: "08:00-20:00 Daily", accepts_uninsured: true, distance_km: 4.1 },
  { clinic_id: "CLN-003", name: "Durban North Clinic", type: "community", address: "78 Kenneth Kaunda Road", city: "Durban", province: "KwaZulu-Natal", phone: "031 563 1234", services: ["General Practice", "Malaria Testing", "Antenatal Care", "Immunizations"], wait_time: "20-45 min", open_hours: "07:30-16:00 Mon-Sat", accepts_uninsured: true, distance_km: 1.8 },
  { clinic_id: "CLN-004", name: "Pretoria East Medical Centre", type: "private", address: "210 Garsfontein Road", city: "Pretoria", province: "Gauteng", phone: "012 993 5000", services: ["General Practice", "Specialist Referrals", "Lab Tests", "Ultrasound", "Dental"], wait_time: "15-30 min", open_hours: "07:00-19:00 Daily", accepts_uninsured: false, distance_km: 5.2 },
  { clinic_id: "CLN-005", name: "Soweto Mobile Health Unit", type: "mobile", address: "Rotates — check schedule", city: "Johannesburg", province: "Gauteng", phone: "0800 123 456", services: ["HIV Testing", "TB Screening", "Blood Pressure Checks", "Vaccinations", "Health Education"], wait_time: "No wait", open_hours: "08:00-14:00 Mon/Thu", accepts_uninsured: true, distance_km: 0 },
];

/* Health Alerts */

const MOCK_ALERTS: HealthAlert[] = [
  {
    alert_id: "ALT-001",
    title: "Cholera Outbreak — Johannesburg South",
    description: "Confirmed cholera cases in Johannesburg South linked to contaminated water supply. Boil all drinking water.",
    severity: "outbreak",
    region: "Johannesburg South",
    disease: "Cholera",
    issued_date: "2025-01-14",
    source: "National Institute for Communicable Diseases (NICD)",
    actions: ["Boil water for 1 minute before drinking", "Avoid street food in affected areas", "Wash hands frequently with soap", "Seek immediate care for severe diarrhea"],
  },
  {
    alert_id: "ALT-002",
    title: "Malaria Season Alert — Limpopo & Mpumalanga",
    description: "Peak malaria transmission season is active. Increased mosquito activity due to summer rainfall.",
    severity: "warning",
    region: "Limpopo, Mpumalanga",
    disease: "Malaria",
    issued_date: "2025-01-10",
    source: "Department of Health",
    actions: ["Use mosquito nets and repellent", "Wear long sleeves at dusk and dawn", "Remove standing water around homes", "Seek testing if fever develops"],
  },
  {
    alert_id: "ALT-003",
    title: "Heatwave Health Advisory — Gauteng",
    description: "Extended heatwave expected with temperatures above 35°C. Risk of heat exhaustion and heatstroke.",
    severity: "warning",
    region: "Gauteng",
    disease: "Heat-related illness",
    issued_date: "2025-01-13",
    source: "SA Weather Service",
    actions: ["Stay indoors during peak heat (11:00-15:00)", "Drink at least 3 litres of water daily", "Check on elderly neighbours", "Never leave children in parked vehicles"],
  },
  {
    alert_id: "ALT-004",
    title: "Typhoid Cases — Informal Settlements",
    description: "Increased typhoid cases reported in informal settlements with interrupted water supply.",
    severity: "info",
    region: "Various informal settlements",
    disease: "Typhoid",
    issued_date: "2025-01-08",
    source: "Municipal Health Services",
    actions: ["Drink only treated or boiled water", "Wash hands before eating", "Avoid raw vegetables and unpasteurized dairy", "Get vaccinated if available"],
  },
];

/* Helper Functions */

const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case "emergency": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "urgent_care": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "clinic_visit": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "self_care": return "bg-green-500/20 text-green-400 border-green-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const getUrgencyLabel = (urgency: string) => {
  switch (urgency) {
    case "emergency": return "EMERGENCY — Call 10177";
    case "urgent_care": return "Urgent — Visit Clinic Today";
    case "clinic_visit": return "See a Doctor This Week";
    case "self_care": return "Self-Care at Home";
    default: return urgency;
  }
};

const getAlertColor = (severity: string) => {
  switch (severity) {
    case "emergency": return "bg-red-500/10 border-red-500/30";
    case "outbreak": return "bg-orange-500/10 border-orange-500/30";
    case "warning": return "bg-yellow-500/10 border-yellow-500/30";
    case "info": return "bg-blue-500/10 border-blue-500/30";
    default: return "bg-neutral-800 border-neutral-700";
  }
};

const getAlertBadgeColor = (severity: string) => {
  switch (severity) {
    case "emergency": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "outbreak": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "warning": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "info": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "tropical": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "waterborne": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "respiratory": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
    case "chronic": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "emergency": return "bg-red-600/20 text-red-400 border-red-600/30";
    case "general": return "bg-neutral-700 text-neutral-300 border-neutral-600";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

const getClinicTypeColor = (type: string) => {
  switch (type) {
    case "public": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "private": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "community": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
    case "mobile": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    default: return "bg-neutral-700 text-neutral-300 border-neutral-600";
  }
};

/* Main Component */

export default function HealthPage() {
  const [activeTab, setActiveTab] = useState("triage");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [triageResults, setTriageResults] = useState<TriageResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [medicationList, setMedicationList] = useState<Medication[]>(MOCK_MEDICATIONS);
  const [searchClinic, setSearchClinic] = useState("");
  const [filterClinicType, setFilterClinicType] = useState("all");
  const [filterProvince, setFilterProvince] = useState("all");

  const toggleSymptom = useCallback((symptomName: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomName)
        ? prev.filter((s) => s !== symptomName)
        : [...prev, symptomName]
    );
  }, []);

  const runTriage = useCallback(() => {
    if (selectedSymptoms.length === 0) return;

    const results: TriageResult[] = CONDITIONS.map((condition) => {
      const matchedSymptoms = condition.symptoms.filter((s) =>
        selectedSymptoms.includes(s)
      );
      const matchScore = condition.symptoms.length > 0
        ? Math.round((matchedSymptoms.length / condition.symptoms.length) * 100)
        : 0;

      return {
        condition,
        match_score: matchScore,
        matched_symptoms: matchedSymptoms,
      };
    })
      .filter((r) => r.match_score > 20)
      .sort((a, b) => b.match_score - a.match_score);

    setTriageResults(results);
    setShowResults(true);
  }, [selectedSymptoms]);

  const clearTriage = useCallback(() => {
    setSelectedSymptoms([]);
    setTriageResults([]);
    setShowResults(false);
    setSelectedCondition(null);
  }, []);

  const takeDose = useCallback((medId: string) => {
    setMedicationList((prev) =>
      prev.map((m) =>
        m.med_id === medId && m.remaining_doses > 0
          ? { ...m, remaining_doses: m.remaining_doses - 1 }
          : m
      )
    );
  }, []);

  const filteredClinics = useMemo(() => {
    let result = MOCK_CLINICS;
    if (filterClinicType !== "all") result = result.filter((c) => c.type === filterClinicType);
    if (filterProvince !== "all") result = result.filter((c) => c.province === filterProvince);
    if (searchClinic.trim()) {
      const q = searchClinic.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.services.some((s) => s.toLowerCase().includes(q))
      );
    }
    return result;
  }, [filterClinicType, filterProvince, searchClinic]);

  const topResult = useMemo(() => triageResults.length > 0 ? triageResults[0] : null, [triageResults]);

  const activeAlerts = useMemo(() => MOCK_ALERTS.filter((a) => a.severity === "outbreak" || a.severity === "emergency"), []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 rounded-xl">
                <HeartPulse className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Health Shield</h1>
                <p className="text-neutral-400 text-sm">Community health monitoring and symptom triage for Africa</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {activeAlerts.length} Active Alerts
              </Badge>
            </div>
          </div>
        </div>

        {/* Active Alerts Banner */}
        {activeAlerts.length > 0 && (
          <div className="space-y-3 mb-6">
            {activeAlerts.map((alert) => (
              <Card key={alert.alert_id} className={getAlertColor(alert.severity)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white">{alert.title}</p>
                        <Badge variant="outline" className={getAlertBadgeColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-300">{alert.description}</p>
                      <p className="text-xs text-neutral-500 mt-2">Source: {alert.source} • {alert.issued_date}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Stethoscope className="h-6 w-6 mx-auto mb-2 text-red-400" />
              <p className="text-2xl font-bold text-white">{CONDITIONS.length}</p>
              <p className="text-xs text-neutral-500">Conditions Tracked</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Pill className="h-6 w-6 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold text-white">{medicationList.length}</p>
              <p className="text-xs text-neutral-500">Active Medications</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Hospital className="h-6 w-6 mx-auto mb-2 text-cyan-400" />
              <p className="text-2xl font-bold text-white">{MOCK_CLINICS.length}</p>
              <p className="text-xs text-neutral-500">Clinics Listed</p>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 text-center">
              <Bell className="h-6 w-6 mx-auto mb-2 text-yellow-400" />
              <p className="text-2xl font-bold text-white">{MOCK_ALERTS.length}</p>
              <p className="text-xs text-neutral-500">Health Alerts</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-neutral-900 border border-neutral-800 p-1 w-full overflow-x-auto">
            <TabsTrigger value="triage" className="data-[state=active]:bg-neutral-800">Symptom Triage</TabsTrigger>
            <TabsTrigger value="conditions" className="data-[state=active]:bg-neutral-800">Condition Guide</TabsTrigger>
            <TabsTrigger value="medications" className="data-[state=active]:bg-neutral-800">Medications</TabsTrigger>
            <TabsTrigger value="clinics" className="data-[state=active]:bg-neutral-800">Clinic Finder</TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-neutral-800">Health Alerts</TabsTrigger>
          </TabsList>

          {/* SYMPTOM TRIAGE TAB */}
          <TabsContent value="triage" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Stethoscope className="h-5 w-5 text-red-400" />
                    Select Your Symptoms
                  </CardTitle>
                  <CardDescription>
                    Tap each symptom you are experiencing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {SYMPTOMS.map((symptom) => (
                      <button
                        key={symptom.symptom_id}
                        onClick={() => toggleSymptom(symptom.name)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
                          selectedSymptoms.includes(symptom.name)
                            ? "bg-red-500/10 border border-red-500/20"
                            : "bg-neutral-800 hover:bg-neutral-750 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedSymptoms.includes(symptom.name)
                              ? "bg-red-500 border-red-500"
                              : "border-neutral-600"
                          }`}>
                            {selectedSymptoms.includes(symptom.name) && (
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <p className={`font-medium ${selectedSymptoms.includes(symptom.name) ? "text-red-400" : "text-white"}`}>
                              {symptom.name}
                            </p>
                            <p className="text-xs text-neutral-500">{symptom.body_area}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={runTriage}
                      disabled={selectedSymptoms.length === 0}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Analyze Symptoms ({selectedSymptoms.length})
                    </Button>
                    {showResults && (
                      <Button variant="outline" className="border-neutral-700" onClick={clearTriage}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Activity className="h-5 w-5 text-cyan-400" />
                    Triage Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {showResults && triageResults.length > 0 ? (
                    <div className="space-y-4">
                      {topResult && (
                        <div className={`p-4 rounded-lg border-2 ${
                          topResult.condition.urgency === "emergency"
                            ? "bg-red-500/10 border-red-500"
                            : topResult.condition.urgency === "urgent_care"
                            ? "bg-orange-500/10 border-orange-500"
                            : "bg-neutral-800 border-neutral-700"
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <topResult.condition.icon className="h-5 w-5 text-white" />
                              <span className="font-bold text-white">{topResult.condition.name}</span>
                            </div>
                            <Badge className={getUrgencyColor(topResult.condition.urgency)}>
                              {topResult.match_score}% match
                            </Badge>
                          </div>
                          <Badge variant="outline" className={getUrgencyColor(topResult.condition.urgency)}>
                            {getUrgencyLabel(topResult.condition.urgency)}
                          </Badge>
                          <p className="text-sm text-neutral-300 mt-2">{topResult.condition.description}</p>
                          <div className="mt-3">
                            <p className="text-xs text-neutral-500 mb-1">Matched symptoms:</p>
                            <div className="flex flex-wrap gap-1">
                              {topResult.matched_symptoms.map((s) => (
                                <Badge key={s} variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-neutral-700">
                            <p className="text-xs text-neutral-500 mb-1">First steps:</p>
                            <ul className="space-y-1">
                              {topResult.condition.first_steps.map((step, i) => (
                                <li key={i} className="text-sm text-neutral-300 flex items-start gap-2">
                                  <ArrowRight className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {topResult.condition.warning_signs.length > 0 && (
                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <p className="text-xs text-red-400 font-medium mb-1">⚠️ Seek emergency care if:</p>
                              <ul className="space-y-1">
                                {topResult.condition.warning_signs.map((sign, i) => (
                                  <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                                    <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0 mt-1" />
                                    {sign}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {triageResults.slice(1, 4).map((result) => (
                        <div
                          key={result.condition.condition_id}
                          className="p-3 bg-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-750 transition-colors"
                          onClick={() => setSelectedCondition(result.condition.condition_id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <result.condition.icon className="h-4 w-4 text-neutral-400" />
                              <span className="font-medium text-white">{result.condition.name}</span>
                            </div>
                            <Badge variant="outline" className="bg-neutral-700 text-neutral-300">
                              {result.match_score}%
                            </Badge>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            Matched: {result.matched_symptoms.join(", ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-500">
                      <Stethoscope className="h-12 w-12 mx-auto mb-4 text-neutral-600" />
                      <p>Select your symptoms and click "Analyze" to get a triage assessment</p>
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
                    <p className="font-medium text-red-400">Medical Emergency?</p>
                    <p className="text-sm text-neutral-300 mt-1">
                      If you are experiencing a life-threatening emergency, call <strong className="text-white">10177</strong> (Ambulance) or <strong className="text-white">112</strong> (Emergency) immediately. This tool is for guidance only and does not replace professional medical advice.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONDITION GUIDE TAB */}
          <TabsContent value="conditions" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {CONDITIONS.map((condition) => {
                const CondIcon = condition.icon;
                const isExpanded = selectedCondition === condition.condition_id;
                return (
                  <Card
                    key={condition.condition_id}
                    className={`bg-neutral-900 border-neutral-800 cursor-pointer transition-all ${
                      isExpanded ? "ring-2 ring-cyan-500" : "hover:border-neutral-700"
                    }`}
                    onClick={() => setSelectedCondition(isExpanded ? null : condition.condition_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            condition.urgency === "emergency" ? "bg-red-500/20" :
                            condition.urgency === "urgent_care" ? "bg-orange-500/20" :
                            condition.urgency === "clinic_visit" ? "bg-yellow-500/20" : "bg-green-500/20"
                          }`}>
                            <CondIcon className={`h-5 w-5 ${
                              condition.urgency === "emergency" ? "text-red-400" :
                              condition.urgency === "urgent_care" ? "text-orange-400" :
                              condition.urgency === "clinic_visit" ? "text-yellow-400" : "text-green-400"
                            }`} />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">{condition.name}</h3>
                            <Badge variant="outline" className={getCategoryColor(condition.category)}>
                              {condition.category}
                            </Badge>
                          </div>
                        </div>
                        <Badge variant="outline" className={getUrgencyColor(condition.urgency)}>
                          {condition.urgency.replace("_", " ")}
                        </Badge>
                      </div>

                      <p className="text-sm text-neutral-400 mb-3">{condition.description}</p>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {condition.symptoms.map((s) => (
                          <Badge key={s} variant="outline" className="bg-neutral-800 text-neutral-400 text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-neutral-800 space-y-4">
                          <div>
                            <p className="text-sm font-medium text-white mb-2">First Steps:</p>
                            <ol className="space-y-1">
                              {condition.first_steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {i + 1}
                                  </span>
                                  {step}
                                </li>
                              ))}
                            </ol>
                          </div>

                          {condition.warning_signs.length > 0 && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                              <p className="text-sm font-medium text-red-400 mb-1">⚠️ Warning Signs:</p>
                              <ul className="space-y-1">
                                {condition.warning_signs.map((sign, i) => (
                                  <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                                    <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0 mt-1" />
                                    {sign}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div>
                            <p className="text-xs text-neutral-500 mb-1">Common in:</p>
                            <div className="flex flex-wrap gap-1">
                              {condition.common_in.map((area) => (
                                <Badge key={area} variant="outline" className="bg-neutral-800 text-neutral-400 text-xs">
                                  {area}
                                </Badge>
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

          {/* MEDICATIONS TAB */}
          <TabsContent value="medications" className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Pill className="h-5 w-5 text-blue-400" />
                      Medication Tracker
                    </CardTitle>
                    <CardDescription>Track your prescriptions and doses</CardDescription>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Medication
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {medicationList.map((med) => {
                    const progress = Math.round((med.remaining_doses / med.total_doses) * 100);
                    const isLow = med.remaining_doses <= 5;
                    return (
                      <div
                        key={med.med_id}
                        className={`p-4 rounded-lg border ${
                          isLow
                            ? "bg-yellow-500/5 border-yellow-500/20"
                            : "bg-neutral-800 border-neutral-700"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-white">{med.name}</h4>
                            <p className="text-sm text-neutral-400">{med.condition}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isLow && (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                Low Supply
                              </Badge>
                            )}
                            <Badge variant="outline" className="bg-neutral-700 text-neutral-300">
                              {med.remaining_doses}/{med.total_doses} doses
                            </Badge>
                          </div>
                        </div>

                        <div className="w-full bg-neutral-700 rounded-full h-2 mb-3">
                          <div
                            className={`h-2 rounded-full transition-all ${isLow ? "bg-yellow-500" : "bg-blue-500"}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-neutral-500">Dosage</p>
                            <p className="text-white">{med.dosage}</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Frequency</p>
                            <p className="text-white">{med.frequency}</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Next Dose</p>
                            <p className="text-blue-400">{med.next_dose_time}</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Refill By</p>
                            <p className="text-white">{med.refill_date}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => takeDose(med.med_id)}
                            disabled={med.remaining_doses <= 0}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Take Dose
                          </Button>
                          <Button size="sm" variant="outline" className="border-neutral-700">
                            <Calendar className="h-4 w-4 mr-1" />
                            Set Reminder
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CLINIC FINDER TAB */}
          <TabsContent value="clinics" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <Input
                  value={searchClinic}
                  onChange={(e) => setSearchClinic(e.target.value)}
                  placeholder="Search clinics by name, city, or service..."
                  className="bg-neutral-900 border-neutral-700"
                />
              </div>
              <Select value={filterClinicType} onValueChange={setFilterClinicType}>
                <SelectTrigger className="w-full md:w-[160px] bg-neutral-900 border-neutral-700">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterProvince} onValueChange={setFilterProvince}>
                <SelectTrigger className="w-full md:w-[180px] bg-neutral-900 border-neutral-700">
                  <SelectValue placeholder="Province" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  <SelectItem value="all">All Provinces</SelectItem>
                  <SelectItem value="Gauteng">Gauteng</SelectItem>
                  <SelectItem value="Western Cape">Western Cape</SelectItem>
                  <SelectItem value="KwaZulu-Natal">KwaZulu-Natal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {filteredClinics.map((clinic) => (
                <Card key={clinic.clinic_id} className="bg-neutral-900 border-neutral-800">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/20 rounded-lg">
                          <Hospital className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{clinic.name}</h3>
                          <p className="text-sm text-neutral-400">{clinic.address}, {clinic.city}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getClinicTypeColor(clinic.type)}>
                          {clinic.type}
                        </Badge>
                        {clinic.accepts_uninsured && (
                          <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                            Accepts Uninsured
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-neutral-500">Phone</p>
                        <p className="text-white">{clinic.phone}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Hours</p>
                        <p className="text-white">{clinic.open_hours}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Wait Time</p>
                        <p className="text-yellow-400">{clinic.wait_time}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Distance</p>
                        <p className="text-white">{clinic.distance_km} km</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-neutral-500 mb-2">Services:</p>
                      <div className="flex flex-wrap gap-1">
                        {clinic.services.map((service) => (
                          <Badge key={service} variant="outline" className="bg-neutral-800 text-neutral-400 text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                        <Phone className="h-4 w-4 mr-1" />
                        Call Clinic
                      </Button>
                      <Button size="sm" variant="outline" className="border-neutral-700">
                        <MapPin className="h-4 w-4 mr-1" />
                        Directions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* HEALTH ALERTS TAB */}
          <TabsContent value="alerts" className="space-y-6">
            <div className="space-y-4">
              {MOCK_ALERTS.map((alert) => (
                <Card key={alert.alert_id} className={`bg-neutral-900 border-neutral-800 ${
                  alert.severity === "outbreak" || alert.severity === "emergency" ? "ring-1 ring-red-500/30" : ""
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          alert.severity === "outbreak" ? "bg-red-500/20" :
                          alert.severity === "emergency" ? "bg-red-600/20" :
                          alert.severity === "warning" ? "bg-yellow-500/20" : "bg-blue-500/20"
                        }`}>
                          <AlertTriangle className={`h-5 w-5 ${
                            alert.severity === "outbreak" || alert.severity === "emergency" ? "text-red-400" :
                            alert.severity === "warning" ? "text-yellow-400" : "text-blue-400"
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{alert.title}</h3>
                          <p className="text-sm text-neutral-400">{alert.region}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={getAlertBadgeColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </div>

                    <p className="text-sm text-neutral-300 mb-3">{alert.description}</p>

                    <div className="bg-neutral-800 rounded-lg p-3 mb-3">
                      <p className="text-xs text-neutral-500 mb-2">Recommended Actions:</p>
                      <ul className="space-y-1">
                        {alert.actions.map((action, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                            <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>Source: {alert.source}</span>
                      <span>Issued: {alert.issued_date}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Phone className="h-5 w-5 text-red-400" />
                  Emergency Health Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { name: "Ambulance", number: "10177", desc: "Medical emergency" },
                    { name: "Emergency", number: "112", desc: "All emergencies (mobile)" },
                    { name: "Poison Hotline", number: "0861 555 777", desc: "Poisoning & overdoses" },
                    { name: "Mental Health", number: "0800 056 756", desc: "SADAG crisis line" },
                  ].map((contact, i) => (
                    <div key={i} className="bg-neutral-800 rounded-lg p-4 text-center">
                      <Phone className="h-8 w-8 mx-auto mb-2 text-red-400" />
                      <p className="font-medium text-white">{contact.name}</p>
                      <p className="text-lg text-red-400 font-bold">{contact.number}</p>
                      <p className="text-xs text-neutral-500">{contact.desc}</p>
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
