import React, { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMvpMode } from "../contexts/MvpContext";
import Button from "../components/SimpleButton";
import Textbox from "../components/SimpleTextbox";
import TextArea from "../components/SimpleTextArea";
import Select from "../components/SimpleSelect";
import Badge from "../components/SimpleBadge";
import SimpleSwitch from "../components/SimpleSwitch";
import SimpleTooltip from "../components/SimpleTooltip";
import { TYPE_ICONS, TYPE_COLORS } from "../constants/typeIcons";
import "./ModuleEditor.css";

const MOCK_AUDIENCES = [
  { label: "High-Value Customers", value: "high-value-customers" },
  { label: "Cart Abandoners", value: "cart-abandoners" },
  { label: "Newsletter Subscribers", value: "newsletter-subscribers" },
  { label: "Recent Purchasers", value: "recent-purchasers" },
  { label: "Mobile Users", value: "mobile-users" },
];

const MOCK_EVENT_ATTRIBUTES = [
  { label: "tealium_event", value: "tealium_event", type: "String", scope: "event" },
  { label: "page_url", value: "page_url", type: "String", scope: "event" },
  { label: "page_title", value: "page_title", type: "String", scope: "event" },
  { label: "product_id", value: "product_id", type: "String", scope: "event" },
  { label: "order_total", value: "order_total", type: "Number", scope: "event" },
  { label: "search_query", value: "search_query", type: "String", scope: "event" },
];

const MOCK_VISIT_VISITOR_ATTRIBUTES = [
  { label: "engagement_score", value: "engagement_score", type: "Number", scope: "visit/visitor" },
  { label: "lifetime_value", value: "lifetime_value", type: "Number", scope: "visit/visitor" },
  { label: "loyalty_tier", value: "loyalty_tier", type: "String", scope: "visit/visitor" },
  { label: "is_active", value: "is_active", type: "Boolean", scope: "visit/visitor" },
  { label: "preferred_categories", value: "preferred_categories", type: "Set of Strings", scope: "visit/visitor" },
  { label: "last_interaction_date", value: "last_interaction_date", type: "String", scope: "visit/visitor" },
  { label: "page_view_count", value: "page_view_count", type: "Number", scope: "visit/visitor" },
  { label: "purchase_count", value: "purchase_count", type: "Number", scope: "visit/visitor" },
];

const MOCK_AUDIENCE_ATTRIBUTES = MOCK_AUDIENCES.map((a) => ({
  label: a.label,
  value: `audience:${a.value}`,
  type: "Audience",
  scope: "audience",
}));

const ALL_OUTPUT_ATTRIBUTES = [...MOCK_EVENT_ATTRIBUTES, ...MOCK_VISIT_VISITOR_ATTRIBUTES];

const CODE_BODY_ENGAGEMENT = `  // Example: derive a score from multiple attributes
  const score = (input.viewCount * 0.5) + (input.purchaseCount * 2);
  output.score = Math.round(score);
`;

const CODE_BODY_NORMALIZE = `  // input.name  = attribute name (e.g. "page_url")
  // input.value = the raw string value
  // input.type  = guaranteed "String" by the framework
  // input.scope = "event", "visit", or "visitor"

  let url = input.value.replace(/^https?:\/\//, "");
  url = url.toLowerCase();
  url = url.split("?")[0];
  url = url.split("#")[0];
  output.value = url;
`;

const CODE_BODY_TALLY = `  // ── Tally Over Time (Rolling Window) ──────────────────
  // Computes a visitor's favorite product category over a
  // rolling time window by combining timeline history with
  // the current visit's tally.

  const now = Date.now();
  const windowMs = input.windowDays * 24 * 60 * 60 * 1000;
  const cutoff = now - windowMs;

  // ── Step 1: Build master tally from timeline entries ──
  // Each timeline entry is { timestamp, tally: { category: count } }
  const masterTally = {};
  const timeline = input.timeline || [];

  for (const entry of timeline) {
    if (entry.timestamp >= cutoff) {
      for (const [category, count] of Object.entries(entry.tally)) {
        masterTally[category] = (masterTally[category] || 0) + count;
      }
    }
  }

  // ── Step 2: Add current visit tally ──────────────────
  const visitTally = input.visitTally || {};
  for (const [category, count] of Object.entries(visitTally)) {
    masterTally[category] = (masterTally[category] || 0) + count;
  }

  output.masterTally = masterTally;
`;

const CODE_BODY_NORMALIZE_STRINGS = `  // input.name  = attribute name (e.g. "loyalty_tier")
  // input.value = the raw string value
  // input.type  = guaranteed "String" by the framework
  // input.scope = "event", "visit", or "visitor"

  if (typeof input.value === 'string') {
    output.value = input.value.trim().toLowerCase();
  }
`;

const CODE_BODY_RECENCY = `  // Compute recency-frequency score
  const now = Date.now();
  const lastMs = new Date(input.lastDate).getTime();
  const daysSince = (now - lastMs) / (1000 * 60 * 60 * 24);
  const recency = Math.max(0, 1 - (daysSince / input.windowDays));
  const frequency = Math.min(input.count / 10, 1);
  output.rfScore = Math.round((recency * 0.6 + frequency * 0.4) * 100);
`;

const DEFAULT_NEW_CODE_BODY = `  // Your extension logic here\n`;

const TEST_PLACEHOLDER = `// Write tests for your extension code.
// Available helpers:
//   describe(name, fn)  — group related tests
//   test(name, fn)      — define a test case
//   expect(val)         — assert a value (.toBe, .toEqual, .toBeGreaterThan, etc.)
//   mockAttributes(obj) — provide mock attribute values
//   mockAudiences(obj)  — provide mock audience memberships

describe("Engagement Score", () => {
  test("computes score from page views and purchases", () => {
    const result = runExtension(mockAttributes({
      page_view_count: 10,
      purchase_count: 3,
    }));
    expect(result["engagement_score"]).toBe(11);
  });

  test("handles zero values", () => {
    const result = runExtension(mockAttributes({
      page_view_count: 0,
      purchase_count: 0,
    }));
    expect(result["engagement_score"]).toBe(0);
  });
});

describe("Edge Cases", () => {
  test("handles missing attributes gracefully", () => {
    const result = runExtension(mockAttributes({}));
    expect(result["engagement_score"]).toBe(0);
  });

  test("caps score at 100", () => {
    const result = runExtension(mockAttributes({
      page_view_count: 100,
      purchase_count: 50,
    }));
    expect(result["engagement_score"]).toBeLessThanOrEqual(100);
  });
});
`;

interface TestCase {
  id: string;
  name: string;
  suite: string;
  status: "idle" | "pass" | "fail";
  duration: number;
  error?: string;
  code: string;
}

const TYPE_BADGE_MAP: Record<string, "neutral" | "informative" | "success" | "warn"> = {
  Number: "informative",
  String: "neutral",
  Boolean: "neutral",
  "Set of Strings": "neutral",
  Audience: "neutral",
  "Static String": "success",
  "Static Number": "success",
  "Static Object": "success",
  Timeline: "informative",
  Tally: "informative",
};

const STATIC_TYPES = new Set(["Static String", "Static Number", "Static Object"]);

// Type-scope compatibility: which param types are supported at each pipeline scope
const EVENT_SCOPE_TYPES = new Set([
  "String", "Number", "Boolean",
  "Static String", "Static Number", "Static Object",
]);

const VISITOR_SCOPE_TYPES = new Set([
  "String", "Number", "Boolean", "Tally", "Timeline", "Set of Strings", "Date", "Funnel",
  "Visitor ID", "Array of Strings", "Array of Numbers", "Array of Booleans", "Array of Objects",
  "Static String", "Static Number", "Static Object",
]);

const AUDIENCE_SCOPE_TYPES = new Set([...VISITOR_SCOPE_TYPES, "Audience"]);

function getSupportedTypesForPosition(pos: string): Set<string> {
  if (pos === "preEvent" || pos === "postEvent") return EVENT_SCOPE_TYPES;
  if (pos === "postAudience") return AUDIENCE_SCOPE_TYPES;
  return VISITOR_SCOPE_TYPES;
}

function isPositionCompatibleWithParams(pos: string, params: ParamDef[]): boolean {
  const supported = getSupportedTypesForPosition(pos);
  return params.every((p) => supported.has(p.type));
}

function getIncompatibleTypesForPosition(pos: string, params: ParamDef[]): string[] {
  const supported = getSupportedTypesForPosition(pos);
  return [...new Set(params.filter((p) => !supported.has(p.type)).map((p) => p.type))];
}

const ALL_POSITIONS = [
  { id: "preEvent", label: "Pre-Event", group: "event", desc: "Before event enrichments. Reads/writes event attributes." },
  { id: "postEvent", label: "Post-Event", group: "event", desc: "After event enrichments. Reads/writes event attributes." },
  { id: "preVisitor", label: "Pre-Visitor", group: "visitor", desc: "Before visit/visitor enrichments. Returning visitors only." },
  { id: "postVisitor", label: "Post-Visitor", group: "visitor", desc: "After visit/visitor enrichments." },
  { id: "postAudience", label: "Post-Audience", group: "audience", desc: "After audience evaluation. Can read/write audience memberships." },
];

