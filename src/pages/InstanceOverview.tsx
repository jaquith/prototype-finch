import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMvpMode } from "../contexts/MvpContext";
import Button from "../components/SimpleButton";
import Badge from "../components/SimpleBadge";
import SimpleSwitch from "../components/SimpleSwitch";
import SimpleTooltip from "../components/SimpleTooltip";
import Select from "../components/SimpleSelect";
import Textbox from "../components/SimpleTextbox";
import { TYPE_ICONS, TYPE_COLORS } from "../constants/typeIcons";
import "./InstanceOverview.css";

// ─── Shared Types ────────────────────────────────────────────────

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
  trigger?: "event" | "new-visitor" | "new-visit" | "visit-ended";
  conditionGroups?: RuleConditionGroup[];
}

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

// ─── Extension Metadata ─────────────────────────────────────────

interface ExtensionMeta {
  id: string;
  name: string;
  params: ParamDef[];
  isBulk: boolean;
  enabled: boolean;
  allowedPositions: { id: string; label: string }[];
}

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

const PARAMS_TALLY: ParamDef[] = [
  { variableName: "timeline", type: "Timeline", direction: "input", description: "Historical tally entries with timestamps" },
  { variableName: "visitTally", type: "Tally", direction: "input", description: "Current visit category counts" },
  { variableName: "windowDays", type: "Static Number", direction: "input", description: "Rolling window size in days" },
  { variableName: "masterTally", type: "Tally", direction: "output", description: "Aggregated category counts across the window" },
];

const EXTENSIONS: ExtensionMeta[] = [
  { id: "1", name: "Normalize Page URLs", params: PARAMS_NORMALIZE, isBulk: true, enabled: true, allowedPositions: [{ id: "preEvent", label: "Pre-Event" }, { id: "postEvent", label: "Post-Event" }] },
  { id: "2", name: "Compute Engagement Score", params: PARAMS_ENGAGEMENT, isBulk: false, enabled: true, allowedPositions: [{ id: "postVisitor", label: "Post-Visitor" }, { id: "postAudience", label: "Post-Audience" }] },
  { id: "8", name: "Recency Frequency Scorer", params: PARAMS_RECENCY, isBulk: false, enabled: true, allowedPositions: [{ id: "postVisitor", label: "Post-Visitor" }] },
  { id: "10", name: "Tally Over Time", params: PARAMS_TALLY, isBulk: false, enabled: true, allowedPositions: [{ id: "postVisitor", label: "Post-Visitor" }] },
  { id: "11", name: "Lowercase String", params: PARAMS_NORMALIZE_STRINGS, isBulk: true, enabled: true, allowedPositions: [{ id: "preEvent", label: "Pre-Event" }, { id: "postEvent", label: "Post-Event" }, { id: "preVisitor", label: "Pre-Visitor" }, { id: "postVisitor", label: "Post-Visitor" }, { id: "postAudience", label: "Post-Audience" }] },
];

// ─── Attributes ──────────────────────────────────────────────────

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

const availableAttributes = [
  ...MOCK_EVENT_ATTRIBUTES,
  ...MOCK_VISIT_VISITOR_ATTRIBUTES,
  ...MOCK_AUDIENCE_ATTRIBUTES,
];

// ─── Typed attributes for bulk mode ───────────────────────

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
  { name: "product_category_tally_30_days", type: "Tally", scope: "visitor" },
  { name: "product_category_tally_60_days", type: "Tally", scope: "visitor" },
  { name: "product_category_timeline", type: "Timeline", scope: "visitor" },
  { name: "visit_product_categories", type: "Tally", scope: "visit" },
  { name: "visitor_id", type: "String", scope: "visitor" },
  { name: "account_hash", type: "String", scope: "visitor" },
  { name: "email_hash", type: "String", scope: "visitor" },
  { name: "last_purchase_date", type: "String", scope: "visitor" },
];

const AVAILABLE_TYPES = ["String", "Number", "Boolean", "Tally", "Timeline", "Set of Strings", "Date"];

const INSTANCE_SCOPE_TYPES: { scope: string; scopeKey: "event" | "visit" | "visitor"; icon: string; types: string[] }[] = [
  { scope: "Event", scopeKey: "event", icon: "fas fa-bolt", types: ["String", "Number", "Boolean", "Date"] },
  { scope: "Visit", scopeKey: "visit", icon: "fas fa-window-maximize", types: ["String", "Number", "Boolean", "Date", "Tally", "Set of Strings", "Timeline"] },
  { scope: "Visitor", scopeKey: "visitor", icon: "fas fa-user", types: ["String", "Number", "Boolean", "Date", "Tally", "Set of Strings", "Timeline"] },
];

function getAllowedScopes(timing: string): ("event" | "visit" | "visitor")[] {
  if (timing === "preEvent" || timing === "postEvent") return ["event"];
  return ["visit", "visitor"];
}

const STATIC_TYPES = new Set(["Static String", "Static Number", "Static Object"]);

function getExtensionBulkTypes(extensionId: string): Set<string> {
  const ext = EXTENSIONS.find((e) => e.id === extensionId);
  if (!ext) return new Set(AVAILABLE_TYPES);
  const types = new Set<string>();
  ext.params.forEach((p) => { if (!STATIC_TYPES.has(p.type)) types.add(p.type); });
  return types;
}

function getMatchedAttributes(filter: BulkFilter): string[] {
  return TYPED_ATTRIBUTES.filter((attr) => {
    if (!filter.types.includes(attr.type)) return false;
    if (filter.scopes && filter.scopes.length > 0 && !filter.scopes.includes(attr.scope)) return false;
    if (filter.excludeAttributes?.includes(attr.name)) return false;
    return true;
  }).map((a) => a.name);
}

// ─── Trigger Rules ───────────────────────────────────────────────

const DEFAULT_RULE: TriggerRule = { id: "all", name: "All Events", type: "all", trigger: "event" };

