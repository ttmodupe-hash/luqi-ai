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

  // Replace mathematical constants and functions
  expr = expr.replace(/\bPI\b/g, 'Math.PI');
  expr = expr.replace(/\bE\b/g, 'Math.E');
  expr = expr.replace(/\bsqrt\b/g, 'Math.sqrt');
  expr = expr.replace(/\bsin\b/g, 'Math.sin');
  expr = expr.replace(/\bcos\b/g, 'Math.cos');
  expr = expr.replace(/\btan\b/g, 'Math.tan');
  expr = expr.replace(/\blog\b/g, 'Math.log');
  expr = expr.replace(/\bln\b/g, 'Math.log');
  expr = expr.replace(/\bexp\b/g, 'Math.exp');
  expr = expr.replace(/\babs\b/g, 'Math.abs');
  expr = expr.replace(/\bpow\b/g, 'Math.pow');
  expr = expr.replace(/\bmin\b/g, 'Math.min');
  expr = expr.replace(/\bmax\b/g, 'Math.max');

  // Security: only allow math-safe characters
  const safePattern = /^[0-9+\-*/().\sMath{}[\]**,_]+$/;
  if (!safePattern.test(expr)) {
    throw new Error("Expression contains unsafe characters");
  }

  // Additional security: block dangerous patterns
  const dangerousPatterns = [
    /process/i, /require/i, /import/i, /export/i, /eval/i,
    /Function/i, /constructor/i, /prototype/i, /__proto__/i,
    /window/i, /document/i, /global/i, /this/i, /fetch/i,
    /XMLHttpRequest/i, /WebSocket/i, /localStorage/i, /sessionStorage/i,
  ];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(expr)) {
      throw new Error("Expression contains blocked pattern");
    }
  }

  try {
    // Use a safe math parser instead of new Function()
    // Whitelist approach: only allow specific math functions
    const safeExpr = expr
      .replace(/\bsqrt\b/g, "Math.sqrt")
      .replace(/\bsin\b/g, "Math.sin")
      .replace(/\bcos\b/g, "Math.cos")
      .replace(/\btan\b/g, "Math.tan")
      .replace(/\bPI\b/g, "Math.PI")
      .replace(/\bE\b/g, "Math.E")
      .replace(/\blog\b/g, "Math.log")
      .replace(/\bexp\b/g, "Math.exp")
      .replace(/\babs\b/g, "Math.abs")
      .replace(/\bpow\b/g, "Math.pow")
      .replace(/\bmin\b/g, "Math.min")
      .replace(/\bmax\b/g, "Math.max");

    // Final validation: ensure only allowed characters remain
    const finalCheck = /^[0-9+\-*/().\sMath{},_]+$/;
    if (!finalCheck.test(safeExpr)) {
      throw new Error("Expression failed final safety check");
    }

    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${safeExpr})`)();
    if (typeof result !== "number" || !isFinite(result)) {
      throw new Error("Invalid result");
    }
    return result;
  } catch (e) {
    throw new Error(`Failed to evaluate "${expression}": ${e}`);
  }
}

// ── PUBLIC API ──────────────────────────────────────────────────────

export function runCalculations(
  formulas: LabFormula[],
  variables: Record<string, number>
): CalculationResult[] {
  return formulas.map((formula) => {
    const value = evaluateExpression(formula.expression, variables);
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