// Mock instance-position data for warning about scope removal impact
const MOCK_INSTANCE_POSITIONS: Record<string, { name: string; position: string }[]> = {
  "1": [{ name: "Normalize page_url", position: "preEvent" }, { name: "Normalize page_title URL", position: "preEvent" }],
  "2": [{ name: "Score from page views", position: "postVisitor" }, { name: "Score from lifetime value", position: "postVisitor" }, { name: "Reset on inactivity", position: "postVisitor" }],
  "10": [{ name: "Product category tally (30 days)", position: "postVisitor" }, { name: "Product category tally (60 days)", position: "postVisitor" }],
  "11": [{ name: "Lowercase all visitor strings", position: "postVisitor" }],
};

interface OutputAttribute {
  attribute: string;
  type: string;
}

interface ParamDef {
  id: string;
  variableName: string;
  type: string;
  staticValue?: string;
  description?: string;
}

// Simple JS syntax highlighter (no dependencies)
function highlightJS(code: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const KEYWORDS = new Set([
    "const","let","var","function","return","if","else","for","while","of","in",
    "new","true","false","null","undefined","typeof","instanceof","this","class",
    "import","export","default","from","await","async","try","catch","throw",
    "switch","case","break","continue",
  ]);
  const BUILTINS = new Set([
    "console","Math","Date","Object","Array","JSON","Map","Set","Promise","Error",
  ]);

  // Single-pass tokenizer regex — order matters (first match wins)
  const TOKEN =
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+\.?\d*\b|[a-zA-Z_$][a-zA-Z0-9_$]*/g;

  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN.exec(code)) !== null) {
    // Append any plain text between tokens
    if (match.index > lastIndex) {
      result += esc(code.slice(lastIndex, match.index));
    }
    const tok = match[0];
    const escaped = esc(tok);

    if (tok.startsWith("/*") || tok.startsWith("//")) {
      result += `<span class="hl-comment">${escaped}</span>`;
    } else if (tok.startsWith('"') || tok.startsWith("'") || tok.startsWith("`")) {
      result += `<span class="hl-string">${escaped}</span>`;
    } else if (/^\d/.test(tok)) {
      result += `<span class="hl-number">${escaped}</span>`;
    } else if (KEYWORDS.has(tok)) {
      result += `<span class="hl-keyword">${escaped}</span>`;
    } else if (BUILTINS.has(tok)) {
      result += `<span class="hl-builtin">${escaped}</span>`;
    } else {
      result += escaped;
    }

    lastIndex = match.index + tok.length;
  }

  // Append any remaining plain text
  if (lastIndex < code.length) {
    result += esc(code.slice(lastIndex));
  }

  return result;
}

