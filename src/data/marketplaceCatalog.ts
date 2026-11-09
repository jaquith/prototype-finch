// ─── Marketplace Catalog ─────────────────────────────────────────
// Publisher-authored, ready-to-install server-side extensions ("capsules").
// Installing one adds a locked copy to the active Extension Definitions.
// Once unlocked, it can be edited like any user-authored extension, and
// the definition tracks that it diverged from the published version.
//
// The catalog is organized into two shelves:
//   • Tier 1 "core"      — Tealium-authored primitives (verified).
//   • Tier 2 "community" — composite recipes published by the community.

export type Timing =
  | "Pre-Event"
  | "Post-Event"
  | "Pre-Visitor"
  | "Post-Visitor"
  | "Post-Audience";

export type MarketplaceTier = "core" | "community";

export interface MarketplaceParam {
  id: string;
  variableName: string;
  type: string;
  direction: "input" | "output";
  description?: string;
  staticValue?: string;
}

export interface MarketplaceExtension {
  id: string;
  name: string;
  publisher: string;
  verified: boolean;
  tier: MarketplaceTier;
  category: string;
  icon: string;
  tagline: string;
  description: string;
  /** The manual attribute/enrichment recipe this capsule replaces today. */
  replaces: string;
  version: string;
  /** ISO date the current version was published to the marketplace. */
  publishedAt?: string;
  /** Short "what's new" note describing the latest published version. */
  changelog?: string;
  installs: string;
  rating: number;
  scope: "Event" | "Visit/Visitor" | "Multi-Scope";
  isBulk?: boolean;
  supportedTypes?: string[];
  timings: Timing[];
  allowedPositions: { id: string; label: string }[];
  params: MarketplaceParam[];
  code: string;
}

const POS = {
  preEvent: { id: "preEvent", label: "Pre-Event" },
  postEvent: { id: "postEvent", label: "Post-Event" },
  preVisitor: { id: "preVisitor", label: "Pre-Visitor" },
  postVisitor: { id: "postVisitor", label: "Post-Visitor" },
  postAudience: { id: "postAudience", label: "Post-Audience" },
};

