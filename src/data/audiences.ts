import { useSyncExternalStore } from "react";
import type { EnrichmentCondition } from "../components/EnrichmentConditions";
import { CUSTOM_OPERATOR_PREFIX, MOCK_OPERATORS } from "./operators";
import { operatorTestSummary } from "../utils/operatorRuntime";

export interface Audience {
  id: string;
  name: string;
  description: string;
  /** A visitor qualifies when every condition in at least one group is true (AND within, OR across). */
  conditionGroups: EnrichmentCondition[][];
  lastModified: string;
}

let audiences: Audience[] = [
  {
    id: "aud1",
    name: "Reachable by Email",
    description: "Customers with a usable email address who have bought at least once.",
    conditionGroups: [
      [
        { attribute: "email", operator: "custom:op1", values: [] },
        { attribute: "purchase_count", operator: "greater than", values: ["0"] },
      ],
    ],
    lastModified: "2026-03-12T14:20:00",
  },
  {
    id: "aud2",
    name: "Lapsed High-Value Buyers",
    description: "Big spenders who haven't purchased in the last quarter.",
    conditionGroups: [
      [
        { attribute: "lifetime_revenue", operator: "greater than", values: ["1000"] },
        { attribute: "last_purchase_date", operator: "custom:op3", values: ["90"], negate: true },
      ],
    ],
    lastModified: "2026-03-13T09:05:00",
  },
  {
    id: "aud3",
    name: "Running Gear Shoppers",
    description: "Visitors who browse or search for running products.",
    conditionGroups: [
      [{ attribute: "preferred_categories", operator: "custom:op4", values: ["running, trail"] }],
      [{ attribute: "search_history", operator: "custom:op4", values: ["running shoes, trail shoes"] }],
    ],
    lastModified: "2026-03-14T16:42:00",
  },
  {
    id: "aud4",
    name: "B2B Prospects",
    description: "Leads with a company email address and a company name.",
    conditionGroups: [
      [
        { attribute: "email", operator: "custom:op6", values: [] },
        { attribute: "company_name", operator: "is set", values: [] },
      ],
    ],
    lastModified: "2026-03-15T10:30:00",
  },
  {
    id: "aud5",
    name: "Gold Loyalty Members",
    description: "Members of the gold loyalty tier.",
    conditionGroups: [[{ attribute: "loyalty_tier", operator: "equals", values: ["gold"] }]],
    lastModified: "2026-03-10T11:15:00",
  },
];

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAudiences(): Audience[] {
  return audiences;
}

export function useAudiences(): Audience[] {
  return useSyncExternalStore(subscribe, getAudiences);
}

export function findAudience(id: string): Audience | undefined {
  return audiences.find((a) => a.id === id);
}

export function saveAudience(audience: Omit<Audience, "id" | "lastModified"> & { id?: string }): Audience {
  const saved: Audience = {
    ...structuredClone(audience),
    id: audience.id ?? `aud${Date.now()}`,
    lastModified: new Date().toISOString(),
  };
  const exists = audiences.some((a) => a.id === saved.id);
  audiences = exists ? audiences.map((a) => (a.id === saved.id ? saved : a)) : [...audiences, saved];
  emit();
  return saved;
}

export function deleteAudience(id: string) {
  audiences = audiences.filter((a) => a.id !== id);
  emit();
}

export function isAudienceNameTaken(name: string, exceptId?: string): boolean {
  const key = name.trim().toLowerCase();
  return audiences.some((a) => a.id !== exceptId && a.name.trim().toLowerCase() === key);
}

export function conditionCount(audience: Pick<Audience, "conditionGroups">): number {
  return audience.conditionGroups.reduce((n, g) => n + g.length, 0);
}

/** Custom operator ids an audience references, in first-use order. */
export function customOperatorIds(audience: Pick<Audience, "conditionGroups">): string[] {
  const ids = audience.conditionGroups
    .flat()
    .filter((c) => c.operator.startsWith(CUSTOM_OPERATOR_PREFIX))
    .map((c) => c.operator.slice(CUSTOM_OPERATOR_PREFIX.length));
  return [...new Set(ids)];
}

export function operatorHasFailingTests(opId: string): boolean {
  const op = MOCK_OPERATORS.find((o) => o.id === opId);
  return !!op && operatorTestSummary(op).failing > 0;
}

export function audienceNeedsAttention(audience: Pick<Audience, "conditionGroups">): boolean {
  return customOperatorIds(audience).some(operatorHasFailingTests);
}