export default function ModuleEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isMvp } = useMvpMode();
  const isNew = id === "new";

  const isNormalize = id === "1";
  const isTally = id === "10";
  const isNormalizeStrings = id === "11";
  const isRecency = id === "8";

  const [name, setName] = useState(
    isNew ? "" : isNormalize ? "Normalize Page URLs" : isTally ? "Tally Over Time" : isNormalizeStrings ? "Lowercase String" : isRecency ? "Recency Frequency Scorer" : "Compute Engagement Score"
  );
  const [description, setDescription] = useState(
    isNew
      ? ""
      : isNormalize
        ? "Strips protocol, lowercases, and removes query params and hash fragments from page URLs."
        : isTally
          ? "Computes a visitor's favorite product category over a rolling time window by combining timeline history with the current visit tally."
          : isNormalizeStrings
            ? "Lowercases string values. Designed for bulk mode to process all string attributes of a given scope at once."
            : isRecency
              ? "Computes a recency-frequency score for a given activity category over a configurable time window."
              : "Derives an engagement score from page views and purchases."
  );

  // allowedPositions is now derived reactively — see useMemo below

  const [extensionEnabled, setExtensionEnabled] = useState(!isNew);

  const [inputParams, setInputParams] = useState<ParamDef[]>(
    isNew
      ? []
      : isNormalize
        ? [
            { id: "p0", variableName: "name", type: "String", description: "Attribute name (provided by framework)" },
            { id: "p1", variableName: "value", type: "String", description: "Attribute value to normalize" },
            { id: "p1b", variableName: "type", type: "String", description: "Attribute type (guaranteed by framework)" },
            { id: "p1c", variableName: "scope", type: "String", description: "Attribute scope: event, visit, or visitor" },
          ]
        : isTally
          ? [
              { id: "p1", variableName: "timeline", type: "Timeline", description: "Historical tally entries with timestamps" },
              { id: "p2", variableName: "visitTally", type: "Tally", description: "Current visit category counts" },
              { id: "p3", variableName: "windowDays", type: "Static Number", staticValue: "", description: "Rolling window size in days" },
            ]
          : isNormalizeStrings
            ? [
                { id: "p0", variableName: "name", type: "String", description: "Attribute name (provided by framework)" },
                { id: "p1", variableName: "value", type: "String", description: "String value to lowercase" },
                { id: "p1b", variableName: "type", type: "String", description: "Attribute type (guaranteed by framework)" },
                { id: "p1c", variableName: "scope", type: "String", description: "Attribute scope: event, visit, or visitor" },
              ]
            : isRecency
              ? [
                  { id: "p1", variableName: "lastDate", type: "String", description: "Date of the most recent activity" },
                  { id: "p2", variableName: "count", type: "Number", description: "Number of occurrences in the time window" },
                  { id: "p3", variableName: "windowDays", type: "Static Number", staticValue: "", description: "Number of days for the scoring window" },
                  { id: "p4", variableName: "categoryName", type: "Static String", staticValue: "", description: "Label for the category being scored" },
                ]
              : [
                  { id: "p1", variableName: "viewCount", type: "Number" },
                  { id: "p2", variableName: "purchaseCount", type: "Number" },
                ]
  );

  const [outputParams, setOutputParams] = useState<ParamDef[]>(
    isNew
      ? []
      : isNormalize
        ? [{ id: "p3", variableName: "value", type: "String", description: "Cleaned and normalized value" }]
        : isTally
          ? [
              { id: "p4", variableName: "masterTally", type: "Tally", description: "Aggregated category counts across the window" },
            ]
          : isNormalizeStrings
            ? [{ id: "p2", variableName: "value", type: "String", description: "Trimmed and lowercased string" }]
            : isRecency
              ? [{ id: "p5", variableName: "rfScore", type: "Number", description: "Computed recency-frequency score" }]
              : [{ id: "p3", variableName: "score", type: "Number" }]
  );

  const instanceCount = isNew ? 0 : isNormalize ? 2 : isTally ? 2 : isNormalizeStrings ? 2 : isRecency ? 4 : 3;

  const [isBulkExtension, setIsBulkExtension] = useState(
    isNormalize || isNormalizeStrings
  );

  // Derive allowed bulk types from the extension's param definitions (exclude static types)
  const paramTypes = useMemo(() => {
    const allTypes = new Set<string>();
    [...inputParams, ...outputParams].forEach((p) => {
      if (!STATIC_TYPES.has(p.type)) allTypes.add(p.type);
    });
    return allTypes;
  }, [inputParams, outputParams]);

  const ALL_EVENT_TYPES = ["String", "Number", "Boolean", "Date", "Array of Strings"];
  const ALL_VISIT_VISITOR_TYPES = ["String", "Number", "Boolean", "Date", "Badge", "Tally", "Set of Strings", "Funnel", "Timeline", "Visitor ID", "Array of Strings", "Array of Numbers", "Array of Booleans", "Array of Objects"];

  const BULK_SCOPE_TYPES: { scope: string; icon: string; types: string[] }[] = [
    { scope: "Event", icon: "fas fa-bolt", types: ALL_EVENT_TYPES.filter((t) => paramTypes.has(t)) },
    { scope: "Visit", icon: "fas fa-window-maximize", types: ALL_VISIT_VISITOR_TYPES.filter((t) => paramTypes.has(t)) },
    { scope: "Visitor", icon: "fas fa-user", types: ALL_VISIT_VISITOR_TYPES.filter((t) => paramTypes.has(t)) },
  ];

  const [supportedBulkTypes, setSupportedBulkTypes] = useState<string[]>(
    isNormalize || isNormalizeStrings ? ["String"] : []
  );

  const handleToggleBulkType = (type: string) => {
    setSupportedBulkTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Keep these for scope-change confirmation compatibility
  const [inputAttributes, setInputAttributes] = useState<
    { label: string; value: string }[]
  >([]);

  const [outputAttributes, setOutputAttributes] = useState<OutputAttribute[]>(
    isNew
      ? []
      : isNormalize
        ? [{ attribute: "value", type: "String" }]
        : isTally
          ? [
              { attribute: "master_tally", type: "Tally" },
            ]
          : isNormalizeStrings
            ? [{ attribute: "value", type: "String" }]
            : isRecency
              ? [{ attribute: "rf_score", type: "Number" }]
              : [{ attribute: "engagement_score", type: "Number" }]
  );

  const [codeBody, setCodeBody] = useState(
    isNew ? DEFAULT_NEW_CODE_BODY : isNormalize ? CODE_BODY_NORMALIZE : isTally ? CODE_BODY_TALLY : isNormalizeStrings ? CODE_BODY_NORMALIZE_STRINGS : isRecency ? CODE_BODY_RECENCY : CODE_BODY_ENGAGEMENT
  );

  // Build the dynamic function signature + header comment from current params
  const buildCodeSignature = useCallback(() => {
    const lines: string[] = [];
    lines.push("// ── Extension Interface ──────────────────────────────");
    if (inputParams.length > 0) {
      lines.push("//  input:");
      inputParams.forEach((p) => {
        lines.push(`//    input.${p.variableName || "_"}  (${p.type})`);
      });
    }
    if (outputParams.length > 0) {
      lines.push("//  output:");
      outputParams.forEach((p) => {
        lines.push(`//    output.${p.variableName || "_"}  (${p.type})`);
      });
    }
    lines.push("// ─────────────────────────────────────────────────────");
    return lines.join("\n");
  }, [inputParams, outputParams]);

  const fullCode = useMemo(() => {
    const sig = buildCodeSignature();
    return `${sig}\nfunction run(input, output) {\n${codeBody}  return output;\n}\n`;
  }, [buildCodeSignature, codeBody]);

  // When the user edits the textarea, extract just the body portion
  const handleCodeChange = useCallback((raw: string) => {
    const fnHeaderMatch = raw.match(/^function\s+run\s*\(\s*input\s*,\s*output\s*\)\s*\{/m);
    if (fnHeaderMatch) {
      const startIdx = raw.indexOf(fnHeaderMatch[0]) + fnHeaderMatch[0].length;
      const lastBrace = raw.lastIndexOf("}");
      if (lastBrace > startIdx) {
        let body = raw.substring(startIdx, lastBrace);
        // Strip the hardcoded return output; line so it doesn't duplicate
        body = body.replace(/\s*return\s+output\s*;\s*$/, "\n");
        setCodeBody(body);
        return;
      }
    }
    setCodeBody(raw);
  }, []);

  // Type-change warning state (when a type edit would remove allowed positions)
  const [typeChangeWarning, setTypeChangeWarning] = useState<{
    paramId: string;
    direction: "input" | "output";
    newType: string;
    removedPositions: string[];
    affectedInstances: { name: string; position: string }[];
  } | null>(null);

  const testsEngagement: TestCase[] = [
    {
      id: "t1",
      suite: "Engagement Score",
      name: "computes score from page views and purchases",
      status: "idle",
      duration: 0,
      code: `const result = runExtension(mockAttributes({\n  page_view_count: 10,\n  purchase_count: 3,\n}));\nexpect(result["engagement_score"]).toBe(11);`,
    },
    {
      id: "t2",
      suite: "Engagement Score",
      name: "handles zero values",
      status: "idle",
      duration: 0,
      code: `const result = runExtension(mockAttributes({\n  page_view_count: 0,\n  purchase_count: 0,\n}));\nexpect(result["engagement_score"]).toBe(0);`,
    },
    {
      id: "t3",
      suite: "Edge Cases",
      name: "handles missing attributes gracefully",
      status: "idle",
      duration: 0,
      code: `const result = runExtension(mockAttributes({}));\nexpect(result["engagement_score"]).toBe(0);`,
    },
    {
      id: "t4",
      suite: "Edge Cases",
      name: "caps score at 100",
      status: "idle",
      duration: 0,
      code: `const result = runExtension(mockAttributes({\n  page_view_count: 100,\n  purchase_count: 50,\n}));\nexpect(result["engagement_score"]).toBeLessThanOrEqual(100);`,
    },
  ];

  const testsTally: TestCase[] = [
    {
      id: "t1",
      suite: "Rolling Window",
      name: "includes entries within the time window",
      status: "idle",
      duration: 0,
      code: `const now = Date.now();
const result = run({
  windowDays: 10,
  timeline: [
    { timestamp: now - 2 * 86400000, tally: { shoes: 3, hats: 1 } },
    { timestamp: now - 5 * 86400000, tally: { shoes: 1, jackets: 2 } },
  ],
  visitTally: { shoes: 1 },
}, {});
expect(result.masterTally.shoes).toBe(5);
expect(result.masterTally.hats).toBe(1);`,
    },
    {
      id: "t2",
      suite: "Rolling Window",
      name: "excludes entries outside the time window",
      status: "idle",
      duration: 0,
      code: `const now = Date.now();
const result = run({
  windowDays: 10,
  timeline: [
    { timestamp: now - 2 * 86400000, tally: { shoes: 3 } },
    { timestamp: now - 15 * 86400000, tally: { hats: 100 } },
  ],
  visitTally: {},
}, {});
expect(result.masterTally.shoes).toBe(3);
expect(result.masterTally.hats).toBeUndefined();`,
    },
    {
      id: "t3",
      suite: "Visit Tally Merge",
      name: "merges current visit tally into master",
      status: "idle",
      duration: 0,
      code: `const now = Date.now();
const result = run({
  windowDays: 10,
  timeline: [
    { timestamp: now - 1 * 86400000, tally: { electronics: 2 } },
  ],
  visitTally: { electronics: 3, books: 1 },
}, {});
expect(result.masterTally.electronics).toBe(5);
expect(result.masterTally.books).toBe(1);`,
    },
    {
      id: "t4",
      suite: "Visit Tally Merge",
      name: "works with empty timeline (first visit)",
      status: "idle",
      duration: 0,
      code: `const result = run({
  windowDays: 10,
  timeline: [],
  visitTally: { shoes: 2, hats: 5 },
}, {});
expect(result.masterTally.shoes).toBe(2);
expect(result.masterTally.hats).toBe(5);`,
    },
    {
      id: "t5",
      suite: "Edge Cases",
      name: "handles no data gracefully",
      status: "idle",
      duration: 0,
      code: `const result = run({
  windowDays: 10,
  timeline: [],
  visitTally: {},
}, {});
expect(result.masterTally).toEqual({});`,
    },
    {
      id: "t6",
      suite: "Edge Cases",
      name: "handles tied categories in tally correctly",
      status: "idle",
      duration: 0,
      code: `const now = Date.now();
const result = run({
  windowDays: 10,
  timeline: [
    { timestamp: now - 1 * 86400000, tally: { shoes: 3, hats: 3 } },
  ],
  visitTally: {},
}, {});
expect(result.masterTally.shoes).toBe(3);
expect(result.masterTally.hats).toBe(3);`,
    },
  ];

  const testsNormalize: TestCase[] = [
    {
      id: "t1",
      suite: "Protocol Stripping",
      name: "strips https://",
      status: "idle",
      duration: 0,
      code: `const result = run({ pageUrl: "https://Example.com/Page" }, {});\nexpect(result.pageUrl).toBe("example.com/page");`,
    },
    {
      id: "t2",
      suite: "Protocol Stripping",
      name: "strips http://",
      status: "idle",
      duration: 0,
      code: `const result = run({ pageUrl: "http://Example.com/Page" }, {});\nexpect(result.pageUrl).toBe("example.com/page");`,
    },
    {
      id: "t3",
      suite: "Query & Fragment Removal",
      name: "removes query parameters",
      status: "idle",
      duration: 0,
      code: `const result = run({ pageUrl: "https://example.com/page?foo=bar&baz=1" }, {});\nexpect(result.pageUrl).toBe("example.com/page");`,
    },
  ];

  const testsNormalizeStrings: TestCase[] = [
    {
      id: "t1",
      suite: "String Normalization",
      name: "lowercases string value",
      status: "idle",
      duration: 0,
      code: `const result = run({ value: "Hello World" }, {});\nexpect(result.value).toBe("hello world");`,
    },
    {
      id: "t2",
      suite: "String Normalization",
      name: "trims whitespace",
      status: "idle",
      duration: 0,
      code: `const result = run({ value: "  hello  " }, {});\nexpect(result.value).toBe("hello");`,
    },
    {
      id: "t3",
      suite: "Edge Cases",
      name: "passes through null/undefined",
      status: "idle",
      duration: 0,
      code: `const result = run({ value: null }, {});\nexpect(result.value).toBeUndefined();`,
    },
    {
      id: "t4",
      suite: "Edge Cases",
      name: "passes through non-string values",
      status: "idle",
      duration: 0,
      code: `const result = run({ value: 42 }, {});\nexpect(result.value).toBeUndefined();`,
    },
  ];

  const initialTests: TestCase[] = isNew ? [] : isNormalize ? testsNormalize : isTally ? testsTally : isNormalizeStrings ? testsNormalizeStrings : testsEngagement;

  const [testCases, setTestCases] = useState<TestCase[]>(initialTests);
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "done">("idle");
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [testFilter, setTestFilter] = useState<"all" | "passed" | "failed">("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ code: true });
  const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleExpanded = (id: string) => {
    setExpandedTests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateTestCode = (id: string, newCode: string) => {
    setTestCases((prev) => prev.map((t) => t.id === id ? { ...t, code: newCode } : t));
  };

  const updateTestName = (id: string, newName: string) => {
    setTestCases((prev) => prev.map((t) => t.id === id ? { ...t, name: newName } : t));
  };

  const handleAddTest = (suite?: string) => {
    const newId = `t${Date.now()}`;
    const newTest: TestCase = {
      id: newId,
      suite: suite || suiteNames[0] || "New Suite",
      name: "new test",
      status: "idle",
      duration: 0,
      code: `const result = runExtension(mockAttributes({\n  // set up your test attributes here\n}));\nexpect(result["engagement_score"]).toBe(0);`,
    };
    setTestCases((prev) => [...prev, newTest]);
    setExpandedTests((prev) => new Set([...prev, newId]));
  };

  const handleDeleteTest = (id: string) => {
    setTestCases((prev) => prev.filter((t) => t.id !== id));
    setExpandedTests((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleAddSuite = () => {
    const newId = `t${Date.now()}`;
    const suiteName = `New Suite ${suiteNames.length + 1}`;
    const newTest: TestCase = {
      id: newId,
      suite: suiteName,
      name: "new test",
      status: "idle",
      duration: 0,
      code: `const result = runExtension(mockAttributes({\n  // set up your test attributes here\n}));\nexpect(result["engagement_score"]).toBe(0);`,
    };
    setTestCases((prev) => [...prev, newTest]);
    setExpandedTests((prev) => new Set([...prev, newId]));
  };

  const handleRenameSuite = (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) return;
    setTestCases((prev) => prev.map((t) => t.suite === oldName ? { ...t, suite: newName } : t));
  };

  const handleDeleteSuite = (suiteName: string) => {
    setTestCases((prev) => prev.filter((t) => t.suite !== suiteName));
  };

  const handleMoveTest = (testId: string, targetSuite: string) => {
    setTestCases((prev) => prev.map((t) => t.id === testId ? { ...t, suite: targetSuite } : t));
  };

  const isEngagement = !isNew && !isNormalize && !isTally && !isNormalizeStrings && !isRecency;

  const handleRunTests = () => {
    setTestStatus("running");
    setTestCases((prev) => prev.map((t) => ({ ...t, status: "idle" as const, duration: 0, error: undefined })));
    // Simulate test execution with staggered results
    setTimeout(() => {
      if (isEngagement) {
        // Compute Engagement Score: t3 and t4 fail
        setTestCases((prev) => prev.map((t) => {
          if (t.id === "t3") return {
            ...t, status: "fail" as const, duration: 3,
            error: 'Expected: 0\nReceived: NaN\n\n  at runExtension (extension.js:3:15)\n  > expect(result["engagement_score"]).toBe(0);',
          };
          if (t.id === "t4") return {
            ...t, status: "fail" as const, duration: 1,
            error: 'Expected: \u2264 100\nReceived: 150\n\n  > expect(result["engagement_score"]).toBeLessThanOrEqual(100);',
          };
          return { ...t, status: "pass" as const, duration: Math.floor(Math.random() * 3) + 1 };
        }));
        setExpandedTests(new Set(["t3", "t4"]));
      } else {
        // All other extensions: all tests pass
        setTestCases((prev) => prev.map((t) => ({
          ...t, status: "pass" as const, duration: Math.floor(Math.random() * 3) + 1,
        })));
      }
      setTestStatus("done");
    }, 800);
  };

  const handleRunSingleTest = (id: string) => {
    setTestCases((prev) => prev.map((t) => t.id === id ? { ...t, status: "idle" as const, duration: 0, error: undefined } : t));
    setTimeout(() => {
      setTestCases((prev) => prev.map((t) => {
        if (t.id !== id) return t;
        if (isEngagement) {
          if (id === "t3") return { ...t, status: "fail" as const, duration: 3, error: 'Expected: 0\nReceived: NaN\n\n  > expect(result["engagement_score"]).toBe(0);' };
          if (id === "t4") return { ...t, status: "fail" as const, duration: 1, error: 'Expected: \u2264 100\nReceived: 150\n\n  > expect(result["engagement_score"]).toBeLessThanOrEqual(100);' };
        }
        return { ...t, status: "pass" as const, duration: Math.floor(Math.random() * 3) + 1 };
      }));
    }, 400);
  };

  const totalTests = testCases.length;
  const passedTests = testCases.filter((t) => t.status === "pass").length;
  const failedTests = testCases.filter((t) => t.status === "fail").length;
  const totalDuration = testCases.reduce((d, t) => d + t.duration, 0);

  // Group tests by suite
  const suiteNames = [...new Set(testCases.map((t) => t.suite))];

  const filteredTests = testCases.filter((t) => {
    if (testFilter === "passed") return t.status === "pass";
    if (testFilter === "failed") return t.status === "fail";
    return true;
  });

  // AI Assistant callbacks for code & tests context
  const getEditorResponse = useCallback((msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes("add") && lower.includes("test") && (lower.includes("edge") || lower.includes("case"))) {
      return { text: "I'd suggest adding this edge case test to your \"Edge Cases\" suite:", action: { type: "add-test", label: "Add test: handles negative values", detail: `test("handles negative values", () => {\n  const result = run(\n    { viewCount: -5, purchaseCount: -1 }, {}\n  );\n  expect(result.score).toBe(0);\n});`, id: `action-${Date.now()}` } };
    }
    if (lower.includes("add") && lower.includes("test") && (lower.includes("bound") || lower.includes("overflow"))) {
      return { text: "Here's a boundary test I'd recommend adding:", action: { type: "add-test", label: "Add test: handles maximum values", detail: `test("handles max values", () => {\n  const result = run(\n    { viewCount: Number.MAX_SAFE_INTEGER,\n      purchaseCount: 0 }, {}\n  );\n  expect(result.score).toBeDefined();\n});`, id: `action-${Date.now()}` } };
    }
    if (lower.includes("run") && lower.includes("test")) {
      return { text: "I can run all your tests for you right now.", action: { type: "run-tests", label: "Run all tests", detail: `Will execute ${testCases.length} test(s) across ${suiteNames.length} suite(s).`, id: `action-${Date.now()}` } };
    }
    if (lower.includes("delete") && lower.includes("fail")) {
      const failed = testCases.filter((t) => t.status === "fail");
      if (failed.length > 0) {
        return { text: `I found ${failed.length} failing test(s). Want me to remove them?`, action: { type: "delete-failed", label: `Delete ${failed.length} failing test(s)`, detail: failed.map((t) => `\u2022 ${t.suite} > ${t.name}`).join("\n"), id: `action-${Date.now()}` } };
      }
      return { text: "No failing tests found. All tests are either passing or haven't been run yet." };
    }
    if (lower.includes("fail") || lower.includes("debug") || lower.includes("why") || lower.includes("broken")) {
      const failed = testCases.filter((t) => t.status === "fail");
      if (failed.length > 0) {
        return { text: `You have ${failed.length} failing test(s):\n\n${failed.map((t) => `\u2022 **${t.name}**\n  ${t.error?.split("\n")[0] || "Unknown error"}`).join("\n")}\n\nCheck that your code logic matches the assertions. Common issues:\n1. Missing null/undefined guards on inputs\n2. Incorrect formula producing unexpected values\n3. Assertions using wrong comparison (.toBe vs .toEqual)` };
      }
      return { text: "No failing tests at the moment. Run your tests first to see if anything fails." };
    }
    if (lower.includes("error") || lower.includes("try") || lower.includes("catch")) {
      return { text: "Here's a try/catch wrapper you could add to your code:\n\n```\ntry {\n  // your logic here\n} catch (e) {\n  output.error = e.message;\n}\n```\n\nThis catches runtime errors and writes the message to an `error` output variable." };
    }
    if (lower.includes("cap") || lower.includes("max") || lower.includes("limit")) {
      return { text: "To cap the score at 100, add this before setting the output:\n\n```\nconst capped = Math.min(score, 100);\noutput.score = capped;\n```" };
    }
    if (lower.includes("valid") || lower.includes("check") || lower.includes("guard")) {
      return { text: "You can add input validation like this:\n\n```\nif (typeof input.viewCount !== 'number') {\n  output.score = 0;\n  return output;\n}\n```\n\nThis guards against missing or non-numeric inputs." };
    }
    if (lower.includes("explain") || lower.includes("what does") || lower.includes("how does")) {
      return { text: "This extension takes input values, applies a weighted formula to compute an engagement score, and writes the result to the output object. The `return output` at the end is required so the platform can capture your results." };
    }
    return { text: "I can help with both your **extension code** and **tests**. Try asking me to:\n\n**Code:**\n\u2022 Add error handling\n\u2022 Validate inputs\n\u2022 Explain this code\n\n**Tests:**\n\u2022 Add edge case tests\n\u2022 Run all tests\n\u2022 Why is my test failing?\n\u2022 Delete failing tests" };
  }, [testCases, suiteNames]);

  const handleEditorAction = useCallback((action: { type: string; label: string; detail: string; id: string }, accepted: boolean) => {
    if (!accepted) return;
    if (action.type === "add-test") {
      const newId = `t${Date.now()}`;
      setTestCases((prev) => [...prev, { id: newId, suite: suiteNames[0] || "New Suite", name: action.label.replace("Add test: ", ""), status: "idle" as const, duration: 0, code: action.detail }]);
      setExpandedTests((prev) => new Set([...prev, newId]));
    } else if (action.type === "run-tests") {
      handleRunTests();
    } else if (action.type === "delete-failed") {
      const failedIds = testCases.filter((t) => t.status === "fail").map((t) => t.id);
      setTestCases((prev) => prev.filter((t) => !failedIds.includes(t.id)));
    }
  }, [suiteNames, testCases, handleRunTests]);

  const positionLabels: Record<string, string> = {
    preEvent: "Pre-Event",
    postEvent: "Post-Event",
    preVisitor: "Pre-Visitor",
    postVisitor: "Post-Visitor",
    postAudience: "Post-Audience",
  };

  const allParams = [...inputParams, ...outputParams];

  // Build effective type list: params + bulk types (if enabled)
  const allUsedTypes: string[] = [
    ...allParams.map((p) => p.type),
    ...(isBulkExtension ? supportedBulkTypes : []),
  ];
  // Create synthetic param-like objects for the compatibility check
  const effectiveParams: ParamDef[] = useMemo(() => [...new Set(allUsedTypes)].map((t) => ({
    id: `_type_${t}`,
    variableName: t,
    type: t,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [allUsedTypes.join(",")]);

  // Infer allowed positions reactively from the types used
  const allowedPositions = useMemo(() => {
    if (effectiveParams.length === 0) return ALL_POSITIONS.map((p) => p.id);
    return ALL_POSITIONS
      .filter((p) => isPositionCompatibleWithParams(p.id, effectiveParams))
      .map((p) => p.id);
  }, [effectiveParams]);

  const hasEventScope = allowedPositions.some((p) => p === "preEvent" || p === "postEvent");
  const hasVisitorScope = allowedPositions.some((p) => p === "preVisitor" || p === "postVisitor" || p === "postAudience");
  const hasAudienceScope = allowedPositions.includes("postAudience");

  const confirmTypeChangeWarning = () => {
    if (!typeChangeWarning) return;
    if (typeChangeWarning.newType) {
      // Apply type change — positions will auto-recalculate
      const setter = typeChangeWarning.direction === "input" ? setInputParams : setOutputParams;
      setter((prev) =>
        prev.map((p) =>
          p.id === typeChangeWarning.paramId
            ? { ...p, type: typeChangeWarning.newType, staticValue: STATIC_TYPES.has(typeChangeWarning.newType) ? (p.staticValue ?? "") : undefined }
            : p
        )
      );
    }
    setTypeChangeWarning(null);
  };

  const cancelTypeChangeWarning = () => {
    setTypeChangeWarning(null);
  };

  // Broadest scope across all allowed positions determines available attributes
  const availableInputAttributes = hasAudienceScope
    ? [...MOCK_EVENT_ATTRIBUTES, ...MOCK_VISIT_VISITOR_ATTRIBUTES, ...MOCK_AUDIENCE_ATTRIBUTES]
    : hasVisitorScope
      ? [...MOCK_EVENT_ATTRIBUTES, ...MOCK_VISIT_VISITOR_ATTRIBUTES]
      : MOCK_EVENT_ATTRIBUTES;

  const availableOutputAttributes = hasAudienceScope
    ? [...ALL_OUTPUT_ATTRIBUTES, ...MOCK_AUDIENCE_ATTRIBUTES]
    : hasVisitorScope
      ? ALL_OUTPUT_ATTRIBUTES
      : MOCK_EVENT_ATTRIBUTES;

  const handleAddOutput = () => {
    setOutputAttributes((prev) => [...prev, { attribute: "", type: "" }]);
  };

  const handleRemoveOutput = (idx: number) => {
    setOutputAttributes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleOutputAttributeChange = (idx: number, value: any) => {
    const attr = [...ALL_OUTPUT_ATTRIBUTES, ...MOCK_AUDIENCE_ATTRIBUTES].find(
      (a) => a.value === (value?.value ?? value)
    );
    if (attr) {
      setOutputAttributes((prev) =>
        prev.map((o, i) =>
          i === idx ? { attribute: attr.value, type: attr.type } : o
        )
      );
    }
  };

  // Param definition handlers
  const PARAM_TYPES = [
    { label: "String", value: "String" },
    { label: "Number", value: "Number" },
    { label: "Boolean", value: "Boolean" },
    { label: "Date", value: "Date" },
    { label: "Tally", value: "Tally" },
    { label: "Timeline", value: "Timeline" },
    { label: "Set of Strings", value: "Set of Strings" },
    { label: "Array of Strings", value: "Array of Strings" },
    { label: "Array of Numbers", value: "Array of Numbers" },
    { label: "Array of Booleans", value: "Array of Booleans" },
    { label: "Array of Objects", value: "Array of Objects" },
    { label: "Funnel", value: "Funnel" },
    { label: "Audience", value: "Audience" },
    { label: "Visitor ID", value: "Visitor ID" },
    { label: "Static String", value: "Static String" },
    { label: "Static Number", value: "Static Number" },
    { label: "Static Object", value: "Static Object" },
  ];

  const handleAddInputParam = () => {
    setInputParams((prev) => [...prev, { id: `p${Date.now()}`, variableName: "", type: "String", description: "" }]);
  };

  const handleRemoveInputParam = (paramId: string) => {
    setInputParams((prev) => prev.filter((p) => p.id !== paramId));
  };

  const handleInputParamNameChange = (paramId: string, newName: string) => {
    setInputParams((prev) => prev.map((p) => p.id === paramId ? { ...p, variableName: newName } : p));
  };

  const handleInputParamTypeChange = (paramId: string, val: any) => {
    const typeVal = val?.value ?? val;
    setInputParams((prev) => prev.map((p) => p.id === paramId ? { ...p, type: typeVal, staticValue: STATIC_TYPES.has(typeVal) ? (p.staticValue ?? "") : undefined } : p));
  };

  const handleInputParamStaticValueChange = (paramId: string, val: string) => {
    setInputParams((prev) => prev.map((p) => p.id === paramId ? { ...p, staticValue: val } : p));
  };

  const handleInputParamDescChange = (paramId: string, val: string) => {
    setInputParams((prev) => prev.map((p) => p.id === paramId ? { ...p, description: val } : p));
  };

  const handleAddOutputParam = () => {
    setOutputParams((prev) => [...prev, { id: `p${Date.now()}`, variableName: "", type: "String", description: "" }]);
  };

  const handleRemoveOutputParam = (paramId: string) => {
    setOutputParams((prev) => prev.filter((p) => p.id !== paramId));
  };

  const handleOutputParamNameChange = (paramId: string, newName: string) => {
    setOutputParams((prev) => prev.map((p) => p.id === paramId ? { ...p, variableName: newName } : p));
  };

  const handleOutputParamTypeChange = (paramId: string, val: any) => {
    const typeVal = val?.value ?? val;
    setOutputParams((prev) => prev.map((p) => p.id === paramId ? { ...p, type: typeVal } : p));
  };

  const handleOutputParamDescChange = (paramId: string, val: string) => {
    setOutputParams((prev) => prev.map((p) => p.id === paramId ? { ...p, description: val } : p));
  };

  const positionToActiveMap: Record<string, string> = {
    preEvent: "eventBefore",
    postEvent: "eventAfter",
    preVisitor: "visitBefore",
    postVisitor: "visitAfterStd",
    postAudience: "visitAfterAud",
  };

  const activePositionSet = new Set(allowedPositions.map((p) => positionToActiveMap[p]).filter(Boolean));

  return (
    <div className="module-editor-page">
      {/* Breadcrumb */}
      <nav className="editor-breadcrumb">
        <button
          type="button"
          className="breadcrumb-link"
          onClick={() => navigate("/extensions")}
        >
          Extension Definitions
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">
          {isNew ? "New Extension" : name}
        </span>
      </nav>

      <div className="editor-title-row">
        <h1 className="editor-page-title">
          {isNew ? "New Extension" : "Edit Extension"}
        </h1>
        <div className="editor-title-right">
          <button type="button" className="test-ai-btn" onClick={() => window.dispatchEvent(new CustomEvent("open-ai-builder", { detail: { prompt: isNew ? "Help me generate a new extension" : `Improve or explain the ${name} extension` } }))}>
            <i className="fas fa-magic" aria-hidden="true" /> {isNew ? "Generate" : "Improve / Explain"}
          </button>
          {!isNew && (
            <button
              type="button"
              className="editor-instances-top-link"
              onClick={() => navigate(`/instances?ext=${id}`)}
            >
              <i className="fas fa-cubes" aria-hidden="true" />
              {instanceCount} instance{instanceCount !== 1 ? "s" : ""}
            </button>
          )}
          {!isNew && (
            <div className="editor-extension-toggle">
              <span className={`editor-toggle-label ${extensionEnabled ? "" : "editor-toggle-label-off"}`}>
                {extensionEnabled ? "Enabled" : "Disabled"}
              </span>
              <SimpleSwitch
                isStandAlone
                on={extensionEnabled}
                onChange={setExtensionEnabled}
                inputProps={{ "aria-label": `Toggle extension ${name}` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Metadata section */}
      <section className="editor-section">
        <div className="editor-section-header editor-section-header-collapsible" onClick={() => toggle("details")}>
          <h2 className="editor-section-title">
            <i className={`fas fa-chevron-${collapsed.details ? "right" : "down"}`} aria-hidden="true" />
            Extension Details
          </h2>
        </div>
        {!collapsed.details && (
          <>
            <div className="editor-field">
              <label className="editor-field-label">Extension Name</label>
              <Textbox
                value={name}
                onChange={setName}
                placeholder="e.g., Compute Engagement Score"
                isFullWidth
              />
            </div>
            <div className="editor-field">
              <label className="editor-field-label">
                Description
                <span className="editor-field-optional">(optional)</span>
              </label>
              <div className="editor-textarea-wrapper">
                <TextArea
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe what this extension does..."
                  height="80px"
                  width="100%"
                />
              </div>
            </div>
          </>
        )}
      </section>

      {/* Execution Timing — hero section */}
      <section className="editor-section editor-section-hero">
        <div className="editor-section-header editor-section-header-collapsible" onClick={() => toggle("timing")}>
          <h2 className="editor-section-title">
            <i className={`fas fa-chevron-${collapsed.timing ? "right" : "down"}`} aria-hidden="true" />
            Execution Timing
          </h2>
          <span onClick={(e) => e.stopPropagation()}>
            <SimpleTooltip title="Server-side extensions are replay-safe and participate in event replay during visitor stitching.">
              <i className="fas fa-info-circle editor-section-info" />
            </SimpleTooltip>
          </span>
        </div>

        {!collapsed.timing && <>
        {/* Inline pipeline diagram */}
        <div className="editor-pipeline">
          <div className="pipeline-flow-rows">
            {/* Event phase */}
            {!isMvp && (
              <div className="pipeline-phase">
                <span className="pipeline-phase-label">Event</span>
                <div className="pipeline-flow">
                  <span className="pipeline-step">Event Received</span>
                  <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                  <span className="pipeline-step">Functions</span>
                  <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                  <span
                    className={`pipeline-step ${activePositionSet.has("eventBefore") ? "pipeline-step-active" : "pipeline-step-module-off"}`}
                  >
                    <i className="fas fa-code" aria-hidden="true" /> Pre-Event
                  </span>
                  <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                  <span className="pipeline-step">Event Enrichments</span>
                  <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                  <span
                    className={`pipeline-step ${activePositionSet.has("eventAfter") ? "pipeline-step-active" : "pipeline-step-module-off"}`}
                  >
                    <i className="fas fa-code" aria-hidden="true" /> Post-Event
                  </span>
                  <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                  <span className="pipeline-step pipeline-step-dimmed">Event Activations</span>
                </div>
              </div>
            )}
            {/* Visit/Visitor phase */}
            <div className="pipeline-phase">
              <span className="pipeline-phase-label">Visit / Visitor</span>
              <div className="pipeline-flow">
                {!isMvp && (<>
                  <span
                    className={`pipeline-step ${activePositionSet.has("visitBefore") ? "pipeline-step-active" : "pipeline-step-module-off"}`}
                  >
                    <i className="fas fa-code" aria-hidden="true" /> Pre-Visitor
                  </span>
                  <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                </>)}
                <span className="pipeline-step">Visit/Visitor Enrichments</span>
                <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                <span
                  className={`pipeline-step ${activePositionSet.has("visitAfterStd") ? "pipeline-step-active" : "pipeline-step-module-off"}`}
                >
                  <i className="fas fa-code" aria-hidden="true" /> Post-Visitor
                </span>
                <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                <span className="pipeline-step">Audiences</span>
                {!isMvp && (<>
                  <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                  <span
                    className={`pipeline-step ${activePositionSet.has("visitAfterAud") ? "pipeline-step-active" : "pipeline-step-module-off"}`}
                  >
                    <i className="fas fa-code" aria-hidden="true" /> Post-Audience
                  </span>
                </>)}
                <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                <span className="pipeline-step pipeline-step-dimmed">Visitor Activations</span>
              </div>
            </div>
          </div>
        </div>

        <div className="editor-timing-inferred">
          {isMvp ? (
            <p className="editor-timing-multi-hint">
              <i className="fas fa-info-circle" aria-hidden="true" />
              In MVP mode, extensions run at <strong>Post-Visitor</strong> only — after visit/visitor enrichments, before audiences.
            </p>
          ) : (
            <p className="editor-timing-multi-hint">
              <i className="fas fa-magic" aria-hidden="true" />
              Available positions are inferred from the input and output types. Each instance will choose which position it runs at.
            </p>
          )}
          {!isMvp && <div className="editor-timing-status-rows">
            {[
              { group: "event", label: "Event Scope", desc: "Event-level attributes only." },
              { group: "visitor", label: "Visit / Visitor Scope", desc: "Event + visit/visitor attributes." },
              { group: "audience", label: "Visit / Visitor + Audiences Scope", desc: "Event + visit/visitor attributes + audience membership read/write." },
            ].map((g) => {
              const positions = ALL_POSITIONS.filter((p) => p.group === g.group);
              const anyCompatible = positions.some((p) => allowedPositions.includes(p.id));
              return (
                <div key={g.group} className={`editor-timing-status-group ${anyCompatible ? "" : "editor-timing-status-group-off"}`}>
                  <div className="editor-timing-status-header">
                    <span className={`editor-timing-status-icon ${anyCompatible ? "editor-timing-status-icon-on" : ""}`}>
                      <i className={`fas ${anyCompatible ? "fa-check-circle" : "fa-minus-circle"}`} aria-hidden="true" />
                    </span>
                    <div className="editor-timing-status-text">
                      <span className="editor-timing-status-label">{g.label}</span>
                      <span className="editor-timing-status-desc">{g.desc}</span>
                    </div>
                  </div>
                  <div className="editor-timing-status-positions">
                    {positions.map((pos) => {
                      const compatible = allowedPositions.includes(pos.id);
                      const incompatTypes = !compatible ? getIncompatibleTypesForPosition(pos.id, effectiveParams) : [];
                      return (
                        <div key={pos.id} className={`editor-timing-status-pos ${compatible ? "editor-timing-status-pos-on" : "editor-timing-status-pos-off"}`}>
                          <i className={`fas ${compatible ? "fa-check" : "fa-times"}`} aria-hidden="true" />
                          <span className="editor-timing-status-pos-label">{pos.label}</span>
                          <span className="editor-timing-status-pos-desc">{pos.desc}</span>
                          {pos.id === "preVisitor" && compatible && (
                            <span className="editor-timing-check-note">
                              <i className="fas fa-exclamation-circle" aria-hidden="true" />
                              Returning visitors only.
                            </span>
                          )}
                          {!compatible && incompatTypes.length > 0 && (
                            <span className="editor-timing-status-pos-reason">
                              Unavailable: {incompatTypes.join(", ")} not supported at this scope
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>}
        </div>
        </>}
      </section>

      {/* Bulk Mode */}
      {!isMvp && <section className="editor-section">
        <div className="editor-section-header editor-section-header-collapsible" onClick={() => toggle("bulk")}>
          <h2 className="editor-section-title">
            <i className={`fas fa-chevron-${collapsed.bulk ? "right" : "down"}`} aria-hidden="true" />
            <i className="fas fa-cubes" aria-hidden="true" /> Bulk Mode
          </h2>
          <span onClick={(e) => e.stopPropagation()}>
            <SimpleTooltip title="Bulk extensions iterate over all attributes matching the selected types and scopes, instead of mapping specific attributes.">
              <i className="fas fa-info-circle editor-section-info" />
            </SimpleTooltip>
          </span>
        </div>
        {!collapsed.bulk && <><div className="editor-bulk-toggle">
          <label className="editor-bulk-toggle-label">
            <SimpleSwitch
              isStandAlone
              on={isBulkExtension}
              onChange={setIsBulkExtension}
              inputProps={{ "aria-label": "Enable bulk mode" }}
            />
            <span>Enable bulk mode</span>
          </label>
          <span className="editor-bulk-toggle-desc">
            When enabled, instances will iterate over all attributes matching the supported types instead of mapping specific attributes.
          </span>
        </div>
        {isBulkExtension && (
          <div className="editor-bulk-types-section">
            <label className="editor-field-label">
              Supported Types
              <span className="editor-field-hint">Select which attribute types this extension can process. Types are shown per scope.</span>
            </label>
            <div className="editor-bulk-scope-rows">
              {BULK_SCOPE_TYPES.map((row) => (
                <div key={row.scope} className="editor-bulk-scope-row">
                  <div className="editor-bulk-scope-label">
                    <i className={row.icon} aria-hidden="true" />
                    {row.scope}
                  </div>
                  <div className="editor-bulk-type-chips">
                    {row.types.map((t) => {
                      const selected = supportedBulkTypes.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          className={`editor-bulk-type-chip ${selected ? "editor-bulk-type-chip-selected" : ""}`}
                          onClick={() => handleToggleBulkType(t)}
                        >
                          {selected ? <i className="fas fa-check" aria-hidden="true" /> : TYPE_ICONS[t] ? <i className={TYPE_ICONS[t]} aria-hidden="true" style={{ opacity: 0.5 }} /> : null}
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {supportedBulkTypes.length === 0 && (
              <p className="editor-bulk-type-warn">
                <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                Select at least one type for bulk mode to work.
              </p>
            )}
          </div>
        )}
        </>}
      </section>}

      {/* Input Definitions */}
      <section className="editor-section">
        <div className="editor-section-header editor-section-header-collapsible" onClick={() => toggle("input")}>
          <h2 className="editor-section-title">
            <i className={`fas fa-chevron-${collapsed.input ? "right" : "down"}`} aria-hidden="true" />
            <i className="fas fa-sign-in-alt" aria-hidden="true" /> Input
          </h2>
        </div>
        {!collapsed.input && <><p className="editor-section-help">
          Define the variable names your code will use to read input values. Inputs are <strong>read-only</strong> — to write a value, declare it as an output. Static types provide a fixed configuration value per instance.
        </p>
        <div className="editor-param-list">
          {inputParams.map((param) => (
            <div key={param.id} className={`editor-param-row ${STATIC_TYPES.has(param.type) ? "editor-param-row-static" : ""}`}>
              <div className="editor-param-name">
                <Textbox
                  value={param.variableName}
                  onChange={(val: string) => handleInputParamNameChange(param.id, val)}
                  placeholder="variableName"
                  isFullWidth
                  disabled={isBulkExtension}
                />
              </div>
              <div className="editor-param-type">
                <Select
                  options={PARAM_TYPES}
                  value={{ label: param.type, value: param.type }}
                  onChange={(val: any) => handleInputParamTypeChange(param.id, val)}
                  placeholder="Type"
                  isFullWidth
                  disabled={isBulkExtension}
                />
                {TYPE_ICONS[param.type] && <span className="editor-param-type-icon" style={{ background: TYPE_COLORS[param.type] }}><i className={TYPE_ICONS[param.type]} aria-hidden="true" /></span>}
              </div>
              <div className="editor-param-preview">
                {STATIC_TYPES.has(param.type) ? (
                  <>
                    <span className="editor-param-static-badge">
                      <i className="fas fa-lock" aria-hidden="true" /> Static
                    </span>
                    <code>input.{param.variableName || "_"}</code>
                  </>
                ) : (
                  <code>input.{param.variableName || "_"}</code>
                )}
              </div>
              {!isBulkExtension && <Button
                type="borderless"
                isIconOnly
                onClick={() => handleRemoveInputParam(param.id)}
                attrProps={{ "aria-label": "Remove input variable", className: "editor-btn-small" }}
              >
                <i className="fas fa-times" aria-hidden="true" />
              </Button>}
              <div className="editor-param-desc">
                <Textbox
                  value={param.description || ""}
                  onChange={(val: string) => handleInputParamDescChange(param.id, val)}
                  placeholder="Description (optional)"
                  isFullWidth
                />
                {STATIC_TYPES.has(param.type) && (
                  <span className="editor-param-static-hint">
                    Fixed per instance, not mapped to an attribute. If left empty, defaults to undefined.
                  </span>
                )}
              </div>
              {STATIC_TYPES.has(param.type) && (
                <div className="editor-param-static-value">
                  <span className="editor-param-static-label">Default value (optional):</span>
                  {param.type === "Static Object" ? (
                    <TextArea
                      value={param.staticValue || ""}
                      onChange={(val: string) => handleInputParamStaticValueChange(param.id, val)}
                      placeholder='{"key": "value"}'
                      rows={3}
                    />
                  ) : (
                    <Textbox
                      value={param.staticValue || ""}
                      onChange={(val: string) => handleInputParamStaticValueChange(param.id, val)}
                      placeholder="undefined"
                      isFullWidth
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="editor-param-add">
          {!isBulkExtension && <Button type="border" onClick={handleAddInputParam} attrProps={{ className: "editor-btn-small" }}>
            <i className="fas fa-plus" aria-hidden="true" />
            <span>Add input variable</span>
          </Button>}
        </div>
        </>}
      </section>

      {/* Output Definitions */}
      <section className="editor-section">
        <div className="editor-section-header editor-section-header-collapsible" onClick={() => toggle("output")}>
          <h2 className="editor-section-title">
            <i className={`fas fa-chevron-${collapsed.output ? "right" : "down"}`} aria-hidden="true" />
            <i className="fas fa-sign-out-alt" aria-hidden="true" /> Output
          </h2>
        </div>
        {!collapsed.output && <><p className="editor-section-help">
          Define the variable names your code will use to write output values back to attributes.
        </p>
        <div className="editor-param-list">
          {outputParams.map((param) => (
            <div key={param.id} className="editor-param-row">
              <div className="editor-param-name">
                <Textbox
                  value={param.variableName}
                  onChange={(val: string) => handleOutputParamNameChange(param.id, val)}
                  placeholder="variableName"
                  isFullWidth
                  disabled={isBulkExtension}
                />
              </div>
              <div className="editor-param-type">
                <Select
                  options={PARAM_TYPES}
                  value={{ label: param.type, value: param.type }}
                  onChange={(val: any) => handleOutputParamTypeChange(param.id, val)}
                  placeholder="Type"
                  isFullWidth
                  disabled={isBulkExtension}
                />
                {TYPE_ICONS[param.type] && <span className="editor-param-type-icon" style={{ background: TYPE_COLORS[param.type] }}><i className={TYPE_ICONS[param.type]} aria-hidden="true" /></span>}
              </div>
              <div className="editor-param-preview">
                <code>output.{param.variableName || "_"}</code>
              </div>
              {!isBulkExtension && <Button
                type="borderless"
                isIconOnly
                onClick={() => handleRemoveOutputParam(param.id)}
                attrProps={{ "aria-label": "Remove output variable", className: "editor-btn-small" }}
              >
                <i className="fas fa-times" aria-hidden="true" />
              </Button>}
              <div className="editor-param-desc">
                <Textbox
                  value={param.description || ""}
                  onChange={(val: string) => handleOutputParamDescChange(param.id, val)}
                  placeholder="Description (optional)"
                  isFullWidth
                />
                {param.type === "Tally" && (
                  <span className="editor-param-static-hint">
                    Favorites will be auto-generated after the tally attribute is set, as usual.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="editor-param-add">
          {!isBulkExtension && <Button type="border" onClick={handleAddOutputParam} attrProps={{ className: "editor-btn-small" }}>
            <i className="fas fa-plus" aria-hidden="true" />
            <span>Add output variable</span>
          </Button>}
        </div>
        </>}
      </section>

      {/* Extension Code */}
      <section className="editor-section">
        <div className="editor-section-header editor-section-header-collapsible" onClick={() => toggle("code")}>
          <h2 className="editor-section-title">
            <i className={`fas fa-chevron-${collapsed.code ? "right" : "down"}`} aria-hidden="true" />
            Extension Code
          </h2>
          <div className="editor-section-header-actions" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="test-ai-btn" onClick={() => window.dispatchEvent(new CustomEvent("open-ai-builder", { detail: { prompt: `Generate or improve code for the ${name} extension` } }))}>
              <i className="fas fa-magic" aria-hidden="true" /> Generate or improve code
            </button>
            <span className="editor-code-line-count">{fullCode.split("\n").length} lines</span>
          </div>
        </div>
        {!collapsed.code && <div className="editor-code-wrapper">
          <div className="editor-code-lines" aria-hidden="true">
            {fullCode.split("\n").map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <div className="editor-code-body">
            <pre className="editor-code-highlight" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightJS(fullCode) + "\n" }} />
            <textarea
              className="editor-code-area"
              value={fullCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              onScroll={(e) => {
                const target = e.target as HTMLTextAreaElement;
                const highlight = target.previousElementSibling as HTMLElement;
                const lines = target.parentElement?.previousElementSibling as HTMLElement;
                if (highlight) {
                  highlight.scrollTop = target.scrollTop;
                  highlight.scrollLeft = target.scrollLeft;
                }
                if (lines) {
                  lines.scrollTop = target.scrollTop;
                }
              }}
              spellCheck={false}
            />
          </div>
        </div>}
      </section>

      {/* Test Explorer */}
      <section className="editor-section">
        <div className="test-explorer-toolbar">
          <div className="test-explorer-toolbar-left" onClick={() => toggle("tests")} style={{ cursor: "pointer" }}>
            <h2 className="editor-section-title">
              <i className={`fas fa-chevron-${collapsed.tests ? "right" : "down"}`} aria-hidden="true" />
              <i className="fas fa-flask" aria-hidden="true" /> Tests
            </h2>
            {testStatus === "done" && (
              <div className="test-toolbar-counts">
                <span className="test-toolbar-count test-toolbar-pass">
                  <i className="fas fa-check-circle" aria-hidden="true" /> {passedTests}
                </span>
                <span className="test-toolbar-count test-toolbar-fail">
                  <i className="fas fa-times-circle" aria-hidden="true" /> {failedTests}
                </span>
                <span className="test-toolbar-duration">{totalDuration}ms</span>
              </div>
            )}
          </div>
          <div className="test-explorer-toolbar-right">
            {testStatus === "done" && (
              <div className="test-filter-buttons">
                <button
                  type="button"
                  className={`test-filter-btn ${testFilter === "all" ? "test-filter-btn-active" : ""}`}
                  onClick={() => setTestFilter("all")}
                >All</button>
                <button
                  type="button"
                  className={`test-filter-btn ${testFilter === "passed" ? "test-filter-btn-active" : ""}`}
                  onClick={() => setTestFilter("passed")}
                ><i className="fas fa-check" aria-hidden="true" /> Passed</button>
                <button
                  type="button"
                  className={`test-filter-btn ${testFilter === "failed" ? "test-filter-btn-active" : ""}`}
                  onClick={() => setTestFilter("failed")}
                ><i className="fas fa-times" aria-hidden="true" /> Failed</button>
              </div>
            )}
            <button type="button" className="test-ai-btn" onClick={() => window.dispatchEvent(new CustomEvent("open-ai-builder", { detail: { prompt: `Improve tests for the ${name} extension` } }))}>
              <i className="fas fa-magic" aria-hidden="true" /> Improve tests
            </button>
            <Button type={testStatus === "running" ? "secondary" : "border"} onClick={handleRunTests} attrProps={{ className: "editor-btn-small" }}>
              {testStatus === "running" ? (
                <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> <span>Running...</span></>
              ) : (
                <><i className="fas fa-play" aria-hidden="true" /> <span>Run All</span></>
              )}
            </Button>
          </div>
        </div>

        {!collapsed.tests && <>{testStatus === "done" && failedTests > 0 && (
          <div className="test-summary-bar test-summary-bar-fail">
            <i className="fas fa-exclamation-triangle" aria-hidden="true" />
            {failedTests} test{failedTests > 1 ? "s" : ""} failed
          </div>
        )}
        {testStatus === "done" && failedTests === 0 && (
          <div className="test-summary-bar test-summary-bar-pass">
            <i className="fas fa-check-circle" aria-hidden="true" />
            All {totalTests} tests passed
          </div>
        )}

        <div className="test-explorer-list">
          {suiteNames.map((suiteName) => {
            const suiteTests = filteredTests.filter((t) => t.suite === suiteName);
            if (suiteTests.length === 0) return null;
            const suitePass = suiteTests.every((t) => t.status === "pass");
            const suiteFail = suiteTests.some((t) => t.status === "fail");
            return (
              <div key={suiteName} className="test-suite">
                <div className="test-suite-header">
                  {suiteFail ? (
                    <i className="fas fa-times-circle test-icon-fail" aria-hidden="true" />
                  ) : suitePass ? (
                    <i className="fas fa-check-circle test-icon-pass" aria-hidden="true" />
                  ) : (
                    <i className="fas fa-circle test-icon-idle" aria-hidden="true" />
                  )}
                  <span
                    className="test-suite-name"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleRenameSuite(suiteName, e.currentTarget.textContent || suiteName)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
                  >{suiteName}</span>
                  <span className="test-suite-count">{suiteTests.length} test{suiteTests.length > 1 ? "s" : ""}</span>
                  <button
                    type="button"
                    className="test-suite-add-btn"
                    onClick={() => handleAddTest(suiteName)}
                    title="Add test to this suite"
                  >
                    <i className="fas fa-plus" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="test-suite-delete-btn"
                    onClick={() => handleDeleteSuite(suiteName)}
                    title="Delete this suite and all its tests"
                  >
                    <i className="fas fa-trash" aria-hidden="true" />
                  </button>
                </div>
                {suiteTests.map((tc) => {
                  const isExpanded = expandedTests.has(tc.id);
                  return (
                    <div key={tc.id} className={`test-case ${tc.status === "fail" ? "test-case-fail" : tc.status === "pass" ? "test-case-pass" : ""}`}>
                      <div
                        className="test-case-row"
                        onClick={() => toggleExpanded(tc.id)}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                      >
                        <i className={`fas fa-chevron-${isExpanded ? "down" : "right"} test-case-chevron`} aria-hidden="true" />
                        {tc.status === "pass" ? (
                          <i className="fas fa-check-circle test-icon-pass" aria-hidden="true" />
                        ) : tc.status === "fail" ? (
                          <i className="fas fa-times-circle test-icon-fail" aria-hidden="true" />
                        ) : (
                          <i className="fas fa-circle test-icon-idle" aria-hidden="true" />
                        )}
                        <span className="test-case-name">{tc.name}</span>
                        {suiteNames.length > 1 && (
                          <select
                            className="test-case-move-select"
                            value={tc.suite}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => { e.stopPropagation(); handleMoveTest(tc.id, e.target.value); }}
                            title="Move to suite"
                          >
                            {suiteNames.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        )}
                        {tc.duration > 0 && <span className="test-case-duration">{tc.duration}ms</span>}
                        <button
                          type="button"
                          className="test-case-run-btn"
                          onClick={(e) => { e.stopPropagation(); handleRunSingleTest(tc.id); }}
                          title="Run this test"
                        >
                          <i className="fas fa-play" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="test-case-delete-btn"
                          onClick={(e) => { e.stopPropagation(); handleDeleteTest(tc.id); }}
                          title="Delete this test"
                        >
                          <i className="fas fa-trash" aria-hidden="true" />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="test-case-expanded">
                          <div className="test-case-code-wrapper">
                            <div className="editor-code-lines" aria-hidden="true">
                              {(tc.code || "").split("\n").map((_: string, i: number) => (
                                <span key={i}>{i + 1}</span>
                              ))}
                            </div>
                            <div className="editor-code-body">
                              <pre className="editor-code-highlight" aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightJS(tc.code || "") + "\n" }} />
                              <textarea
                                className="editor-code-area"
                                value={tc.code}
                                onChange={(e) => updateTestCode(tc.id, e.target.value)}
                                onScroll={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  const highlight = target.previousElementSibling as HTMLElement;
                                  const lines = target.parentElement?.previousElementSibling as HTMLElement;
                                  if (highlight) {
                                    highlight.scrollTop = target.scrollTop;
                                    highlight.scrollLeft = target.scrollLeft;
                                  }
                                  if (lines) {
                                    lines.scrollTop = target.scrollTop;
                                  }
                                }}
                                spellCheck={false}
                              />
                            </div>
                          </div>
                          {tc.error && (
                            <div className="test-case-error">
                              <div className="test-case-error-label">
                                <i className="fas fa-exclamation-triangle" aria-hidden="true" /> Error Output
                              </div>
                              <pre>{tc.error}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="test-explorer-add">
          <Button type="border" onClick={() => handleAddSuite()} attrProps={{ className: "editor-btn-small" }}>
            <i className="fas fa-plus" aria-hidden="true" />
            <span>Add Test Suite</span>
          </Button>
        </div>
        </>}
      </section>

      {/* Type/Scope Change Warning Dialog */}
      {typeChangeWarning && (
        <div className="scope-change-overlay" onClick={cancelTypeChangeWarning}>
          <div className="scope-change-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="scope-change-header">
              <i className="fas fa-exclamation-triangle scope-change-warn-icon" aria-hidden="true" />
              <h3 className="scope-change-title">
                {typeChangeWarning.newType ? "Type change will remove timing positions" : "Remove timing position?"}
              </h3>
            </div>
            <p className="scope-change-description">
              {typeChangeWarning.newType ? (
                <>Changing to <strong>{typeChangeWarning.newType}</strong> is not supported at the following timing position{typeChangeWarning.removedPositions.length > 1 ? "s" : ""}:</>
              ) : (
                <>Removing this timing position will affect active instances:</>
              )}
            </p>
            <div className="scope-change-detail">
              <span className="scope-change-detail-label">
                <i className="fas fa-clock" aria-hidden="true" /> Position{typeChangeWarning.removedPositions.length > 1 ? "s" : ""} to be removed:
              </span>
              <ul className="scope-change-detail-list">
                {typeChangeWarning.removedPositions.map((pos) => (
                  <li key={pos}>{positionLabels[pos] || pos}</li>
                ))}
              </ul>
            </div>
            {typeChangeWarning.affectedInstances.length > 0 && (
              <div className="scope-change-detail">
                <span className="scope-change-detail-label">
                  <i className="fas fa-cubes" aria-hidden="true" /> Affected instances ({typeChangeWarning.affectedInstances.length}):
                </span>
                <ul className="scope-change-detail-list">
                  {typeChangeWarning.affectedInstances.map((inst, i) => (
                    <li key={i}>
                      <strong>{inst.name}</strong>
                      <span style={{ color: "var(--gray-600, #999)", marginLeft: 6 }}>at {positionLabels[inst.position] || inst.position}</span>
                    </li>
                  ))}
                </ul>
                <p className="scope-change-reason">
                  These instances will need to be reassigned to a different timing position.
                </p>
              </div>
            )}
            <div className="scope-change-actions">
              <Button type="border" onClick={cancelTypeChangeWarning}>Cancel</Button>
              <Button type="destructive" onClick={confirmTypeChangeWarning}>Proceed</Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="editor-action-bar">
        <div className="editor-action-primary">
          <Button type="primary" onClick={() => navigate("/extensions")}>
            Save
          </Button>
          <Button type="secondary" onClick={() => navigate("/extensions")}>
            Cancel
          </Button>
        </div>
        {!isNew && (
          <div className="editor-action-destructive">
            <Button type="destructive" onClick={() => navigate("/extensions")}>
              Delete Extension
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}
