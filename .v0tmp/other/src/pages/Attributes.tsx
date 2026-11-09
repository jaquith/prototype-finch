import React, { useState, useMemo, useCallback } from "react";
import Button from "../components/SimpleButton";
import Badge from "../components/SimpleBadge";
import { useMvpMode } from "../contexts/MvpContext";
import "./Attributes.css";

type AttrScope = "Visit" | "Visitor" | "Event";
type AttrType = "String" | "Number" | "Boolean" | "Tally" | "Timeline" | "Set of Strings" | "Date" | "Funnel";

interface Enrichment {
  source: string;
  sourceType: "extension" | "rule" | "connector";
  description: string;
  when: string;
  rule?: string;
}

interface ExtensionRef {
  extensionName: string;
  instanceName: string;
  scope: string;
  direction: "input" | "output";
  variableName: string;
  isBulk?: boolean;
  bulkLabel?: string;
}

interface LinkedEnrichment {
  action: string;
  target: string;
  targetId: string;
  description: string;
  when: string;
}

interface Attribute {
  id: string;
  attrId: number;
  name: string;
  type: AttrType;
  scope: AttrScope;
  notes: string;
  enrichments: Enrichment[];
  extensions?: ExtensionRef[];
  linkedEnrichments?: LinkedEnrichment[];
  lastModified: string;
  lastModifiedBy: string;
  audienceDB: boolean;
  preloaded?: boolean;
}

// Type icon colors matching real Tealium UI
const TYPE_COLORS: Record<AttrType, string> = {
  String: "#9C27B0",
  Number: "#1976D2",
  Boolean: "#512DA8",
  Tally: "#BF5B04",
  Timeline: "#C62828",
  "Set of Strings": "#0097A7",
  Date: "#D32F2F",
  Funnel: "#5C6BC0",
};

const TYPE_ICONS: Record<AttrType, string> = {
  String: "fas fa-quote-right",
  Number: "fas fa-chart-bar",
  Boolean: "fas fa-comment",
  Tally: "fas fa-list-ul",
  Timeline: "fas fa-ellipsis-h",
  "Set of Strings": "fas fa-stream",
  Date: "fas fa-calendar-alt",
  Funnel: "fas fa-filter",
};

// Pipeline step definitions matching ModuleList
const EVENT_STEPS = [
  { id: "event-received", label: "Event Received", type: "plain" },
  { id: "functions", label: "Functions", type: "plain" },
  { id: "pre-event", label: "Pre-Event", type: "ext" },
  { id: "event-enrichments", label: "Event Enrichments", type: "enr" },
  { id: "post-event", label: "Post-Event", type: "ext" },
  { id: "event-activations", label: "Event Activations", type: "dimmed" },
] as const;

const VISITOR_STEPS = [
  { id: "pre-visitor", label: "Pre-Visitor", type: "ext" },
  { id: "visitor-enrichments", label: "Visit/Visitor Enrichments", type: "enr" },
  { id: "post-visitor", label: "Post-Visitor", type: "ext" },
  { id: "audiences", label: "Audiences", type: "plain" },
  { id: "post-audience", label: "Post-Audience", type: "ext" },
  { id: "visitor-activations", label: "Visitor Activations", type: "dimmed" },
] as const;

function getActiveSteps(attr: Attribute): Set<string> {
  const active = new Set<string>();
  // Map enrichments to their pipeline step
  attr.enrichments.forEach((e) => {
    const w = e.when.toLowerCase();
    if (w === "any event" || w === "all events") active.add("event-enrichments");
    else if (w === "new visit" || w === "visit ended" || w === "visit started" || w === "always") active.add("visitor-enrichments");
    else active.add("event-enrichments");
  });
  // Map extensions to their pipeline step
  (attr.extensions || []).forEach((ext) => {
    const s = ext.scope.toLowerCase();
    if (s.includes("pre-event")) active.add("pre-event");
    else if (s.includes("post-event")) active.add("post-event");
    else if (s.includes("pre-visitor")) active.add("pre-visitor");
    else if (s.includes("post-visitor")) active.add("post-visitor");
    else if (s.includes("post-audience")) active.add("post-audience");
  });
  return active;
}