const PREDEFINED_RULES: TriggerRule[] = [
  { id: "all", name: "All Events", type: "all", trigger: "event" },
  { id: "page-view", name: "Page View Events", type: "predefined", trigger: "event", conditionGroups: [{ conditions: [{ attribute: "tealium_event", operator: "equals", value: "page_view" }] }] },
  { id: "purchase", name: "Purchase Events", type: "predefined", trigger: "event", conditionGroups: [{ conditions: [{ attribute: "tealium_event", operator: "equals", value: "purchase" }] }] },
  { id: "cart-add", name: "Add to Cart Events", type: "predefined", trigger: "event", conditionGroups: [{ conditions: [{ attribute: "tealium_event", operator: "equals", value: "cart_add" }] }] },
  { id: "search", name: "Search Events", type: "predefined", trigger: "event", conditionGroups: [{ conditions: [{ attribute: "tealium_event", operator: "equals", value: "search" }] }] },
  { id: "has-order", name: "Events with Order Total", type: "predefined", trigger: "event", conditionGroups: [{ conditions: [{ attribute: "order_total", operator: "is set", value: "" }] }] },
  { id: "high-value", name: "High-Value Visitors", type: "predefined", trigger: "event", conditionGroups: [{ conditions: [{ attribute: "lifetime_value", operator: "greater than", value: "500" }] }] },
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

// ─── Unified Instance Model ─────────────────────────────────────

interface OverviewInstance {
  id: string;
  name: string;
  extensionId: string;
  extensionName: string;
  timing: string;
  timingLabel: string;
  enabled: boolean;
  extensionEnabled: boolean;
  order: number;
  rule: TriggerRule;
  inputMappings: InstanceMapping[];
  outputMappings: InstanceMapping[];
  mappingMode?: MappingMode;
  attributeList?: string[];
  bulkMode?: boolean;
}

// ─── Timing constants ────────────────────────────────────────────

const TIMING_ORDER: Record<string, number> = {
  preEvent: 0, postEvent: 1, preVisitor: 2, postVisitor: 3, postAudience: 4,
};

const TIMING_LABELS: Record<string, string> = {
  preEvent: "Pre-Event", postEvent: "Post-Event", preVisitor: "Pre-Visitor",
  postVisitor: "Post-Visitor", postAudience: "Post-Audience",
};

const TIMING_PHASE: Record<string, string> = {
  preEvent: "Event", postEvent: "Event", preVisitor: "Visit / Visitor",
  postVisitor: "Visit / Visitor", postAudience: "Visit / Visitor",
};

// ─── Mock instances (unified) ────────────────────────────────────

const INITIAL_INSTANCES: OverviewInstance[] = [
  // Normalize Page URLs - preEvent
  {
    id: "1-inst1", name: "Normalize page_url", extensionId: "1", extensionName: "Normalize Page URLs",
    timing: "preEvent", timingLabel: "Pre-Event", enabled: true, extensionEnabled: true, order: 1,
    rule: { ...DEFAULT_RULE },
    mappingMode: "bulk", bulkMode: true,
    inputMappings: [{
      variableName: "value", mappedAttribute: "",
      bulkFilter: { types: ["String"], scopes: ["event"], excludeAttributes: ["tealium_event"] },
    }],
    outputMappings: [{
      variableName: "value", mappedAttribute: "",
      bulkFilter: { types: ["String"], scopes: ["event"], excludeAttributes: ["tealium_event"] },
    }],
  },
  {
    id: "1-inst2", name: "Normalize page_title URL", extensionId: "1", extensionName: "Normalize Page URLs",
    timing: "preEvent", timingLabel: "Pre-Event", enabled: true, extensionEnabled: true, order: 2,
    rule: { ...DEFAULT_RULE },
    mappingMode: "bulk", bulkMode: true,
    inputMappings: [{
      variableName: "value", mappedAttribute: "",
      bulkFilter: { types: ["String"], scopes: ["event"], excludeAttributes: ["tealium_event"] },
    }],
    outputMappings: [{
      variableName: "value", mappedAttribute: "",
      bulkFilter: { types: ["String"], scopes: ["event"], excludeAttributes: ["tealium_event"] },
    }],
  },
  // Lowercase String - preEvent
  {
    id: "11-inst2", name: "Lowercase event strings (pre-enrichments)", extensionId: "11", extensionName: "Lowercase String",
    timing: "preEvent", timingLabel: "Pre-Event", enabled: true, extensionEnabled: true, order: 3,
    rule: { ...DEFAULT_RULE },
    mappingMode: "bulk", bulkMode: true,
    inputMappings: [{
      variableName: "value", mappedAttribute: "",
      bulkFilter: { types: ["String"], scopes: ["event"], excludeAttributes: ["visitor_id", "account_hash", "email_hash"] },
    }],
    outputMappings: [{
      variableName: "value", mappedAttribute: "",
      bulkFilter: { types: ["String"], scopes: ["event"], excludeAttributes: ["visitor_id", "account_hash", "email_hash"] },
    }],
  },
  // Lowercase String - postEvent
  {
    id: "11-inst1", name: "Lowercase event strings (post-enrichments)", extensionId: "11", extensionName: "Lowercase String",
    timing: "postEvent", timingLabel: "Post-Event", enabled: true, extensionEnabled: true, order: 1,
    rule: { ...DEFAULT_RULE },
    mappingMode: "bulk", bulkMode: true,
    inputMappings: [{
      variableName: "value", mappedAttribute: "",
      bulkFilter: { types: ["String"], scopes: ["event"], excludeAttributes: ["tealium_event"] },
    }],
    outputMappings: [{
      variableName: "value", mappedAttribute: "",
      bulkFilter: { types: ["String"], scopes: ["event"], excludeAttributes: ["tealium_event"] },
    }],
  },
  // Engagement - postVisitor
  {
    id: "2-inst1", name: "Engagement score from page views", extensionId: "2", extensionName: "Compute Engagement Score",
    timing: "postVisitor", timingLabel: "Post-Visitor", enabled: true, extensionEnabled: true, order: 1,
    rule: { ...PREDEFINED_RULES[1] },
    inputMappings: [
      { variableName: "viewCount", mappedAttribute: "page_view_count" },
      { variableName: "purchaseCount", mappedAttribute: "purchase_count" },
    ],
    outputMappings: [{ variableName: "score", mappedAttribute: "engagement_score" }],
  },
  {
    id: "2-inst2", name: "Score from lifetime value", extensionId: "2", extensionName: "Compute Engagement Score",
    timing: "postVisitor", timingLabel: "Post-Visitor", enabled: true, extensionEnabled: true, order: 2,
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      { variableName: "viewCount", mappedAttribute: "lifetime_value" },
      { variableName: "purchaseCount", mappedAttribute: "purchase_count" },
    ],
    outputMappings: [{ variableName: "score", mappedAttribute: "loyalty_tier" }],
  },
  // Tally Over Time - postVisitor
  {
    id: "10-inst1", name: "Product category tally (30 days)", extensionId: "10", extensionName: "Tally Over Time",
    timing: "postVisitor", timingLabel: "Post-Visitor", enabled: true, extensionEnabled: true, order: 4,
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      { variableName: "timeline", mappedAttribute: "product_category_timeline" },
      { variableName: "visitTally", mappedAttribute: "visit_product_categories" },
      { variableName: "windowDays", mappedAttribute: "30" },
    ],
    outputMappings: [{ variableName: "masterTally", mappedAttribute: "product_category_tally_30_days" }],
  },
  {
    id: "10-inst2", name: "Product category tally (60 days)", extensionId: "10", extensionName: "Tally Over Time",
    timing: "postVisitor", timingLabel: "Post-Visitor", enabled: true, extensionEnabled: true, order: 5,
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      { variableName: "timeline", mappedAttribute: "product_category_timeline" },
      { variableName: "visitTally", mappedAttribute: "visit_product_categories" },
      { variableName: "windowDays", mappedAttribute: "60" },
    ],
    outputMappings: [{ variableName: "masterTally", mappedAttribute: "product_category_tally_60_days" }],
  },
  // Recency - postVisitor
  {
    id: "8-inst1", name: "Purchase recency (7 days)", extensionId: "8", extensionName: "Recency Frequency Scorer",
    timing: "postVisitor", timingLabel: "Post-Visitor", enabled: true, extensionEnabled: true, order: 6,
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      { variableName: "lastDate", mappedAttribute: "last_purchase_date" },
      { variableName: "count", mappedAttribute: "purchase_count" },
      { variableName: "windowDays", mappedAttribute: "7" },
      { variableName: "categoryName", mappedAttribute: "Purchases" },
    ],
    outputMappings: [{ variableName: "rfScore", mappedAttribute: "purchase_recency_score_7d" }],
  },
  {
    id: "8-inst2", name: "Purchase recency (30 days)", extensionId: "8", extensionName: "Recency Frequency Scorer",
    timing: "postVisitor", timingLabel: "Post-Visitor", enabled: true, extensionEnabled: true, order: 7,
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      { variableName: "lastDate", mappedAttribute: "last_purchase_date" },
      { variableName: "count", mappedAttribute: "purchase_count" },
      { variableName: "windowDays", mappedAttribute: "30" },
      { variableName: "categoryName", mappedAttribute: "Purchases" },
    ],
    outputMappings: [{ variableName: "rfScore", mappedAttribute: "purchase_recency_score_30d" }],
  },
  {
    id: "8-inst3", name: "Purchase recency (60 days)", extensionId: "8", extensionName: "Recency Frequency Scorer",
    timing: "postVisitor", timingLabel: "Post-Visitor", enabled: true, extensionEnabled: true, order: 8,
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      { variableName: "lastDate", mappedAttribute: "last_purchase_date" },
      { variableName: "count", mappedAttribute: "purchase_count" },
      { variableName: "windowDays", mappedAttribute: "60" },
      { variableName: "categoryName", mappedAttribute: "Purchases" },
    ],
    outputMappings: [{ variableName: "rfScore", mappedAttribute: "purchase_recency_score_60d" }],
  },
  {
    id: "8-inst4", name: "Purchase recency (90 days)", extensionId: "8", extensionName: "Recency Frequency Scorer",
    timing: "postVisitor", timingLabel: "Post-Visitor", enabled: true, extensionEnabled: true, order: 9,
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      { variableName: "lastDate", mappedAttribute: "last_purchase_date" },
      { variableName: "count", mappedAttribute: "purchase_count" },
      { variableName: "windowDays", mappedAttribute: "90" },
      { variableName: "categoryName", mappedAttribute: "Purchases" },
    ],
    outputMappings: [{ variableName: "rfScore", mappedAttribute: "purchase_recency_score_90d" }],
  },
  // Engagement - postAudience
  {
    id: "2-instA", name: "High value recent customers", extensionId: "2", extensionName: "Compute Engagement Score",
    timing: "postAudience", timingLabel: "Post-Audience", enabled: true, extensionEnabled: true, order: 1,
    rule: { ...DEFAULT_RULE },
    inputMappings: [
      { variableName: "viewCount", mappedAttribute: "page_view_count" },
      { variableName: "purchaseCount", mappedAttribute: "purchase_count" },
    ],
    outputMappings: [{ variableName: "score", mappedAttribute: "high_value_score" }],
  },
];

