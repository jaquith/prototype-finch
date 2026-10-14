import type { OperandType, SubjectType } from "../data/operators";

export type EvaluationResult =
  | { ok: true; value: boolean; durationMs: number }
  | { ok: false; error: string; durationMs: number };

function splitList(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function parseSubject(raw: string, type: SubjectType): unknown {
  switch (type) {
    case "Number":
      return raw.trim() === "" ? undefined : Number(raw);
    case "Boolean":
      return raw.trim().toLowerCase() === "true";
    case "Set of Strings":
      return splitList(raw);
    case "Date":
    case "String":
    default:
      return raw;
  }
}

export function parseOperand(raw: string, type: OperandType): unknown {
  switch (type) {
    case "none":
      return undefined;
    case "Number":
      return raw.trim() === "" ? undefined : Number(raw);
    case "List of Strings":
      return splitList(raw);
    default:
      return raw;
  }
}

// Mirrors the production contract: anything other than a literal boolean is an error,
// and at runtime an errored operator makes its condition evaluate to FALSE.
export function evaluateOperator(code: string, subject: unknown, operand: unknown): EvaluationResult {
  const start = performance.now();
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("subject", "operand", `"use strict";\n${code}`);
    const result = fn(subject, operand);
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
