import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/SimpleButton";
import Textbox from "../components/SimpleTextbox";
import Select from "../components/SimpleSelect";
import Badge from "../components/SimpleBadge";
import SimpleSwitch from "../components/SimpleSwitch";
import SimpleTooltip from "../components/SimpleTooltip";
import { TYPE_ICONS, TYPE_COLORS } from "../constants/typeIcons";
import "./ModuleInstances.css";

// These would come from shared state / API in production
const MOCK_EVENT_ATTRIBUTES = [
  { label: "tealium_event", value: "tealium_event" },
  { label: "page_url", value: "page_url" },
  { label: "page_title", value: "page_title" },
  { label: "product_id", value: "product_id" },
  { label: "order_total", value: "order_total" },
  { label: "search_query", value: "search_query" },
];

const MOCK_VISIT_VISITOR_ATTRIBUTES = [
  { label: "engagement_score", value: "engagement_score" },
  { label: "lifetime_value", value: "lifetime_value" },
  { label: "loyalty_tier", value: "loyalty_tier" },
  { label: "is_active", value: "is_active" },
  { label: "preferred_categories", value: "preferred_categories" },
  { label: "last_interaction_date", value: "last_interaction_date" },
  { label: "page_view_count", value: "page_view_count" },
  { label: "purchase_count", value: "purchase_count" },
];

const MOCK_AUDIENCE_ATTRIBUTES = [
  { label: "High-Value Customers", value: "audience:high-value-customers" },
  { label: "Cart Abandoners", value: "audience:cart-abandoners" },
  { label: "Newsletter Subscribers", value: "audience:newsletter-subscribers" },
];

// Trigger rule types
interface RuleCondition {
  attribute: string;
  operator: string;
  value: string;
}

interface RuleConditionGroup {
  conditions: RuleCondition[];
}

interface TriggerRule {
  id: string;
  name: string;
  type: "all" | "predefined" | "custom";
  trigger?: "event" | "new-visitor" | "new-visit" | "visit-ended"; // defaults to "event"
  conditionGroups?: RuleConditionGroup[]; // groups joined by OR, conditions within group joined by AND
}

const PREDEFINED_RULES: TriggerRule[] = [
  // Event triggers
  { id: "all", name: "All Events", type: "all", trigger: "event" },
  {
    id: "page-view",
    name: "Page View Events",
    type: "predefined",
    trigger: "event",
    conditionGroups: [{ conditions: [{ attribute: "tealium_event", operator: "equals", value: "page_view" }] }],
  },
  {
    id: "purchase",
    name: "Purchase Events",
    type: "predefined",
    trigger: "event",
    conditionGroups: [{ conditions: [{ attribute: "tealium_event", operator: "equals", value: "purchase" }] }],
  },
  {
    id: "cart-add",
    name: "Add to Cart Events",
    type: "predefined",
    trigger: "event",
    conditionGroups: [{ conditions: [{ attribute: "tealium_event", operator: "equals", value: "cart_add" }] }],
  },
  {
    id: "search",
    name: "Search Events",
    type: "predefined",
    trigger: "event",
    conditionGroups: [{ conditions: [{ attribute: "tealium_event", operator: "equals", value: "search" }] }],
  },
  {
    id: "has-order",
    name: "Events with Order Total",
    type: "predefined",
    trigger: "event",
    conditionGroups: [{ conditions: [{ attribute: "order_total", operator: "is set", value: "" }] }],
  },
  {
    id: "high-value",
    name: "High-Value Visitors",
    type: "predefined",
    trigger: "event",
    conditionGroups: [{ conditions: [{ attribute: "lifetime_value", operator: "greater than", value: "500" }] }],
  },
  // Lifecycle triggers
  { id: "new-visitor", name: "New Visitor", type: "predefined", trigger: "new-visitor" },
  { id: "new-visit", name: "New Visit", type: "predefined", trigger: "new-visit" },
  { id: "visit-ended", name: "Visit Ended", type: "predefined", trigger: "visit-ended" },
];

const CONDITION_OPERATORS = [
  { label: "equals", value: "equals" },
  { label: "not equals", value: "not equals" },
  { label: "contains", value: "contains" },
  { label: "is set", value: "is set" },
  { label: "is not set", value: "is not set" },
  { label: "greater than", value: "greater than" },
  { label: "less than", value: "less than" },
];

const LIFECYCLE_CONDITION_ATTRIBUTES: Record<string, { label: string; value: string }[]> = {
  "new-visitor": MOCK_VISIT_VISITOR_ATTRIBUTES,
  "new-visit": [...MOCK_VISIT_VISITOR_ATTRIBUTES],
  "visit-ended": [...MOCK_VISIT_VISITOR_ATTRIBUTES],
};

function isLifecycleTrigger(trigger?: string): boolean {
  return trigger === "new-visitor" || trigger === "new-visit" || trigger === "visit-ended";
}

function getLifecycleIcon(trigger?: string): string {
  switch (trigger) {
    case "new-visitor": return "fas fa-user-plus";
    case "new-visit": return "fas fa-door-open";
    case "visit-ended": return "fas fa-door-closed";
    default: return "fas fa-bolt";
  }
}

// The extension's defined interface (variable names + types)
interface ParamDef {
  variableName: string;
  type: string;
  direction: "input" | "output";
  description?: string;
}

interface BulkFilter {
  types: string[];
  scopes?: ("visitor" | "visit" | "event")[];
  excludeAttributes?: string[];
}

interface InstanceMapping {
  variableName: string;
  mappedAttribute: string;
  bulkFilter?: BulkFilter;
}

type MappingMode = "specific" | "single-attribute" | "bulk";

interface ExtensionInstance {
  id: string;
  name: string;
  enabled: boolean;
  rule: TriggerRule;
  inputMappings: InstanceMapping[];
  outputMappings: InstanceMapping[];
  mappingMode?: MappingMode;
  attributeList?: string[];
  timing?: string;
}

// Allowed positions per extension (mirrors editor config)
const ALLOWED_POSITIONS: Record<string, { id: string; label: string }[]> = {
  "1": [
    { id: "preEvent", label: "Pre-Event" },
    { id: "postEvent", label: "Post-Event" },
  ],
  "2": [
    { id: "postVisitor", label: "Post-Visitor" },
    { id: "postAudience", label: "Post-Audience" },
  ],
  "8": [
    { id: "postVisitor", label: "Post-Visitor" },
  ],
  "10": [
    { id: "postVisitor", label: "Post-Visitor" },
  ],
  "11": [
    { id: "preEvent", label: "Pre-Event" },
    { id: "postEvent", label: "Post-Event" },
    { id: "preVisitor", label: "Pre-Visitor" },
    { id: "postVisitor", label: "Post-Visitor" },
    { id: "postAudience", label: "Post-Audience" },
  ],
};

// Mock: the extension's defined parameters (from the editor)
const PARAMS_ENGAGEMENT: ParamDef[] = [
  { variableName: "viewCount", type: "Number", direction: "input", description: "Total page views for the visitor" },
  { variableName: "purchaseCount", type: "Number", direction: "input", description: "Total purchases made" },
  { variableName: "score", type: "Number", direction: "output", description: "Computed engagement score (0-100)" },
];

const PARAMS_NORMALIZE: ParamDef[] = [
  { variableName: "name", type: "String", direction: "input", description: "Attribute name (provided by framework)" },
  { variableName: "value", type: "String", direction: "input", description: "Attribute value to normalize" },
  { variableName: "type", type: "String", direction: "input", description: "Attribute type (guaranteed by framework)" },
  { variableName: "scope", type: "String", direction: "input", description: "Attribute scope: event, visit, or visitor" },
  { variableName: "value", type: "String", direction: "output", description: "Cleaned and normalized value" },
];

const PARAMS_NORMALIZE_STRINGS: ParamDef[] = [
  { variableName: "name", type: "String", direction: "input", description: "Attribute name (provided by framework)" },
  { variableName: "value", type: "String", direction: "input", description: "String value to lowercase" },
  { variableName: "type", type: "String", direction: "input", description: "Attribute type (guaranteed by framework)" },
  { variableName: "scope", type: "String", direction: "input", description: "Attribute scope: event, visit, or visitor" },
  { variableName: "value", type: "String", direction: "output", description: "Lowercased string" },
];

