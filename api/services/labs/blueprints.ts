// =====================================================================
// LAB BLUEPRINTS — Predefined interactive simulations
// Covers Physics, Chemistry, Biology, Electrical, Renewable Energy, Fluid Mechanics
// =====================================================================

import type { LabVariable, LabFormula, SafetyBound } from "./engine";

export interface LabBlueprint {
  slug: string;
  title: string;
  description: string;
  subject: string;
  difficulty: string;
  durationMinutes: number;
  variables: LabVariable[];
  formulas: LabFormula[];
  safetyBounds: SafetyBound[];
  practicalSteps: string[];
  governingLaws: string[];
  aiTutorPrompt: string;
}

export const LAB_BLUEPRINTS: LabBlueprint[] = [
  {
    slug: "mechanics-newton",
    title: "Newton's Laws — Force & Acceleration",
    description: "Explore F=ma with adjustable mass and force. Watch how acceleration changes in real-time.",
    subject: "Physics",
    difficulty: "beginner",
    durationMinutes: 20,
    variables: [
      { name: "mass", label: "Mass", unit: "kg", min: 0.1, max: 10, step: 0.1, defaultValue: 1, description: "Object mass" },
      { name: "force", label: "Force", unit: "N", min: 0, max: 100, step: 1, defaultValue: 10, description: "Applied force" },
    ],
    formulas: [
      { name: "acceleration", expression: "force / mass", unit: "m/s²", description: "Newton's Second Law" },
    ],
    safetyBounds: [
      { variable: "force", min: 0, max: 100, message: "Force within safe limits" },
    ],
    practicalSteps: ["Set mass", "Apply force", "Measure acceleration", "Record data"],
    governingLaws: ["Newton's Second Law: F = ma"],
    aiTutorPrompt: "Explain Newton's Second Law and how force, mass, and acceleration relate. Use simple language and examples.",
  },
  {
    slug: "pendulum-motion",
    title: "Simple Pendulum — Period & Gravity",
    description: "Measure the period of a pendulum and calculate gravitational acceleration.",
    subject: "Physics",
    difficulty: "intermediate",
    durationMinutes: 25,
    variables: [
      { name: "length", label: "Length", unit: "m", min: 0.1, max: 2, step: 0.01, defaultValue: 1, description: "Pendulum length" },
      { name: "angle", label: "Release Angle", unit: "°", min: 5, max: 45, step: 1, defaultValue: 15, description: "Initial displacement" },
    ],
    formulas: [
      { name: "period", expression: "2 * PI * sqrt(length / 9.81)", unit: "s", description: "Pendulum period" },
    ],
    safetyBounds: [
      { variable: "length", min: 0.1, max: 2, message: "Length within safe limits" },
    ],
    practicalSteps: ["Set length", "Release at angle", "Time 10 oscillations", "Calculate g"],
    governingLaws: ["T = 2π√(L/g)"],
    aiTutorPrompt: "Explain how a pendulum works and how its period relates to length and gravity.",
  },
  {
    slug: "ohms-law",
    title: "Ohm's Law — Voltage, Current & Resistance",
    description: "Discover the relationship between V, I, and R in electrical circuits.",
    subject: "Physics",
    difficulty: "beginner",
    durationMinutes: 15,
    variables: [
      { name: "voltage", label: "Voltage", unit: "V", min: 0, max: 24, step: 0.5, defaultValue: 12, description: "Supply voltage" },
      { name: "resistance", label: "Resistance", unit: "Ω", min: 1, max: 100, step: 1, defaultValue: 10, description: "Circuit resistance" },
    ],
    formulas: [
      { name: "current", expression: "voltage / resistance", unit: "A", description: "Ohm's Law" },
    ],
    safetyBounds: [
      { variable: "voltage", min: 0, max: 24, message: "Voltage within safe limits" },
    ],
    practicalSteps: ["Set voltage", "Measure current", "Calculate resistance", "Verify V=IR"],
    governingLaws: ["V = IR"],
    aiTutorPrompt: "Explain Ohm's Law and how voltage, current, and resistance relate in a circuit.",
  },
  {
    slug: "solar-minigrid",
    title: "Solar Mini-Grid Design",
    description: "Size a solar panel array and battery bank for a rural clinic.",
    subject: "Engineering",
    difficulty: "advanced",
    durationMinutes: 40,
    variables: [
      { name: "panelWattage", label: "Panel Wattage", unit: "W", min: 100, max: 500, step: 10, defaultValue: 300, description: "Per panel output" },
      { name: "panelCount", label: "Panel Count", unit: "", min: 1, max: 20, step: 1, defaultValue: 4, description: "Number of panels" },
      { name: "sunHours", label: "Sun Hours", unit: "h", min: 2, max: 8, step: 0.5, defaultValue: 5, description: "Peak sun hours" },
    ],
    formulas: [
      { name: "dailyOutput", expression: "panelWattage * panelCount * sunHours / 1000", unit: "kWh", description: "Daily energy production" },
      { name: "systemPower", expression: "panelWattage * panelCount / 1000", unit: "kW", description: "Total system power" },
    ],
    safetyBounds: [
      { variable: "panelCount", min: 1, max: 20, message: "Panel count within limits" },
    ],
    practicalSteps: ["Calculate load", "Size panels", "Size batteries", "Verify autonomy"],
    governingLaws: ["Energy = Power × Time"],
    aiTutorPrompt: "Explain how to size a solar mini-grid system including panels, batteries, and energy calculations.",
  },
  {
    slug: "fluid-mechanics",
    title: "Fluid Mechanics — Pipe Flow",
    description: "Calculate flow rate and pressure drop in irrigation pipes.",
    subject: "Engineering",
    difficulty: "intermediate",
    durationMinutes: 30,
    variables: [
      { name: "diameter", label: "Pipe Diameter", unit: "mm", min: 15, max: 100, step: 1, defaultValue: 25, description: "Inner diameter" },
      { name: "velocity", label: "Flow Velocity", unit: "m/s", min: 0.1, max: 3, step: 0.1, defaultValue: 1, description: "Water velocity" },
      { name: "length", label: "Pipe Length", unit: "m", min: 10, max: 500, step: 10, defaultValue: 100, description: "Total pipe length" },
    ],
    formulas: [
      { name: "flowRate", expression: "PI * (diameter/2000)^2 * velocity", unit: "m³/s", description: "Volumetric flow rate" },
      { name: "pressureDrop", expression: "0.02 * (length / (diameter/1000)) * (velocity^2 / (2*9.81))", unit: "m", description: "Head loss" },
    ],
    safetyBounds: [
      { variable: "velocity", min: 0.1, max: 3, message: "Velocity within safe limits" },
    ],
    practicalSteps: ["Measure diameter", "Set velocity", "Calculate flow", "Check pressure"],
    governingLaws: ["Q = AV", "Darcy-Weisbach"],
    aiTutorPrompt: "Explain fluid flow in pipes including flow rate, velocity, and pressure drop calculations.",
  },
  {
    slug: "acid-base-titration",
    title: "Acid-Base Titration",
    description: "Determine the concentration of an unknown acid using a standard base.",
    subject: "Chemistry",
    difficulty: "intermediate",
    durationMinutes: 35,
    variables: [
      { name: "acidVolume", label: "Acid Volume", unit: "mL", min: 10, max: 100, step: 1, defaultValue: 25, description: "Volume of acid" },
      { name: "baseConcentration", label: "Base Concentration", unit: "M", min: 0.01, max: 2, step: 0.01, defaultValue: 0.1, description: "Standard base" },
      { name: "acidConcentration", label: "Acid Concentration", unit: "M", min: 0.01, max: 2, step: 0.01, defaultValue: 0.1, description: "Unknown acid" },
    ],
    formulas: [
      { name: "molesAcid", expression: "acidVolume * acidConcentration / 1000", unit: "mol", description: "Moles of acid" },
      { name: "molesBase", expression: "baseConcentration * 25 / 1000", unit: "mol", description: "Moles of base (25mL)" },
      { name: "ph", expression: "7 + (molesBase - molesAcid) * 10", unit: "", description: "Approximate pH" },
    ],
    safetyBounds: [
      { variable: "acidConcentration", min: 0.01, max: 2, message: "Concentrated acids (>2M) cause severe burns" },
      { variable: "baseConcentration", min: 0.01, max: 2, message: "Handle with care" },
    ],
    practicalSteps: ["Measure acid", "Add indicator", "Titrate with base", "Record endpoint"],
    governingLaws: ["M₁V₁ = M₂V₂"],
    aiTutorPrompt: "Explain acid-base titration and how to determine unknown concentrations.",
  },
  {
    slug: "enzyme-kinetics",
    title: "Enzyme Kinetics — Michaelis-Menten",
    description: "Study how substrate concentration affects enzyme reaction rate.",
    subject: "Biology",
    difficulty: "advanced",
    durationMinutes: 45,
    variables: [
      { name: "substrate", label: "Substrate [S]", unit: "mM", min: 0.1, max: 10, step: 0.1, defaultValue: 1, description: "Substrate concentration" },
      { name: "vmax", label: "Vmax", unit: "μmol/min", min: 1, max: 100, step: 1, defaultValue: 50, description: "Maximum rate" },
      { name: "km", label: "Km", unit: "mM", min: 0.1, max: 5, step: 0.1, defaultValue: 1, description: "Michaelis constant" },
    ],
    formulas: [
      { name: "rate", expression: "vmax * substrate / (km + substrate)", unit: "μmol/min", description: "Michaelis-Menten rate" },
      { name: "efficiency", expression: "rate / vmax * 100", unit: "%", description: "Enzyme efficiency" },
    ],
    safetyBounds: [
      { variable: "substrate", min: 0.1, max: 10, message: "Substrate within safe limits" },
    ],
    practicalSteps: ["Prepare substrate", "Add enzyme", "Measure rate", "Plot Michaelis-Menten"],
    governingLaws: ["v = Vmax[S] / (Km + [S])"],
    aiTutorPrompt: "Explain enzyme kinetics and the Michaelis-Menten equation.",
  },
];

export function getBlueprint(slug: string): LabBlueprint | null {
  return LAB_BLUEPRINTS.find((bp) => bp.slug === slug) ?? null;
}

export function listBlueprints(filters?: { subject?: string; difficulty?: string; gradeLevel?: string }): LabBlueprint[] {
  if (!filters) return LAB_BLUEPRINTS;
  
  return LAB_BLUEPRINTS.filter((bp) => {
    if (filters.subject && bp.subject !== filters.subject) return false;
    if (filters.difficulty && bp.difficulty !== filters.difficulty) return false;
    return true;
  });
}

export function listSubjects(): string[] {
  return [...new Set(LAB_BLUEPRINTS.map((bp) => bp.subject))];
}

export function listGradeLevels(): string[] {
  return ["beginner", "intermediate", "advanced"];
}
