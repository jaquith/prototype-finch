export type ExtensionSource = "tealium" | "community" | "team";

export type ExtensionCategory = "Data cleanup" | "Privacy and identity" | "Time and dates" | "Scoring" | "Commerce";

export const EXTENSION_CATEGORIES: ExtensionCategory[] = [
  "Data cleanup",
  "Privacy and identity",
  "Time and dates",
  "Scoring",
  "Commerce",
];

export interface ExtensionPosition {
  id: string;
  label: string;
}

export interface ExtensionParamDef {
  id: string;
  variableName: string;
  direction: "input" | "output";
  type: string;
  exampleAttribute: string;
  description: string;
}

export interface ExtensionTestDef {
  id: string;
  suite?: string;
  name: string;
  inputs: Record<string, string>;
  expected: Record<string, string>;
}

export interface ExtensionDefinition {
  id: string;
  name: string;
  description: string;
  replaces: string;
  source: string;
  publisher: string;
  category: string;
  isBulk: boolean;
  mvp: boolean;
  allowedPositions: ExtensionPosition[];
  suggestedTriggers: string[];
  exampleInstance?: string;
  params: ExtensionParamDef[];
  code: string;
  fixedCode?: string;
  tests: ExtensionTestDef[];
}

export const FRAMEWORK_PROVIDED = "provided by framework";

export function sourceLabel(ext: Pick<ExtensionDefinition, "source" | "publisher">): string {
  if (ext.source === "tealium") return "By Tealium";
  if (ext.source === "community") return ext.publisher ? `Community · ${ext.publisher}` : "Community";
  return "Your team";
}
