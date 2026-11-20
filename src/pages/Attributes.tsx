import React, { useState, useMemo, useCallback } from "react";
import Button from "../components/SimpleButton";
import Badge from "../components/SimpleBadge";
import { useMvpMode } from "../contexts/MvpContext";
import { useMarketplace } from "../contexts/MarketplaceContext";
import { derivedAttributes, installedDerived, type InstalledDerived } from "../data/extensionActivity";
import { useSearchParams } from "react-router-dom";
import EnrichmentConditions, { type EnrichmentCondition } from "../components/EnrichmentConditions";
import { MOCK_ATTRIBUTES, type AttrScope, type AttrType, type Attribute } from "../data/attributes";
import "./Attributes.css";


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
  { id: "functions", label: "Enrichment Functions", type: "plain" },
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

function toAttrType(type: string): AttrType {
  return type in TYPE_COLORS ? (type as AttrType) : "String";
}

function mergeDerivedAttributes(base: Attribute[], installed: InstalledDerived[]): Attribute[] {
  const byName = new Map(base.map((a) => [a.name.toLowerCase(), { ...a, extensions: [...(a.extensions || [])] }]));
  let nextAttrId = Math.max(0, ...base.map((a) => a.attrId)) + 1;
  for (const item of installed) {
    for (const derived of derivedAttributes(item.ext, item.name)) {
      const key = derived.name.toLowerCase();
      const existing = byName.get(key);
      if (existing) {
        existing.extensions!.push(...derived.refs);
        continue;
      }
      byName.set(key, {
        id: `derived-${item.id}-${derived.name}`,
        attrId: nextAttrId++,
        name: derived.name,
        type: toAttrType(derived.type),
        scope: derived.scope,
        notes: `Example attribute used by ${item.name}.`,
        enrichments: [],
        extensions: derived.refs,
        lastModified: "2026-11-09",
        lastModifiedBy: "Marketplace install",
        audienceDB: false,
      });
    }
  }
  return [...byName.values()];
}

export default function Attributes() {
  const { isMvp, showMarketplace } = useMvpMode();
  const { added } = useMarketplace();
  const attributes = useMemo(
    () => (showMarketplace ? mergeDerivedAttributes(MOCK_ATTRIBUTES, installedDerived(added, false)) : MOCK_ATTRIBUTES),
    [added, showMarketplace]
  );
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("attr"));
  const [conditionOverrides, setConditionOverrides] = useState<Record<string, EnrichmentCondition[]>>({});
  const [editingEnrichment, setEditingEnrichment] = useState<string | null>(null);
  const attributeOptions = useMemo(() => attributes.map((a) => ({ name: a.name, type: a.type })), [attributes]);
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
    const visitor = attributes.filter((a) => a.scope === "Visitor").length;
    const visit = attributes.filter((a) => a.scope === "Visit").length;
    const event = attributes.filter((a) => a.scope === "Event").length;
    return { all: attributes.length, visitor, visit, event };
  }, [attributes]);

  const typeCounts = useMemo(() => {
    const counts: Partial<Record<AttrType, number>> = {};
    attributes.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return counts;
  }, [attributes]);

  const filtered = useMemo(() => {
    let attrs = attributes.filter((attr) => {
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
  }, [attributes, scopeFilter, typeFilter, searchQuery, orderBy]);

  const selectedAttr = selectedId ? attributes.find((a) => a.id === selectedId) : null;

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
                  <span>Enrichment Functions ({selectedAttr.extensions.length})</span>
                  <span className="attr-detail-section-help"> - Enrichment function instances that read or write this attribute</span>
                </div>
                {selectedAttr.extensions.map((ext, idx) => (
                  <div key={idx} className={`attr-detail-ext-card ${ext.isBulk ? "attr-detail-ext-card-bulk" : ""}`}>
                    <div className="attr-detail-ext-header">
                      <i className="fas fa-code attr-detail-ext-icon" aria-hidden="true" />
                      <span className="attr-detail-ext-name">{ext.extensionName}</span>
                      <Badge type={ext.direction === "input" ? "informative" : "positive"} label={ext.direction} />
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
                {selectedAttr.enrichments.map((e, idx) => {
                  const key = `${selectedAttr.id}-${idx}`;
                  const conditions = conditionOverrides[key] ?? e.conditions ?? [];
                  const editing = editingEnrichment === key;
                  return (
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
                      <EnrichmentConditions
                        conditions={conditions}
                        attributes={attributeOptions}
                        editing={editing}
                        onChange={(next) => setConditionOverrides((prev) => ({ ...prev, [key]: next }))}
                      />
                      <button
                        type="button"
                        className="op-add-btn"
                        onClick={() => setEditingEnrichment(editing ? null : key)}
                      >
                        <i className={`fas ${editing ? "fa-check" : "fa-filter"}`} aria-hidden="true" />{" "}
                        {editing ? "Done" : conditions.length ? "Edit conditions" : "Add conditions"}
                      </button>
                    </div>
                  );
                })}
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
