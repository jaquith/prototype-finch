import type { EnrichmentCondition } from "../components/EnrichmentConditions";

export type AttrScope = "Visit" | "Visitor" | "Event";
export type AttrType = "String" | "Number" | "Boolean" | "Tally" | "Timeline" | "Set of Strings" | "Date" | "Funnel";

export interface Enrichment {
  source: string;
  sourceType: "extension" | "rule" | "connector";
  description: string;
  when: string;
  rule?: string;
  conditions?: EnrichmentCondition[];
}

export interface ExtensionRef {
  extensionName: string;
  instanceName: string;
  scope: string;
  direction: "input" | "output";
  variableName: string;
  isBulk?: boolean;
  bulkLabel?: string;
}

export interface LinkedEnrichment {
  action: string;
  target: string;
  targetId: string;
  description: string;
  when: string;
}

export interface Attribute {
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

export const MOCK_ATTRIBUTES: Attribute[] = [
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
      { action: "Compute Engagement Score", target: "engagement_score", targetId: "a10", description: "Used as input to the Compute Engagement Score function", when: "Post-Visitor" },
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
      { action: "Compute Engagement Score", target: "engagement_score", targetId: "a10", description: "Used as input to the Compute Engagement Score function", when: "Post-Visitor" },
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
      { source: "Set Loyalty Tier", sourceType: "rule", description: "For String loyalty_tier, set value to \"gold\" when lifetime_revenue is greater than 5000", when: "Any Event", rule: "High Value Customer", conditions: [
        { attribute: "lifetime_revenue", operator: "greater than", values: ["5000"] },
        { attribute: "last_interaction_date", operator: "custom:op3", values: ["90"] },
      ] },
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
    notes: "Page title from the data layer, normalized by function",
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
      { source: "Add Search Term", sourceType: "rule", description: "For Set of Strings search_history, add search_query when search_query is assigned", when: "Any Event", rule: "Search Performed", conditions: [
        { attribute: "search_query", operator: "is set", values: [] },
        { attribute: "search_query", operator: "custom:op2", values: ["^[\\w\\s-]{3,64}$"] },
        { attribute: "search_history", operator: "custom:op4", values: ["shoes, boots, sandals"], negate: true },
      ] },
    ],
    extensions: [],
    linkedEnrichments: [],
    lastModified: "Feb 20, 2026 at 9:45 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a22",
    attrId: 5218,
    name: "order_date",
    type: "Date",
    scope: "Event",
    notes: "Timestamp of the order, taken from the purchase event payload",
    enrichments: [],
    extensions: [],
    linkedEnrichments: [
      { action: "Set Last Purchase Date", target: "last_purchase_date", targetId: "a24", description: "Copies the order date to the visitor's last purchase date", when: "Any Event" },
      { action: "Set Holiday Purchase Date", target: "holiday_purchase_date", targetId: "a25", description: "Records orders placed around Black Friday", when: "Any Event" },
    ],
    lastModified: "Mar 14, 2026 at 10:05 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: false,
  },
  {
    id: "a23",
    attrId: 5219,
    name: "first_visit_date",
    type: "Date",
    scope: "Visitor",
    notes: "Date of the visitor's first recorded visit. Never overwritten.",
    enrichments: [
      { source: "Set First Visit Date", sourceType: "rule", description: "For Date first_visit_date, set to the current timestamp when first_visit_date is not set", when: "New Visitor", rule: "First Visit" },
    ],
    extensions: [],
    linkedEnrichments: [],
    lastModified: "Mar 14, 2026 at 10:12 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a24",
    attrId: 5220,
    name: "last_purchase_date",
    type: "Date",
    scope: "Visitor",
    notes: "Most recent order date across all visits",
    enrichments: [
      { source: "Set Last Purchase Date", sourceType: "rule", description: "For Date last_purchase_date, set to order_date when order_date is assigned", when: "Any Event", rule: "Purchase Completed", conditions: [
        { attribute: "order_date", operator: "is set", values: [] },
      ] },
    ],
    extensions: [],
    linkedEnrichments: [
      { action: "Set Win-Back Date", target: "winback_eligible_date", targetId: "a26", description: "Marks lapsed customers for win-back campaigns", when: "Any Event" },
    ],
    lastModified: "Mar 14, 2026 at 10:20 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a25",
    attrId: 5221,
    name: "holiday_purchase_date",
    type: "Date",
    scope: "Visitor",
    notes: "Order date of a purchase made within a week of Black Friday",
    enrichments: [
      { source: "Set Holiday Purchase Date", sourceType: "rule", description: "For Date holiday_purchase_date, set to order_date when order_date is within 7 days of Black Friday", when: "Any Event", rule: "Purchase Completed", conditions: [
        { attribute: "order_date", operator: "is set", values: [] },
        { attribute: "order_date", operator: "custom:op5", values: ["7", "2026-11-27"] },
      ] },
    ],
    extensions: [],
    linkedEnrichments: [],
    lastModified: "Mar 14, 2026 at 10:31 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a26",
    attrId: 5222,
    name: "winback_eligible_date",
    type: "Date",
    scope: "Visitor",
    notes: "Set when a returning customer hasn't purchased in 90 days",
    enrichments: [
      { source: "Set Win-Back Date", sourceType: "rule", description: "For Date winback_eligible_date, set to the current timestamp when last_purchase_date is not within the last 90 days", when: "New Visit", rule: "Returning Visitor", conditions: [
        { attribute: "last_purchase_date", operator: "is set", values: [] },
        { attribute: "last_purchase_date", operator: "custom:op3", values: ["90"], negate: true },
      ] },
    ],
    extensions: [],
    linkedEnrichments: [],
    lastModified: "Mar 14, 2026 at 10:40 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a27",
    attrId: 5230,
    name: "email",
    type: "String",
    scope: "Visitor",
    notes: "Most recent email address captured from a form or login",
    enrichments: [],
    lastModified: "Mar 15, 2026 at 9:12 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a28",
    attrId: 5231,
    name: "preferred_categories",
    type: "Set of Strings",
    scope: "Visitor",
    notes: "Product categories the visitor has browsed most",
    enrichments: [],
    lastModified: "Mar 15, 2026 at 9:14 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
  {
    id: "a29",
    attrId: 5232,
    name: "company_name",
    type: "String",
    scope: "Visitor",
    notes: "Company name from a B2B lead form",
    enrichments: [],
    lastModified: "Mar 15, 2026 at 9:16 AM",
    lastModifiedBy: "caleb.jaquith@tealium.com",
    audienceDB: true,
  },
];
