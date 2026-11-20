import { MOCK_ATTRIBUTES } from "./attributes";
import { audienceNeedsAttention, customOperatorIds, type Audience } from "./audiences";
import { customOperatorValue, type OperatorDef, type OperatorUsage } from "./operators";

export interface AudienceUsage {
  audienceId: string;
  audience: string;
  needsAttention: boolean;
}

export function enrichmentUsesOf(opId: string): OperatorUsage[] {
  const value = customOperatorValue({ id: opId } as OperatorDef);
  return MOCK_ATTRIBUTES.flatMap((attr) =>
    attr.enrichments
      .filter((e) => e.conditions?.some((c) => c.operator === value))
      .map((e) => ({ enrichment: e.source, attribute: attr.name, attributeId: attr.id })),
  );
}

export function audienceUsesOf(opId: string, audiences: Audience[]): AudienceUsage[] {
  return audiences
    .filter((a) => customOperatorIds(a).includes(opId))
    .map((a) => ({ audienceId: a.id, audience: a.name, needsAttention: audienceNeedsAttention(a) }));
}

/** "1 enrichment and 2 audiences", leaving out zero counts. */
export function describeUses(enrichments: number, audiences: number): string {
  const parts: string[] = [];
  if (enrichments > 0) parts.push(`${enrichments} ${enrichments === 1 ? "enrichment" : "enrichments"}`);
  if (audiences > 0) parts.push(`${audiences} ${audiences === 1 ? "audience" : "audiences"}`);
  return parts.join(" and ");
}
