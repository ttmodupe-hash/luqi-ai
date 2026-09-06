// =====================================================================
// LAB CALCULATION ENGINE — Real mathematical execution
// Converts formula strings into computed values with safety validation
// =====================================================================

export interface LabVariable {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  description: string;
}

export interface LabFormula {
  name: string;
  expression: string;
  unit: string;
  description: string;
}

export interface SafetyBound {
  variable: string;
  min: number;
  max: number;
  message: string;
}

export interface CalculationResult {
  name: string;
  value: number;
  unit: string;
  description: string;
}

// ── SAFETY: Whitelist of allowed mathematical functions ──────────────
const ALLOWED_FUNCTIONS = new Set([
  'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'log', 'ln', 'exp', 'abs', 'pow', 'min', 'max',
  'floor', 'ceil', 'round', 'PI', 'E'
]);

const ALLOWED_OPERATORS = new Set(['+', '-', '*', '/', '(', ')', ',']);

// ── FORMULA EVALUATOR ───────────────────────────────────────────────

function evaluateExpression(expression: string, variables: Record<string, number>): number {
  // Replace variable names with their values
  let expr = expression;
  for (const [name, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\b${name}\\b`, 'g');
    expr = expr.replace(regex, String(value));
  }

  // Blueprints use ^ for exponent — normalize to JS ** (was bitwise XOR bug)
  expr = expr.replace(/\^/g, "**");

  // Whitelisted math names → Math.* equivalents (longest names first so
  // asin/acos/atan are not partially matched by sin/cos/tan)
  const MATH_NAMES = [
    "asin", "acos", "atan", "sqrt", "floor", "ceil", "round",
    "sin", "cos", "tan", "exp", "abs", "pow", "min", "max", "log",
  ];
  let normalized = expr;
  for (const fn of MATH_NAMES) {
    normalized = normalized.replace(new RegExp(`\\b${fn}\\b`, 'g'), `Math.${fn}`);
  }
  normalized = normalized.replace(/\bln\b/g, "Math.log");
  normalized = normalized.replace(/\bPI\b/g, "Math.PI");
  normalized = normalized.replace(/\bE\b/g, "Math.E");

  // Strip every Math.<whitelisted> token; the remainder must be pure
  // arithmetic characters only. Anything else → reject.
  const stripped = normalized.replace(
    /Math\.(sqrt|sin|cos|tan|asin|acos|atan|log|exp|abs|pow|min|max|floor|ceil|round|PI|E)\b/g,
    ""
  );
  if (!/^[0-9+\-*\/().,\s]*$/.test(stripped)) {
    throw new Error("Expression contains unsafe or unknown tokens");
  }

  try {
    const result = new Function(`"use strict"; return (${normalized})`)();
    if (typeof result !== "number" || !isFinite(result)) {
      throw new Error("Invalid result");
    }
    return result;
  } catch (err) {
    throw new Error(`Failed to evaluate "${expression}": ${err}`);
  }
}

// ── PUBLIC API ──────────────────────────────────────────────────────

// Public wrapper for the agent "calculate" tool — evaluates a pure math
// expression through the same whitelist/hardened evaluator used by labs.
export function evaluateMathExpression(expression: string): number {
  return evaluateExpression(expression, {});
}

export function runCalculations(
  formulas: LabFormula[],
  variables: Record<string, number>
): CalculationResult[] {
  // Chain: each formula's result becomes available to later formulas
  const scope: Record<string, number> = { ...variables };
  return formulas.map((formula) => {
    const value = evaluateExpression(formula.expression, scope);
    scope[formula.name] = value;
    return {
      name: formula.name,
      value,
      unit: formula.unit,
      description: formula.description,
    };
  });
}

export function checkSafety(
  variables: Record<string, number>,
  safetyBounds: SafetyBound[]
): { safe: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const bound of safetyBounds) {
    const value = variables[bound.variable];
    if (value === undefined) continue;

    if (value < bound.min || value > bound.max) {
      violations.push(bound.message);
    }
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}

export function clampVariables(
  variables: Record<string, number>,
  variableDefinitions: LabVariable[]
): Record<string, number> {
  const clamped: Record<string, number> = {};

  for (const def of variableDefinitions) {
    const value = variables[def.name] ?? def.defaultValue;
    clamped[def.name] = Math.max(def.min, Math.min(def.max, value));
  }

  return clamped;
}