export const MARKETPLACE_CATALOG: MarketplaceExtension[] = [
  // ─── Tier 1 — Core (Tealium-authored primitives) ───────────────
  {
    id: "mkt-days-since",
    name: "Days Since Last Event",
    publisher: "Tealium",
    verified: true,
    tier: "core",
    category: "Dates",
    icon: "fas fa-clock",
    tagline: "Days since a visitor last did something.",
    description:
      "Emits the number of days since a visitor last performed a chosen event — last purchase, last login, last visit. Replaces the classic two-date-plus-subtraction recipe with a single configurable attribute.",
    replaces:
      "A 3-attribute, 3-enrichment recipe: one conditional Capture Date, one unconditional Capture Date, and a Set Difference Between Two Dates.",
    version: "1.4.0",
    publishedAt: "2026-06-15",
    installs: "4,120",
    rating: 4.8,
    scope: "Visit/Visitor",
    timings: ["Post-Event", "Post-Visitor", "Post-Audience"],
    allowedPositions: [POS.postEvent, POS.postVisitor, POS.postAudience],
    params: [
      { id: "p1", variableName: "triggerEvent", type: "String", direction: "input", description: "Event that resets the clock (e.g. purchase)" },
      { id: "p2", variableName: "lastSeenAt", type: "Date", direction: "input", description: "Timestamp of the visitor's last qualifying event" },
      { id: "p3", variableName: "daysSince", type: "Number", direction: "output", description: "Whole days since the last qualifying event" },
    ],
    code: `  // Whole days between the last qualifying event and now.
  const last = new Date(input.lastSeenAt || 0).getTime();
  if (!last) { output.daysSince = null; return; }
  const ms = Date.now() - last;
  output.daysSince = Math.max(0, Math.floor(ms / 86400000));
`,
  },
  {
    id: "mkt-normalize-string",
    name: "Normalize String",
    publisher: "Tealium",
    verified: true,
    tier: "core",
    category: "Strings",
    icon: "fas fa-font",
    tagline: "Trim, lowercase, and strip characters in one step.",
    description:
      "Cleans a string in a single pass: trims whitespace, applies a consistent case, and strips unwanted characters. Runs in bulk across every String attribute of a scope so normalization stops being a multi-enrichment chain.",
    replaces:
      "Multi-step chains of Lowercase String, Remove String, and Set String — or a fallback to Functions.",
    version: "2.1.3",
    publishedAt: "2026-05-02",
    installs: "3,150",
    rating: 4.7,
    scope: "Multi-Scope",
    isBulk: true,
    supportedTypes: ["String"],
    timings: ["Pre-Event", "Post-Event", "Pre-Visitor", "Post-Visitor", "Post-Audience"],
    allowedPositions: [POS.preEvent, POS.postEvent, POS.preVisitor, POS.postVisitor, POS.postAudience],
    params: [
      { id: "p0", variableName: "name", type: "String", direction: "input", description: "Attribute name (provided by framework)" },
      { id: "p1", variableName: "value", type: "String", direction: "input", description: "Raw string to normalize" },
      { id: "p2", variableName: "casing", type: "Static String", direction: "input", staticValue: "lower", description: "lower | upper | none" },
      { id: "p3", variableName: "stripChars", type: "Static String", direction: "input", staticValue: "", description: "Characters to remove (regex class)" },
      { id: "p4", variableName: "value", type: "String", direction: "output", description: "Trimmed, cased, stripped value" },
    ],
    code: `  // Trim, apply casing, then strip unwanted characters in one pass.
  let s = String(input.value || "").trim();
  if (input.casing === "lower") s = s.toLowerCase();
  else if (input.casing === "upper") s = s.toUpperCase();
  if (input.stripChars) s = s.replace(new RegExp("[" + input.stripChars + "]", "g"), "");
  output.value = s;
`,
  },
  {
    id: "mkt-set-builder",
    name: "Set Builder & Dedupe",
    publisher: "Tealium",
    verified: true,
    tier: "core",
    category: "Lists & Sets",
    icon: "fas fa-clone",
    tagline: "Collect values into a deduplicated set.",
    description:
      "Accumulates values into a deduplicated Set of Strings — categories browsed, brands purchased, SKUs viewed — with an optional filter. Replaces hand-guarded Add-To-Set chains with one attribute.",
    replaces:
      "Chains of Add To Property Set / Add To Set of Strings with manual guards, or Functions when filtering is needed.",
    version: "3.2.0",
    publishedAt: "2026-08-05",
    changelog:
      "v3.2.0 adds an optional case-insensitive dedupe mode and fixes a bug where empty filter matches could add blank entries to the set.",
    installs: "5,400",
    rating: 4.9,
    scope: "Visit/Visitor",
    timings: ["Post-Event", "Post-Visitor"],
    allowedPositions: [POS.postEvent, POS.postVisitor],
    params: [
      { id: "p1", variableName: "sourceValue", type: "String", direction: "input", description: "Value to add to the set" },
      { id: "p2", variableName: "existingSet", type: "Set of Strings", direction: "input", description: "Current accumulated set" },
      { id: "p3", variableName: "filter", type: "Static String", direction: "input", staticValue: "", description: "Optional regex; only matches are added" },
      { id: "p4", variableName: "values", type: "Set of Strings", direction: "output", description: "Deduplicated set of collected values" },
    ],
    code: `  // Add the incoming value to the set unless it fails the filter.
  const set = new Set(input.existingSet || []);
  const v = String(input.sourceValue || "").trim();
  const ok = v && (!input.filter || new RegExp(input.filter).test(v));
  if (ok) set.add(v);
  output.values = Array.from(set);
`,
  },
  {
    id: "mkt-rolling-count",
    name: "Rolling Count in a Time Window",
    publisher: "Tealium",
    verified: true,
    tier: "core",
    category: "Dates",
    icon: "fas fa-history",
    tagline: "Count of an event in the last N days.",
    description:
      "Counts how many times an event occurred within a configurable rolling window (7 / 30 / 90 days) from one attribute, instead of maintaining a separate timeline per window.",
    replaces:
      "The single-expiration-per-timeline constraint that forces a separate timeline per window, each with its own Update Timeline + Set Expiration pair.",
    version: "1.1.2",
    publishedAt: "2026-07-10",
    installs: "3,880",
    rating: 4.6,
    scope: "Visit/Visitor",
    timings: ["Post-Event", "Post-Visitor", "Post-Audience"],
    allowedPositions: [POS.postEvent, POS.postVisitor, POS.postAudience],
    params: [
      { id: "p1", variableName: "eventTimestamps", type: "Timeline", direction: "input", description: "Timeline of qualifying event timestamps" },
      { id: "p2", variableName: "windowDays", type: "Static Number", direction: "input", staticValue: "30", description: "Look-back window length in days" },
      { id: "p3", variableName: "count", type: "Number", direction: "output", description: "Events within the window" },
    ],
    code: `  // Count timeline entries newer than the rolling window boundary.
  const days = Number(input.windowDays || 30);
  const cutoff = Date.now() - days * 86400000;
  const entries = input.eventTimestamps || [];
  output.count = entries.filter((t) => new Date(t).getTime() >= cutoff).length;
`,
  },

  // ─── Tier 2 — Community (composite recipes) ────────────────────
  {
    id: "mkt-cart-abandon",
    name: "Cart Abandonment Badge",
    publisher: "Retail Patterns Co.",
    verified: false,
    tier: "community",
    category: "Ecommerce",
    icon: "fas fa-cart-arrow-down",
    tagline: "Flag sessions that ended with items in cart, no purchase.",
    description:
      "A four-state badge that turns on when a visitor ends a session holding cart items without purchasing, and clears itself on purchase or an emptied cart. Composes directly with the Live Cart State Flag.",
    replaces:
      "4 enrichments on the session-end trigger — one per state transition (assign on has-cart, assign on not-purchased, remove on purchased, remove on empty).",
    version: "1.0.5",
    publishedAt: "2026-04-20",
    installs: "2,640",
    rating: 4.4,
    scope: "Visit/Visitor",
    timings: ["Post-Event", "Post-Visitor"],
    allowedPositions: [POS.postEvent, POS.postVisitor],
    params: [
      { id: "p1", variableName: "cartPopulated", type: "Boolean", direction: "input", description: "Visitor currently has cart items" },
      { id: "p2", variableName: "purchased", type: "Boolean", direction: "input", description: "Visitor completed a purchase" },
      { id: "p3", variableName: "abandonedCart", type: "Badge", direction: "output", description: "Badge: abandoned cart this session" },
    ],
    code: `  // Badge is on only when there's a cart and no purchase followed.
  output.abandonedCart = Boolean(input.cartPopulated) && !input.purchased;
`,
  },
  {
    id: "mkt-cart-state",
    name: "Live Cart State Flag",
    publisher: "Retail Patterns Co.",
    verified: false,
    tier: "community",
    category: "Ecommerce",
    icon: "fas fa-shopping-cart",
    tagline: "Boolean for whether the visitor has items in cart right now.",
    description:
      "Maintains a live boolean of the visitor's cart state: reset at visit start, set true on a non-empty cart view, set false on an empty cart view. The building block for cart-abandonment logic.",
    replaces:
      "3 enrichments: reset to false on visit start, set true on non-empty cart view, set false on empty cart view.",
    version: "1.0.2",
    publishedAt: "2026-03-18",
    installs: "2,210",
    rating: 4.2,
    scope: "Visit/Visitor",
    timings: ["Post-Event"],
    allowedPositions: [POS.postEvent],
    params: [
      { id: "p1", variableName: "cartNonEmpty", type: "Boolean", direction: "input", description: "Signal: cart view with items" },
      { id: "p2", variableName: "cartEmpty", type: "Boolean", direction: "input", description: "Signal: cart view with no items" },
      { id: "p3", variableName: "hasCart", type: "Boolean", direction: "output", description: "True while the cart holds items" },
    ],
    code: `  // Empty view always wins; otherwise a non-empty view sets the flag.
  if (input.cartEmpty) output.hasCart = false;
  else if (input.cartNonEmpty) output.hasCart = true;
`,
  },
  {
    id: "mkt-frequency-badge",
    name: "Frequency Threshold Badge",
    publisher: "Convert Collective",
    verified: false,
    tier: "community",
    category: "Segmentation",
    icon: "fas fa-trophy",
    tagline: '"Did X at least N times in the last M days" as one badge.',
    description:
      "Collapses the heaviest hand-built segmentation recipe into a single configurable badge: qualify an event or URL pattern, set a count threshold and a rolling window, and get a badge when the visitor crosses it.",
    replaces:
      "Up to 21 transformations — URL flags, timeline push/expiration/count, threshold comparisons, and intermediate badge chaining.",
    version: "2.3.1",
    publishedAt: "2026-07-22",
    installs: "1,490",
    rating: 4.1,
    scope: "Visit/Visitor",
    timings: ["Post-Visitor", "Post-Audience"],
    allowedPositions: [POS.postVisitor, POS.postAudience],
    params: [
      { id: "p1", variableName: "qualifyingCount", type: "Number", direction: "input", description: "Rolling count of the qualifying event" },
      { id: "p2", variableName: "threshold", type: "Static Number", direction: "input", staticValue: "3", description: "Minimum count to earn the badge" },
      { id: "p3", variableName: "earned", type: "Badge", direction: "output", description: "Badge when count ≥ threshold" },
    ],
    code: `  // Earn the badge once the qualifying count meets the threshold.
  output.earned = Number(input.qualifyingCount || 0) >= Number(input.threshold || 1);
`,
  },
  {
    id: "mkt-url-flag",
    name: "URL Pattern Flag",
    publisher: "Convert Collective",
    verified: false,
    tier: "community",
    category: "Segmentation",
    icon: "fas fa-link",
    tagline: "Boolean that turns on when the URL matches a pattern.",
    description:
      "Turns a page-URL pattern into a reusable boolean — product pages, checkout, a funnel step — replacing the pile of one-off contains/regex flag attributes that get copied across audiences.",
    replaces:
      "1–4 intermediate Set Boolean flag attributes per pattern, each gated by a contains/regex rule and reused across audiences.",
    version: "1.5.0",
    publishedAt: "2026-06-30",
    installs: "2,980",
    rating: 4.3,
    scope: "Event",
    timings: ["Pre-Event", "Post-Event"],
    allowedPositions: [POS.preEvent, POS.postEvent],
    params: [
      { id: "p1", variableName: "pageUrl", type: "String", direction: "input", description: "Current page URL" },
      { id: "p2", variableName: "pattern", type: "Static String", direction: "input", staticValue: "/checkout", description: "Substring or regex to match" },
      { id: "p3", variableName: "matches", type: "Boolean", direction: "output", description: "True when the URL matches" },
    ],
    code: `  // Match the current URL against the configured pattern.
  const url = String(input.pageUrl || "");
  try { output.matches = new RegExp(input.pattern).test(url); }
  catch { output.matches = url.includes(input.pattern); }
`,
  },
  {
    id: "mkt-engagement-rfm",
    name: "Engagement Score (RFM-style)",
    publisher: "Signal Foundry",
    verified: false,
    tier: "community",
    category: "Scoring",
    icon: "fas fa-chart-line",
    tagline: "One numeric score from recency, frequency, and monetary inputs.",
    description:
      "Blends recency, frequency, and monetary signals into a single weighted engagement/loyalty score, replacing sprawling chains of running-total metrics, timeline counts, and thresholds.",
    replaces:
      "Running-total metrics (Increment / Decrement, Increment Tally) combined with timeline counts and thresholds across many intermediate attributes.",
    version: "0.9.4",
    publishedAt: "2026-08-01",
    installs: "1,320",
    rating: 4.0,
    scope: "Visit/Visitor",
    timings: ["Post-Visitor", "Post-Audience"],
    allowedPositions: [POS.postVisitor, POS.postAudience],
    params: [
      { id: "p1", variableName: "recency", type: "Number", direction: "input", description: "Recency signal (e.g. days since last visit, inverted)" },
      { id: "p2", variableName: "frequency", type: "Number", direction: "input", description: "Frequency signal (e.g. visits in window)" },
      { id: "p3", variableName: "monetary", type: "Number", direction: "input", description: "Monetary signal (e.g. lifetime spend)" },
      { id: "p4", variableName: "weights", type: "Static String", direction: "input", staticValue: "0.4,0.3,0.3", description: "R,F,M weights (must sum to 1)" },
      { id: "p5", variableName: "score", type: "Number", direction: "output", description: "Weighted 0-100 engagement score" },
    ],
    code: `  // Weighted blend of recency, frequency, and monetary signals.
  const [wr, wf, wm] = String(input.weights || "0.4,0.3,0.3").split(",").map(Number);
  const raw = wr * Number(input.recency || 0) + wf * Number(input.frequency || 0) + wm * Number(input.monetary || 0);
  output.score = Math.max(0, Math.min(100, Math.round(raw)));
`,
  },
];

export function getCatalogItem(id: string): MarketplaceExtension | undefined {
  return MARKETPLACE_CATALOG.find((e) => e.id === id);
}

export function isMarketplaceId(id: string | undefined): boolean {
  return !!id && id.startsWith("mkt-");
}

export const MARKETPLACE_CATEGORIES = Array.from(
  new Set(MARKETPLACE_CATALOG.map((e) => e.category))
).sort();

export const TIER_LABELS: Record<MarketplaceTier, { title: string; blurb: string }> = {
  core: {
    title: "Tealium Core",
    blurb: "First-party primitives, curated and verified by Tealium.",
  },
  community: {
    title: "Community",
    blurb: "Composite recipes published and maintained by the community.",
  },
};
