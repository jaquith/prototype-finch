export const SUBJECT_TYPES = ["String", "Number", "Boolean", "Date", "Set of Strings"] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export const OPERAND_TYPES = ["String", "Number", "Boolean", "Date", "List of Strings"] as const;
export type OperandType = (typeof OPERAND_TYPES)[number];

/** A test subject is either one of the declared attribute types, or Null to simulate a missing attribute. */
export type TestValueType = SubjectType | "Null";

export interface OperandDef {
  /** JS parameter name the function receives, and the {placeholder} used in the label. */
  name: string;
  label: string;
  type: OperandType;
}

export interface OperatorTest {
  id: string;
  name: string;
  subjectType: TestValueType;
  subject: string;
  /** Raw operand inputs, positionally matching OperatorDef.operands. */
  operands: string[];
  expected: boolean;
}

export interface OperatorUsage {
  enrichment: string;
  attribute: string;
  attributeId: string;
}

export interface OperatorDef {
  id: string;
  /** May reference operands inline, e.g. "is within {days} days of {other}". */
  label: string;
  /** Optional wording used when a condition negates this operator. Defaults to "NOT <label>". */
  negatedLabel?: string;
  identifier: string;
  description: string;
  subjectTypes: SubjectType[];
  operands: OperandDef[];
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

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

export const MOCK_OPERATORS: OperatorDef[] = [
  {
    id: "op1",
    label: "is valid email",
    negatedLabel: "is not a valid email",
    identifier: "isValidEmail",
    description: "TRUE when the value is a syntactically valid email address with a real-looking TLD.",
    subjectTypes: ["String"],
    operands: [],
    code: `  if (typeof subject !== "string") return false;
  const pattern = /^[^\\s@]+@[^\\s@]+\\.[a-z]{2,}$/i;
  return pattern.test(subject.trim());
`,
    tests: [
      { id: "t1", name: "accepts a normal address", subjectType: "String", subject: "jane.doe@example.com", operands: [], expected: true },
      { id: "t2", name: "rejects a missing domain", subjectType: "String", subject: "jane.doe@", operands: [], expected: false },
      { id: "t3", name: "rejects whitespace inside", subjectType: "String", subject: "jane doe@example.com", operands: [], expected: false },
      { id: "t4", name: "rejects a missing attribute", subjectType: "Null", subject: "", operands: [], expected: false },
    ],
    enabled: true,
    lastModified: "2026-03-08",
  },
  {
    id: "op2",
    label: "matches pattern {pattern}",
    negatedLabel: "does not match pattern {pattern}",
    identifier: "matchesPattern",
    description: "TRUE when the value matches the regular expression given as the operand (case-insensitive).",
    subjectTypes: ["String"],
    operands: [{ name: "pattern", label: "Regex pattern", type: "String" }],
    code: `  if (typeof subject !== "string" || !pattern) return false;
  return new RegExp(pattern, "i").test(subject);
`,
    tests: [
      { id: "t1", name: "matches a clean search term", subjectType: "String", subject: "running shoes", operands: ["^[\\w\\s-]{3,64}$"], expected: true },
      { id: "t2", name: "rejects a too-short term", subjectType: "String", subject: "a", operands: ["^[\\w\\s-]{3,64}$"], expected: false },
      { id: "t3", name: "rejects script injection", subjectType: "String", subject: "<script>", operands: ["^[\\w\\s-]{3,64}$"], expected: false },
    ],
    enabled: true,
    lastModified: "2026-03-10",
  },
  {
    id: "op3",
    label: "is within last {days} days",
    negatedLabel: "is not within last {days} days",
    identifier: "isWithinLastDays",
    description: "TRUE when the date value falls between now and N days ago. Future dates evaluate to FALSE.",
    subjectTypes: ["String", "Date"],
    operands: [{ name: "days", label: "Days", type: "Number" }],
    code: `  const ts = new Date(subject).getTime();
  if (Number.isNaN(ts)) return false;
  const ageMs = Date.now() - ts;
  return ageMs >= 0 && ageMs <= days * 24 * 60 * 60 * 1000;
`,
    tests: [
      { id: "t1", name: "accepts a very recent date", subjectType: "Date", subject: daysAgo(2), operands: ["90"], expected: true },
      { id: "t2", name: "rejects a date outside the window", subjectType: "Date", subject: "2019-01-01", operands: ["90"], expected: false },
      { id: "t3", name: "rejects an unparseable date string", subjectType: "String", subject: "not a date", operands: ["90"], expected: false },
    ],
    enabled: true,
    lastModified: "2026-03-11",
  },
  {
    id: "op4",
    label: "contains any of {values}",
    negatedLabel: "contains none of {values}",
    identifier: "containsAnyOf",
    description: "TRUE when the set shares at least one value with the operand list. Comparison ignores case.",
    subjectTypes: ["Set of Strings"],
    operands: [{ name: "values", label: "Values", type: "List of Strings" }],
    code: `  if (!Array.isArray(subject)) return false;
  const wanted = new Set(values.map((v) => v.toLowerCase()));
  return subject.some((v) => wanted.has(String(v).toLowerCase()));
`,
    tests: [
      { id: "t1", name: "finds an overlapping value", subjectType: "Set of Strings", subject: "boots, Luxury Watches", operands: ["luxury watches, jewelry"], expected: true },
      { id: "t2", name: "no overlap", subjectType: "Set of Strings", subject: "socks, tees", operands: ["luxury watches, jewelry"], expected: false },
      { id: "t3", name: "values containing commas", subjectType: "Set of Strings", subject: "[\"Watches, Luxury\"]", operands: ["[\"watches, luxury\"]"], expected: true },
    ],
    enabled: true,
    lastModified: "2026-03-12",
  },
  {
    id: "op5",
    label: "is within {days} days of {other}",
    negatedLabel: "is more than {days} days from {other}",
    identifier: "isWithinDaysOf",
    description: "TRUE when the two dates are at most N days apart, in either direction.",
    subjectTypes: ["Date"],
    operands: [
      { name: "days", label: "Days", type: "Number" },
      { name: "other", label: "Date", type: "Date" },
    ],
    code: `  if (!(subject instanceof Date)) return false;
  const gapMs = Math.abs(subject.getTime() - other.getTime());
  return gapMs <= days * 24 * 60 * 60 * 1000;
`,
    tests: [
      { id: "t1", name: "accepts a date just before", subjectType: "Date", subject: "2026-03-01", operands: ["7", "2026-03-05"], expected: true },
      { id: "t2", name: "accepts a date just after", subjectType: "Date", subject: "2026-03-12", operands: ["7", "2026-03-05"], expected: true },
      { id: "t3", name: "rejects a date outside the window", subjectType: "Date", subject: "2026-04-01", operands: ["7", "2026-03-05"], expected: false },
      { id: "t4", name: "rejects a missing attribute", subjectType: "Null", subject: "", operands: ["7", "2026-03-05"], expected: false },
    ],
    enabled: true,
    lastModified: "2026-03-14",
  },
];

export const OPERATOR_USAGE: Record<string, OperatorUsage[]> = {
  op4: [{ enrichment: "Add Search Term", attribute: "search_history", attributeId: "a21" }],
  op3: [
    { enrichment: "Set Loyalty Tier", attribute: "loyalty_tier", attributeId: "a14" },
    { enrichment: "Set Win-Back Date", attribute: "winback_eligible_date", attributeId: "a26" },
  ],
  op5: [{ enrichment: "Set Holiday Purchase Date", attribute: "holiday_purchase_date", attributeId: "a25" }],
};

export function customOperatorValue(op: OperatorDef): string {
  return `${CUSTOM_OPERATOR_PREFIX}${op.id}`;
}

export function findCustomOperator(value: string): OperatorDef | undefined {
  if (!value.startsWith(CUSTOM_OPERATOR_PREFIX)) return undefined;
  const id = value.slice(CUSTOM_OPERATOR_PREFIX.length);
  return MOCK_OPERATORS.find((o) => o.id === id);
}

/** Operand slots a condition using this operator must fill. Built-ins take one unlabeled value or none. */
export function operatorOperands(value: string): OperandDef[] {
  const custom = findCustomOperator(value);
  if (custom) return custom.operands;
  const unary = BUILT_IN_OPERATORS.find((o) => o.value === value)?.unary;
  return unary ? [] : [{ name: "value", label: "Value", type: "String" }];
}

export function operatorLabel(value: string): string {
  return findCustomOperator(value)?.label ?? BUILT_IN_OPERATORS.find((o) => o.value === value)?.label ?? value;
}

export function negatedOperatorLabel(op: Pick<OperatorDef, "label" | "negatedLabel">): string {
  return op.negatedLabel?.trim() || `NOT ${op.label || "operator"}`;
}

export type LabelSegment = { kind: "text"; text: string } | { kind: "operand"; index: number; operand: OperandDef };

/**
 * Splits a label template into text and operand slots. Operands the template does not
 * reference are appended in order, so a plain label like "matches" still shows its inputs.
 */
export function labelSegments(template: string, operands: OperandDef[]): LabelSegment[] {
  const segments: LabelSegment[] = [];
  const used = new Set<number>();
  let last = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    const index = operands.findIndex((o) => o.name === match[1]);
    if (index === -1) continue;
    if (match.index! > last) segments.push({ kind: "text", text: template.slice(last, match.index) });
    segments.push({ kind: "operand", index, operand: operands[index] });
    used.add(index);
    last = match.index! + match[0].length;
  }
  if (last < template.length) segments.push({ kind: "text", text: template.slice(last) });
  operands.forEach((operand, index) => {
    if (!used.has(index)) segments.push({ kind: "operand", index, operand });
  });
  return segments;
}

/** Label with placeholders replaced by operand labels, for plain-text contexts like <option>. */
export function plainLabel(template: string, operands: OperandDef[]): string {
  return labelSegments(template, operands)
    .map((s) => (s.kind === "text" ? s.text : `[${s.operand.label || s.operand.name}]`))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export const RESERVED_OPERAND_NAMES = new Set(["subject"]);
export const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;

export function createBlankOperator(): OperatorDef {
  return {
    id: "new",
    label: "",
    identifier: "",
    description: "",
    subjectTypes: ["String"],
    operands: [],
    code: `  // Return true or false.\n  return false;\n`,
    tests: [],
    enabled: false,
    lastModified: new Date().toISOString().slice(0, 10),
  };
}