function getStepAnnotations(attr: Attribute, stepId: string): string[] {
  const annotations: string[] = [];
  // Enrichments
  attr.enrichments.forEach((e) => {
    const w = e.when.toLowerCase();
    const mapped = (w === "any event" || w === "all events") ? "event-enrichments"
      : (w === "new visit" || w === "visit ended" || w === "visit started" || w === "always") ? "visitor-enrichments"
      : "event-enrichments";
    if (mapped === stepId) annotations.push(e.source);
  });
  // Extensions
  (attr.extensions || []).forEach((ext) => {
    const s = ext.scope.toLowerCase();
    const mapped = s.includes("pre-event") ? "pre-event"
      : s.includes("post-event") ? "post-event"
      : s.includes("pre-visitor") ? "pre-visitor"
      : s.includes("post-audience") ? "post-audience"
      : "post-visitor";
    if (mapped === stepId) annotations.push(`${ext.direction}: ${ext.instanceName}`);
  });
  return annotations;
}

function ExecutionTimingDiagram({ attr, mvp }: { attr: Attribute; onNavigate: (id: string) => void; mvp?: boolean }) {
  const activeSteps = useMemo(() => getActiveSteps(attr), [attr]);

  const hasEventActivity = useMemo(() =>
    EVENT_STEPS.some((s) => activeSteps.has(s.id)), [activeSteps]);
  const hasVisitorActivity = useMemo(() =>
    VISITOR_STEPS.some((s) => activeSteps.has(s.id)), [activeSteps]);

  if (!hasEventActivity && !hasVisitorActivity) return null;

  const renderStep = (step: { id: string; label: string; type: string }) => {
    const isActive = activeSteps.has(step.id);
    const isExt = step.type === "ext";
    const annotations = getStepAnnotations(attr, step.id);
    const stepClass = isActive
      ? "attr-pipe-step attr-pipe-step-active"
      : step.type === "ext"
        ? "attr-pipe-step attr-pipe-step-ext"
        : step.type === "dimmed"
          ? "attr-pipe-step attr-pipe-step-dimmed"
          : step.type === "enr"
            ? "attr-pipe-step attr-pipe-step-enr"
            : "attr-pipe-step";

    return (
      <span key={step.id} className="attr-pipe-step-wrap">
        <span className={stepClass}>
          {isExt && <i className="fas fa-code" aria-hidden="true" />}
          {step.label}
        </span>
        {annotations.length > 0 && (
          <span className="attr-pipe-annotations">
            {annotations.map((a, i) => (
              <span key={i} className="attr-pipe-annotation">{a}</span>
            ))}
          </span>
        )}
      </span>
    );
  };

  const arrow = <span className="attr-pipe-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>;

  return (
    <div className="attr-timing">
      <div className="attr-timing-header">
        <span>Processing Pipeline</span>
      </div>
      <div className="attr-pipe-rows">
        {hasEventActivity && !mvp && (
          <div className="attr-pipe-phase">
            <span className="attr-pipe-phase-label">Event</span>
            <div className="attr-pipe-flow">
              {EVENT_STEPS.map((step, i) => (
                <React.Fragment key={step.id}>
                  {renderStep(step)}
                  {i < EVENT_STEPS.length - 1 && arrow}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
        {hasVisitorActivity && (
          <div className="attr-pipe-phase">
            <span className="attr-pipe-phase-label">Visit / Visitor</span>
            <div className="attr-pipe-flow">
              {(mvp ? VISITOR_STEPS.filter((s) => s.id === "visitor-enrichments" || s.id === "post-visitor" || s.id === "audiences" || s.id === "visitor-activations") : VISITOR_STEPS).map((step, i, arr) => (
                <React.Fragment key={step.id}>
                  {renderStep(step)}
                  {i < arr.length - 1 && arrow}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const MOCK_ATTRIBUTES: Attribute[] = [
  {
    id: "a1",
    attrId: 5201,
    name: "product_category_timeline",
    type: "Timeline",
    scope: "Visitor",
    notes: "Stores timestamped tally snapshots for rolling window calculations",
    enrichments: [
      { source: "Capture Visit Tally to Timeline", sourceType: "rule", description: "For Timeline product_category_timeline, capture visit_product_categories", when: "Visit Ended", rule: "Visit Tally Assigned" },
    ],
    extensions: [
      { extensionName: "Tally Over Time", instanceName: "Product category tally (30 days)", scope: "Post-Visitor", direction: "input", variableName: "timeline" },
      { extensionName: "Tally Over Time", instanceName: "Product category tally (60 days)", scope: "Post-Visitor", direction: "input", variableName: "timeline" },
    ],
    linkedEnrichments: [
      { action: "Set Rolling Sum Based on Timeline", target: "product_category_tally_30_days", targetId: "a3", description: "Sums timeline entries within 30-day window into master tally", when: "New Visit" },
      { action: "Set Rolling Sum Based on Timeline", target: "product_category_tally_60_days", targetId: "a5", description: "Sums timeline entries within 60-day window into master tally", when: "New Visit" },
    ],
    lastModified: "Mar 4, 2026 at 2:15 PM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a2",
    attrId: 5202,
    name: "visit_product_categories",
    type: "Tally",
    scope: "Visit",
    notes: "Resets each visit. Captured into timeline at visit end.",
    enrichments: [
      { source: "Increment Category Tally", sourceType: "rule", description: "For Tally visit_product_categories, increment product_category", when: "Any Event", rule: "PDP Page Rule" },
    ],
    extensions: [
      { extensionName: "Tally Over Time", instanceName: "Product category tally (30 days)", scope: "Post-Visitor", direction: "input", variableName: "visitTally" },
      { extensionName: "Tally Over Time", instanceName: "Product category tally (60 days)", scope: "Post-Visitor", direction: "input", variableName: "visitTally" },
    ],
    linkedEnrichments: [
      { action: "Update Timeline", target: "product_category_timeline", targetId: "a1", description: "Snapshots this visit tally into the timeline at visit end", when: "Visit Ended" },
    ],
    lastModified: "Mar 5, 2026 at 10:30 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: false,
  },
  {
    id: "a3",
    attrId: 5203,
    name: "product_category_tally_30_days",
    type: "Tally",
    scope: "Visitor",
    notes: "Rolling 30-day aggregation. Favorite auto-generated.",
    enrichments: [],
    extensions: [
      { extensionName: "Tally Over Time", instanceName: "Product category tally (30 days)", scope: "Post-Visitor", direction: "output", variableName: "masterTally" },
    ],
    linkedEnrichments: [
      { action: "Auto-generate Favorite", target: "favorite_product_category_30_days", targetId: "a7", description: "Auto-generates the highest-count category as a String", when: "Always" },
    ],
    lastModified: "Mar 6, 2026 at 9:00 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a5",
    attrId: 5205,
    name: "product_category_tally_60_days",
    type: "Tally",
    scope: "Visitor",
    notes: "Rolling 60-day aggregation. Favorite auto-generated.",
    enrichments: [],
    extensions: [
      { extensionName: "Tally Over Time", instanceName: "Product category tally (60 days)", scope: "Post-Visitor", direction: "output", variableName: "masterTally" },
    ],
    linkedEnrichments: [
      { action: "Auto-generate Favorite", target: "favorite_product_category_60_days", targetId: "a8", description: "Auto-generates the highest-count category as a String", when: "Always" },
    ],
    lastModified: "Mar 6, 2026 at 9:00 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a7",
    attrId: 5207,
    name: "favorite_product_category_30_days",
    type: "String",
    scope: "Visitor",
    notes: "Auto-generated from 30-day tally",
    enrichments: [
      { source: "Auto-generated from Tally", sourceType: "rule", description: "Automatically derived as the highest-count entry in product_category_tally_30_days", when: "Always" },
    ],
    extensions: [
      { extensionName: "Lowercase String", instanceName: "Lowercase visitor strings", scope: "Post-Event", direction: "output", variableName: "value", isBulk: true, bulkLabel: "All String attributes" },
    ],
    linkedEnrichments: [],
    lastModified: "Mar 6, 2026 at 9:00 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a8",
    attrId: 5208,
    name: "favorite_product_category_60_days",
    type: "String",
    scope: "Visitor",
    notes: "Auto-generated from 60-day tally",
    enrichments: [
      { source: "Auto-generated from Tally", sourceType: "rule", description: "Automatically derived as the highest-count entry in product_category_tally_60_days", when: "Always" },
    ],
    extensions: [
      { extensionName: "Lowercase String", instanceName: "Lowercase visitor strings", scope: "Post-Event", direction: "output", variableName: "value", isBulk: true, bulkLabel: "All String attributes" },
    ],
    linkedEnrichments: [],
    lastModified: "Mar 6, 2026 at 9:00 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a9",
    attrId: 5189,
    name: "page_view_count",
    type: "Number",
    scope: "Visitor",
    notes: "Lifetime page view counter across all visits",
    enrichments: [
      { source: "Increment on Page View", sourceType: "rule", description: "For Number page_view_count, increment by 1 when tealium_event equals page_view", when: "Any Event", rule: "Page View Rule" },
    ],
    linkedEnrichments: [
      { action: "Compute Engagement Score", target: "engagement_score", targetId: "a10", description: "Used as input to the Compute Engagement Score extension", when: "Post-Visitor" },
    ],
    extensions: [
      { extensionName: "Compute Engagement Score", instanceName: "Score from page views", scope: "Post-Visitor", direction: "input", variableName: "viewCount" },
    ],
    lastModified: "Feb 28, 2026 at 3:45 PM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a10",
    attrId: 5190,
    name: "engagement_score",
    type: "Number",
    scope: "Visitor",
    notes: "Composite score (0-100) based on views and purchases",
    enrichments: [],
    extensions: [
      { extensionName: "Compute Engagement Score", instanceName: "Score from page views", scope: "Post-Visitor", direction: "output", variableName: "score" },
    ],
    linkedEnrichments: [],
    lastModified: "Mar 1, 2026 at 11:20 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a11",
    attrId: 5191,
    name: "purchase_count",
    type: "Number",
    scope: "Visitor",
    notes: "Lifetime purchase counter",
    enrichments: [
      { source: "Increment on Purchase", sourceType: "rule", description: "For Number purchase_count, increment by 1 when tealium_event equals purchase", when: "Any Event", rule: "Purchase Event" },
    ],
    linkedEnrichments: [
      { action: "Compute Engagement Score", target: "engagement_score", targetId: "a10", description: "Used as input to the Compute Engagement Score extension", when: "Post-Visitor" },
    ],
    extensions: [
      { extensionName: "Compute Engagement Score", instanceName: "Score from page views", scope: "Post-Visitor", direction: "input", variableName: "purchaseCount" },
    ],
    lastModified: "Feb 28, 2026 at 3:45 PM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a13",
    attrId: 5193,
    name: "product_category",
    type: "String",
    scope: "Event",
    notes: "Product category from the data layer. Used to increment visit tally.",
    enrichments: [],
    extensions: [],
    linkedEnrichments: [
      { action: "Increment Category Tally", target: "visit_product_categories", targetId: "a2", description: "Increments the visit-scoped tally for this category", when: "Any Event" },
    ],
    lastModified: "Feb 25, 2026 at 10:00 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: false,
  },
  {
    id: "a14",
    attrId: 5210,
    name: "loyalty_tier",
    type: "String",
    scope: "Visitor",
    notes: "Customer loyalty tier derived from lifetime revenue",
    enrichments: [
      { source: "Set Loyalty Tier", sourceType: "rule", description: "For String loyalty_tier, set value to \"gold\" when lifetime_revenue is greater than 5000", when: "Any Event", rule: "High Value Customer" },
      { source: "Set Loyalty Tier Default", sourceType: "rule", description: "For String loyalty_tier, set value to \"silver\" when lifetime_revenue is greater than 1000", when: "Any Event", rule: "Mid Value Customer" },
    ],
    extensions: [
      { extensionName: "Lowercase String", instanceName: "Lowercase visitor strings", scope: "Post-Event", direction: "output", variableName: "value", isBulk: true, bulkLabel: "All String attributes" },
    ],
    linkedEnrichments: [],
    lastModified: "Mar 6, 2026 at 9:00 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a15",
    attrId: 5211,
    name: "last_interaction_date",
    type: "String",
    scope: "Visitor",
    notes: "ISO 8601 date of last visitor interaction",
    enrichments: [
      { source: "Set Current Date", sourceType: "rule", description: "For String last_interaction_date, set value to current_date", when: "Any Event" },
    ],
    extensions: [
      { extensionName: "Recency-Frequency Score", instanceName: "Recency scoring", scope: "Post-Visitor", direction: "input", variableName: "lastDate" },
    ],
    linkedEnrichments: [],
    lastModified: "Mar 6, 2026 at 9:00 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: false,
  },
  {
    id: "a12",
    attrId: 5192,
    name: "page_url",
    type: "String",
    scope: "Event",
    notes: "Normalized URL (no protocol, no query params)",
    enrichments: [],
    extensions: [
      { extensionName: "Normalize Page URLs", instanceName: "Normalize page_url", scope: "Pre-Event", direction: "output", variableName: "pageUrl" },
    ],
    linkedEnrichments: [],
    lastModified: "Mar 2, 2026 at 4:10 PM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: false,
  },
  {
    id: "a16",
    attrId: 5212,
    name: "tealium_event",
    type: "String",
    scope: "Event",
    notes: "Primary event identifier from the data layer",
    enrichments: [],
    extensions: [],
    linkedEnrichments: [],
    lastModified: "Jan 15, 2026 at 9:00 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: false,
    preloaded: true,
  },
  {
    id: "a17",
    attrId: 5213,
    name: "page_title",
    type: "String",
    scope: "Event",
    notes: "Page title from the data layer, normalized by extension",
    enrichments: [],
    extensions: [
      { extensionName: "Normalize Page URLs", instanceName: "Normalize page_title URL", scope: "Pre-Event", direction: "output", variableName: "value" },
    ],
    linkedEnrichments: [],
    lastModified: "Mar 2, 2026 at 4:15 PM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: false,
  },
  {
    id: "a18",
    attrId: 5214,
    name: "lifetime_revenue",
    type: "Number",
    scope: "Visitor",
    notes: "Running sum of order_total across all visits",
    enrichments: [
      { source: "Sum Order Total", sourceType: "rule", description: "For Number lifetime_revenue, increment by order_total when tealium_event equals purchase", when: "Any Event", rule: "Purchase Event" },
    ],
    extensions: [],
    linkedEnrichments: [
      { action: "Set Loyalty Tier", target: "loyalty_tier", targetId: "a14", description: "Drives loyalty tier assignment based on revenue thresholds", when: "Any Event" },
    ],
    lastModified: "Mar 3, 2026 at 11:00 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a19",
    attrId: 5215,
    name: "visit_page_count",
    type: "Number",
    scope: "Visit",
    notes: "Count of pages viewed in the current visit. Resets each visit.",
    enrichments: [
      { source: "Increment on Page View", sourceType: "rule", description: "For Number visit_page_count, increment by 1 when tealium_event equals page_view", when: "Any Event", rule: "Page View Rule" },
    ],
    extensions: [],
    linkedEnrichments: [],
    lastModified: "Mar 1, 2026 at 2:30 PM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: false,
  },
  {
    id: "a20",
    attrId: 5216,
    name: "search_query",
    type: "String",
    scope: "Event",
    notes: "Search term entered by the user on-site",
    enrichments: [],
    extensions: [],
    linkedEnrichments: [
      { action: "Add to Search History", target: "search_history", targetId: "a21", description: "Appends search term to the visitor's search history set", when: "Any Event" },
    ],
    lastModified: "Feb 20, 2026 at 9:30 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: false,
  },
  {
    id: "a21",
    attrId: 5217,
    name: "search_history",
    type: "Set of Strings",
    scope: "Visitor",
    notes: "Unique search terms from across all visits",
    enrichments: [
      { source: "Add Search Term", sourceType: "rule", description: "For Set of Strings search_history, add search_query when search_query is assigned", when: "Any Event", rule: "Search Performed" },
    ],
    extensions: [],
    linkedEnrichments: [],
    lastModified: "Feb 20, 2026 at 9:45 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
];

// Bulk instances that process attributes by type/scope
interface BulkInstance {
  instanceId: string;
  instanceName: string;
  extensionName: string;
  timing: string;
  types: string[];
  scopes: string[];
}

const BULK_INSTANCES: BulkInstance[] = [
  { instanceId: "1-inst1", instanceName: "Normalize page_url", extensionName: "Normalize Page URLs", timing: "Pre-Event", types: ["String"], scopes: ["event"] },
  { instanceId: "11-inst2", instanceName: "Lowercase event strings (pre-enrichments)", extensionName: "Lowercase String", timing: "Pre-Event", types: ["String"], scopes: ["event"] },
  { instanceId: "11-inst1", instanceName: "Lowercase event strings (post-enrichments)", extensionName: "Lowercase String", timing: "Post-Event", types: ["String"], scopes: ["event"] },
];

// Default exclusions matching mock data in InstanceOverview
const DEFAULT_EXCLUSIONS: Record<string, string[]> = {
  "1-inst1": ["tealium_event"],
  "11-inst2": ["visitor_id", "account_hash", "email_hash"],
  "11-inst1": ["tealium_event"],
};

function getBulkInstancesForAttr(attr: Attribute, exclusions: Record<string, string[]>): { active: (BulkInstance & { excluded: false })[]; excluded: (BulkInstance & { excluded: true })[] } {
  const scopeKey = attr.scope.toLowerCase();
  const matching = BULK_INSTANCES.filter((bi) => bi.types.includes(attr.type) && bi.scopes.includes(scopeKey));
  const active: (BulkInstance & { excluded: false })[] = [];
  const excluded: (BulkInstance & { excluded: true })[] = [];
  for (const bi of matching) {
    const exList = exclusions[bi.instanceId] || [];
    if (exList.includes(attr.name)) {
      excluded.push({ ...bi, excluded: true as const });
    } else {
      active.push({ ...bi, excluded: false as const });
    }
  }
  return { active, excluded };
}

export default function Attributes() {
  const { isMvp } = useMvpMode();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bulkExclusions, setBulkExclusions] = useState<Record<string, string[]>>(DEFAULT_EXCLUSIONS);

  const handleExcludeFromBulk = (instanceId: string, attrName: string) => {
    setBulkExclusions((prev) => ({
      ...prev,
      [instanceId]: [...(prev[instanceId] || []), attrName],
    }));
  };

  const handleIncludeInBulk = (instanceId: string, attrName: string) => {
    setBulkExclusions((prev) => ({
      ...prev,
      [instanceId]: (prev[instanceId] || []).filter((n) => n !== attrName),
    }));
  };
  const [scopeFilter, setScopeFilter] = useState<"all" | AttrScope>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | AttrType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderBy, setOrderBy] = useState<"name" | "date">("name");

  const scopeCounts = useMemo(() => {
    const visitor = MOCK_ATTRIBUTES.filter((a) => a.scope === "Visitor").length;
    const visit = MOCK_ATTRIBUTES.filter((a) => a.scope === "Visit").length;
    const event = MOCK_ATTRIBUTES.filter((a) => a.scope === "Event").length;
    return { all: MOCK_ATTRIBUTES.length, visitor, visit, event };
  }, []);

  const typeCounts = useMemo(() => {
    const counts: Partial<Record<AttrType, number>> = {};
    MOCK_ATTRIBUTES.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return counts;
  }, []);

  const filtered = useMemo(() => {
    let attrs = MOCK_ATTRIBUTES.filter((attr) => {
      if (scopeFilter !== "all" && attr.scope !== scopeFilter) return false;
      if (typeFilter !== "all" && attr.type !== typeFilter) return false;
      if (searchQuery && !attr.name.toLowerCase().includes(searchQuery.toLowerCase()) && !attr.notes.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
    if (orderBy === "name") {
      attrs = [...attrs].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      attrs = [...attrs].sort((a, b) => b.lastModified.localeCompare(a.lastModified));
    }
    return attrs;
  }, [scopeFilter, typeFilter, searchQuery, orderBy]);

  const selectedAttr = selectedId ? MOCK_ATTRIBUTES.find((a) => a.id === selectedId) : null;

  return (
    <div className="attr-page">
      {/* Detail panel overlay */}
      {selectedAttr && (
        <div className="attr-detail-overlay" onClick={() => setSelectedId(null)}>
          <div className="attr-detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="attr-detail-topbar">
              <button className="attr-detail-close" onClick={() => setSelectedId(null)}>
                <i className="fas fa-times" aria-hidden="true" />
              </button>
              <div className="attr-detail-topbar-actions">
                <button className="attr-detail-action-btn"><i className="fas fa-trash" aria-hidden="true" /></button>
                <button className="attr-detail-action-btn"><i className="fas fa-copy" aria-hidden="true" /></button>
                <button className="attr-detail-action-btn"><i className="fas fa-pencil-alt" aria-hidden="true" /></button>
              </div>
            </div>

            <div className="attr-detail-hero">
              <div className="attr-type-icon-large" style={{ background: TYPE_COLORS[selectedAttr.type] }}>
                <i className={TYPE_ICONS[selectedAttr.type]} aria-hidden="true" />
              </div>
              <h2 className="attr-detail-name">{selectedAttr.name}</h2>
              <div className="attr-detail-meta-line">
                <span>{selectedAttr.scope}</span>
                <span className="attr-detail-meta-sep">|</span>
                <span>{selectedAttr.type}</span>
                <span className="attr-detail-meta-sep">|</span>
                <span>Attribute Id : {selectedAttr.attrId}</span>
              </div>
            </div>

            {selectedAttr.notes && (
              <div className="attr-detail-notes">
                <span className="attr-detail-notes-label">Notes:</span> {selectedAttr.notes}
              </div>
            )}

            {/* Execution Timing Diagram */}
            {((selectedAttr.extensions && selectedAttr.extensions.length > 0) || selectedAttr.enrichments.length > 0) && (
              <ExecutionTimingDiagram attr={selectedAttr} onNavigate={() => {}} mvp={isMvp} />
            )}

            {/* Bulk Processing */}
            {!isMvp && (() => {
              const { active, excluded } = getBulkInstancesForAttr(selectedAttr, bulkExclusions);
              if (active.length === 0 && excluded.length === 0) return null;
              return (
                <div className="attr-detail-section">
                  <div className="attr-detail-section-header">
                    <span><i className="fas fa-cubes" aria-hidden="true" /> Bulk Processing ({active.length + excluded.length})</span>
                    <span className="attr-detail-section-help"> - Bulk instances that match this attribute's type and scope</span>
                  </div>
                  {active.map((bi) => (
                    <div key={bi.instanceId} className="attr-bulk-card attr-bulk-card-active">
                      <div className="attr-bulk-card-info">
                        <span className="attr-bulk-card-name">{bi.instanceName}</span>
                        <span className="attr-bulk-card-ext">{bi.extensionName} &middot; {bi.timing}</span>
                      </div>
                      <div className="attr-bulk-card-status">
                        <span className="attr-bulk-status-active"><i className="fas fa-check-circle" aria-hidden="true" /> Active</span>
                        <button type="button" className="attr-bulk-exclude-btn" onClick={() => handleExcludeFromBulk(bi.instanceId, selectedAttr.name)}>
                          <i className="fas fa-ban" aria-hidden="true" /> Exclude
                        </button>
                      </div>
                    </div>
                  ))}
                  {excluded.map((bi) => (
                    <div key={bi.instanceId} className="attr-bulk-card attr-bulk-card-excluded">
                      <div className="attr-bulk-card-info">
                        <span className="attr-bulk-card-name">{bi.instanceName}</span>
                        <span className="attr-bulk-card-ext">{bi.extensionName} &middot; {bi.timing}</span>
                      </div>
                      <div className="attr-bulk-card-status">
                        <span className="attr-bulk-status-excluded"><i className="fas fa-ban" aria-hidden="true" /> Excluded</span>
                        <button type="button" className="attr-bulk-include-btn" onClick={() => handleIncludeInBulk(bi.instanceId, selectedAttr.name)}>
                          <i className="fas fa-check" aria-hidden="true" /> Include
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Server-Side Extensions */}
            {selectedAttr.extensions && selectedAttr.extensions.length > 0 && (
              <div className="attr-detail-section">
                <div className="attr-detail-section-header">
                  <span>Server-Side Extensions ({selectedAttr.extensions.length})</span>
                  <span className="attr-detail-section-help"> - Extension instances that read or write this attribute</span>
                </div>
                {selectedAttr.extensions.map((ext, idx) => (
                  <div key={idx} className={`attr-detail-ext-card ${ext.isBulk ? "attr-detail-ext-card-bulk" : ""}`}>
                    <div className="attr-detail-ext-header">
                      <i className="fas fa-code attr-detail-ext-icon" aria-hidden="true" />
                      <span className="attr-detail-ext-name">{ext.extensionName}</span>
                      <Badge type={ext.direction === "input" ? "informative" : "success"} label={ext.direction} />
                      {ext.isBulk && (
                        <span className="attr-detail-ext-bulk-badge">
                          <i className="fas fa-cubes" aria-hidden="true" />
                          via bulk
                        </span>
                      )}
                    </div>
                    <div className="attr-detail-ext-details">
                      <span className="attr-detail-ext-detail">
                        <i className="fas fa-cubes" aria-hidden="true" /> Instance: <strong>{ext.instanceName}</strong>
                      </span>
                      <span className="attr-detail-ext-detail">
                        <i className="fas fa-clock" aria-hidden="true" /> Scope: <strong>{ext.scope}</strong>
                      </span>
                      <span className="attr-detail-ext-detail">
                        <i className="fas fa-code" aria-hidden="true" /> Variable: <code>{ext.variableName}</code>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Enrichments that populate this attribute */}
            {selectedAttr.enrichments.length > 0 && (
              <div className="attr-detail-section">
                <div className="attr-detail-section-header">
                  <span>Enrichments ({selectedAttr.enrichments.length})</span>
                  <span className="attr-detail-section-help"> - These are used to enrich this attribute</span>
                  <button className="attr-detail-add-btn">Add Enrichment</button>
                </div>
                {selectedAttr.enrichments.map((e, idx) => (
                  <div key={idx} className="attr-detail-enrichment-card">
                    <div className="attr-detail-enrichment-desc">{e.description}</div>
                    <div className="attr-detail-enrichment-when">
                      <span className="attr-detail-when-label">WHEN</span>
                      <span className="attr-detail-when-pipe">|</span>
                      <span>{e.when}</span>
                    </div>
                    {e.rule && (
                      <div className="attr-detail-enrichment-rule">
                        <span className="attr-detail-rule-label">Rule:</span> {e.rule}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Linked enrichments */}
            {selectedAttr.linkedEnrichments && selectedAttr.linkedEnrichments.length > 0 && (
              <div className="attr-detail-section">
                <div className="attr-detail-section-header">
                  <span>Linked Enrichments ({selectedAttr.linkedEnrichments.length})</span>
                  <span className="attr-detail-section-help"> - These refer to other enrichments that are using this attribute</span>
                </div>
                {selectedAttr.linkedEnrichments.map((le, idx) => (
                  <div key={idx} className="attr-detail-enrichment-card attr-detail-enrichment-linked">
                    <div className="attr-detail-enrichment-desc">
                      {le.action} <span className="attr-detail-linked-target" onClick={() => { setSelectedId(le.targetId); }}>{le.target}</span> — {le.description}
                    </div>
                    <div className="attr-detail-enrichment-when">
                      <span className="attr-detail-when-label">WHEN</span>
                      <span className="attr-detail-when-pipe">|</span>
                      <span>{le.when}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="attr-detail-footer">
              Last modified by {selectedAttr.lastModifiedBy} on {selectedAttr.lastModified}
            </div>
          </div>
        </div>
      )}

      <div className="attr-layout">
        {/* Left sidebar filters */}
        <aside className="attr-sidebar">
          <div className="attr-sidebar-search">
            <i className="fas fa-search" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="attr-sidebar-group">
            <div className="attr-sidebar-group-title">Scope</div>
            <button className={`attr-sidebar-filter ${scopeFilter === "all" ? "active" : ""}`} onClick={() => setScopeFilter("all")}>
              <span>all</span><span className="attr-sidebar-count">{scopeCounts.all}</span>
            </button>
            <button className={`attr-sidebar-filter ${scopeFilter === "Visitor" ? "active" : ""}`} onClick={() => setScopeFilter("Visitor")}>
              <span>visitor</span><span className="attr-sidebar-count">{scopeCounts.visitor}</span>
            </button>
            <button className={`attr-sidebar-filter ${scopeFilter === "Visit" ? "active" : ""}`} onClick={() => setScopeFilter("Visit")}>
              <span>visit</span><span className="attr-sidebar-count">{scopeCounts.visit}</span>
            </button>
            <button className={`attr-sidebar-filter ${scopeFilter === "Event" ? "active" : ""}`} onClick={() => setScopeFilter("Event")}>
              <span>event</span><span className="attr-sidebar-count">{scopeCounts.event}</span>
            </button>
          </div>

          <div className="attr-sidebar-group">
            <div className="attr-sidebar-group-title">Order by</div>
            <button className={`attr-sidebar-filter ${orderBy === "name" ? "active" : ""}`} onClick={() => setOrderBy("name")}>
              <i className="fas fa-sort-alpha-down" aria-hidden="true" /> <span>name</span>
            </button>
            <button className={`attr-sidebar-filter ${orderBy === "date" ? "active" : ""}`} onClick={() => setOrderBy("date")}>
              <span>date modified</span>
            </button>
          </div>

          <div className="attr-sidebar-group">
            <div className="attr-sidebar-group-title">By Data Type</div>
            <button className={`attr-sidebar-filter ${typeFilter === "all" ? "active" : ""}`} onClick={() => setTypeFilter("all")}>
              <span>Show All</span>
            </button>
            {(Object.keys(typeCounts) as AttrType[]).sort().map((t) => (
              <button
                key={t}
                className={`attr-sidebar-filter ${typeFilter === t ? "active" : ""}`}
                onClick={() => setTypeFilter(typeFilter === t ? "all" : t)}
              >
                <span className="attr-sidebar-type-dot" style={{ background: TYPE_COLORS[t] }} />
                <span>{t}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <div className="attr-main">
          <div className="attr-main-header">
            <span className="attr-main-count">{filtered.length} Attributes</span>
            <Button type="primary">
              <i className="fas fa-plus" aria-hidden="true" /> Add Attribute
            </Button>
          </div>

          {/* Table header */}
          <div className="attr-table-header">
            <div className="attr-th-icon" />
            <div className="attr-th-name">all</div>
            <div className="attr-th-scope">Scope</div>
            <div className="attr-th-notes">Notes</div>
            <div className="attr-th-adb">AudienceDB</div>
          </div>

          {/* Attribute rows */}
          <div className="attr-table-body">
            {filtered.length === 0 && (
              <div className="attr-empty">No attributes match your filters.</div>
            )}
            {filtered.map((attr) => (
              <div
                key={attr.id}
                className={`attr-row ${selectedId === attr.id ? "attr-row-selected" : ""}`}
                onClick={() => setSelectedId(attr.id)}
                role="button"
                tabIndex={0}
              >
                <div className="attr-row-icon">
                  <span className="attr-type-icon" style={{ background: TYPE_COLORS[attr.type] }}>
                    <i className={TYPE_ICONS[attr.type]} aria-hidden="true" />
                  </span>
                </div>
                <div className="attr-row-name">
                  <span className="attr-row-name-text">{attr.name} ({attr.attrId})</span>
                  <span className="attr-row-modified">Last modified by {attr.lastModifiedBy} on {attr.lastModified}</span>
                </div>
                <div className="attr-row-scope">{attr.scope}</div>
                <div className="attr-row-notes">{attr.notes}</div>
                <div className="attr-row-adb">
                  {attr.audienceDB && <i className="fas fa-check attr-adb-check" aria-hidden="true" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
