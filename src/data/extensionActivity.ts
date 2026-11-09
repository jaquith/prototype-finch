import { EXTENSIONS } from "./extensions";
import { FRAMEWORK_PROVIDED, type ExtensionDefinition } from "./extensionTypes";

// The five original extensions keep their hand-written instances, attributes and
// monitoring data in each page. Everything else is derived here from the registry.
export const LEGACY_EXTENSION_IDS = ["1", "2", "8", "10", "11"];

// Per the doc: these example attributes are event scoped, "(visit)" marks visit
// scope, and everything else is visitor scope.
const EVENT_ATTRIBUTES = new Set([
  "tealium_event",
  "product_id",
  "cart_item_count",
  "customer_guid",
  "search_query",
  "search_query_redacted",
  "churn_model_score",
  "spin_outcome",
  "stake_amount",
]);

export type DerivedScope = "Event" | "Visit" | "Visitor";

export interface DerivedParam {
  variableName: string;
  type: string;
  direction: "input" | "output";
  description?: string;
}

export interface DerivedMapping {
  variableName: string;
  mappedAttribute: string;
}

export interface DerivedInstance {
  id: string;
  name: string;
  enabled: boolean;
  timing: string;
  timingLabel: string;
  trigger: string;
  inputMappings: DerivedMapping[];
  outputMappings: DerivedMapping[];
}

export interface DerivedAttributeRef {
  extensionName: string;
  instanceName: string;
  scope: string;
  direction: "input" | "output";
  variableName: string;
}

export interface DerivedAttribute {
  name: string;
  type: string;
  scope: DerivedScope;
  refs: DerivedAttributeRef[];
}

export interface DerivedUsage {
  executionsToday: number;
  executionsWeek: number;
  avgDurationMs: number;
}

export function registryIdFor(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return id.startsWith("mkt-") ? id.slice(4) : id;
}

/** The registry definition for an extension whose page data is derived, or undefined for the five originals. */
export function derivedExtension(id: string | undefined): ExtensionDefinition | undefined {
  const rid = registryIdFor(id);
  if (!rid || LEGACY_EXTENSION_IDS.includes(rid)) return undefined;
  return EXTENSIONS.find((e) => e.id === rid);
}

const isStatic = (type: string) => type.startsWith("Static");
const isFramework = (p: { exampleAttribute: string }) => p.exampleAttribute === FRAMEWORK_PROVIDED;

function parseAttribute(raw: string): { name: string; scope: DerivedScope } {
  const visit = raw.match(/^(.*?)\s*\(visit\)$/);
  if (visit) return { name: visit[1], scope: "Visit" };
  return { name: raw, scope: EVENT_ATTRIBUTES.has(raw) ? "Event" : "Visitor" };
}

/** Params the instance maps. Framework-provided values aren't mappable, so they're left out. */
export function derivedParams(ext: ExtensionDefinition): DerivedParam[] {
  return ext.params
    .filter((p) => !isFramework(p))
    .map((p) => ({ variableName: p.variableName, type: p.type, direction: p.direction, description: p.description }));
}

export function derivedInstance(ext: ExtensionDefinition): DerivedInstance {
  const position = ext.allowedPositions[0] ?? { id: "postVisitor", label: "Post-Visitor" };
  const mapping = (p: ExtensionDefinition["params"][number]): DerivedMapping => ({
    variableName: p.variableName,
    mappedAttribute: isStatic(p.type) || p.type === "Badge" ? p.exampleAttribute : parseAttribute(p.exampleAttribute).name,
  });
  const mappable = ext.params.filter((p) => !isFramework(p));
  return {
    id: "inst1",
    name: ext.exampleInstance || `${ext.name} instance`,
    enabled: true,
    timing: position.id,
    timingLabel: position.label,
    trigger: ext.suggestedTriggers[0] ?? "Any Event",
    inputMappings: mappable.filter((p) => p.direction === "input").map(mapping),
    outputMappings: mappable.filter((p) => p.direction === "output").map(mapping),
  };
}

/** The attributes an extension's example instance reads and writes, each linked back to that instance. */
export function derivedAttributes(ext: ExtensionDefinition, extensionName = ext.name): DerivedAttribute[] {
  const instance = derivedInstance(ext);
  const byName = new Map<string, DerivedAttribute>();
  for (const p of ext.params) {
    if (isFramework(p) || isStatic(p.type) || p.type === "Badge") continue;
    const { name, scope } = parseAttribute(p.exampleAttribute);
    const attr = byName.get(name) ?? { name, type: p.type, scope, refs: [] };
    attr.refs.push({
      extensionName,
      instanceName: instance.name,
      scope: instance.timingLabel,
      direction: p.direction,
      variableName: p.variableName,
    });
    byName.set(name, attr);
  }
  return [...byName.values()];
}

// Plausible volumes: event-time extensions see every event, visitor-time ones
// run once per visitor update. All new extensions report a 0% error rate.
const USAGE: Record<string, DerivedUsage> = {
  "12": { executionsToday: 61440, executionsWeek: 430_080, avgDurationMs: 1.4 },
  "13": { executionsToday: 61440, executionsWeek: 430_080, avgDurationMs: 0.4 },
  "14": { executionsToday: 61440, executionsWeek: 430_080, avgDurationMs: 0.2 },
  "15": { executionsToday: 23_870, executionsWeek: 167_090, avgDurationMs: 0.6 },
  "16": { executionsToday: 61440, executionsWeek: 430_080, avgDurationMs: 0.3 },
  "17": { executionsToday: 61440, executionsWeek: 430_080, avgDurationMs: 1.9 },
  "18": { executionsToday: 92_160, executionsWeek: 645_120, avgDurationMs: 0.5 },
  "19": { executionsToday: 61440, executionsWeek: 430_080, avgDurationMs: 1.1 },
  "20": { executionsToday: 92_160, executionsWeek: 645_120, avgDurationMs: 0.8 },
  "21": { executionsToday: 38_400, executionsWeek: 268_800, avgDurationMs: 0.9 },
};

export function derivedUsage(ext: ExtensionDefinition): DerivedUsage {
  return USAGE[ext.id] ?? { executionsToday: 30_720, executionsWeek: 215_040, avgDurationMs: 0.5 };
}

export interface InstalledDerived {
  /** The id pages route with, e.g. "mkt-15". */
  id: string;
  name: string;
  enabled: boolean;
  ext: ExtensionDefinition;
}

/** Installed marketplace extensions whose page data is derived, with their display names. MVP mode drops MVP: No extensions. */
export function installedDerived(
  added: { id: string; enabled: boolean; overrides?: { name?: string } }[],
  isMvp: boolean
): InstalledDerived[] {
  return added.flatMap((a) => {
    const ext = derivedExtension(a.id);
    if (!ext || (isMvp && !ext.mvp)) return [];
    return [{ id: a.id, name: a.overrides?.name || ext.name, enabled: a.enabled, ext }];
  });
}