const PARAMS_RECENCY: ParamDef[] = [
  { variableName: "lastDate", type: "String", direction: "input", description: "Date of the most recent activity" },
  { variableName: "count", type: "Number", direction: "input", description: "Number of occurrences in the time window" },
  { variableName: "windowDays", type: "Static Number", direction: "input", description: "Number of days for the scoring window" },
  { variableName: "categoryName", type: "Static String", direction: "input", description: "Label for the category being scored" },
  { variableName: "rfScore", type: "Number", direction: "output", description: "Computed recency-frequency score" },
];

const INSTANCES_RECENCY: ExtensionInstance[] = [
  {
    id: "inst1",
    name: "Purchase recency (7 days)",
    enabled: true,
    timing: "postVisitor",
    rule: { id: "all", name: "All Events", type: "all" },
    inputMappings: [
      { variableName: "lastDate", mappedAttribute: "last_purchase_date" },
      { variableName: "count", mappedAttribute: "purchase_count" },
      { variableName: "windowDays", mappedAttribute: "7" },
      { variableName: "categoryName", mappedAttribute: "Purchases" },
    ],
    outputMappings: [
      { variableName: "rfScore", mappedAttribute: "purchase_recency_score_7d" },
    ],
  },
  {
    id: "inst2",
    name: "Purchase recency (30 days)",
    enabled: true,
    timing: "postVisitor",
    rule: { id: "all", name: "All Events", type: "all" },
    inputMappings: [
      { variableName: "lastDate", mappedAttribute: "last_purchase_date" },
      { variableName: "count", mappedAttribute: "purchase_count" },
      { variableName: "windowDays", mappedAttribute: "30" },
      { variableName: "categoryName", mappedAttribute: "Purchases" },
    ],
    outputMappings: [
      { variableName: "rfScore", mappedAttribute: "purchase_recency_score_30d" },
    ],
  },
  {
    id: "inst3",
    name: "Purchase recency (60 days)",
    enabled: true,
    timing: "postVisitor",
    rule: { id: "all", name: "All Events", type: "all" },
    inputMappings: [
      { variableName: "lastDate", mappedAttribute: "last_purchase_date" },
      { variableName: "count", mappedAttribute: "purchase_count" },
      { variableName: "windowDays", mappedAttribute: "60" },
      { variableName: "categoryName", mappedAttribute: "Purchases" },
    ],
    outputMappings: [
      { variableName: "rfScore", mappedAttribute: "purchase_recency_score_60d" },
    ],
  },
  {
    id: "inst4",
    name: "Purchase recency (90 days)",
    enabled: true,
    timing: "postVisitor",
    rule: { id: "all", name: "All Events", type: "all" },
    inputMappings: [
      { variableName: "lastDate", mappedAttribute: "last_purchase_date" },
      { variableName: "count", mappedAttribute: "purchase_count" },
      { variableName: "windowDays", mappedAttribute: "90" },
      { variableName: "categoryName", mappedAttribute: "Purchases" },
    ],
    outputMappings: [
      { variableName: "rfScore", mappedAttribute: "purchase_recency_score_90d" },
    ],
  },
];

const DEFAULT_RULE: TriggerRule = { id: "all", name: "All Events", type: "all" };

const INSTANCES_ENGAGEMENT: ExtensionInstance[] = [
  {
    id: "inst1",
    name: "Engagement score from page views",
    enabled: true,
    rule: { ...PREDEFINED_RULES[1] }, // Page View Events
    inputMappings: [
      { variableName: "viewCount", mappedAttribute: "page_view_count" },
      { variableName: "purchaseCount", mappedAttribute: "purchase_count" },
    ],
    outputMappings: [
      { variableName: "score", mappedAttribute: "engagement_score" },
    ],
  },
  {
    id: "inst2",
    name: "Score from lifetime value",
    enabled: true,
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      { variableName: "viewCount", mappedAttribute: "lifetime_value" },
      { variableName: "purchaseCount", mappedAttribute: "purchase_count" },
    ],
    outputMappings: [
      { variableName: "score", mappedAttribute: "loyalty_tier" },
    ],
  },
  {
    id: "inst3",
    name: "High value recent customers",
    enabled: true,
    timing: "postAudience",
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      { variableName: "viewCount", mappedAttribute: "page_view_count" },
      { variableName: "purchaseCount", mappedAttribute: "purchase_count" },
    ],
    outputMappings: [
      { variableName: "score", mappedAttribute: "high_value_score" },
    ],
  },
];

const PARAMS_TALLY: ParamDef[] = [
  { variableName: "timeline", type: "Timeline", direction: "input", description: "Historical tally entries with timestamps" },
  { variableName: "visitTally", type: "Tally", direction: "input", description: "Current visit category counts" },
  { variableName: "windowDays", type: "Static Number", direction: "input", description: "Rolling window size in days" },
  { variableName: "masterTally", type: "Tally", direction: "output", description: "Aggregated category counts across the window" },
];

const INSTANCES_TALLY: ExtensionInstance[] = [
  {
    id: "inst1",
    name: "Product category tally (30 days)",
    enabled: true,
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      { variableName: "timeline", mappedAttribute: "product_category_timeline" },
      { variableName: "visitTally", mappedAttribute: "visit_product_categories" },
      { variableName: "windowDays", mappedAttribute: "30" },
    ],
    outputMappings: [
      { variableName: "masterTally", mappedAttribute: "product_category_tally_30_days" },
    ],
  },
  {
    id: "inst2",
    name: "Product category tally (60 days)",
    enabled: true,
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      { variableName: "timeline", mappedAttribute: "product_category_timeline" },
      { variableName: "visitTally", mappedAttribute: "visit_product_categories" },
      { variableName: "windowDays", mappedAttribute: "60" },
    ],
    outputMappings: [
      { variableName: "masterTally", mappedAttribute: "product_category_tally_60_days" },
    ],
  },
];

const INSTANCES_NORMALIZE: ExtensionInstance[] = [
  {
    id: "inst1",
    name: "Normalize common URLs",
    enabled: true,
    timing: "preEvent",
    mappingMode: "single-attribute",
    attributeList: ["page_url", "page_title", "referrer"],
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      { variableName: "value", mappedAttribute: "page_url" },
    ],
    outputMappings: [
      { variableName: "value", mappedAttribute: "page_url" },
    ],
  },
  {
    id: "inst2",
    name: "Normalize page_title URL",
    enabled: true,
    timing: "preEvent",
    rule: { ...PREDEFINED_RULES[1] }, // Page View Events
    inputMappings: [
      { variableName: "value", mappedAttribute: "page_title" },
    ],
    outputMappings: [
      { variableName: "value", mappedAttribute: "page_title" },
    ],
  },
];

const INSTANCES_NORMALIZE_STRINGS: ExtensionInstance[] = [
  {
    id: "inst1",
    name: "Lowercase event strings (post-enrichments)",
    enabled: true,
    mappingMode: "bulk",
    timing: "postEvent",
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      {
        variableName: "value",
        mappedAttribute: "",
        bulkFilter: {
          types: ["String"],
          scopes: ["event"],
          excludeAttributes: ["tealium_event"],
        },
      },
    ],
    outputMappings: [
      {
        variableName: "value",
        mappedAttribute: "",
        bulkFilter: {
          types: ["String"],
          scopes: ["event"],
          excludeAttributes: ["tealium_event"],
        },
      },
    ],
  },
  {
    id: "inst2",
    name: "Lowercase visitor strings (pre-enrichments)",
    enabled: true,
    mappingMode: "bulk",
    timing: "preEvent",
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      {
        variableName: "value",
        mappedAttribute: "",
        bulkFilter: {
          types: ["String"],
          scopes: ["event", "visitor"],
          excludeAttributes: ["visitor_id", "account_hash", "email_hash"],
        },
      },
    ],
    outputMappings: [
      {
        variableName: "value",
        mappedAttribute: "",
        bulkFilter: {
          types: ["String"],
          scopes: ["event", "visitor"],
          excludeAttributes: ["visitor_id", "account_hash", "email_hash"],
        },
      },
    ],
  },
];

const availableAttributes = [
  ...MOCK_EVENT_ATTRIBUTES,
  ...MOCK_VISIT_VISITOR_ATTRIBUTES,
  ...MOCK_AUDIENCE_ATTRIBUTES,
];

