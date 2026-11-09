// ─── Marketplace Catalog ─────────────────────────────────────────
// Every Tealium- and Community-published extension in the registry, shaped
// for the Marketplace. The registry (./extensions) is the single source of
// truth for name, description, params, code and tests; this file only adds
// storefront metadata (icon, version, installs, rating).
//
// Installing one adds a locked copy to the active Extension Definitions.
// Once unlocked, it can be edited like any team-authored extension, and the
// definition tracks that it diverged from the published version.

import { EXTENSIONS } from "./extensions";
import type { ExtensionDefinition } from "./extensionTypes";

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
  /** Id of the backing entry in the extension registry. */
  registryId: string;
  /**
   * Set when this extension is already one of the workspace's Extension
   * Definitions, so the Marketplace shows it as added and opens that copy.
   */
  definitionId?: string;
  name: string;
  publisher: string;
  verified: boolean;
  tier: MarketplaceTier;
  category: string;
  icon: string;
  tagline: string;
  description: string;
  /** The manual attribute/enrichment recipe this extension replaces today. */
  replaces: string;
  version: string;
  /** ISO date the current version was published to the marketplace. */
  publishedAt?: string;
  /** Short "what's new" note describing the latest published version. */
  changelog?: string;
  installs: string;
  rating: number;
  testCount: number;
  scope: "Event" | "Visit/Visitor" | "Multi-Scope";
  isBulk?: boolean;
  supportedTypes?: string[];
  timings: Timing[];
  allowedPositions: { id: string; label: string }[];
  params: MarketplaceParam[];
  code: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Data cleanup": "fas fa-broom",
  "Privacy and identity": "fas fa-user-shield",
  "Time and dates": "fas fa-clock",
  Scoring: "fas fa-chart-line",
  Commerce: "fas fa-shopping-cart",
};

interface StorefrontMeta {
  version: string;
  publishedAt: string;
  installs: string;
  rating: number;
  changelog?: string;
}

const STOREFRONT: Record<string, StorefrontMeta> = {
  "1": { version: "2.3.0", publishedAt: "2026-05-20", installs: "5,410", rating: 4.8 },
  "8": { version: "1.6.1", publishedAt: "2026-06-02", installs: "1,280", rating: 4.5 },
  "10": { version: "3.1.0", publishedAt: "2026-07-01", installs: "3,960", rating: 4.7 },
  "11": { version: "2.1.3", publishedAt: "2026-05-02", installs: "6,020", rating: 4.9 },
  "12": { version: "1.2.0", publishedAt: "2026-06-24", installs: "2,140", rating: 4.6 },
  "13": { version: "1.0.4", publishedAt: "2026-07-18", installs: "870", rating: 4.4 },
  "14": { version: "2.0.0", publishedAt: "2026-06-11", installs: "1,930", rating: 4.6 },
  "15": {
    version: "1.3.0",
    publishedAt: "2026-08-04",
    installs: "4,480",
    rating: 4.8,
    changelog: "Now also redacts international phone formats with a leading + and spaces.",
  },
  "16": { version: "1.1.0", publishedAt: "2026-05-28", installs: "640", rating: 4.3 },
  "17": { version: "1.4.2", publishedAt: "2026-07-09", installs: "2,310", rating: 4.7 },
  "18": { version: "2.2.0", publishedAt: "2026-07-22", installs: "1,750", rating: 4.5 },
  "19": { version: "1.0.1", publishedAt: "2026-06-30", installs: "420", rating: 4.2 },
  "20": { version: "1.2.3", publishedAt: "2026-07-14", installs: "980", rating: 4.4 },
  "21": { version: "1.0.0", publishedAt: "2026-08-01", installs: "310", rating: 4.1 },
};

// Registry extensions that already exist as Extension Definitions in this
// workspace (see MOCK_MODULES in ModuleList), keyed by registry id.
const EXISTING_DEFINITIONS = new Set(["1", "8", "10", "11"]);

const EVENT_TIMINGS = new Set(["Pre-Event", "Post-Event"]);

function scopeFor(timings: string[]): MarketplaceExtension["scope"] {
  if (timings.every((t) => EVENT_TIMINGS.has(t))) return "Event";
  if (timings.every((t) => !EVENT_TIMINGS.has(t))) return "Visit/Visitor";
  return "Multi-Scope";
}

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : text).trim();
}

function toCatalogItem(ext: ExtensionDefinition): MarketplaceExtension {
  const meta = STOREFRONT[ext.id] ?? {
    version: "1.0.0",
    publishedAt: "2026-06-01",
    installs: "100",
    rating: 4.0,
  };
  const timings = ext.allowedPositions.map((p) => p.label) as Timing[];
  return {
    id: `mkt-${ext.id}`,
    registryId: ext.id,
    definitionId: EXISTING_DEFINITIONS.has(ext.id) ? ext.id : undefined,
    name: ext.name,
    publisher: ext.source === "tealium" ? "Tealium" : ext.publisher || "Community",
    verified: ext.source === "tealium",
    tier: ext.source === "tealium" ? "core" : "community",
    category: ext.category,
    icon: CATEGORY_ICONS[ext.category] ?? "fas fa-puzzle-piece",
    tagline: firstSentence(ext.description),
    description: ext.description,
    replaces: ext.replaces,
    version: meta.version,
    publishedAt: meta.publishedAt,
    changelog: meta.changelog,
    installs: meta.installs,
    rating: meta.rating,
    testCount: ext.tests.length,
    scope: scopeFor(timings),
    isBulk: ext.isBulk,
    supportedTypes: ext.isBulk ? ["String"] : undefined,
    timings,
    allowedPositions: ext.allowedPositions,
    params: ext.params.map(({ id, variableName, type, direction, description }) => ({
      id,
      variableName,
      type,
      direction,
      description,
    })),
    code: ext.code,
  };
}

export const MARKETPLACE_CATALOG: MarketplaceExtension[] = EXTENSIONS.filter(
  (e) => e.source === "tealium" || e.source === "community"
).map(toCatalogItem);

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
    title: "By Tealium",
    blurb: "First-party extensions, curated and verified by Tealium.",
  },
  community: {
    title: "Community",
    blurb: "Extensions published and maintained by the community.",
  },
};
