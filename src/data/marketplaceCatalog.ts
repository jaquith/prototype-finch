// ─── Marketplace Catalog ─────────────────────────────────────────
// Publisher-authored, ready-to-install server-side extensions.
// Installing one adds a locked copy to the active Extension Definitions.
// Once unlocked, it can be edited like any user-authored extension, and
// the definition tracks that it diverged from the published version.

export type Timing =
  | "Pre-Event"
  | "Post-Event"
  | "Pre-Visitor"
  | "Post-Visitor"
  | "Post-Audience";

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
  category: string;
  icon: string;
  tagline: string;
  description: string;
  version: string;
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
  {
    id: "mkt-email-hash",
    name: "Email Hasher (SHA-256)",
    publisher: "Tealium Labs",
    verified: true,
    category: "Privacy & Compliance",
    icon: "fas fa-key",
    tagline: "Irreversibly hash email addresses before activation.",
    description:
      "Normalizes and SHA-256 hashes email addresses so raw PII never leaves the pipeline. Runs in bulk across any String attribute, lowercasing and trimming before hashing to match partner match-key specs.",
    version: "2.3.1",
    installs: "18.2k",
    rating: 4.8,
    scope: "Multi-Scope",
    isBulk: true,
    supportedTypes: ["String"],
    timings: ["Pre-Event", "Post-Event", "Pre-Visitor", "Post-Visitor", "Post-Audience"],
    allowedPositions: [POS.preEvent, POS.postEvent, POS.preVisitor, POS.postVisitor, POS.postAudience],
    params: [
      { id: "p0", variableName: "name", type: "String", direction: "input", description: "Attribute name (provided by framework)" },
      { id: "p1", variableName: "value", type: "String", direction: "input", description: "Raw email address to hash" },
      { id: "p2", variableName: "value", type: "String", direction: "output", description: "Lowercased, trimmed, SHA-256 hashed value" },
    ],
    code: `  // Normalize then hash the email so it can be used as a match key.
  const email = String(input.value || "").trim().toLowerCase();
  if (!email) { output.value = ""; return; }
  output.value = await sha256(email);
`,
  },
  {
    id: "mkt-geoip",
    name: "GeoIP Enrichment",
    publisher: "Maxwell Data",
    verified: true,
    category: "Enrichment",
    icon: "fas fa-map-marker-alt",
    tagline: "Resolve IP addresses to country, region, and city.",
    description:
      "Looks up the visitor's IP against a bundled GeoIP database and writes country, region, and city attributes. Ideal for geo-based audiences and compliance routing at the event edge.",
    version: "5.1.0",
    installs: "31.7k",
    rating: 4.6,
    scope: "Event",
    timings: ["Pre-Event", "Post-Event"],
    allowedPositions: [POS.preEvent, POS.postEvent],
    params: [
      { id: "p1", variableName: "ipAddress", type: "String", direction: "input", description: "Visitor IP address" },
      { id: "p2", variableName: "country", type: "String", direction: "output", description: "ISO country code" },
      { id: "p3", variableName: "region", type: "String", direction: "output", description: "Region / state" },
      { id: "p4", variableName: "city", type: "String", direction: "output", description: "Resolved city name" },
    ],
    code: `  // Resolve the IP against the bundled GeoIP dataset.
  const geo = await geoipLookup(input.ipAddress);
  output.country = geo.countryCode || "";
  output.region = geo.region || "";
  output.city = geo.city || "";
`,
  },
  {
    id: "mkt-sentiment",
    name: "Sentiment Scorer",
    publisher: "Lexicon AI",
    verified: false,
    category: "Machine Learning",
    icon: "fas fa-smile",
    tagline: "Score free-text feedback from -1 (negative) to 1 (positive).",
    description:
      "Runs a lightweight sentiment model over free-text fields such as reviews, search queries, or support messages, emitting a normalized sentiment score you can threshold into audiences.",
    version: "1.4.2",
    installs: "6.9k",
    rating: 4.3,
    scope: "Visit/Visitor",
    timings: ["Post-Visitor", "Post-Audience"],
    allowedPositions: [POS.postVisitor, POS.postAudience],
    params: [
      { id: "p1", variableName: "text", type: "String", direction: "input", description: "Free-text to analyze" },
      { id: "p2", variableName: "sentiment", type: "Number", direction: "output", description: "Score from -1 to 1" },
    ],
    code: `  // Score sentiment of the provided text (-1 negative … 1 positive).
  const text = String(input.text || "");
  output.sentiment = text ? scoreSentiment(text) : 0;
`,
  },
  {
    id: "mkt-currency",
    name: "Currency Normalizer",
    publisher: "FXStream",
    verified: true,
    category: "Data Quality",
    icon: "fas fa-money-bill-transfer",
    tagline: "Convert monetary values to a single base currency.",
    description:
      "Converts any numeric monetary attribute into a configured base currency using daily FX rates. Runs in bulk so every revenue-style Number attribute stays comparable across regions.",
    version: "3.0.4",
    installs: "9.5k",
    rating: 4.5,
    scope: "Multi-Scope",
    isBulk: true,
    supportedTypes: ["Number"],
    timings: ["Post-Event", "Post-Visitor", "Post-Audience"],
    allowedPositions: [POS.postEvent, POS.postVisitor, POS.postAudience],
    params: [
      { id: "p1", variableName: "value", type: "Number", direction: "input", description: "Monetary amount in source currency" },
      { id: "p2", variableName: "sourceCurrency", type: "Static String", direction: "input", staticValue: "USD", description: "ISO code of the source currency" },
      { id: "p3", variableName: "baseCurrency", type: "Static String", direction: "input", staticValue: "USD", description: "ISO code to normalize into" },
      { id: "p4", variableName: "value", type: "Number", direction: "output", description: "Amount converted to base currency" },
    ],
    code: `  // Convert the amount into the configured base currency.
  const rate = await fxRate(input.sourceCurrency, input.baseCurrency);
  output.value = Math.round(Number(input.value || 0) * rate * 100) / 100;
`,
  },
  {
    id: "mkt-phone",
    name: "Phone Formatter (E.164)",
    publisher: "Tealium Labs",
    verified: true,
    category: "Data Quality",
    icon: "fas fa-phone",
    tagline: "Standardize phone numbers to E.164 format.",
    description:
      "Cleans and reformats phone numbers to the international E.164 standard, applying a default country code when one is missing. Bulk-mode ready for any String attribute.",
    version: "1.2.0",
    installs: "4.1k",
    rating: 4.2,
    scope: "Multi-Scope",
    isBulk: true,
    supportedTypes: ["String"],
    timings: ["Pre-Event", "Post-Event", "Post-Visitor"],
    allowedPositions: [POS.preEvent, POS.postEvent, POS.postVisitor],
    params: [
      { id: "p0", variableName: "name", type: "String", direction: "input", description: "Attribute name (provided by framework)" },
      { id: "p1", variableName: "value", type: "String", direction: "input", description: "Raw phone number" },
      { id: "p2", variableName: "defaultCountry", type: "Static String", direction: "input", staticValue: "US", description: "Fallback country code" },
      { id: "p3", variableName: "value", type: "String", direction: "output", description: "E.164 formatted number" },
    ],
    code: `  // Reformat to E.164, falling back to the default country when needed.
  const digits = String(input.value || "").replace(/[^0-9+]/g, "");
  output.value = toE164(digits, input.defaultCountry);
`,
  },
  {
    id: "mkt-bot-detect",
    name: "Bot & Fraud Detector",
    publisher: "Sentinel Security",
    verified: true,
    category: "Security",
    icon: "fas fa-robot",
    tagline: "Flag automated and suspicious traffic with a risk score.",
    description:
      "Combines user-agent heuristics and IP reputation to produce a 0–100 bot risk score plus a boolean flag, letting you exclude non-human traffic from audiences and activations.",
    version: "4.7.3",
    installs: "22.0k",
    rating: 4.7,
    scope: "Event",
    timings: ["Pre-Event", "Post-Event"],
    allowedPositions: [POS.preEvent, POS.postEvent],
    params: [
      { id: "p1", variableName: "userAgent", type: "String", direction: "input", description: "Raw user-agent string" },
      { id: "p2", variableName: "ipAddress", type: "String", direction: "input", description: "Visitor IP address" },
      { id: "p3", variableName: "botScore", type: "Number", direction: "output", description: "Risk score 0-100" },
      { id: "p4", variableName: "isBot", type: "Boolean", direction: "output", description: "True when score exceeds threshold" },
    ],
    code: `  // Blend UA heuristics with IP reputation into a single risk score.
  const uaRisk = scoreUserAgent(input.userAgent);
  const ipRisk = await ipReputation(input.ipAddress);
  const score = Math.min(100, Math.round(uaRisk * 0.6 + ipRisk * 0.4));
  output.botScore = score;
  output.isBot = score >= 70;
`,
  },
  {
    id: "mkt-ltv-predict",
    name: "Predictive LTV Model",
    publisher: "Lexicon AI",
    verified: false,
    category: "Machine Learning",
    icon: "fas fa-chart-line",
    tagline: "Forecast 12-month customer lifetime value.",
    description:
      "Estimates a visitor's projected 12-month lifetime value from purchase history and engagement signals, so high-value prospects can be targeted before they convert.",
    version: "0.9.6",
    installs: "3.3k",
    rating: 4.0,
    scope: "Visit/Visitor",
    timings: ["Post-Visitor", "Post-Audience"],
    allowedPositions: [POS.postVisitor, POS.postAudience],
    params: [
      { id: "p1", variableName: "purchaseCount", type: "Number", direction: "input", description: "Lifetime purchase count" },
      { id: "p2", variableName: "avgOrderValue", type: "Number", direction: "input", description: "Average order value" },
      { id: "p3", variableName: "daysActive", type: "Number", direction: "input", description: "Days since first seen" },
      { id: "p4", variableName: "predictedLtv", type: "Number", direction: "output", description: "Projected 12-month LTV" },
    ],
    code: `  // Simple decayed projection of lifetime value.
  const freq = Number(input.purchaseCount || 0) / Math.max(1, Number(input.daysActive || 1));
  const projected = freq * 365 * Number(input.avgOrderValue || 0);
  output.predictedLtv = Math.round(projected * 100) / 100;
`,
  },
  {
    id: "mkt-consent",
    name: "Consent String Parser (TCF v2)",
    publisher: "Tealium Labs",
    verified: true,
    category: "Privacy & Compliance",
    icon: "fas fa-shield-halved",
    tagline: "Decode IAB TCF v2 consent strings into usable flags.",
    description:
      "Parses an IAB TCF v2 consent string and exposes granular purpose flags such as advertising and analytics consent, so downstream extensions and activations honor visitor choices.",
    version: "2.0.0",
    installs: "11.8k",
    rating: 4.6,
    scope: "Event",
    timings: ["Pre-Event", "Post-Event"],
    allowedPositions: [POS.preEvent, POS.postEvent],
    params: [
      { id: "p1", variableName: "consentString", type: "String", direction: "input", description: "Encoded TCF v2 consent string" },
      { id: "p2", variableName: "adConsent", type: "Boolean", direction: "output", description: "Consent for advertising" },
      { id: "p3", variableName: "analyticsConsent", type: "Boolean", direction: "output", description: "Consent for analytics" },
    ],
    code: `  // Decode the TCF v2 string and surface the purposes we care about.
  const decoded = decodeTcf(input.consentString);
  output.adConsent = decoded.purpose(2) && decoded.purpose(3);
  output.analyticsConsent = decoded.purpose(7);
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
