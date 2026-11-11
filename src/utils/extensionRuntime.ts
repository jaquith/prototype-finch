export interface ExtensionParam {
  variableName: string;
  type: string;
}

export interface ExtensionTest {
  id: string;
  suite?: string;
  name: string;
  inputs: Record<string, string>;
  expected: Record<string, string>;
}

export interface TestVariable {
  id: string;
  name: string;
  value: string;
}

type ParseResult = { ok: true; value: unknown } | { ok: false; error: string };
type TextResult = { ok: true; text: string } | { ok: false; error: string };

export const VARIABLE_NAME = /^[A-Za-z_]\w*$/;
const VARIABLE_REF = /\{\{\s*([A-Za-z_]\w*)\s*\}\}/g;

function substitute(raw: string, values: Map<string, string>): TextResult {
  let missing: string | undefined;
  const text = raw.replace(VARIABLE_REF, (whole, name: string) => {
    const v = values.get(name);
    if (v === undefined) missing ??= name;
    return v ?? whole;
  });
  return missing ? { ok: false, error: `Unknown variable {{${missing}}}` } : { ok: true, text };
}

// Variables resolve in order, so a later variable can build on an earlier one.
export function resolveTestVariables(vars: TestVariable[]): { values: Map<string, string>; errors: Map<string, string> } {
  const values = new Map<string, string>();
  const errors = new Map<string, string>();
  for (const v of vars) {
    if (!v.name) continue;
    if (!VARIABLE_NAME.test(v.name)) {
      errors.set(v.id, "Use letters, numbers and underscores");
      continue;
    }
    if (values.has(v.name)) {
      errors.set(v.id, `{{${v.name}}} is already defined`);
      continue;
    }
    const r = substitute(v.value, values);
    if (r.ok) values.set(v.name, r.text);
    else errors.set(v.id, r.error);
  }
  return { values, errors };
}

export type OutputCheck = { name: string; expected: unknown; actual: unknown; pass: boolean };

export type ExtensionTestResult =
  | { ok: true; pass: boolean; checks: OutputCheck[]; durationMs: number }
  | { ok: false; error: string; durationMs: number };

const NUMBER_TYPES = new Set(["Number", "Static Number"]);
const LIST_TYPES = new Set(["Set of Strings", "Array of Strings"]);
const JSON_TYPES = new Set(["Tally", "Timeline", "Funnel", "Array of Numbers", "Array of Booleans", "Array of Objects", "Static Object"]);

export function placeholderFor(type: string): string {
  if (NUMBER_TYPES.has(type)) return "e.g. 42";
  if (type === "Boolean" || type === "Badge") return "true or false";
  if (type === "Date") return "e.g. 2026-01-31T09:00:00Z";
  if (LIST_TYPES.has(type)) return "a, b, c";
  if (type === "Tally") return '{"shoes": 3}';
  if (JSON_TYPES.has(type)) return "JSON";
  return "text";
}

// A blank field means the attribute is absent, so inputs arrive as undefined
// and a blank expectation asserts the output was never set.
export function parseExtensionValue(raw: string, type: string): ParseResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: undefined };
  if (NUMBER_TYPES.has(type)) {
    const n = Number(trimmed);
    return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, error: `"${raw}" is not a number` };
  }
  if (type === "Boolean" || type === "Badge") {
    const v = trimmed.toLowerCase();
    return v === "true" || v === "false" ? { ok: true, value: v === "true" } : { ok: false, error: "Use true or false" };
  }
  if (type === "Date") {
    const ms = /^-?\d+$/.test(trimmed) ? Number(trimmed) : new Date(trimmed).getTime();
    return Number.isNaN(ms) ? { ok: false, error: `"${raw}" is not a valid date` } : { ok: true, value: ms };
  }
  if (LIST_TYPES.has(type) && !trimmed.startsWith("[")) {
    return { ok: true, value: trimmed.split(",").map((s) => s.trim()).filter(Boolean).map(unquote) };
  }
  if (LIST_TYPES.has(type) || JSON_TYPES.has(type)) {
    try {
      return { ok: true, value: JSON.parse(trimmed) };
    } catch {
      return { ok: false, error: "Invalid JSON" };
    }
  }
  return { ok: true, value: unquote(raw) };
}

// A string wrapped in double quotes is read as a JSON literal, so `""` is an
// empty string and `" hi "` keeps its spaces; anything else is taken as typed.
function unquote(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") return parsed;
    } catch {
      /* not a valid literal; use the text as typed */
    }
  }
  return raw;
}

function canonical(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "number" && Number.isNaN(value)) return "NaN";
  if (value instanceof Date) return `date:${value.toISOString()}`;
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function formatExtensionValue(value: unknown, type?: string): string {
  if (value === undefined) return "not set";
  if (type === "Date" && typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === "number" && Number.isNaN(value)) return "NaN";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return JSON.stringify(value);
  return JSON.stringify(value);
}

export function runExtensionTest(
  codeBody: string,
  inputs: ExtensionParam[],
  outputs: ExtensionParam[],
  test: ExtensionTest,
  variables: Map<string, string> = new Map(),
): ExtensionTestResult {
  const start = performance.now();
  const elapsed = () => Math.round((performance.now() - start) * 100) / 100;

  const parseField = (raw: string, type: string): ParseResult => {
    const r = substitute(raw, variables);
    return r.ok ? parseExtensionValue(r.text, type) : r;
  };

  const input: Record<string, unknown> = {};
  for (const p of inputs) {
    const parsed = parseField(test.inputs[p.variableName] ?? "", p.type);
    if (!parsed.ok) return { ok: false, error: `input.${p.variableName}: ${parsed.error}`, durationMs: elapsed() };
    input[p.variableName] = parsed.value;
  }

  const expected: Record<string, unknown> = {};
  for (const p of outputs) {
    const parsed = parseField(test.expected[p.variableName] ?? "", p.type);
    if (!parsed.ok) return { ok: false, error: `expected output.${p.variableName}: ${parsed.error}`, durationMs: elapsed() };
    expected[p.variableName] = parsed.value;
  }

  let result: unknown;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("input", "output", `"use strict";\n${codeBody}\nreturn output;`);
    result = fn(input, {});
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), durationMs: elapsed() };
  }

  const out = (result ?? {}) as Record<string, unknown>;
  const checks = outputs.map((p) => {
    const actual = out[p.variableName];
    return { name: p.variableName, expected: expected[p.variableName], actual, pass: canonical(actual) === canonical(expected[p.variableName]) };
  });
  return { ok: true, pass: checks.every((c) => c.pass), checks, durationMs: elapsed() };
}