// 24-hour error counts per instance (matches ERRORS in ExtensionsOverview)
const INSTANCE_EXECUTIONS_24H: Record<string, number> = {
  "2-inst1": 30720, "2-inst2": 30720,
};

const INSTANCE_ERRORS: Record<string, { count: number; message: string; recentInputs: string }> = {
  "2-inst1": { count: 1247, message: "Output 'score' expected number but got NaN", recentInputs: "Recent inputs:\n• viewCount=undefined, purchaseCount=3 (2 min ago)\n• viewCount=undefined, purchaseCount=0 (4 min ago)\n• viewCount=null, purchaseCount=12 (11 min ago)\n• viewCount=undefined, purchaseCount=1 (18 min ago)\n• viewCount=\"\", purchaseCount=7 (23 min ago)" },
};

// ─── Rule Picker Component ──────────────────────────────────────

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
    if (isLifecycleTrigger(rule.trigger)) return <i className={`${getLifecycleIcon(rule.trigger)} rule-picker-item-icon`} aria-hidden="true" />;
    if (rule.type === "all") return <i className="fas fa-globe rule-picker-item-icon" aria-hidden="true" />;
    return <i className="fas fa-filter rule-picker-item-icon" aria-hidden="true" />;
  };

  return (
    <div className="rule-picker" ref={ref}>
      <div className="rule-picker-search">
        <i className="fas fa-search" aria-hidden="true" />
        <input type="text" className="rule-picker-input" placeholder="Search…" value={search}
          onChange={(e) => setSearch(e.target.value)} autoFocus />
      </div>
      <div className="rule-picker-list">
        {eventRules.length > 0 && (
          <>
            <div className="rule-picker-section-header"><i className="fas fa-bolt" aria-hidden="true" /> Event Triggers</div>
            {eventRules.map((rule) => (
              <button key={rule.id} type="button" className="rule-picker-item"
                onClick={() => { onSelect(rule); onClose(); }}>
                {renderRuleIcon(rule)}{rule.name}
              </button>
            ))}
          </>
        )}
        {lifecycleRules.length > 0 && (
          <>
            <div className="rule-picker-section-header"><i className="fas fa-sync-alt" aria-hidden="true" /> Lifecycle Triggers</div>
            {lifecycleRules.map((rule) => (
              <button key={rule.id} type="button" className="rule-picker-item"
                onClick={() => { onSelect(rule); onClose(); }}>
                {renderRuleIcon(rule)}{rule.name}
              </button>
            ))}
          </>
        )}
        {filtered.length === 0 && <div className="rule-picker-empty">No matching rules</div>}
      </div>
    </div>
  );
}

// ─── Extension Picker Component ─────────────────────────────────