// Typed attribute list for bulk mode filtering
const TYPED_ATTRIBUTES: { name: string; type: string; scope: "visitor" | "visit" | "event" }[] = [
  { name: "tealium_event", type: "String", scope: "event" },
  { name: "page_url", type: "String", scope: "event" },
  { name: "page_title", type: "String", scope: "event" },
  { name: "product_id", type: "String", scope: "event" },
  { name: "product_category", type: "String", scope: "event" },
  { name: "order_total", type: "Number", scope: "event" },
  { name: "search_query", type: "String", scope: "event" },
  { name: "engagement_score", type: "Number", scope: "visitor" },
  { name: "lifetime_value", type: "Number", scope: "visitor" },
  { name: "loyalty_tier", type: "String", scope: "visitor" },
  { name: "is_active", type: "Boolean", scope: "visitor" },
  { name: "preferred_categories", type: "Set of Strings", scope: "visitor" },
  { name: "last_interaction_date", type: "String", scope: "visitor" },
  { name: "page_view_count", type: "Number", scope: "visitor" },
  { name: "purchase_count", type: "Number", scope: "visitor" },
  { name: "favorite_product_category_30_days", type: "String", scope: "visitor" },
  { name: "favorite_product_category_60_days", type: "String", scope: "visitor" },
  { name: "product_category_tally_30_days", type: "Tally", scope: "visitor" },
  { name: "product_category_tally_60_days", type: "Tally", scope: "visitor" },
  { name: "product_category_timeline", type: "Timeline", scope: "visitor" },
  { name: "visit_product_categories", type: "Tally", scope: "visit" },
  { name: "visitor_id", type: "String", scope: "visitor" },
  { name: "account_hash", type: "String", scope: "visitor" },
  { name: "email_hash", type: "String", scope: "visitor" },
  { name: "first_name", type: "String", scope: "visitor" },
  { name: "last_name", type: "String", scope: "visitor" },
  { name: "email", type: "String", scope: "visitor" },
  { name: "city", type: "String", scope: "visitor" },
  { name: "state", type: "String", scope: "visitor" },
  { name: "country", type: "String", scope: "visitor" },
  { name: "device_type", type: "String", scope: "visitor" },
  { name: "browser", type: "String", scope: "visitor" },
  { name: "os", type: "String", scope: "visitor" },
  { name: "campaign_source", type: "String", scope: "visitor" },
  { name: "campaign_medium", type: "String", scope: "visitor" },
  { name: "campaign_name", type: "String", scope: "visitor" },
  { name: "referrer", type: "String", scope: "visitor" },
  { name: "signup_date", type: "String", scope: "visitor" },
  { name: "last_purchase_date", type: "String", scope: "visitor" },
  { name: "customer_segment", type: "String", scope: "visitor" },
  { name: "preferred_language", type: "String", scope: "visitor" },
  { name: "company_name", type: "String", scope: "visitor" },
  { name: "job_title", type: "String", scope: "visitor" },
  { name: "phone_number", type: "String", scope: "visitor" },
  { name: "postal_code", type: "String", scope: "visitor" },
  { name: "gender", type: "String", scope: "visitor" },
  { name: "age_bracket", type: "String", scope: "visitor" },
  { name: "interest_tags", type: "String", scope: "visitor" },
  { name: "session_source", type: "String", scope: "visit" },
  { name: "landing_page", type: "String", scope: "visit" },
  { name: "exit_page", type: "String", scope: "visit" },
];

const AVAILABLE_TYPES = ["String", "Number", "Boolean", "Tally", "Timeline", "Set of Strings", "Date"];

const INSTANCE_SCOPE_TYPES: { scope: string; scopeKey: "event" | "visit" | "visitor"; icon: string; types: string[] }[] = [
  { scope: "Event", scopeKey: "event", icon: "fas fa-bolt", types: ["String", "Number", "Boolean", "Date"] },
  { scope: "Visit", scopeKey: "visit", icon: "fas fa-window-maximize", types: ["String", "Number", "Boolean", "Date", "Tally", "Set of Strings", "Timeline"] },
  { scope: "Visitor", scopeKey: "visitor", icon: "fas fa-user", types: ["String", "Number", "Boolean", "Date", "Tally", "Set of Strings", "Timeline"] },
];

function getMatchedAttributes(filter: BulkFilter): string[] {
  return TYPED_ATTRIBUTES.filter((attr) => {
    if (!filter.types.includes(attr.type)) return false;
    if (filter.scopes && filter.scopes.length > 0 && !filter.scopes.includes(attr.scope)) return false;
    if (filter.excludeAttributes?.includes(attr.name)) return false;
    return true;
  }).map((a) => a.name);
}

// Mock test results
interface TestResult {
  name: string;
  status: "pass" | "fail";
  error?: string;
}

const TEST_RESULTS_TALLY: TestResult[] = [
  { name: "includes entries within time window", status: "pass" },
  { name: "excludes entries outside the time window", status: "pass" },
  { name: "merges current visit tally into master", status: "pass" },
  { name: "works with empty timeline (first visit)", status: "pass" },
  { name: "handles no data gracefully", status: "pass" },
  { name: "handles tied categories in tally correctly", status: "pass" },
];

const TEST_RESULTS_ENGAGEMENT: TestResult[] = [
  { name: "computes score from page views and purchases", status: "pass" },
  { name: "handles zero values", status: "pass" },
  { name: "handles missing attributes gracefully", status: "fail", error: "Expected: 0, Received: NaN" },
  { name: "caps score at 100", status: "fail", error: "Expected: \u2264 100, Received: 150" },
];

const TEST_RESULTS_NORMALIZE: TestResult[] = [
  { name: "strips https://", status: "pass" },
  { name: "strips http://", status: "pass" },
  { name: "removes query parameters", status: "pass" },
];

const TEST_RESULTS_NORMALIZE_STRINGS: TestResult[] = [
  { name: "lowercases string value", status: "pass" },
  { name: "trims whitespace", status: "pass" },
  { name: "passes through null/undefined", status: "pass" },
  { name: "passes through non-string values", status: "pass" },
];

const TEST_RESULTS_RECENCY: TestResult[] = [
  { name: "scores high for recent activity", status: "pass" },
  { name: "scores low for stale activity", status: "pass" },
  { name: "handles zero count gracefully", status: "pass" },
];

