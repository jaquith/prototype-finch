import React, { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMvpMode } from "../contexts/MvpContext";
import { useMarketplace } from "../contexts/MarketplaceContext";
import { getCatalogItem, isMarketplaceId } from "../data/marketplaceCatalog";
import Button from "../components/SimpleButton";
import Textbox from "../components/SimpleTextbox";
import TextArea from "../components/SimpleTextArea";
import Select from "../components/SimpleSelect";
import Badge from "../components/SimpleBadge";
import SimpleSwitch from "../components/SimpleSwitch";
import SimpleTooltip from "../components/SimpleTooltip";
import { TYPE_ICONS, TYPE_COLORS } from "../constants/typeIcons";
import ExtensionCodeField from "../components/ExtensionCodeField";
import ExtensionTestTable from "../components/ExtensionTestTable";
import { formatExtensionValue, runExtensionTest, type ExtensionTest } from "../utils/extensionRuntime";
import "./Operators.css";
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

  let url = input.value.replace(/^https?:\\/\\//, "");
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

const DAY_MS = 24 * 60 * 60 * 1000;

const TESTS_ENGAGEMENT: ExtensionTest[] = [
  { id: "t1", name: "computes score from page views and purchases", inputs: { viewCount: "10", purchaseCount: "3" }, expected: { score: "11" } },
  { id: "t2", name: "handles zero values", inputs: { viewCount: "0", purchaseCount: "0" }, expected: { score: "0" } },
  { id: "t3", name: "handles missing attributes", inputs: {}, expected: { score: "0" } },
  { id: "t4", name: "caps score at 100", inputs: { viewCount: "100", purchaseCount: "50" }, expected: { score: "100" } },
];

const urlInputs = (value: string) => ({ name: "page_url", value, type: "String", scope: "event" });
const TESTS_NORMALIZE: ExtensionTest[] = [
  { id: "t1", name: "strips https://", inputs: urlInputs("https://Example.com/Page"), expected: { value: "example.com/page" } },
  { id: "t2", name: "strips http://", inputs: urlInputs("http://Example.com/Page"), expected: { value: "example.com/page" } },
  { id: "t3", name: "removes query parameters", inputs: urlInputs("https://example.com/page?foo=bar&baz=1"), expected: { value: "example.com/page" } },
  { id: "t4", name: "removes hash fragments", inputs: urlInputs("https://example.com/page#top"), expected: { value: "example.com/page" } },
];

const stringInputs = (value: string) => ({ name: "loyalty_tier", value, type: "String", scope: "visitor" });
const TESTS_NORMALIZE_STRINGS: ExtensionTest[] = [
  { id: "t1", name: "lowercases string value", inputs: stringInputs("Hello World"), expected: { value: "hello world" } },
  { id: "t2", name: "trims whitespace", inputs: stringInputs("  hello  "), expected: { value: "hello" } },
  { id: "t3", name: "leaves output unset when value is missing", inputs: stringInputs(""), expected: {} },
];

// Timeline timestamps are relative to when the editor opens so the rolling window stays meaningful.
function buildTallyTests(): ExtensionTest[] {
  const at = (daysAgo: number, tally: Record<string, number>) => ({ timestamp: Date.now() - daysAgo * DAY_MS, tally });
  const json = (v: unknown) => JSON.stringify(v);
  return [
    { id: "t1", name: "includes entries within the window", inputs: { timeline: json([at(2, { shoes: 3, hats: 1 }), at(5, { shoes: 1, jackets: 2 })]), visitTally: json({ shoes: 1 }), windowDays: "10" }, expected: { masterTally: json({ shoes: 5, hats: 1, jackets: 2 }) } },
    { id: "t2", name: "excludes entries outside the window", inputs: { timeline: json([at(2, { shoes: 3 }), at(15, { hats: 100 })]), visitTally: "{}", windowDays: "10" }, expected: { masterTally: json({ shoes: 3 }) } },
    { id: "t3", name: "merges current visit tally", inputs: { timeline: json([at(1, { electronics: 2 })]), visitTally: json({ electronics: 3, books: 1 }), windowDays: "10" }, expected: { masterTally: json({ electronics: 5, books: 1 }) } },
    { id: "t4", name: "first visit with empty timeline", inputs: { timeline: "[]", visitTally: json({ shoes: 2, hats: 5 }), windowDays: "10" }, expected: { masterTally: json({ shoes: 2, hats: 5 }) } },
    { id: "t5", name: "no data yields an empty tally", inputs: { timeline: "[]", visitTally: "{}", windowDays: "10" }, expected: { masterTally: "{}" } },
  ];
}

function buildRecencyTests(): ExtensionTest[] {
  return [
    { id: "t1", name: "recent and frequent scores 100", inputs: { lastDate: new Date().toISOString(), count: "10", windowDays: "30", categoryName: "shoes" }, expected: { rfScore: "100" } },
    { id: "t2", name: "stale activity scores on frequency only", inputs: { lastDate: "2000-01-01", count: "5", windowDays: "30", categoryName: "shoes" }, expected: { rfScore: "20" } },
  ];
}

const CODE_FOOTER = "  return output;\n}";

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

export default function ModuleEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isMvp } = useMvpMode();
  const isNew = id === "new";

  const isNormalize = id === "1";
  const isTally = id === "10";
  const isNormalizeStrings = id === "11";
  const isRecency = id === "8";
  const catalogItem = isMarketplaceId(id) ? getCatalogItem(id!) : undefined;
  const { getAdded } = useMarketplace();
  const addedRecord = catalogItem ? getAdded(catalogItem.id) : undefined;
  const toParamDefs = (direction: "input" | "output"): ParamDef[] =>
    (catalogItem?.params ?? [])
      .filter((p) => p.direction === direction)
      .map(({ id, variableName, type, description, staticValue }) => ({ id, variableName, type, description, staticValue }));

  const [name, setName] = useState(
    catalogItem ? addedRecord?.overrides?.name || catalogItem.name : isNew ? "" : isNormalize ? "Normalize Page URLs" : isTally ? "Tally Over Time" : isNormalizeStrings ? "Lowercase String" : isRecency ? "Recency Frequency Scorer" : "Compute Engagement Score"
  );
  const [description, setDescription] = useState(
    catalogItem
      ? addedRecord?.overrides?.description || catalogItem.description
      : isNew
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

  const [extensionEnabled, setExtensionEnabled] = useState(
    catalogItem ? (addedRecord?.enabled ?? true) : !isNew
  );

  const [inputParams, setInputParams] = useState<ParamDef[]>(
    catalogItem
      ? toParamDefs("input")
      : isNew
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
    catalogItem
      ? toParamDefs("output")
      : isNew
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

  const instanceCount = catalogItem || isNew ? 0 : isNormalize ? 2 : isTally ? 2 : isNormalizeStrings ? 2 : isRecency ? 4 : 3;

  const [isBulkExtension, setIsBulkExtension] = useState(
    catalogItem ? !!catalogItem.isBulk : isNormalize || isNormalizeStrings
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
    catalogItem ? catalogItem.supportedTypes || [] : isNormalize || isNormalizeStrings ? ["String"] : []
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
    catalogItem
      ? toParamDefs("output").map((p) => ({ attribute: p.variableName, type: p.type }))
      : isNew
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
    catalogItem ? addedRecord?.overrides?.code || catalogItem.code : isNew ? DEFAULT_NEW_CODE_BODY : isNormalize ? CODE_BODY_NORMALIZE : isTally ? CODE_BODY_TALLY : isNormalizeStrings ? CODE_BODY_NORMALIZE_STRINGS : isRecency ? CODE_BODY_RECENCY : CODE_BODY_ENGAGEMENT
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

  const codeHeader = useMemo(() => `${buildCodeSignature()}\nfunction run(input, output) {`, [buildCodeSignature]);
  const codeLineCount = codeHeader.split("\n").length + codeBody.split("\n").length + CODE_FOOTER.split("\n").length;

  // Type-change warning state (when a type edit would remove allowed positions)
  const [typeChangeWarning, setTypeChangeWarning] = useState<{
    paramId: string;
    direction: "input" | "output";
    newType: string;
    removedPositions: string[];
    affectedInstances: { name: string; position: string }[];
  } | null>(null);

  const [testCases, setTestCases] = useState<ExtensionTest[]>(() =>
    isNew || catalogItem ? [] : isNormalize ? TESTS_NORMALIZE : isTally ? buildTallyTests() : isNormalizeStrings ? TESTS_NORMALIZE_STRINGS : isRecency ? buildRecencyTests() : TESTS_ENGAGEMENT
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ code: true });
  const toggle = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const testInputs = useMemo(() => inputParams.filter((p) => p.variableName), [inputParams]);
  const testOutputs = useMemo(() => outputParams.filter((p) => p.variableName), [outputParams]);
  const testResults = useMemo(
    () => testCases.map((t) => runExtensionTest(codeBody, testInputs, testOutputs, t)),
    [codeBody, testCases, testInputs, testOutputs]
  );
  const failedTests = useMemo(
    () =>
      testCases.flatMap((t, i) => {
        const r = testResults[i];
        if (r.ok && r.pass) return [];
        const reason = !r.ok
          ? r.error
          : r.checks
              .filter((c) => !c.pass)
              .map((c) => `output.${c.name}: expected ${formatExtensionValue(c.expected)}, got ${formatExtensionValue(c.actual)}`)
              .join("; ");
        return [{ test: t, reason }];
      }),
    [testCases, testResults]
  );

  // AI Assistant callbacks for code & tests context
  const getEditorResponse = useCallback((msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes("add") && lower.includes("test")) {
      return { text: "I'd add a test with every input left blank, to make sure missing attributes don't produce a bad output:", action: { type: "add-test", label: "Add test: all inputs missing", detail: "Inputs: all blank (missing)\nExpected outputs: not set", id: `action-${Date.now()}` } };
    }
    if (lower.includes("delete") && lower.includes("fail")) {
      if (failedTests.length > 0) {
        return { text: `I found ${failedTests.length} failing test(s). Want me to remove them?`, action: { type: "delete-failed", label: `Delete ${failedTests.length} failing test(s)`, detail: failedTests.map((f) => `\u2022 ${f.test.name}`).join("\n"), id: `action-${Date.now()}` } };
      }
      return { text: "No failing tests found." };
    }
    if (lower.includes("fail") || lower.includes("debug") || lower.includes("why") || lower.includes("broken")) {
      if (failedTests.length > 0) {
        return { text: `You have ${failedTests.length} failing test(s):\n\n${failedTests.map((f) => `\u2022 **${f.test.name}**\n  ${f.reason}`).join("\n")}\n\nEither the function body needs a fix, or the expected value in the test is wrong.` };
      }
      return { text: "All tests are passing." };
    }
    if (lower.includes("error") || lower.includes("try") || lower.includes("catch")) {
      return { text: "Here's a try/catch wrapper you could add to your code:\n\n```\ntry {\n  // your logic here\n} catch (e) {\n  output.error = e.message;\n}\n```\n\nThis catches runtime errors and writes the message to an `error` output variable." };
    }
    if (lower.includes("cap") || lower.includes("max") || lower.includes("limit")) {
      return { text: "To cap the score at 100, add this before setting the output:\n\n```\nconst capped = Math.min(score, 100);\noutput.score = capped;\n```" };
    }
    if (lower.includes("explain") || lower.includes("what does") || lower.includes("how does")) {
      return { text: "This extension reads values from `input`, applies its logic, and writes results to `output`. The function signature and `return output` are generated from the extension's inputs and outputs, so you only edit the body." };
    }
    return { text: "I can help with both your **extension code** and **tests**. Try asking me to:\n\n**Code:**\n\u2022 Add error handling\n\u2022 Explain this code\n\n**Tests:**\n\u2022 Add a test\n\u2022 Why is my test failing?\n\u2022 Delete failing tests" };
  }, [failedTests]);

  const handleEditorAction = useCallback((action: { type: string; label: string; detail: string; id: string }, accepted: boolean) => {
    if (!accepted) return;
    if (action.type === "add-test") {
      setTestCases((prev) => [...prev, { id: `t${Date.now()}`, name: action.label.replace("Add test: ", ""), inputs: {}, expected: {} }]);
      setCollapsed((prev) => ({ ...prev, tests: false }));
    } else if (action.type === "delete-failed") {
      const failedIds = new Set(failedTests.map((f) => f.test.id));
      setTestCases((prev) => prev.filter((t) => !failedIds.has(t.id)));
    }
  }, [failedTests]);

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
            <span className="editor-code-line-count">{codeLineCount} lines</span>
          </div>
        </div>
        {!collapsed.code && (
          <>
            <p className="ext-code-note">
              <i className="fas fa-lock" aria-hidden="true" /> The signature and <code>return output</code> are generated from this extension&apos;s inputs and outputs. Only the function body is editable.
            </p>
            <ExtensionCodeField header={codeHeader} footer={CODE_FOOTER} value={codeBody} onChange={setCodeBody} />
          </>
        )}
      </section>

      {/* Tests */}
      <section className="editor-section">
        <div className="editor-section-header editor-section-header-collapsible" onClick={() => toggle("tests")}>
          <h2 className="editor-section-title">
            <i className={`fas fa-chevron-${collapsed.tests ? "right" : "down"}`} aria-hidden="true" />
            <i className="fas fa-flask" aria-hidden="true" /> Tests
          </h2>
          <div className="editor-section-header-actions" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="test-ai-btn" onClick={() => window.dispatchEvent(new CustomEvent("open-ai-builder", { detail: { prompt: `Improve tests for the ${name} extension` } }))}>
              <i className="fas fa-magic" aria-hidden="true" /> Improve tests
            </button>
          </div>
        </div>
        {!collapsed.tests && (
          <ExtensionTestTable inputs={testInputs} outputs={testOutputs} tests={testCases} results={testResults} onChange={setTestCases} />
        )}
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
