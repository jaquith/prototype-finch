import {
  IDENTIFIER_PATTERN,
  RESERVED_OPERAND_NAMES,
  type OperandDef,
  type OperandType,
  type TestValueType,
} from "../data/operators";

export type EvaluationResult =
  | { ok: true; value: boolean; durationMs: number }
  | { ok: false; error: string; durationMs: number };

export type ParseResult = { ok: true; value: unknown } | { ok: false; error: string };

function splitList(raw: string): ParseResult {
  const trimmed = raw.trim();
  // A JSON array is the escape hatch for values that themselves contain commas.
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) return { ok: true, value: parsed };
      return { ok: false, error: "JSON must be an array of strings" };
    } catch {
      return { ok: false, error: "Invalid JSON array" };
    }
  }
  return { ok: true, value: raw.split(",").map((s) => s.trim()).filter(Boolean) };
}

function parseNumber(raw: string): ParseResult {
  if (raw.trim() === "") return { ok: false, error: "Enter a number" };
  const n = Number(raw);
  return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, error: `"${raw}" is not a number` };
}

export function parseTyped(raw: string, type: TestValueType): ParseResult {
  switch (type) {
    case "Null":
      return { ok: true, value: null };
    case "Number":
      return parseNumber(raw);
    case "Boolean": {
      const v = raw.trim().toLowerCase();
      if (v === "true" || v === "false") return { ok: true, value: v === "true" };
      return { ok: false, error: "Boolean must be true or false" };
    }
    case "Date": {
      const d = new Date(raw.trim());
      return Number.isNaN(d.getTime()) ? { ok: false, error: `"${raw}" is not a valid date` } : { ok: true, value: d };
    }
    case "Set of Strings":
      return splitList(raw);
    case "String":
    default:
      return { ok: true, value: raw };
  }
}

export function parseOperand(raw: string, type: OperandType): ParseResult {
  return parseTyped(raw, type === "List of Strings" ? "Set of Strings" : type);
}

export function formatValue(value: unknown): string {
  if (value instanceof Date) return `Date(${value.toISOString()})`;
  if (value === undefined) return "undefined";
  return JSON.stringify(value);
}

// Mirrors the production contract: anything other than a literal boolean is an error,
// and at runtime an errored operator makes its condition evaluate to FALSE.
export function evaluateOperator(
  code: string,
  subject: unknown,
  operandNames: string[],
  operandValues: unknown[],
): EvaluationResult {
  const start = performance.now();
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("subject", ...operandNames, `"use strict";\n${code}`);
    const result = fn(subject, ...operandValues);
    const durationMs = performance.now() - start;
    if (typeof result !== "boolean") {
      const got = result === undefined ? "undefined" : JSON.stringify(result);
      return { ok: false, error: `Operator must return true or false (got ${got})`, durationMs };
    }
    return { ok: true, value: result, durationMs };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), durationMs: performance.now() - start };
  }
}

export function evaluateCase(
  code: string,
  operands: OperandDef[],
  subjectRaw: string,
  subjectType: TestValueType,
  operandRaws: string[],
): EvaluationResult {
  const subject = parseTyped(subjectRaw, subjectType);
  if (!subject.ok) return { ok: false, error: `Subject: ${subject.error}`, durationMs: 0 };
  const values: unknown[] = [];
  for (const [i, def] of operands.entries()) {
    const parsed = parseOperand(operandRaws[i] ?? "", def.type);
    if (!parsed.ok) return { ok: false, error: `${def.label || def.name}: ${parsed.error}`, durationMs: 0 };
    values.push(parsed.value);
  }
  return evaluateOperator(
    code,
    subject.value,
    operands.map((o) => o.name),
    values,
  );
}

/** Problems that would stop the function from compiling with these operand names. */
export function operandNameErrors(operands: OperandDef[]): (string | null)[] {
  return operands.map((o, i) => {
    if (!IDENTIFIER_PATTERN.test(o.name)) return "Must be a valid JS identifier";
    if (RESERVED_OPERAND_NAMES.has(o.name)) return `"${o.name}" is reserved`;
    if (operands.findIndex((x) => x.name === o.name) !== i) return "Duplicate name";
    return null;
  });
}

// Negation flips a successful result only. An errored operator stays FALSE either way,
// so a crashing "NOT is valid email" never silently lets every profile through.
export function conditionOutcome(result: EvaluationResult, negate: boolean): boolean {
  if (!result.ok) return false;
  return negate ? !result.value : result.value;
}