function ExtensionPicker({ onSelect, onClose, hideBulk }: { onSelect: (ext: ExtensionMeta) => void; onClose: () => void; hideBulk?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const visibleExtensions = hideBulk ? EXTENSIONS.filter((e) => !e.isBulk) : EXTENSIONS;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="ov-ext-picker" ref={ref}>
      <div className="ov-ext-picker-header">Select Extension</div>
      {visibleExtensions.map((ext) => (
        <button key={ext.id} type="button" className="ov-ext-picker-item"
          onClick={() => { onSelect(ext); onClose(); }}>
          <span className="ov-ext-picker-name">{ext.name}</span>
          {ext.isBulk && <span className="ov-ext-picker-badge">Bulk</span>}
          <span className="ov-ext-picker-positions">{ext.allowedPositions.map(p => p.label).join(", ")}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export default function InstanceOverview() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isMvp } = useMvpMode();
  const [instances, setInstances] = useState(INITIAL_INSTANCES);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filterExtensions, setFilterExtensions] = useState<Set<string>>(() => {
    const ext = searchParams.get("ext");
    return ext ? new Set([ext]) : new Set();
  });
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [rulePickerOpen, setRulePickerOpen] = useState<string | null>(null);
  const [showExtPicker, setShowExtPicker] = useState(false);
  const [bulkListExpanded, setBulkListExpanded] = useState<Set<string>>(new Set());
  const [excludeInput, setExcludeInput] = useState("");
  const dragCounter = useRef(0);

  // Clear the ?ext= param after consuming it so it doesn't linger
  useEffect(() => {
    if (searchParams.has("ext")) {
      searchParams.delete("ext");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getExtension = useCallback((extId: string) => EXTENSIONS.find((e) => e.id === extId), []);

  const filteredInstances = useMemo(() => {
    let result = instances;
    if (isMvp) {
      result = result.filter((i) => i.timing === "postVisitor" && !i.bulkMode);
    }
    if (filterExtensions.size > 0) {
      result = result.filter((i) => filterExtensions.has(i.extensionId));
    }
    return result;
  }, [instances, filterExtensions, isMvp]);

  const toggleFilterExtension = useCallback((extId: string) => {
    setFilterExtensions((prev) => {
      const next = new Set(prev);
      if (next.has(extId)) next.delete(extId);
      else next.add(extId);
      return next;
    });
  }, []);

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!filterDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterDropdownOpen]);

  const groupedInstances = useMemo(() => {
    const sorted = [...filteredInstances].sort((a, b) => {
      const tDiff = TIMING_ORDER[a.timing] - TIMING_ORDER[b.timing];
      if (tDiff !== 0) return tDiff;
      return a.order - b.order;
    });
    const groups: { timing: string; label: string; phase: string; instances: OverviewInstance[] }[] = [];
    let currentTiming: string | null = null;
    for (const inst of sorted) {
      if (inst.timing !== currentTiming) {
        currentTiming = inst.timing;
        groups.push({ timing: inst.timing, label: TIMING_LABELS[inst.timing] || inst.timing, phase: TIMING_PHASE[inst.timing] || "", instances: [inst] });
      } else {
        groups[groups.length - 1].instances.push(inst);
      }
    }
    return groups;
  }, [filteredInstances]);

  // ─── Drag & Drop ────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, instId: string) => {
    setDragId(instId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", instId);
    const row = (e.target as HTMLElement).closest("tr");
    if (row) row.classList.add("ov-row-dragging");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDragId(null);
    setDragOverId(null);
    dragCounter.current = 0;
    const row = (e.target as HTMLElement).closest("tr");
    if (row) row.classList.remove("ov-row-dragging");
  };

  const handleDragEnter = (e: React.DragEvent, instId: string) => {
    e.preventDefault();
    dragCounter.current++;
    setDragOverId(instId);
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    dragCounter.current = 0;
    if (!dragId || dragId === targetId) return;
    const dragInst = instances.find((i) => i.id === dragId);
    const targetInst = instances.find((i) => i.id === targetId);
    if (!dragInst || !targetInst || dragInst.timing !== targetInst.timing) return;

    setInstances((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((i) => i.id === dragId);
      const toIdx = next.findIndex((i) => i.id === targetId);
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      let order = 1;
      for (const inst of next) {
        if (inst.timing === dragInst.timing) inst.order = order++;
      }
      return next;
    });
    setDragId(null);
  };

  // ─── Instance Editing Handlers ──────────────────────────────

  const handleToggle = (instId: string, val: boolean) => {
    setInstances((prev) => prev.map((i) => (i.id === instId ? { ...i, enabled: val } : i)));
  };

  const handleNameChange = (instId: string, newName: string) => {
    setInstances((prev) => prev.map((i) => (i.id === instId ? { ...i, name: newName } : i)));
  };

  const handleRuleChange = (instId: string, rule: TriggerRule) => {
    setInstances((prev) => prev.map((i) => (i.id === instId ? { ...i, rule: { ...rule } } : i)));
  };

  const handleRemoveRule = (instId: string) => {
    setInstances((prev) => prev.map((i) => (i.id === instId ? { ...i, rule: { ...DEFAULT_RULE } } : i)));
  };

  const handleTimingChange = (instId: string, newTiming: string) => {
    const allowed = getAllowedScopes(newTiming);
    setInstances((prev) => prev.map((i) => {
      if (i.id !== instId) return i;
      const updateScopes = (m: InstanceMapping): InstanceMapping => {
        if (!m.bulkFilter) return m;
        return { ...m, bulkFilter: { ...m.bulkFilter, scopes: [...allowed] } };
      };
      return {
        ...i,
        timing: newTiming,
        timingLabel: TIMING_LABELS[newTiming] || newTiming,
        inputMappings: i.inputMappings.map(updateScopes),
        outputMappings: i.outputMappings.map(updateScopes),
      };
    }));
  };

  const handleInputMappingChange = (instId: string, varName: string, attrValue: any) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === instId
          ? { ...inst, inputMappings: inst.inputMappings.map((m) => m.variableName === varName ? { ...m, mappedAttribute: attrValue?.value ?? attrValue ?? "" } : m) }
          : inst
      )
    );
  };

  const handleOutputMappingChange = (instId: string, varName: string, attrValue: any) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === instId
          ? { ...inst, outputMappings: inst.outputMappings.map((m) => m.variableName === varName ? { ...m, mappedAttribute: attrValue?.value ?? attrValue ?? "" } : m) }
          : inst
      )
    );
  };

  const handleMappingModeChange = (instId: string, mode: MappingMode) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        if (mode === "bulk") {
          const defaultFilter: BulkFilter = { types: ["String"], scopes: [], excludeAttributes: [] };
          return {
            ...inst, mappingMode: "bulk", bulkMode: true, attributeList: undefined,
            inputMappings: inst.inputMappings.map((m) => ({ ...m, mappedAttribute: "", bulkFilter: { ...defaultFilter } })),
            outputMappings: inst.outputMappings.map((m) => ({ ...m, mappedAttribute: "", bulkFilter: { ...defaultFilter } })),
          };
        }
        if (mode === "single-attribute") {
          return {
            ...inst, mappingMode: "single-attribute", bulkMode: false, attributeList: inst.attributeList || [],
            inputMappings: inst.inputMappings.map((m) => { const { bulkFilter, ...rest } = m; return rest; }),
            outputMappings: inst.outputMappings.map((m) => { const { bulkFilter, ...rest } = m; return rest; }),
          };
        }
        return {
          ...inst, mappingMode: "specific", bulkMode: false, attributeList: undefined,
          inputMappings: inst.inputMappings.map((m) => { const { bulkFilter, ...rest } = m; return rest; }),
          outputMappings: inst.outputMappings.map((m) => { const { bulkFilter, ...rest } = m; return rest; }),
        };
      })
    );
  };

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
    setInstances((prev) => prev.map((inst) => inst.id !== instId ? inst : { ...inst, attributeList: (inst.attributeList || []).filter((a) => a !== attrName) }));
  };

  const handleBulkTypeToggle = (instId: string, type: string) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const update = (m: InstanceMapping): InstanceMapping => {
          if (!m.bulkFilter) return m;
          const types = m.bulkFilter.types.includes(type) ? m.bulkFilter.types.filter((t) => t !== type) : [...m.bulkFilter.types, type];
          return { ...m, bulkFilter: { ...m.bulkFilter, types } };
        };
        return { ...inst, inputMappings: inst.inputMappings.map(update), outputMappings: inst.outputMappings.map(update) };
      })
    );
  };

  const handleBulkScopeToggle = (instId: string, scope: "visitor" | "visit" | "event") => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const update = (m: InstanceMapping): InstanceMapping => {
          if (!m.bulkFilter) return m;
          const current = m.bulkFilter.scopes || [];
          const next = current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope];
          return { ...m, bulkFilter: { ...m.bulkFilter, scopes: next } };
        };
        return { ...inst, inputMappings: inst.inputMappings.map(update), outputMappings: inst.outputMappings.map(update) };
      })
    );
  };

  const handleAddExclusion = (instId: string, attrName: string) => {
    if (!attrName.trim()) return;
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const update = (m: InstanceMapping): InstanceMapping => {
          if (!m.bulkFilter) return m;
          const excludes = m.bulkFilter.excludeAttributes || [];
          if (excludes.includes(attrName)) return m;
          return { ...m, bulkFilter: { ...m.bulkFilter, excludeAttributes: [...excludes, attrName] } };
        };
        return { ...inst, inputMappings: inst.inputMappings.map(update), outputMappings: inst.outputMappings.map(update) };
      })
    );
    setExcludeInput("");
  };

  const handleRemoveExclusion = (instId: string, attrName: string) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const update = (m: InstanceMapping): InstanceMapping => {
          if (!m.bulkFilter) return m;
          return { ...m, bulkFilter: { ...m.bulkFilter, excludeAttributes: (m.bulkFilter.excludeAttributes || []).filter((a) => a !== attrName) } };
        };
        return { ...inst, inputMappings: inst.inputMappings.map(update), outputMappings: inst.outputMappings.map(update) };
      })
    );
  };

  const handleAddCondition = (instId: string, groupIndex: number) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== instId) return inst;
        const groups = [...(inst.rule.conditionGroups || [])];
        if (!groups[groupIndex]) return inst;
        groups[groupIndex] = { ...groups[groupIndex], conditions: [...groups[groupIndex].conditions, { attribute: "", operator: "equals", value: "" }] };
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
        if (field === "operator" && (val === "is set" || val === "is not set")) conditions[condIndex].value = "";
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
          const newGroups = groups.filter((_, i) => i !== groupIndex);
          return { ...inst, rule: { ...inst.rule, conditionGroups: newGroups.length > 0 ? newGroups : undefined } };
        }
        groups[groupIndex] = { ...groups[groupIndex], conditions };
        return { ...inst, rule: { ...inst.rule, conditionGroups: groups } };
      })
    );
  };

  const handleAddInstance = (ext: ExtensionMeta) => {
    const inputParams = ext.params.filter((p) => p.direction === "input");
    const outputParams = ext.params.filter((p) => p.direction === "output");
    const newId = `${ext.id}-inst${Date.now()}`;
    const timing = ext.allowedPositions[0]?.id || "postVisitor";
    const newInstance: OverviewInstance = {
      id: newId,
      name: `New ${ext.name} instance`,
      extensionId: ext.id,
      extensionName: ext.name,
      timing,
      timingLabel: TIMING_LABELS[timing] || timing,
      enabled: true,
      extensionEnabled: ext.enabled,
      order: 999,
      rule: { ...DEFAULT_RULE },
      inputMappings: inputParams.map((p) => ({ variableName: p.variableName, mappedAttribute: "" })),
      outputMappings: outputParams.map((p) => ({ variableName: p.variableName, mappedAttribute: "" })),
    };
    setInstances((prev) => [...prev, newInstance]);
    setExpandedIds((prev) => new Set([...prev, newId]));
  };

  const handleDeleteInstance = (instId: string) => {
    setInstances((prev) => prev.filter((i) => i.id !== instId));
    setExpandedIds((prev) => { const next = new Set(prev); next.delete(instId); return next; });
  };

  const handleDuplicateInstance = (instId: string) => {
    const source = instances.find((i) => i.id === instId);
    if (!source) return;
    const newId = `${source.extensionId}-inst${Date.now()}`;
    const dup: OverviewInstance = { ...source, id: newId, name: `${source.name} (copy)`, rule: { ...source.rule } };
    setInstances((prev) => [...prev, dup]);
    setExpandedIds((prev) => new Set([...prev, newId]));
  };

  // ─── Condition Editor Render ────────────────────────────────

  const renderConditionEditor = (inst: OverviewInstance) => {
    const { rule } = inst;
    const groups = rule.conditionGroups || [];
    const lifecycle = isLifecycleTrigger(rule.trigger);
    const attrOptions = lifecycle ? MOCK_VISIT_VISITOR_ATTRIBUTES : [...MOCK_EVENT_ATTRIBUTES, ...MOCK_VISIT_VISITOR_ATTRIBUTES];

    return (
      <div className="inst-rule-conditions-editor">
        {groups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <div className="inst-rule-or-divider">OR</div>}
            <div className="inst-rule-condition-group-edit">
              {group.conditions.map((cond, ci) => (
                <div key={ci} className="inst-rule-condition-edit-row">
                  {ci > 0 && <span className="inst-rule-and-label">AND</span>}
                  <select className="inst-rule-cond-select inst-rule-cond-attr" value={cond.attribute}
                    onChange={(e) => handleUpdateCondition(inst.id, gi, ci, "attribute", e.target.value)}>
                    <option value="">Select attribute…</option>
                    {attrOptions.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                  <select className="inst-rule-cond-select inst-rule-cond-op" value={cond.operator}
                    onChange={(e) => handleUpdateCondition(inst.id, gi, ci, "operator", e.target.value)}>
                    {CONDITION_OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                  </select>
                  {cond.operator !== "is set" && cond.operator !== "is not set" && (
                    <input type="text" className="inst-rule-cond-value" placeholder="Value…" value={cond.value}
                      onChange={(e) => handleUpdateCondition(inst.id, gi, ci, "value", e.target.value)} />
                  )}
                  <button type="button" className="inst-rule-cond-remove" onClick={() => handleRemoveCondition(inst.id, gi, ci)} title="Remove condition">
                    <i className="fas fa-times" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button type="button" className="inst-rule-add-cond-btn" onClick={() => handleAddCondition(inst.id, gi)}>
                <i className="fas fa-plus" aria-hidden="true" /> Add condition
              </button>
            </div>
          </React.Fragment>
        ))}
        <button type="button" className="inst-rule-add-or-btn" onClick={() => handleAddOrGroup(inst.id)}>
          <i className="fas fa-plus" aria-hidden="true" /> Add OR group
        </button>
      </div>
    );
  };

  // ─── Rule Display Render ────────────────────────────────────

  const renderRuleDisplay = (inst: OverviewInstance) => {
    const { rule } = inst;
    const lifecycle = isLifecycleTrigger(rule.trigger);

    if (rule.type === "all") {
      return (
        <div className="inst-rule-summary inst-rule-summary-all">
          <i className="fas fa-globe" aria-hidden="true" />
          <span>All Events</span>
          <button type="button" className="inst-rule-change-btn"
            onClick={() => setRulePickerOpen(rulePickerOpen === inst.id ? null : inst.id)}>
            Change
          </button>
          {rulePickerOpen === inst.id && (
            <RulePicker onSelect={(r) => handleRuleChange(inst.id, r)} onClose={() => setRulePickerOpen(null)} />
          )}
        </div>
      );
    }

    return (
      <div className={`inst-rule-card ${lifecycle ? "inst-rule-card-lifecycle" : ""}`}>
        <div className="inst-rule-card-header">
          <i className={`${lifecycle ? getLifecycleIcon(rule.trigger) : "fas fa-filter"} inst-rule-card-icon`} aria-hidden="true" />
          <span className="inst-rule-card-name">{rule.name}</span>
          {lifecycle && <span className="inst-rule-lifecycle-badge">Lifecycle</span>}
          <div className="inst-rule-card-actions">
            <button type="button" className="inst-rule-card-btn"
              onClick={() => setRulePickerOpen(rulePickerOpen === inst.id ? null : inst.id)} title="Change rule">
              <i className="fas fa-pen" aria-hidden="true" />
            </button>
            <button type="button" className="inst-rule-card-btn inst-rule-card-btn-remove"
              onClick={() => handleRemoveRule(inst.id)} title="Reset to All Events">
              <i className="fas fa-times" aria-hidden="true" />
            </button>
          </div>
          {rulePickerOpen === inst.id && (
            <RulePicker onSelect={(r) => handleRuleChange(inst.id, r)} onClose={() => setRulePickerOpen(null)} />
          )}
        </div>
        {rule.conditionGroups && rule.conditionGroups.length > 0 && (
          <div className="inst-rule-conditions">{renderConditionEditor(inst)}</div>
        )}
        {(!rule.conditionGroups || rule.conditionGroups.length === 0) && (
          <div className="inst-rule-conditions inst-rule-conditions-empty">
            <button type="button" className="inst-rule-add-cond-btn" onClick={() => handleAddOrGroup(inst.id)}>
              <i className="fas fa-plus" aria-hidden="true" /> Add condition (optional)
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── Inline Editing Render ──────────────────────────────────

  const renderEditPanel = (inst: OverviewInstance) => {
    const ext = getExtension(inst.extensionId);
    if (!ext) return null;
    const inputParams = ext.params.filter((p) => p.direction === "input");
    const outputParams = ext.params.filter((p) => p.direction === "output");
    const currentMode: MappingMode = inst.mappingMode || "specific";
    const bulkFilter = currentMode === "bulk" ? inst.inputMappings[0]?.bulkFilter : null;
    const matchedAttrs = bulkFilter ? getMatchedAttributes(bulkFilter) : [];
    const isListExpanded = bulkListExpanded.has(inst.id);
    const isMultiScope = ext.allowedPositions.length > 1;

    return (
      <div className="ov-edit-panel" onClick={(e) => e.stopPropagation()}>
        {/* Instance name */}
        <div className="ov-edit-field">
          <label className="ov-edit-label">Instance Name</label>
          <Textbox value={inst.name} onChange={(val: string) => handleNameChange(inst.id, val)} placeholder="e.g., Score from page views" isFullWidth />
        </div>

        {/* Timing selector */}
        {isMultiScope && !isMvp && (
          <div className="ov-edit-field">
            <label className="ov-edit-label"><i className="fas fa-clock" aria-hidden="true" /> Execution Timing</label>
            <div className="ov-edit-timing-btns">
              {ext.allowedPositions.map((pos) => (
                <button key={pos.id} type="button"
                  className={`ov-edit-timing-btn ${inst.timing === pos.id ? "ov-edit-timing-btn-active" : ""}`}
                  onClick={() => handleTimingChange(inst.id, pos.id)}>
                  {inst.timing === pos.id && <i className="fas fa-check" aria-hidden="true" />}
                  {pos.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mapping mode for bulk extensions */}
        {ext.isBulk && !isMvp && (
          <div className="ov-edit-field">
            <label className="ov-edit-label"><i className="fas fa-exchange-alt" aria-hidden="true" /> Attribute Mapping</label>
            <div className="ov-edit-mapping-modes">
              {([
                { id: "bulk" as MappingMode, label: "Process all attributes of type", icon: "fas fa-cubes", desc: "Pick type(s) and scope. Add exclusions if needed." },
                { id: "single-attribute" as MappingMode, label: "Attribute list", icon: "fas fa-list", desc: "Provide a list of attributes to apply the extension to." },
              ]).map((opt) => (
                <label key={opt.id} className={`ov-edit-mode-radio ${currentMode === opt.id ? "ov-edit-mode-radio-active" : ""}`}>
                  <input type="radio" name={`mapping-mode-${inst.id}`} value={opt.id} checked={currentMode === opt.id}
                    onChange={() => handleMappingModeChange(inst.id, opt.id)} className="ov-edit-mode-input" />
                  <span className="ov-edit-mode-dot" />
                  <div className="ov-edit-mode-text">
                    <span className="ov-edit-mode-label"><i className={opt.icon} aria-hidden="true" />{opt.label}</span>
                    <span className="ov-edit-mode-desc">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Bulk mode panel */}
        {currentMode === "bulk" && bulkFilter && (
          <div className="ov-edit-bulk-panel">
            <div className="ov-edit-bulk-section">
              <label className="ov-edit-label"><i className="fas fa-tags" aria-hidden="true" /> Types & Scopes</label>
              <div className="inst-scope-rows">
                {INSTANCE_SCOPE_TYPES.filter((row) => getAllowedScopes(inst.timing).includes(row.scopeKey)).map((row) => {
                  const scopeActive = !bulkFilter.scopes || bulkFilter.scopes.length === 0 || bulkFilter.scopes.includes(row.scopeKey);
                  return (
                    <div key={row.scope} className={`inst-scope-row ${!scopeActive ? "inst-scope-row-off" : ""}`}>
                      <button type="button" className={`inst-scope-row-label ${scopeActive ? "inst-scope-row-label-active" : ""}`}
                        onClick={() => handleBulkScopeToggle(inst.id, row.scopeKey)}>
                        <i className={row.icon} aria-hidden="true" />{row.scope}
                      </button>
                      <div className="inst-scope-row-chips">
                        {row.types.filter((t) => getExtensionBulkTypes(inst.extensionId).has(t)).map((t) => {
                          const selected = bulkFilter.types.includes(t);
                          return (
                            <button key={t} type="button" className={`inst-type-chip ${selected ? "inst-type-chip-selected" : ""}`}
                              onClick={() => handleBulkTypeToggle(inst.id, t)}>
                              {selected ? <i className="fas fa-check" aria-hidden="true" /> : TYPE_ICONS[t] ? <i className={TYPE_ICONS[t]} aria-hidden="true" style={{ opacity: 0.5 }} /> : null}{t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="ov-edit-bulk-section">
              <div className="inst-bulk-matches">
                <span className="inst-bulk-matches-label">Matches: <strong>{matchedAttrs.length}</strong> attribute{matchedAttrs.length !== 1 ? "s" : ""}</span>
                <button type="button" className="inst-bulk-view-btn"
                  onClick={() => setBulkListExpanded((prev) => { const next = new Set(prev); if (next.has(inst.id)) next.delete(inst.id); else next.add(inst.id); return next; })}>
                  {isListExpanded ? "Hide list" : "View list"}
                </button>
              </div>
              {isListExpanded && (
                <div className="inst-bulk-attr-list">
                  {matchedAttrs.map((a) => <span key={a} className="inst-bulk-attr-item">{a}</span>)}
                  {matchedAttrs.length === 0 && <span className="inst-bulk-attr-empty">No attributes match the current filter.</span>}
                </div>
              )}
            </div>
            <div className="ov-edit-bulk-section">
              <label className="ov-edit-label"><i className="fas fa-ban" aria-hidden="true" /> Excluded attributes</label>
              <div className="inst-bulk-exclusions">
                {(bulkFilter.excludeAttributes || []).map((attr) => (
                  <span key={attr} className="inst-exclusion-tag">{attr}
                    <button type="button" className="inst-exclusion-remove" onClick={() => handleRemoveExclusion(inst.id, attr)} aria-label={`Remove ${attr}`}>
                      <i className="fas fa-times" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <div className="inst-exclusion-add">
                  <input type="text" className="inst-exclusion-input" placeholder="Attribute name..." value={excludeInput}
                    onChange={(e) => setExcludeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddExclusion(inst.id, excludeInput); }} />
                  <button type="button" className="inst-exclusion-add-btn" onClick={() => handleAddExclusion(inst.id, excludeInput)}>
                    <i className="fas fa-plus" aria-hidden="true" /> Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Single-attribute mode panel */}
        {currentMode === "single-attribute" && (
          <div className="ov-edit-single-attr-panel">
            <p className="ov-edit-single-attr-hint">The extension will run once per attribute listed below.</p>
            <div className="ov-edit-single-attr-list">
              {(inst.attributeList || []).map((attr) => (
                <span key={attr} className="inst-single-attr-tag"><code>{attr}</code>
                  <button type="button" className="inst-single-attr-remove" onClick={() => handleRemoveAttribute(inst.id, attr)} aria-label={`Remove ${attr}`}>
                    <i className="fas fa-times" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
            <div className="ov-edit-single-attr-add">
              <Select options={availableAttributes.filter((a) => !(inst.attributeList || []).includes(a.value))}
                value={null} onChange={(val: any) => { if (val?.value) handleAddAttribute(inst.id, val.value); }}
                placeholder="Add attribute..." isFullWidth />
            </div>
          </div>
        )}

        {/* Specific attribute mapping */}
        {currentMode === "specific" && (
          <>
            <div className="ov-edit-field">
              <label className="ov-edit-label"><i className="fas fa-sign-in-alt" aria-hidden="true" /> Input Mappings</label>
              <div className="ov-edit-mapping-list">
                {inst.inputMappings.map((mapping) => {
                  const paramDef = inputParams.find((p) => p.variableName === mapping.variableName);
                  return (
                    <div key={mapping.variableName} className="ov-edit-mapping-row">
                      <div className="ov-edit-mapping-var">
                        <code>{mapping.variableName}</code>
                        {paramDef?.description && <span className="ov-edit-mapping-desc">{paramDef.description}</span>}
                      </div>
                      <i className="fas fa-arrow-left ov-edit-mapping-arrow" aria-hidden="true" />
                      <div className="ov-edit-mapping-attr">
                        {paramDef && TYPE_ICONS[paramDef.type] && <span className="ov-edit-mapping-type-icon" style={{ background: TYPE_COLORS[paramDef.type] }}><i className={TYPE_ICONS[paramDef.type]} aria-hidden="true" /></span>}
                        <Select options={availableAttributes}
                          value={mapping.mappedAttribute ? { label: mapping.mappedAttribute, value: mapping.mappedAttribute } : null}
                          onChange={(val: any) => handleInputMappingChange(inst.id, mapping.variableName, val)}
                          placeholder="Select attribute..." isFullWidth />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="ov-edit-field">
              <label className="ov-edit-label"><i className="fas fa-sign-out-alt" aria-hidden="true" /> Output Mappings</label>
              <div className="ov-edit-mapping-list">
                {inst.outputMappings.map((mapping) => {
                  const paramDef = outputParams.find((p) => p.variableName === mapping.variableName);
                  return (
                    <div key={mapping.variableName} className="ov-edit-mapping-row">
                      <div className="ov-edit-mapping-var">
                        <code>{mapping.variableName}</code>
                        {paramDef?.description && <span className="ov-edit-mapping-desc">{paramDef.description}</span>}
                      </div>
                      <i className="fas fa-arrow-right ov-edit-mapping-arrow" aria-hidden="true" />
                      <div className="ov-edit-mapping-attr">
                        {paramDef && TYPE_ICONS[paramDef.type] && <span className="ov-edit-mapping-type-icon" style={{ background: TYPE_COLORS[paramDef.type] }}><i className={TYPE_ICONS[paramDef.type]} aria-hidden="true" /></span>}
                        <Select options={availableAttributes}
                          value={mapping.mappedAttribute ? { label: mapping.mappedAttribute, value: mapping.mappedAttribute } : null}
                          onChange={(val: any) => handleOutputMappingChange(inst.id, mapping.variableName, val)}
                          placeholder="Select attribute..." isFullWidth />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Trigger Rule */}
        <div className="ov-edit-field">
          <label className="ov-edit-label"><i className="fas fa-filter" aria-hidden="true" /> Trigger Rule</label>
          {renderRuleDisplay(inst)}
        </div>

        {/* Instance actions */}
        <div className="ov-edit-actions">
          <button type="button" className="ov-edit-action-btn" onClick={() => handleDuplicateInstance(inst.id)} title="Duplicate">
            <i className="fas fa-copy" aria-hidden="true" /> Duplicate
          </button>
          <button type="button" className="ov-edit-action-btn ov-edit-action-btn-danger" onClick={() => handleDeleteInstance(inst.id)} title="Delete">
            <i className="fas fa-trash" aria-hidden="true" /> Delete
          </button>
        </div>
      </div>
    );
  };

  const activeCount = instances.filter((i) => i.enabled && i.extensionEnabled).length;
  const totalCount = instances.length;

  // Extension filter options
  const extFilterOptions = (isMvp ? EXTENSIONS.filter((e) => !e.isBulk) : EXTENSIONS).map((e) => ({ label: e.name, value: e.id }));

  let globalIdx = 0;

  return (
    <div className="ov-page">
      <nav className="editor-breadcrumb">
        <button type="button" className="breadcrumb-link" onClick={() => navigate("/")}>
          Server-Side Extensions
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Instances and Order</span>
      </nav>

      <div className="ov-header">
        <div className="ov-title-row">
          <h1 className="ov-title">Instances and Order</h1>
          <Badge type="informative" label={`${activeCount} active / ${totalCount} total`} />
        </div>
        <p className="ov-description">
          All extension instances across the pipeline, grouped by execution timing.
          Drag to reorder, click to expand and edit mappings, or add new instances.
        </p>
      </div>

      {/* Toolbar: filter + add */}
      <div className="ov-toolbar">
        <div className="ov-filter">
          <div className="ov-filter-dropdown-wrap" ref={filterDropdownRef}>
            <button
              type="button"
              className="ov-filter-trigger"
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
            >
              <i className="fas fa-filter" aria-hidden="true" />
              {filterExtensions.size === 0 ? "All Extensions" : `${filterExtensions.size} selected`}
              <i className={`fas fa-chevron-${filterDropdownOpen ? "up" : "down"} ov-filter-trigger-arrow`} aria-hidden="true" />
            </button>
            {filterDropdownOpen && (
              <div className="ov-filter-dropdown">
                {extFilterOptions.map((opt) => (
                  <label key={opt.value} className="ov-filter-dropdown-item">
                    <input
                      type="checkbox"
                      checked={filterExtensions.has(opt.value)}
                      onChange={() => toggleFilterExtension(opt.value)}
                    />
                    <span className="ov-filter-dropdown-label">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {filterExtensions.size > 0 && (
            <div className="ov-filter-selected-chips">
              {extFilterOptions.filter((o) => filterExtensions.has(o.value)).map((opt) => (
                <span key={opt.value} className="ov-filter-chip ov-filter-chip-active">
                  {opt.label}
                  <button type="button" className="ov-filter-chip-remove" onClick={() => toggleFilterExtension(opt.value)}>
                    <i className="fas fa-times" aria-hidden="true" />
                  </button>
                </span>
              ))}
              <button type="button" className="ov-filter-clear" onClick={() => setFilterExtensions(new Set())}>
                Clear all
              </button>
            </div>
          )}
        </div>
        <div className="ov-toolbar-right">
          <button type="button" className="test-ai-btn" onClick={() => window.dispatchEvent(new CustomEvent("open-ai-builder", { detail: { prompt: "Help me add a new instance" } }))}>
            <i className="fas fa-magic" aria-hidden="true" /> Add with AI
          </button>
          <div style={{ position: "relative" }}>
            <Button type="primary" onClick={() => setShowExtPicker(!showExtPicker)}>
              <i className="fas fa-plus" aria-hidden="true" />
              <span>Add Instance</span>
            </Button>
            {showExtPicker && (
              <ExtensionPicker onSelect={(ext) => handleAddInstance(ext)} onClose={() => setShowExtPicker(false)} hideBulk={isMvp} />
            )}
          </div>
        </div>
      </div>

      <div className="ov-table-container">
        <table className="ov-table">
          <thead>
            <tr>
              <th className="ov-th ov-col-status"></th>
              <th className="ov-th ov-col-order">#</th>
              <th className="ov-th ov-col-name">Instance</th>
              <th className="ov-th ov-col-extension">Extension</th>
              <th className="ov-th ov-col-warnings">Warnings</th>
              <th className="ov-th ov-col-rule">Trigger Rule</th>
            </tr>
          </thead>
          <tbody>
            {groupedInstances.map((group) => {
              const rows: React.ReactNode[] = [];

              rows.push(
                <tr key={`group-${group.timing}`} className="ov-group-header-row">
                  <td colSpan={6} className="ov-group-header-td">
                    <div className="ov-group-header-inner">
                      <span className="ov-group-header-label">
                        <i className="fas fa-code" aria-hidden="true" />{group.label}
                      </span>
                      <span className="ov-group-header-phase">{group.phase}</span>
                      <span className="ov-group-header-count">
                        {group.instances.length} instance{group.instances.length !== 1 ? "s" : ""}
                      </span>
                      {group.instances.length > 1 && (
                        <span className="ov-group-header-hint">
                          <i className="fas fa-arrows-alt-v" aria-hidden="true" />Drag to reorder
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );

              group.instances.forEach((inst) => {
                globalIdx++;
                const isDragging = dragId === inst.id;
                const isDragOver = dragOverId === inst.id && dragId !== inst.id;
                const dragInst = dragId ? instances.find((i) => i.id === dragId) : null;
                const canDrop = isDragOver && dragInst?.timing === inst.timing;
                const isInactive = !inst.enabled || !inst.extensionEnabled;
                const isExpanded = expandedIds.has(inst.id);

                rows.push(
                  <tr
                    key={inst.id}
                    className={`ov-row ${isDragging ? "ov-row-dragging" : ""} ${canDrop ? "ov-row-dragover" : ""} ${isDragOver && !canDrop ? "ov-row-dragover-invalid" : ""} ${isInactive ? "ov-row-inactive" : ""} ${isExpanded ? "ov-row-expanded" : ""}`}
                    draggable={group.instances.length > 1}
                    onDragStart={(e) => handleDragStart(e, inst.id)}
                    onDragEnd={handleDragEnd}
                    onDragEnter={(e) => handleDragEnter(e, inst.id)}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, inst.id)}
                    onClick={() => {
                      setExpandedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(inst.id)) next.delete(inst.id);
                        else next.add(inst.id);
                        return next;
                      });
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="ov-td ov-col-status">
                      <div className="ov-status-cell">
                        <span onClick={(e) => e.stopPropagation()}>
                          <SimpleSwitch isStandAlone on={inst.enabled} onChange={(val) => handleToggle(inst.id, val)}
                            inputProps={{ "aria-label": `Toggle ${inst.name}` }} />
                        </span>
                      </div>
                    </td>
                    <td className="ov-td ov-col-order">
                      {group.instances.length > 1 ? (
                        <span className="ov-drag-handle" title="Drag to reorder">
                          <i className="fas fa-grip-vertical" aria-hidden="true" />
                        </span>
                      ) : (
                        <span className="ov-drag-handle ov-drag-handle-disabled">
                          <i className="fas fa-grip-vertical" aria-hidden="true" />
                        </span>
                      )}
                      <span className="ov-order-num">{globalIdx}</span>
                    </td>
                    <td className="ov-td ov-col-name">
                      <span className="ov-instance-name">
                        <i className={`fas fa-chevron-right ov-expand-icon ${isExpanded ? "ov-expand-icon-open" : ""}`} aria-hidden="true" />
                        {inst.name}
                      </span>
                      {inst.bulkMode && (
                        <span className="ov-bulk-badge">
                          <i className="fas fa-cubes" aria-hidden="true" />Bulk
                        </span>
                      )}
                    </td>
                    <td className="ov-td ov-col-extension">
                      <button type="button" className="ov-extension-link"
                        onClick={(e) => { e.stopPropagation(); navigate(`/modules/${inst.extensionId}`); }}>
                        {inst.extensionName}
                      </button>
                      {!inst.extensionEnabled && (
                        <SimpleTooltip title="Parent extension is disabled">
                          <span className="ov-ext-disabled-badge"><i className="fas fa-ban" aria-hidden="true" /></span>
                        </SimpleTooltip>
                      )}
                    </td>
                    <td className="ov-td ov-col-warnings">
                      {INSTANCE_ERRORS[inst.id] ? (
                        <SimpleTooltip title={`${INSTANCE_ERRORS[inst.id].message}\n\n${INSTANCE_ERRORS[inst.id].recentInputs}`}>
                          <span className="ov-warning-badge">
                            <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                            {((INSTANCE_ERRORS[inst.id].count / (INSTANCE_EXECUTIONS_24H[inst.id] || 1)) * 100).toFixed(2)}% error rate
                          </span>
                        </SimpleTooltip>
                      ) : (
                        <span className="ov-warnings-none">&ndash;</span>
                      )}
                    </td>
                    <td className="ov-td ov-col-rule">
                      {inst.rule.type === "all" ? (
                        <span className="ov-rule-all"><i className="fas fa-globe" aria-hidden="true" />All Events</span>
                      ) : isLifecycleTrigger(inst.rule.trigger) ? (
                        <span className="ov-rule-lifecycle"><i className={getLifecycleIcon(inst.rule.trigger)} aria-hidden="true" />{inst.rule.name}</span>
                      ) : (
                        <span className="ov-rule-filtered"><i className="fas fa-filter" aria-hidden="true" />{inst.rule.name}</span>
                      )}
                    </td>
                  </tr>
                );

                // Expandable inline editing row
                rows.push(
                  <tr key={`${inst.id}-edit`} className={`ov-edit-row ${isExpanded ? "ov-edit-row-visible" : ""}`}>
                    <td colSpan={6} className="ov-edit-td">
                      <div className="ov-edit-wrap">
                        {isExpanded && renderEditPanel(inst)}
                      </div>
                    </td>
                  </tr>
                );
              });

              return rows;
            })}
          </tbody>
        </table>

        {filteredInstances.length === 0 && (
          <div className="ov-empty">
            <i className="fas fa-inbox" aria-hidden="true" />
            <p>No instances {filterExtension !== "all" ? "for this extension" : "yet"}.</p>
          </div>
        )}
      </div>

      <div className="ov-footer">
        <Button type="border" onClick={() => navigate("/")}>
          <i className="fas fa-arrow-left" aria-hidden="true" />
          <span>Back to Overview</span>
        </Button>
      </div>
    </div>
  );
}
