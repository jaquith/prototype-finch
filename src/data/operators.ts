export type OperandType = "none" | "String" | "Number" | "List of Strings";

export const SUBJECT_TYPES = ["String", "Number", "Boolean", "Date", "Set of Strings"] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export interface OperatorTest {
  id: string;
  name: string;
  subject: string;
  operand: string;
  expected: boolean;
}

export interface OperatorUsage {
  enrichment: string;
  attribute: string;
  attributeId: string;
}

export interface OperatorDef {
  id: string;
  label: string;
  identifier: string;
  description: string;
  subjectTypes: SubjectType[];
  operandType: OperandType;
  operandLabel?: string;
  code: string;
  tests: OperatorTest[];
  enabled: boolean;
  lastModified: string;
}

export const BUILT_IN_OPERATORS: { label: string; value: string; unary?: boolean }[] = [
  { label: "equals", value: "equals" },
  { label: "not equals", value: "not equals" },
  { label: "contains", value: "contains" },
  { label: "is set", value: "is set", unary: true },
  { label: "is not set", value: "is not set", unary: true },
  { label: "greater than", value: "greater than" },
  { label: "less than", value: "less than" },
];

export const CUSTOM_OPERATOR_PREFIX = "custom:";

export const MOCK_OPERATORS: OperatorDef[] = [
  {
    id: "op1",
    label: "is valid email",
    identifier: "isValidEmail",
    description: "TRUE when the value is a syntactically valid email address with a real-looking TLD.",
    subjectTypes: ["String"],
    operandType: "none",
    code: `  if (typeof subject !== "string") return false;
  const pattern = /^[^\\s@]+@[^\\s@]+\\.[a-z]{2,}$/i;
  return pattern.test(subject.trim());
`,
    tests: [
      { id: "t1", name: "accepts a normal address", subject: "jane.doe@example.com", operand: "", expected: true },
      { id: "t2", name: "rejects a missing domain", subject: "jane.doe@", operand: "", expected: false },
      { id: "t3", name: "rejects whitespace inside", subject: "jane doe@example.com", operand: "", expected: false },
    ],
    enabled: true,
    lastModified: "2026-03-08",
  },
  {
    id: "op2",
    label: "matches pattern",
    identifier: "matchesPattern",
    description: "TRUE when the value matches the regular expression given as the operand (case-insensitive).",
    subjectTypes: ["String"],
    operandType: "String",
    operandLabel: "Regex pattern",
    code: `  if (typeof subject !== "string" || !operand) return false;
  return new RegExp(operand, "i").test(subject);
`,
    tests: [
      { id: "t1", name: "matches a clean search term", subject: "running shoes", operand: "^[\\w\\s-]{3,64}$", expected: true },
      { id: "t2", name: "rejects a too-short term", subject: "a", operand: "^[\\w\\s-]{3,64}$", expected: false },
      { id: "t3", name: "rejects script injection", subject: "<script>", operand: "^[\\w\\s-]{3,64}$", expected: false },
    ],
    enabled: true,
    lastModified: "2026-03-10",
  },
  {
    id: "op3",
    label: "is within last N days",
    identifier: "isWithinLastDays",
    description: "TRUE when the date value falls between now and N days ago. Future dates evaluate to FALSE.",
    subjectTypes: ["String", "Date"],
    operandType: "Number",
    operandLabel: "Days",
    code: `  const ts = new Date(subject).getTime();
  if (Number.isNaN(ts) || typeof operand !== "number") return false;
  const ageMs = Date.now() - ts;
  return ageMs >= 0 && ageMs <= operand * 24 * 60 * 60 * 1000;
`,
    tests: [
      { id: "t1", name: "accepts a very recent date", subject: new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10), operand: "90", expected: true },
      { id: "t2", name: "rejects a date outside the window", subject: "2019-01-01", operand: "90", expected: false },
      { id: "t3", name: "rejects an unparseable date", subject: "not a date", operand: "90", expected: false },
    ],
    enabled: true,
    lastModified: "2026-03-11",
  },
  {
    id: "op4",
    label: "contains any of",
    identifier: "containsAnyOf",
    description: "TRUE when the set shares at least one value with the operand list. Comparison ignores case.",
    subjectTypes: ["Set of Strings"],
    operandType: "List of Strings",
    operandLabel: "Values",
    code: `  if (!Array.isArray(subject) || !Array.isArray(operand)) return false;
  const wanted = new Set(operand.map((v) => v.toLowerCase()));
  return subject.some((v) => wanted.has(String(v).toLowerCase()));
`,
    tests: [
      { id: "t1", name: "finds an overlapping value", subject: "boots, Luxury Watches", operand: "luxury watches, jewelry", expected: true },
      { id: "t2", name: "no overlap", subject: "socks, tees", operand: "luxury watches, jewelry", expected: false },
    ],
    enabled: false,
    lastModified: "2026-03-12",
  },
];

export const OPERATOR_USAGE: Record<string, OperatorUsage[]> = {
  op4: [{ enrichment: "Add Search Term", attribute: "search_history", attributeId: "a21" }],
  op3: [{ enrichment: "Set Loyalty Tier", attribute: "loyalty_tier", attributeId: "a14" }],
};

export function customOperatorValue(op: OperatorDef): string {
  return `${CUSTOM_OPERATOR_PREFIX}${op.id}`;
}

export function findCustomOperator(value: string): OperatorDef | undefined {
  if (!value.startsWith(CUSTOM_OPERATOR_PREFIX)) return undefined;
  const id = value.slice(CUSTOM_OPERATOR_PREFIX.length);
  return MOCK_OPERATORS.find((o) => o.id === id);
}

export function operatorTakesValue(value: string): boolean {
  const custom = findCustomOperator(value);
  if (custom) return custom.operandType !== "none";
  return !BUILT_IN_OPERATORS.find((o) => o.value === value)?.unary;
}

export function operatorLabel(value: string): string {
  return findCustomOperator(value)?.label ?? BUILT_IN_OPERATORS.find((o) => o.value === value)?.label ?? value;
}

export function createBlankOperator(): OperatorDef {
  return {
    id: "new",
    label: "",
    identifier: "",
    description: "",
    subjectTypes: ["String"],
    operandType: "none",
    code: `  // Return true or false.\n  return false;\n`,
    tests: [],
    enabled: false,
    lastModified: new Date().toISOString().slice(0, 10),
  };
}