// --- Rule Picker dropdown component ---
function RulePicker({ onSelect, onClose }: { onSelect: (rule: TriggerRule) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const filtered = PREDEFINED_RULES.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const eventRules = filtered.filter((r) => !isLifecycleTrigger(r.trigger));
  const lifecycleRules = filtered.filter((r) => isLifecycleTrigger(r.trigger));

  const renderRuleIcon = (rule: TriggerRule) => {
    if (isLifecycleTrigger(rule.trigger)) {
      return <i className={`${getLifecycleIcon(rule.trigger)} rule-picker-item-icon`} aria-hidden="true" />;
    }
    if (rule.type === "all") return <i className="fas fa-globe rule-picker-item-icon" aria-hidden="true" />;
    return <i className="fas fa-filter rule-picker-item-icon" aria-hidden="true" />;
  };

  return (
    <div className="rule-picker" ref={ref}>
      <div className="rule-picker-search">
        <i className="fas fa-search" aria-hidden="true" />
        <input
          type="text"
          className="rule-picker-input"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>
      <div className="rule-picker-list">
        {eventRules.length > 0 && (
          <>
            <div className="rule-picker-section-header">
              <i className="fas fa-bolt" aria-hidden="true" />
              Event Triggers
            </div>
            {eventRules.map((rule) => (
              <button
                key={rule.id}
                type="button"
                className="rule-picker-item"
                onClick={() => { onSelect(rule); onClose(); }}
              >
                {renderRuleIcon(rule)}
                {rule.name}
              </button>
            ))}
          </>
        )}
        {lifecycleRules.length > 0 && (
          <>
            <div className="rule-picker-section-header">
              <i className="fas fa-sync-alt" aria-hidden="true" />
              Lifecycle Triggers
            </div>
            {lifecycleRules.map((rule) => (
              <button
                key={rule.id}
                type="button"
                className="rule-picker-item"
                onClick={() => { onSelect(rule); onClose(); }}
              >
                {renderRuleIcon(rule)}
                {rule.name}
              </button>
            ))}
          </>
        )}
        {filtered.length === 0 && (
          <div className="rule-picker-empty">No matching rules</div>
        )}
      </div>
    </div>
  );
}

export default function ModuleInstances() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNormalize = id === "1";
  const isTally = id === "10";
  const isNormalizeStrings = id === "11";
  const isRecency = id === "8";
  const isBulkExtension = isNormalize || isNormalizeStrings;
  const extensionName = isNormalize ? "Normalize Page URLs" : isTally ? "Tally Over Time" : isNormalizeStrings ? "Lowercase String" : isRecency ? "Recency Frequency Scorer" : "Compute Engagement Score";
  const mockParams = isNormalize ? PARAMS_NORMALIZE : isTally ? PARAMS_TALLY : isNormalizeStrings ? PARAMS_NORMALIZE_STRINGS : isRecency ? PARAMS_RECENCY : PARAMS_ENGAGEMENT;
  const inputParams = mockParams.filter((p) => p.direction === "input");
  const outputParams = mockParams.filter((p) => p.direction === "output");
  const mockTestResults = isNormalize ? TEST_RESULTS_NORMALIZE : isTally ? TEST_RESULTS_TALLY : isNormalizeStrings ? TEST_RESULTS_NORMALIZE_STRINGS : isRecency ? TEST_RESULTS_RECENCY : TEST_RESULTS_ENGAGEMENT;

  const [instances, setInstances] = useState<ExtensionInstance[]>(
    isNormalize ? INSTANCES_NORMALIZE : isTally ? INSTANCES_TALLY : isNormalizeStrings ? INSTANCES_NORMALIZE_STRINGS : isRecency ? INSTANCES_RECENCY : INSTANCES_ENGAGEMENT
  );

  const allowedPositions = ALLOWED_POSITIONS[id || ""] || [];
  const isMultiScope = allowedPositions.length > 1;

  const handleInstanceTimingChange = (instId: string, newTiming: string) => {
    setInstances((prev) =>
      prev.map((inst) => (inst.id === instId ? { ...inst, timing: newTiming } : inst))
    );
  };

  // Bulk mode UI state
  const [bulkListExpanded, setBulkListExpanded] = useState<Set<string>>(new Set());
  const [excludeInput, setExcludeInput] = useState<string>("");
  const [expandedInstances, setExpandedInstances] = useState<Set<string>>(
    new Set(["inst1"])
  );
  const [rulePickerOpen, setRulePickerOpen] = useState<string | null>(null);

  // Parent extension state
  const [parentEnabled, setParentEnabled] = useState(true);
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);

  // Confirmation dialog for enabling with failed tests
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingEnable, setPendingEnable] = useState(false);

  const runTests = useCallback(() => {
    setTestRunning(true);
    setTestResults(null);
    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      setTestResults(mockTestResults);
      setTestRunning(false);
    }, delay);
  }, [mockTestResults]);

  // Run tests on page load
  useEffect(() => {
    const timer = setTimeout(runTests, 300);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleParentToggle = (newVal: boolean) => {
    if (newVal) {
      setTestRunning(true);
      setTestResults(null);
      const delay = 600 + Math.random() * 800;
      setTimeout(() => {
        setTestResults(mockTestResults);
        setTestRunning(false);
        const hasFails = mockTestResults.some((t) => t.status === "fail");
        if (hasFails) {
          setPendingEnable(true);
          setShowConfirmDialog(true);
        } else {
          setParentEnabled(true);
        }
      }, delay);
    } else {
      setParentEnabled(false);
    }
  };

  const confirmEnable = () => {
    setParentEnabled(true);
    setShowConfirmDialog(false);
    setPendingEnable(false);
  };

  const cancelEnable = () => {
    setShowConfirmDialog(false);
    setPendingEnable(false);
  };

  const passedCount = testResults?.filter((t) => t.status === "pass").length ?? 0;
  const failedCount = testResults?.filter((t) => t.status === "fail").length ?? 0;
  const totalCount = testResults?.length ?? 0;

  const toggleExpanded = (instId: string) => {
    setExpandedInstances((prev) => {
      const next = new Set(prev);
      if (next.has(instId)) next.delete(instId);
      else next.add(instId);
      return next;
    });
  };

  const handleToggleInstance = (instId: string, val: boolean) => {
    setInstances((prev) =>
      prev.map((inst) => (inst.id === instId ? { ...inst, enabled: val } : inst))
    );
  };

  const handleInstanceNameChange = (instId: string, newName: string) => {
    setInstances((prev) =>
      prev.map((inst) => (inst.id === instId ? { ...inst, name: newName } : inst))
    );
  };

  const handleRuleChange = (instId: string, rule: TriggerRule) => {
    setInstances((prev) =>
      prev.map((inst) => (inst.id === instId ? { ...inst, rule: { ...rule } } : inst))
    );
  };

  const handleRemoveRule = (instId: string) => {
    setInstances((prev) =>
      prev.map((inst) => (inst.id === instId ? { ...inst, rule: { ...DEFAULT_RULE } } : inst))
    );
  };

  const handleInputMappingChange = (instId: string, varName: string, attrValue: any) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === instId
          ? {
              ...inst,
              inputMappings: inst.inputMappings.map((m) =>
                m.variableName === varName
                  ? { ...m, mappedAttribute: attrValue?.value ?? attrValue ?? "" }
                  : m
              ),
            }
          : inst
      )
    );
  };

  const handleOutputMappingChange = (instId: string, varName: string, attrValue: any) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === instId
          ? {
              ...inst,
              outputMappings: inst.outputMappings.map((m) =>
                m.variableName === varName
                  ? { ...m, mappedAttribute: attrValue?.value ?? attrValue ?? "" }
                  : m
              ),
            }
          : inst
      )
    );
  };

  const handleAddInstance = () => {
    const newId = `inst${Date.now()}`;
    const newInstance: ExtensionInstance = {
      id: newId,
      name: `Instance ${instances.length + 1}`,
      enabled: true,
      timing: allowedPositions[0]?.id,
      rule: { ...DEFAULT_RULE },
      inputMappings: inputParams.map((p) => ({ variableName: p.variableName, mappedAttribute: "" })),
      outputMappings: outputParams.map((p) => ({ variableName: p.variableName, mappedAttribute: "" })),
    };
    setInstances((prev) => [...prev, newInstance]);
    setExpandedInstances((prev) => new Set([...prev, newId]));
  };

  const handleDeleteInstance = (instId: string) => {
    setInstances((prev) => prev.filter((inst) => inst.id !== instId));
    setExpandedInstances((prev) => {
      const next = new Set(prev);
      next.delete(instId);
      return next;
    });
  };

  const handleDuplicateInstance = (instId: string) => {
    const source = instances.find((inst) => inst.id === instId);
    if (!source) return;
    const newId = `inst${Date.now()}`;
    const duplicate: ExtensionInstance = {
      ...source,
      id: newId,
      name: `${source.name} (copy)`,
      rule: { ...source.rule },
    };
    setInstances((prev) => [...prev, duplicate]);
    setExpandedInstances((prev) => new Set([...prev, newId]));
  };

  // Mapping mode handler
  const handleMappingModeChange = (instId: string, mode: MappingMode) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        if (mode === "bulk") {
          const defaultFilter: BulkFilter = { types: ["String"], scopes: [], excludeAttributes: [] };
          return {
            ...inst,
            mappingMode: "bulk",
            attributeList: undefined,
            inputMappings: inst.inputMappings.map((m) => ({ ...m, mappedAttribute: "", bulkFilter: { ...defaultFilter } })),
            outputMappings: inst.outputMappings.map((m) => ({ ...m, mappedAttribute: "", bulkFilter: { ...defaultFilter } })),
          };
        }
        if (mode === "single-attribute") {
          return {
            ...inst,
            mappingMode: "single-attribute",
            attributeList: inst.attributeList || [],
            inputMappings: inst.inputMappings.map((m) => { const { bulkFilter, ...rest } = m; return rest; }),
            outputMappings: inst.outputMappings.map((m) => { const { bulkFilter, ...rest } = m; return rest; }),
          };
        }
        // "specific"
        return {
          ...inst,
          mappingMode: "specific",
          attributeList: undefined,
          inputMappings: inst.inputMappings.map((m) => { const { bulkFilter, ...rest } = m; return rest; }),
          outputMappings: inst.outputMappings.map((m) => { const { bulkFilter, ...rest } = m; return rest; }),
        };
      })
    );
  };

  // Single-attribute mode handlers
  const handleAddAttribute = (instId: string, attrName: string) => {
    if (!attrName.trim()) return;
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const list = inst.attributeList || [];
        if (list.includes(attrName)) return inst;
        return { ...inst, attributeList: [...list, attrName] };
      })
    );
  };

  const handleRemoveAttribute = (instId: string, attrName: string) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        return { ...inst, attributeList: (inst.attributeList || []).filter((a) => a !== attrName) };
      })
    );
  };

  const handleBulkTypeToggle = (instId: string, type: string) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const updateFilter = (m: InstanceMapping): InstanceMapping => {
          if (!m.bulkFilter) return m;
          const types = m.bulkFilter.types.includes(type)
            ? m.bulkFilter.types.filter((t) => t !== type)
            : [...m.bulkFilter.types, type];
          return { ...m, bulkFilter: { ...m.bulkFilter, types } };
        };
        return { ...inst, inputMappings: inst.inputMappings.map(updateFilter), outputMappings: inst.outputMappings.map(updateFilter) };
      })
    );
  };

  const handleBulkScopeToggle = (instId: string, scope: "visitor" | "visit" | "event") => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const updateFilter = (m: InstanceMapping): InstanceMapping => {
          if (!m.bulkFilter) return m;
          const current = m.bulkFilter.scopes || [];
          const next = current.includes(scope)
            ? current.filter((s) => s !== scope)
            : [...current, scope];
          return { ...m, bulkFilter: { ...m.bulkFilter, scopes: next } };
        };
        return { ...inst, inputMappings: inst.inputMappings.map(updateFilter), outputMappings: inst.outputMappings.map(updateFilter) };
      })
    );
  };

  const handleAddExclusion = (instId: string, attrName: string) => {
    if (!attrName.trim()) return;
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const updateFilter = (m: InstanceMapping): InstanceMapping => {
          if (!m.bulkFilter) return m;
          const excludes = m.bulkFilter.excludeAttributes || [];
          if (excludes.includes(attrName)) return m;
          return { ...m, bulkFilter: { ...m.bulkFilter, excludeAttributes: [...excludes, attrName] } };
        };
        return { ...inst, inputMappings: inst.inputMappings.map(updateFilter), outputMappings: inst.outputMappings.map(updateFilter) };
      })
    );
    setExcludeInput("");
  };

  const handleRemoveExclusion = (instId: string, attrName: string) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const updateFilter = (m: InstanceMapping): InstanceMapping => {
          if (!m.bulkFilter) return m;
          return { ...m, bulkFilter: { ...m.bulkFilter, excludeAttributes: (m.bulkFilter.excludeAttributes || []).filter((a) => a !== attrName) } };
        };
        return { ...inst, inputMappings: inst.inputMappings.map(updateFilter), outputMappings: inst.outputMappings.map(updateFilter) };
      })
    );
  };

  // AI Assistant for instances context
  const getInstancesResponse = useCallback((msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes("add") || lower.includes("create") || lower.includes("new instance")) {
      return {
        text: `I can add a new instance for **${extensionName}**. It will start with blank attribute mappings that you can configure.`,
        action: { type: "add-instance", label: "Add new instance", detail: `Creates a new instance with default "All Events" trigger rule and blank mappings for:\n${inputParams.map((p) => `  input: ${p.variableName} (${p.type})`).join("\n")}\n${outputParams.map((p) => `  output: ${p.variableName} (${p.type})`).join("\n")}`, id: `action-${Date.now()}` },
      };
    }
    if (lower.includes("what") && lower.includes("instance")) {
      return { text: "**Instances** let you reuse the same extension logic with different attribute bindings.\n\nFor example, you could have one instance that computes engagement from page views, and another that computes it from lifetime value — both using the same extension code.\n\nEach instance has:\n\u2022 **Input Mappings** — which real attributes feed into the extension's variables\n\u2022 **Output Mappings** — where results are written back\n\u2022 **Trigger Rule** — which events cause this instance to run" };
    }
    if (lower.includes("rule") || lower.includes("trigger") || lower.includes("filter")) {
      return { text: "**Trigger Rules** control when an instance runs.\n\n\u2022 **All Events** (default) — runs on every event\n\u2022 **Predefined rules** — e.g., Page View Events, Purchase Events\n\u2022 **Custom rules** — combine conditions with AND/OR logic\n\nClick 'Change' on any instance's trigger rule to pick a different one." };
    }
    if (lower.includes("unmap") || lower.includes("check") || lower.includes("missing")) {
      const unmapped = instances.filter((inst) => {
        const ui = inst.inputMappings.filter((m) => !m.mappedAttribute).length;
        const uo = inst.outputMappings.filter((m) => !m.mappedAttribute).length;
        return ui + uo > 0;
      });
      if (unmapped.length > 0) {
        return { text: `${unmapped.length} instance(s) have unmapped variables:\n\n${unmapped.map((inst) => {
          const ui = inst.inputMappings.filter((m) => !m.mappedAttribute).map((m) => m.variableName);
          const uo = inst.outputMappings.filter((m) => !m.mappedAttribute).map((m) => m.variableName);
          return `\u2022 **${inst.name}**: ${[...ui.map((v) => `input.${v}`), ...uo.map((v) => `output.${v}`)].join(", ")}`;
        }).join("\n")}\n\nExpand each instance to assign the missing attributes.` };
      }
      return { text: "All instances have their variables fully mapped." };
    }
    if (lower.includes("duplicate") || lower.includes("copy")) {
      return { text: "You can duplicate any instance by clicking the copy icon on its header row. The duplicate will start with the same mappings and rule as the original, and you can modify it independently." };
    }
    if (lower.includes("delete") || lower.includes("remove")) {
      return { text: "To delete an instance, click the trash icon on its header row. This removes all its mappings and trigger rule configuration. The extension itself and other instances are not affected." };
    }
    if (lower.includes("parent") || lower.includes("enable") || lower.includes("disable") || lower.includes("active")) {
      return { text: `The parent extension **${extensionName}** is currently **${parentEnabled ? "active" : "inactive"}**.\n\n${parentEnabled ? "All enabled instances will execute when triggered." : "While the parent is inactive, no instances will run. Instance toggle positions are preserved for when you re-enable."}\n\nUse the toggle in the status bar above to change this.` };
    }
    return { text: "I can help you manage instances. Try asking me to:\n\n\u2022 Add a new instance\n\u2022 What are instances?\n\u2022 What are trigger rules?\n\u2022 Check unmapped variables\n\u2022 How do I duplicate an instance?" };
  }, [extensionName, instances, inputParams, outputParams, parentEnabled]);

  const handleInstancesAction = useCallback((action: { type: string; label: string; detail: string; id: string }, accepted: boolean) => {
    if (!accepted) return;
    if (action.type === "add-instance") {
      handleAddInstance();
    }
  }, [handleAddInstance]);

  // Condition editing handlers
  const handleAddCondition = (instId: string, groupIndex: number) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const groups = [...(inst.rule.conditionGroups || [])];
        if (!groups[groupIndex]) return inst;
        groups[groupIndex] = {
          ...groups[groupIndex],
          conditions: [...groups[groupIndex].conditions, { attribute: "", operator: "equals", value: "" }],
        };
        return { ...inst, rule: { ...inst.rule, conditionGroups: groups } };
      })
    );
  };

  const handleAddOrGroup = (instId: string) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const groups = [...(inst.rule.conditionGroups || [])];
        groups.push({ conditions: [{ attribute: "", operator: "equals", value: "" }] });
        return { ...inst, rule: { ...inst.rule, conditionGroups: groups } };
      })
    );
  };

  const handleUpdateCondition = (instId: string, groupIndex: number, condIndex: number, field: keyof RuleCondition, val: string) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const groups = [...(inst.rule.conditionGroups || [])];
        if (!groups[groupIndex]) return inst;
        const conditions = [...groups[groupIndex].conditions];
        conditions[condIndex] = { ...conditions[condIndex], [field]: val };
        if (field === "operator" && (val === "is set" || val === "is not set")) {
          conditions[condIndex].value = "";
        }
        groups[groupIndex] = { ...groups[groupIndex], conditions };
        return { ...inst, rule: { ...inst.rule, conditionGroups: groups } };
      })
    );
  };

  const handleRemoveCondition = (instId: string, groupIndex: number, condIndex: number) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const groups = [...(inst.rule.conditionGroups || [])];
        if (!groups[groupIndex]) return inst;
        const conditions = groups[groupIndex].conditions.filter((_, i) => i !== condIndex);
        if (conditions.length === 0) {
          // Remove the entire group if empty
          const newGroups = groups.filter((_, i) => i !== groupIndex);
          return { ...inst, rule: { ...inst.rule, conditionGroups: newGroups.length > 0 ? newGroups : undefined } };
        }
        groups[groupIndex] = { ...groups[groupIndex], conditions };
        return { ...inst, rule: { ...inst.rule, conditionGroups: groups } };
      })
    );
  };

  const renderConditionEditor = (inst: ExtensionInstance) => {
    const { rule } = inst;
    const groups = rule.conditionGroups || [];
    const lifecycle = isLifecycleTrigger(rule.trigger);
    const attrOptions = lifecycle
      ? (LIFECYCLE_CONDITION_ATTRIBUTES[rule.trigger!] || MOCK_VISIT_VISITOR_ATTRIBUTES)
      : [...MOCK_EVENT_ATTRIBUTES, ...MOCK_VISIT_VISITOR_ATTRIBUTES];

    return (
      <div className="inst-rule-conditions-editor">
        {groups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <div className="inst-rule-or-divider">OR</div>}
            <div className="inst-rule-condition-group-edit">
              {group.conditions.map((cond, ci) => (
                <div key={ci} className="inst-rule-condition-edit-row">
                  {ci > 0 && <span className="inst-rule-and-label">AND</span>}
                  <select
                    className="inst-rule-cond-select inst-rule-cond-attr"
                    value={cond.attribute}
                    onChange={(e) => handleUpdateCondition(inst.id, gi, ci, "attribute", e.target.value)}
                  >
                    <option value="">Select attribute…</option>
                    {attrOptions.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                  <select
                    className="inst-rule-cond-select inst-rule-cond-op"
                    value={cond.operator}
                    onChange={(e) => handleUpdateCondition(inst.id, gi, ci, "operator", e.target.value)}
                  >
                    {CONDITION_OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  {cond.operator !== "is set" && cond.operator !== "is not set" && (
                    <input
                      type="text"
                      className="inst-rule-cond-value"
                      placeholder="Value…"
                      value={cond.value}
                      onChange={(e) => handleUpdateCondition(inst.id, gi, ci, "value", e.target.value)}
                    />
                  )}
                  <button
                    type="button"
                    className="inst-rule-cond-remove"
                    onClick={() => handleRemoveCondition(inst.id, gi, ci)}
                    title="Remove condition"
                  >
                    <i className="fas fa-times" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="inst-rule-add-cond-btn"
                onClick={() => handleAddCondition(inst.id, gi)}
              >
                <i className="fas fa-plus" aria-hidden="true" /> Add condition
              </button>
            </div>
          </React.Fragment>
        ))}
        <button
          type="button"
          className="inst-rule-add-or-btn"
          onClick={() => handleAddOrGroup(inst.id)}
        >
          <i className="fas fa-plus" aria-hidden="true" /> Add OR group
        </button>
      </div>
    );
  };

  const renderRuleDisplay = (inst: ExtensionInstance) => {
    const { rule } = inst;
    const lifecycle = isLifecycleTrigger(rule.trigger);

    if (rule.type === "all") {
      return (
        <div className="inst-rule-summary inst-rule-summary-all">
          <i className="fas fa-globe" aria-hidden="true" />
          <span>All Events</span>
          <button
            type="button"
            className="inst-rule-change-btn"
            onClick={() => setRulePickerOpen(rulePickerOpen === inst.id ? null : inst.id)}
          >
            Change
          </button>
          {rulePickerOpen === inst.id && (
            <RulePicker
              onSelect={(r) => handleRuleChange(inst.id, r)}
              onClose={() => setRulePickerOpen(null)}
            />
          )}
        </div>
      );
    }

    return (
      <div className={`inst-rule-card ${lifecycle ? "inst-rule-card-lifecycle" : ""}`}>
        <div className="inst-rule-card-header">
          <i className={`${lifecycle ? getLifecycleIcon(rule.trigger) : "fas fa-filter"} inst-rule-card-icon`} aria-hidden="true" />
          <span className="inst-rule-card-name">{rule.name}</span>
          {lifecycle && (
            <span className="inst-rule-lifecycle-badge">Lifecycle</span>
          )}
          <div className="inst-rule-card-actions">
            <button
              type="button"
              className="inst-rule-card-btn"
              onClick={() => setRulePickerOpen(rulePickerOpen === inst.id ? null : inst.id)}
              title="Change rule"
            >
              <i className="fas fa-pen" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="inst-rule-card-btn inst-rule-card-btn-remove"
              onClick={() => handleRemoveRule(inst.id)}
              title="Reset to All Events"
            >
              <i className="fas fa-times" aria-hidden="true" />
            </button>
          </div>
          {rulePickerOpen === inst.id && (
            <RulePicker
              onSelect={(r) => handleRuleChange(inst.id, r)}
              onClose={() => setRulePickerOpen(null)}
            />
          )}
        </div>
        {/* Condition editor for all rule types */}
        {rule.conditionGroups && rule.conditionGroups.length > 0 && (
          <div className="inst-rule-conditions">
            {renderConditionEditor(inst)}
          </div>
        )}
        {/* Show "Add Condition" prompt when no conditions exist */}
        {(!rule.conditionGroups || rule.conditionGroups.length === 0) && (
          <div className="inst-rule-conditions inst-rule-conditions-empty">
            <button
              type="button"
              className="inst-rule-add-cond-btn"
              onClick={() => handleAddOrGroup(inst.id)}
            >
              <i className="fas fa-plus" aria-hidden="true" /> Add condition (optional)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="instances-page">
      {/* Breadcrumb */}
      <nav className="editor-breadcrumb">
        <button type="button" className="breadcrumb-link" onClick={() => navigate("/extensions")}>
          Extension Definitions
        </button>
        <span className="breadcrumb-separator">/</span>
        <button type="button" className="breadcrumb-link" onClick={() => navigate(`/modules/${id}`)}>
          {extensionName}
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Instances</span>
      </nav>

      <div className="instances-title-row">
        <h1 className="instances-title">Instances</h1>
        <Badge type="informative" label={`${instances.length} instance${instances.length !== 1 ? "s" : ""}`} />
        <button type="button" className="instances-overview-link" onClick={() => navigate("/instances")}>
          <i className="fas fa-list-ol" aria-hidden="true" />
          Instances and Order
        </button>
      </div>

      {/* Parent extension status bar */}
      <div className={`instances-parent-bar ${parentEnabled ? "instances-parent-bar-on" : "instances-parent-bar-off"}`}>
        <div className="instances-parent-left">
          <span className="instances-parent-name">{extensionName}</span>
        </div>
        <div className="instances-parent-right">
          {testRunning && (
            <span className="instances-parent-tests instances-parent-tests-running">
              <i className="fas fa-spinner fa-spin" aria-hidden="true" />
              Running tests…
            </span>
          )}
          {!testRunning && testResults && (
            <button
              type="button"
              className={`instances-parent-tests ${failedCount > 0 ? "instances-parent-tests-fail" : "instances-parent-tests-pass"}`}
              onClick={runTests}
              title="Click to re-run tests"
            >
              {failedCount > 0 ? (
                <i className="fas fa-times-circle" aria-hidden="true" />
              ) : (
                <i className="fas fa-check-circle" aria-hidden="true" />
              )}
              {failedCount > 0 ? `${failedCount} failed` : "Passed"}
              <span className="instances-parent-tests-count">{passedCount}/{totalCount}</span>
              <i className="fas fa-play instances-parent-tests-play" aria-hidden="true" />
            </button>
          )}
          <SimpleSwitch
            isStandAlone
            on={parentEnabled}
            onChange={handleParentToggle}
            inputProps={{ "aria-label": `Toggle extension ${extensionName}` }}
          />
        </div>
      </div>

      {!parentEnabled && (
        <div className="instances-inactive-notice">
          <i className="fas fa-info-circle" aria-hidden="true" />
          Extension is inactive. Instance toggles are preserved but will not execute until the extension is re-activated.
        </div>
      )}

      <p className="instances-description">
        Each instance maps real attributes to the extension's defined variables.
        The extension code references variables generically — instances provide the concrete attribute bindings.
      </p>


      {/* Instance cards */}
      <div className="instances-list">
        {instances.map((inst, idx) => {
          const isExpanded = expandedInstances.has(inst.id);
          const currentMode: MappingMode = inst.mappingMode || "specific";
          const unmappedInputs = currentMode === "specific" ? inst.inputMappings.filter((m) => !m.mappedAttribute).length : 0;
          const unmappedOutputs = currentMode === "specific" ? inst.outputMappings.filter((m) => !m.mappedAttribute).length : 0;
          const hasUnmapped = unmappedInputs + unmappedOutputs > 0;
          const bulkFilter = currentMode === "bulk" ? inst.inputMappings[0]?.bulkFilter : null;
          const matchedAttrs = bulkFilter ? getMatchedAttributes(bulkFilter) : [];
          const isListExpanded = bulkListExpanded.has(inst.id);

          return (
            <div
              key={inst.id}
              className={`inst-card ${!inst.enabled ? "inst-card-disabled" : ""} ${!parentEnabled ? "inst-card-parent-off" : ""} ${hasUnmapped && inst.enabled ? "inst-card-warn" : ""}`}
            >
              <div
                className="inst-card-header"
                onClick={() => toggleExpanded(inst.id)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <i className={`fas fa-chevron-${isExpanded ? "down" : "right"} inst-chevron`} aria-hidden="true" />
                <span className="inst-order">#{idx + 1}</span>
                <span className="inst-name">{inst.name}</span>
                {isMultiScope && inst.timing && (
                  <span className="inst-timing-chip">
                    <i className="fas fa-clock" aria-hidden="true" />
                    {allowedPositions.find((p) => p.id === inst.timing)?.label || inst.timing}
                  </span>
                )}
                {currentMode === "bulk" && (
                  <span className="inst-bulk-chip">
                    <i className="fas fa-cubes" aria-hidden="true" />
                    Bulk
                  </span>
                )}
                {currentMode === "single-attribute" && (
                  <span className="inst-single-attr-chip">
                    <i className="fas fa-list" aria-hidden="true" />
                    {(inst.attributeList?.length || 0)} attr{(inst.attributeList?.length || 0) !== 1 ? "s" : ""}
                  </span>
                )}
                {inst.rule.type !== "all" && (
                  <span className={`inst-rule-chip ${isLifecycleTrigger(inst.rule.trigger) ? "inst-rule-chip-lifecycle" : ""}`}>
                    <i className={isLifecycleTrigger(inst.rule.trigger) ? getLifecycleIcon(inst.rule.trigger) : "fas fa-filter"} aria-hidden="true" />
                    {inst.rule.name}
                  </span>
                )}
                {hasUnmapped && inst.enabled && (
                  <SimpleTooltip title={`${unmappedInputs + unmappedOutputs} unmapped variable${unmappedInputs + unmappedOutputs > 1 ? "s" : ""}`}>
                    <span className="inst-warn-badge">
                      <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                    </span>
                  </SimpleTooltip>
                )}
                <div className="inst-header-actions" onClick={(e) => e.stopPropagation()}>
                  <div className={!parentEnabled ? "inst-switch-disabled" : ""}>
                    <SimpleSwitch
                      isStandAlone
                      on={inst.enabled}
                      onChange={(val) => parentEnabled && handleToggleInstance(inst.id, val)}
                      inputProps={{
                        "aria-label": `Toggle instance ${inst.name}`,
                        disabled: !parentEnabled,
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="inst-action-btn"
                    onClick={() => handleDuplicateInstance(inst.id)}
                    title="Duplicate instance"
                  >
                    <i className="fas fa-copy" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="inst-action-btn inst-delete-btn"
                    onClick={() => handleDeleteInstance(inst.id)}
                    title="Delete instance"
                  >
                    <i className="fas fa-trash" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="inst-card-body">
                  <div className="inst-field">
                    <label className="inst-field-label">Instance Name</label>
                    <Textbox
                      value={inst.name}
                      onChange={(val: string) => handleInstanceNameChange(inst.id, val)}
                      placeholder="e.g., Score from page views"
                      isFullWidth
                    />
                  </div>

                  {/* Timing selector (multi-scope extensions only) */}
                  {isMultiScope && (
                    <div className="inst-field">
                      <label className="inst-field-label">
                        <i className="fas fa-clock" aria-hidden="true" /> Execution Timing
                      </label>
                      <div className="inst-timing-selector">
                        {allowedPositions.map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            className={`inst-timing-btn ${inst.timing === pos.id ? "inst-timing-btn-active" : ""}`}
                            onClick={() => handleInstanceTimingChange(inst.id, pos.id)}
                          >
                            {inst.timing === pos.id && <i className="fas fa-check" aria-hidden="true" />}
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mapping mode selector — only for bulk extensions (which have 2 options) */}
                  {isBulkExtension && (
                    <div className="inst-field">
                      <label className="inst-field-label">
                        <i className="fas fa-exchange-alt" aria-hidden="true" /> Attribute Mapping
                      </label>
                      <div className="inst-mapping-mode-radios">
                        {([
                          { id: "bulk" as MappingMode, label: "Process all attributes of type", icon: "fas fa-cubes", desc: "Pick type(s) and scope. Add exclusions if needed." },
                          { id: "single-attribute" as MappingMode, label: "Attribute list", icon: "fas fa-list", desc: "Provide a list of attributes to apply the extension to." },
                        ]).map((opt) => (
                          <label
                            key={opt.id}
                            className={`inst-mapping-mode-radio ${currentMode === opt.id ? "inst-mapping-mode-radio-active" : ""}`}
                          >
                            <input
                              type="radio"
                              name={`mapping-mode-${inst.id}`}
                              value={opt.id}
                              checked={currentMode === opt.id}
                              onChange={() => handleMappingModeChange(inst.id, opt.id)}
                              className="inst-mapping-mode-input"
                            />
                            <span className="inst-mapping-mode-dot" />
                            <div className="inst-mapping-mode-text">
                              <span className="inst-mapping-mode-label">
                                <i className={opt.icon} aria-hidden="true" />
                                {opt.label}
                              </span>
                              <span className="inst-mapping-mode-desc">{opt.desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bulk mode panel */}
                  {currentMode === "bulk" && bulkFilter && (
                    <div className="inst-bulk-panel">
                      <div className="inst-bulk-section">
                        <label className="inst-field-label">
                          <i className="fas fa-tags" aria-hidden="true" /> Types & Scopes
                          <span className="inst-field-hint">Select types per scope. Types are shown at each scope level where they are available.</span>
                        </label>
                        <div className="inst-scope-rows">
                          {INSTANCE_SCOPE_TYPES.map((row) => {
                            const scopeActive = !bulkFilter.scopes || bulkFilter.scopes.length === 0 || bulkFilter.scopes.includes(row.scopeKey);
                            return (
                              <div key={row.scope} className={`inst-scope-row ${!scopeActive ? "inst-scope-row-off" : ""}`}>
                                <button
                                  type="button"
                                  className={`inst-scope-row-label ${scopeActive ? "inst-scope-row-label-active" : ""}`}
                                  onClick={() => handleBulkScopeToggle(inst.id, row.scopeKey)}
                                >
                                  <i className={row.icon} aria-hidden="true" />
                                  {row.scope}
                                </button>
                                <div className="inst-scope-row-chips">
                                  {row.types.map((t) => {
                                    const selected = bulkFilter.types.includes(t);
                                    return (
                                      <button
                                        key={t}
                                        type="button"
                                        className={`inst-type-chip ${selected ? "inst-type-chip-selected" : ""}`}
                                        onClick={() => handleBulkTypeToggle(inst.id, t)}
                                      >
                                        {selected ? <i className="fas fa-check" aria-hidden="true" /> : TYPE_ICONS[t] ? <i className={TYPE_ICONS[t]} aria-hidden="true" style={{ opacity: 0.5 }} /> : null}
                                        {t}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="inst-bulk-section">
                        <div className="inst-bulk-matches">
                          <span className="inst-bulk-matches-label">
                            Matches: <strong>{matchedAttrs.length}</strong> attribute{matchedAttrs.length !== 1 ? "s" : ""}
                          </span>
                          <button
                            type="button"
                            className="inst-bulk-view-btn"
                            onClick={() => setBulkListExpanded((prev) => {
                              const next = new Set(prev);
                              if (next.has(inst.id)) next.delete(inst.id);
                              else next.add(inst.id);
                              return next;
                            })}
                          >
                            {isListExpanded ? "Hide list" : "View list"}
                          </button>
                        </div>
                        {isListExpanded && (
                          <div className="inst-bulk-attr-list">
                            {matchedAttrs.map((a) => (
                              <span key={a} className="inst-bulk-attr-item">{a}</span>
                            ))}
                            {matchedAttrs.length === 0 && (
                              <span className="inst-bulk-attr-empty">No attributes match the current filter.</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="inst-bulk-section">
                        <label className="inst-field-label">
                          <i className="fas fa-ban" aria-hidden="true" /> Excluded attributes
                        </label>
                        <div className="inst-bulk-exclusions">
                          {(bulkFilter.excludeAttributes || []).map((attr) => (
                            <span key={attr} className="inst-exclusion-tag">
                              {attr}
                              <button
                                type="button"
                                className="inst-exclusion-remove"
                                onClick={() => handleRemoveExclusion(inst.id, attr)}
                                aria-label={`Remove exclusion ${attr}`}
                              >
                                <i className="fas fa-times" aria-hidden="true" />
                              </button>
                            </span>
                          ))}
                          <div className="inst-exclusion-add">
                            <input
                              type="text"
                              className="inst-exclusion-input"
                              placeholder="Attribute name..."
                              value={excludeInput}
                              onChange={(e) => setExcludeInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddExclusion(inst.id, excludeInput);
                              }}
                            />
                            <button
                              type="button"
                              className="inst-exclusion-add-btn"
                              onClick={() => handleAddExclusion(inst.id, excludeInput)}
                            >
                              <i className="fas fa-plus" aria-hidden="true" /> Add
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="inst-bulk-section">
                        <label className="inst-field-label">
                          <i className="fas fa-exchange-alt" aria-hidden="true" /> Variable mapping (per attribute)
                        </label>
                        <div className="inst-bulk-var-map">
                          {inputParams.map((p) => (
                            <div key={`in-${p.variableName}`} className="inst-bulk-var-row">
                              <span className="inst-bulk-var-direction">input</span>
                              <code>{p.variableName}</code>
                              <i className="fas fa-arrow-left inst-mapping-arrow" aria-hidden="true" />
                              <span className="inst-bulk-var-target">each matched attribute</span>
                            </div>
                          ))}
                          {outputParams.map((p) => (
                            <div key={`out-${p.variableName}`} className="inst-bulk-var-row">
                              <span className="inst-bulk-var-direction inst-bulk-var-direction-out">output</span>
                              <code>{p.variableName}</code>
                              <i className="fas fa-arrow-right inst-mapping-arrow" aria-hidden="true" />
                              <span className="inst-bulk-var-target">same attribute (in-place)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Single-attribute mode panel */}
                  {currentMode === "single-attribute" && (
                    <div className="inst-single-attr-panel">
                      <p className="inst-single-attr-hint">
                        The extension will run once per attribute listed below, binding it to both the input and output variable.
                      </p>
                      <div className="inst-single-attr-list">
                        {(inst.attributeList || []).map((attr) => (
                          <span key={attr} className="inst-single-attr-tag">
                            <code>{attr}</code>
                            <button
                              type="button"
                              className="inst-single-attr-remove"
                              onClick={() => handleRemoveAttribute(inst.id, attr)}
                              aria-label={`Remove ${attr}`}
                            >
                              <i className="fas fa-times" aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="inst-single-attr-add">
                        <Select
                          options={availableAttributes.filter((a) => !(inst.attributeList || []).includes(a.value))}
                          value={null}
                          onChange={(val: any) => {
                            if (val?.value) handleAddAttribute(inst.id, val.value);
                          }}
                          placeholder="Add attribute..."
                          isFullWidth
                        />
                      </div>
                      {(inst.attributeList || []).length === 0 && (
                        <p className="inst-single-attr-empty">No attributes added yet. Use the dropdown above to add attributes.</p>
                      )}
                    </div>
                  )}

                  {/* Specific attribute mapping */}
                  {currentMode === "specific" && (
                    <>
                      <div className="inst-field">
                        <label className="inst-field-label">
                          <i className="fas fa-sign-in-alt" aria-hidden="true" /> Input Mappings
                        </label>
                        <div className="inst-mapping-list">
                          {inst.inputMappings.map((mapping) => {
                            const paramDef = inputParams.find((p) => p.variableName === mapping.variableName);
                            return (
                              <div key={mapping.variableName} className="inst-mapping-row">
                                <div className="inst-mapping-var">
                                  <code>{mapping.variableName}</code>
                                  {paramDef?.description && <span className="inst-mapping-desc">{paramDef.description}</span>}
                                </div>
                                <i className="fas fa-arrow-left inst-mapping-arrow" aria-hidden="true" />
                                <div className="inst-mapping-attr">
                                  {paramDef && TYPE_ICONS[paramDef.type] && <span className="inst-mapping-type-icon" style={{ background: TYPE_COLORS[paramDef.type] }}><i className={TYPE_ICONS[paramDef.type]} aria-hidden="true" /></span>}
                                  <Select
                                    options={availableAttributes}
                                    value={
                                      mapping.mappedAttribute
                                        ? { label: mapping.mappedAttribute, value: mapping.mappedAttribute }
                                        : null
                                    }
                                    onChange={(val: any) => handleInputMappingChange(inst.id, mapping.variableName, val)}
                                    placeholder="Select attribute..."
                                    isFullWidth
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="inst-field">
                        <label className="inst-field-label">
                          <i className="fas fa-sign-out-alt" aria-hidden="true" /> Output Mappings
                        </label>
                        <div className="inst-mapping-list">
                          {inst.outputMappings.map((mapping) => {
                            const paramDef = outputParams.find((p) => p.variableName === mapping.variableName);
                            return (
                              <div key={mapping.variableName} className="inst-mapping-row">
                                <div className="inst-mapping-var">
                                  <code>{mapping.variableName}</code>
                                  {paramDef?.description && <span className="inst-mapping-desc">{paramDef.description}</span>}
                                </div>
                                <i className="fas fa-arrow-right inst-mapping-arrow" aria-hidden="true" />
                                <div className="inst-mapping-attr">
                                  {paramDef && TYPE_ICONS[paramDef.type] && <span className="inst-mapping-type-icon" style={{ background: TYPE_COLORS[paramDef.type] }}><i className={TYPE_ICONS[paramDef.type]} aria-hidden="true" /></span>}
                                  <Select
                                    options={availableAttributes}
                                    value={
                                      mapping.mappedAttribute
                                        ? { label: mapping.mappedAttribute, value: mapping.mappedAttribute }
                                        : null
                                    }
                                    onChange={(val: any) => handleOutputMappingChange(inst.id, mapping.variableName, val)}
                                    placeholder="Select attribute..."
                                    isFullWidth
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Trigger Rule */}
                  <div className="inst-field">
                    <label className="inst-field-label">
                      <i className="fas fa-filter" aria-hidden="true" /> Trigger Rule
                    </label>
                    {renderRuleDisplay(inst)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="instances-toolbar">
        <Button type="border" onClick={handleAddInstance}>
          <i className="fas fa-plus" aria-hidden="true" />
          <span>Add Instance</span>
        </Button>
      </div>

      {/* Action Bar */}
      <div className="instances-action-bar">
        <Button type="primary" onClick={() => navigate(`/modules/${id}`)}>
          Save
        </Button>
        <Button type="secondary" onClick={() => navigate(`/modules/${id}`)}>
          Cancel
        </Button>
      </div>


      {/* Confirm enable with failed tests dialog */}
      {showConfirmDialog && (
        <div className="scope-change-overlay" onClick={cancelEnable}>
          <div className="scope-change-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="scope-change-header">
              <i className="fas fa-exclamation-triangle scope-change-warn-icon" aria-hidden="true" />
              <h3 className="scope-change-title">Enable with failing tests?</h3>
            </div>
            <p className="scope-change-description">
              <strong>{failedCount}</strong> of {totalCount} tests failed for <strong>{extensionName}</strong>. Are you sure you want to enable this extension?
            </p>
            <div className="instances-confirm-results">
              {testResults?.filter((t) => t.status === "fail").map((t, i) => (
                <div key={i} className="instances-confirm-fail-item">
                  <i className="fas fa-times-circle" aria-hidden="true" />
                  <span>{t.name}</span>
                  {t.error && <span className="instances-confirm-fail-error">{t.error}</span>}
                </div>
              ))}
            </div>
            <div className="scope-change-actions">
              <Button type="border" onClick={cancelEnable}>Cancel</Button>
              <Button type="destructive" onClick={confirmEnable}>Enable Anyway</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
