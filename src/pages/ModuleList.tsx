import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMvpMode } from "../contexts/MvpContext";
import Button from "../components/SimpleButton";
import Badge from "../components/SimpleBadge";
import SimpleSwitch from "../components/SimpleSwitch";
import SimpleTooltip from "../components/SimpleTooltip";
import "./ModuleList.css";

interface Module {
  id: string;
  name: string;
  scope: "Event" | "Visit/Visitor" | "Multi-Scope";
  timing: "Pre-Event" | "Post-Event" | "Pre-Visitor" | "Post-Visitor" | "Post-Audience";
  timings?: ("Pre-Event" | "Post-Event" | "Pre-Visitor" | "Post-Visitor" | "Post-Audience")[];
  enabled: boolean;
  lastModified: string;
  tests: { total: number; passed: number; failed: number };
  instances: number;
  activeTimingCounts?: Partial<Record<"Pre-Event" | "Post-Event" | "Pre-Visitor" | "Post-Visitor" | "Post-Audience", number>>;
  isBulk?: boolean;
  supportedTypes?: string[];
}

const ALL_POSITIONS = [
  { id: "Pre-Event", short: "PreE" },
  { id: "Post-Event", short: "PostE" },
  { id: "Pre-Visitor", short: "PreV" },
  { id: "Post-Visitor", short: "PostV" },
  { id: "Post-Audience", short: "PostA" },
];

const MOCK_MODULES: Module[] = [
  {
    id: "1",
    name: "Normalize Page URLs",
    isBulk: true,
    supportedTypes: ["String"],
    scope: "Event",
    timing: "Pre-Event",
    timings: ["Pre-Event", "Post-Event", "Pre-Visitor", "Post-Visitor", "Post-Audience"],
    enabled: true,
    lastModified: "2025-02-28",
    tests: { total: 3, passed: 3, failed: 0 },
    instances: 2,
    activeTimingCounts: { "Pre-Event": 2 },
  },
  {
    id: "2",
    name: "Compute Engagement Score",
    scope: "Multi-Scope",
    timing: "Post-Visitor",
    timings: ["Pre-Visitor", "Post-Visitor", "Post-Audience"],
    enabled: true,
    lastModified: "2025-03-01",
    tests: { total: 4, passed: 2, failed: 2 },
    instances: 3,
    activeTimingCounts: { "Post-Visitor": 2, "Post-Audience": 1 },
  },
  {
    id: "10",
    name: "Tally Over Time",
    scope: "Visit/Visitor",
    timing: "Post-Visitor",
    timings: ["Pre-Visitor", "Post-Visitor", "Post-Audience"],
    enabled: true,
    lastModified: "2025-03-05",
    tests: { total: 6, passed: 6, failed: 0 },
    instances: 2,
    activeTimingCounts: { "Post-Visitor": 2 },
  },
  {
    id: "11",
    name: "Lowercase String",
    isBulk: true,
    supportedTypes: ["String"],
    scope: "Multi-Scope",
    timing: "Post-Visitor",
    timings: ["Pre-Event", "Post-Event", "Pre-Visitor", "Post-Visitor", "Post-Audience"],
    enabled: true,
    lastModified: "2025-03-06",
    tests: { total: 4, passed: 4, failed: 0 },
    instances: 2,
    activeTimingCounts: { "Pre-Event": 1, "Post-Event": 1 },
  },
  {
    id: "8",
    name: "Recency Frequency Scorer",
    scope: "Visit/Visitor",
    timing: "Post-Visitor",
    timings: ["Pre-Visitor", "Post-Visitor", "Post-Audience"],
    enabled: true,
    lastModified: "2025-02-26",
    tests: { total: 3, passed: 3, failed: 0 },
    instances: 4,
    activeTimingCounts: { "Post-Visitor": 4 },
  },
];

// Simulated test results per module
const MOCK_RESULTS: Record<string, { passed: number; failed: number }> = {
  "1": { passed: 3, failed: 0 },
  "2": { passed: 2, failed: 2 },
  "8": { passed: 3, failed: 0 },
  "10": { passed: 6, failed: 0 },
  "11": { passed: 4, failed: 0 },
};

// 24-hour error counts per extension (matches ERRORS in ExtensionsOverview)
const EXECUTIONS_24H: Record<string, number> = {
  "1": 184320, "2": 61440, "8": 122880, "10": 61440, "11": 184320,
};

const RECENT_ERRORS: Record<string, { count: number; message: string; recentInputs: string }> = {
  "2": { count: 1247, message: "Output 'score' expected number but got NaN", recentInputs: "Recent inputs:\n• viewCount=undefined, purchaseCount=3 (2 min ago)\n• viewCount=undefined, purchaseCount=0 (4 min ago)\n• viewCount=null, purchaseCount=12 (11 min ago)\n• viewCount=undefined, purchaseCount=1 (18 min ago)\n• viewCount=\"\", purchaseCount=7 (23 min ago)" },
};

export default function ModuleList() {
  const navigate = useNavigate();
  const { isMvp } = useMvpMode();
  const [modules, setModules] = useState(MOCK_MODULES);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [runningAll, setRunningAll] = useState(false);

  // Sort modules alphabetically by name
  const sortedModules = useMemo(() => {
    let list = [...modules];
    if (isMvp) list = list.filter((m) => !m.isBulk);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [modules, isMvp]);

  const runTestsForModule = useCallback((modId: string) => {
    const mod = modules.find((m) => m.id === modId);
    if (!mod || !mod.enabled || !mod.tests?.total) return;

    setRunningTests((prev) => new Set([...prev, modId]));

    setModules((prev) =>
      prev.map((m) =>
        m.id === modId ? { ...m, tests: { ...m.tests, passed: 0, failed: 0 } } : m
      )
    );

    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      const result = MOCK_RESULTS[modId] || { passed: 0, failed: 0 };
      setModules((prev) =>
        prev.map((m) =>
          m.id === modId
            ? { ...m, tests: { ...m.tests, passed: result.passed, failed: result.failed } }
            : m
        )
      );
      setRunningTests((prev) => {
        const next = new Set(prev);
        next.delete(modId);
        return next;
      });
    }, delay);
  }, [modules]);

  const runAllActiveTests = useCallback(() => {
    setRunningAll(true);
    const activeWithTests = modules.filter((m) => m.enabled && m.tests?.total > 0);
    activeWithTests.forEach((m) => runTestsForModule(m.id));
  }, [modules, runTestsForModule]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runAllActiveTests();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (runningAll && runningTests.size === 0) {
      setRunningAll(false);
    }
  }, [runningAll, runningTests.size]);

  const handleToggle = (id: string, newState: boolean) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: newState } : m))
    );
  };

  const getListResponse = useCallback((msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes("create") || lower.includes("new") || lower.includes("add extension")) {
      return {
        text: "I can create a new extension for you. What should it do? Here's a quick-start option:",
        action: { type: "create-extension", label: "Create new extension", detail: "Opens the extension editor with a blank template so you can define inputs, outputs, and code.", id: `action-${Date.now()}` },
      };
    }
    if (lower.includes("what") && (lower.includes("extension") || lower.includes("module"))) {
      return { text: "**Server-Side Extensions** are user-authored code modules that run inside AudienceStream's processing pipeline. They can:\n\n\u2022 Read event and visitor/visit attributes as **inputs**\n\u2022 Compute new values using custom JavaScript logic\n\u2022 Write results back as **outputs** to attributes\n\nEach extension can have multiple **instances**, each mapping different real attributes to the extension's generic variable names." };
    }
    if (lower.includes("pipeline") || lower.includes("timing") || lower.includes("order")) {
      return { text: "The processing pipeline has these stages:\n\n**Event scope:**\n1. Event Received \u2192 Functions \u2192 **Pre-Event** \u2192 Event Enrichments \u2192 **Post-Event** \u2192 Event Activations\n\n**Visit/Visitor scope:**\n1. **Pre-Visitor** \u2192 Visit/Visitor Enrichments \u2192 **Post-Visitor** \u2192 Audiences \u2192 **Post-Audience** \u2192 Visitor Activations\n\nExtensions run at the bold points. Choose the timing based on which attributes you need access to." };
    }
    if (lower.includes("run") && lower.includes("test")) {
      const activeWithTests = modules.filter((m) => m.enabled && m.tests?.total > 0);
      if (activeWithTests.length === 0) {
        return { text: "No active extensions with tests to run." };
      }
      return {
        text: `I can run tests for all ${activeWithTests.length} active extension(s).`,
        action: { type: "run-all-tests", label: "Run all active tests", detail: activeWithTests.map((m) => `\u2022 ${m.name} (${m.tests.total} tests)`).join("\n"), id: `action-${Date.now()}` },
      };
    }
    if (lower.includes("fail") || lower.includes("broken") || lower.includes("status")) {
      const failing = modules.filter((m) => m.tests?.failed > 0);
      if (failing.length > 0) {
        return { text: `${failing.length} extension(s) have failing tests:\n\n${failing.map((m) => `\u2022 **${m.name}** \u2014 ${m.tests.failed} of ${m.tests.total} failed`).join("\n")}\n\nOpen each extension to investigate and fix the failures.` };
      }
      return { text: "All extensions with tests are currently passing." };
    }
    if (lower.includes("instance")) {
      return { text: "**Instances** map real attributes to an extension's generic variables. Each extension can have multiple instances with different attribute bindings and trigger rules.\n\nClick the instance count in the table to manage instances for any extension." };
    }
    if (lower.includes("disable") || lower.includes("enable") || lower.includes("toggle")) {
      return { text: "You can enable or disable extensions using the toggle switch in the **Status** column. Disabled extensions won't execute in the pipeline, but their configuration and instances are preserved." };
    }
    if (lower.includes("write") && lower.includes("test")) {
      const noTests = modules.filter((m) => m.tests?.total === 0);
      const withTests = modules.filter((m) => m.tests?.total > 0);
      const list = noTests.length > 0
        ? `These extensions have **no tests yet**:\n\n${noTests.map((m) => `\u2022 **${m.name}**`).join("\n")}\n\nClick **Edit** on any extension to open the code editor, where I can help you write tests for it.`
        : `All ${withTests.length} extensions already have tests. To add more, click **Edit** on any extension and I'll help you write additional test cases in the editor.`;
      return { text: list };
    }
    if (lower.includes("scope") || lower.includes("multi")) {
      return { text: "Extensions can run at one or more pipeline positions depending on the data types they use. The **Available Scopes** column shows which positions each extension supports.\n\nA filled dot means the extension can run at that position. Extensions using only basic types (String, Number, Boolean) can run anywhere, while those using Tally or Timeline types are limited to Visit/Visitor scopes." };
    }
    return { text: "I can help you manage your extensions. Try asking me to:\n\n\u2022 Create a new extension\n\u2022 What are extensions?\n\u2022 How does the pipeline work?\n\u2022 Run all tests\n\u2022 Which extensions are failing?\n\u2022 How do scopes work?" };
  }, [modules]);

  const handleListAction = useCallback((action: { type: string; label: string; detail: string; id: string }, accepted: boolean) => {
    if (!accepted) return;
    if (action.type === "create-extension") {
      navigate("/modules/new");
    } else if (action.type === "run-all-tests") {
      runAllActiveTests();
    }
  }, [navigate, runAllActiveTests]);

  return (
    <div className="module-list-page">
      <div className="module-list-header">
        <div className="module-list-title-section">
          <h1 className="module-list-title">Extension Definitions</h1>
          <SimpleTooltip title="Server-side extensions are replay-safe and participate in event replay during visitor stitching, just like enrichments.">
            <i className="fas fa-info-circle module-info-icon" />
          </SimpleTooltip>
        </div>
        <p className="module-list-description">
          User-authored server-side extensions that can directly read and write
          visitor/visit attributes. Extensions execute at specific points in the
          AudienceStream processing pipeline.
        </p>
      </div>

      <div className="module-list-toolbar">
        <Button type="border" onClick={() => navigate("/instances")}>
          <i className="fas fa-list-ol" aria-hidden="true" />
          <span>Instances and Order</span>
        </Button>
        <Button
          type="border"
          onClick={runAllActiveTests}
          attrProps={{ disabled: runningAll || runningTests.size > 0 }}
        >
          {runningAll || runningTests.size > 0 ? (
            <>
              <i className="fas fa-spinner fa-spin" aria-hidden="true" />
              <span>Running…</span>
            </>
          ) : (
            <>
              <i className="fas fa-play" aria-hidden="true" />
              <span>Run Active Tests</span>
            </>
          )}
        </Button>
        <button type="button" className="test-ai-btn" onClick={() => { navigate("/modules/new"); setTimeout(() => window.dispatchEvent(new CustomEvent("open-ai-builder", { detail: { prompt: "Help me generate a new extension" } })), 300); }}>
          <i className="fas fa-magic" aria-hidden="true" /> Generate with AI
        </button>
        <Button type="primary" onClick={() => navigate("/modules/new")}>
          <i className="fas fa-plus" aria-hidden="true" />
          <span>New Extension</span>
        </Button>
      </div>

      {/* Pipeline diagram */}
      <div className="pipeline-diagram">
        <span className="pipeline-label">Processing Pipeline:</span>
        <div className="pipeline-flow-rows">
          {!isMvp && (
            <div className="pipeline-phase">
              <span className="pipeline-phase-label">Event</span>
              <div className="pipeline-flow">
                <span className="pipeline-step">Event Received</span>
                <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                <span className="pipeline-step">Functions</span>
                <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                <span className="pipeline-step pipeline-step-highlight"><i className="fas fa-code" aria-hidden="true" /> Pre-Event</span>
                <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                <span className="pipeline-step">Event Enrichments</span>
                <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                <span className="pipeline-step pipeline-step-highlight"><i className="fas fa-code" aria-hidden="true" /> Post-Event</span>
                <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
                <span className="pipeline-step pipeline-step-dimmed">Event Activations</span>
              </div>
            </div>
          )}
          <div className="pipeline-phase">
            <span className="pipeline-phase-label">Visit / Visitor</span>
            <div className="pipeline-flow">
              {!isMvp && <><span className="pipeline-step pipeline-step-highlight"><i className="fas fa-code" aria-hidden="true" /> Pre-Visitor</span>
              <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span></>}
              <span className="pipeline-step">Visit/Visitor Enrichments</span>
              <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
              <span className="pipeline-step pipeline-step-highlight"><i className="fas fa-code" aria-hidden="true" /> Post-Visitor</span>
              <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
              <span className="pipeline-step">Audiences</span>
              {!isMvp && <><span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
              <span className="pipeline-step pipeline-step-highlight"><i className="fas fa-code" aria-hidden="true" /> Post-Audience</span></>}
              <span className="pipeline-arrow"><i className="fas fa-arrow-right" aria-hidden="true" /></span>
              <span className="pipeline-step pipeline-step-dimmed">Visitor Activations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modules table */}
      <div className="module-table-container">
        <table className="module-table">
          <thead>
            <tr>
              <th className="module-table-th module-col-status"></th>
              <th className="module-table-th module-col-name">Extension Name</th>
              <th className="module-table-th module-col-scopes">
                <SimpleTooltip title="Shows which pipeline positions this extension can run at, based on its parameter types">
                  <span>Available Scopes</span>
                </SimpleTooltip>
              </th>
              <th className="module-table-th module-col-instances">Instances</th>
              <th className="module-table-th module-col-tests">Tests</th>
              <th className="module-table-th module-col-warnings">Warnings</th>
              <th className="module-table-th module-col-modified">Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {sortedModules.map((mod) => {
              const isRunning = runningTests.has(mod.id);
              const hasTests = mod.tests?.total > 0;
              const hasFailed = mod.tests?.failed > 0;
              const availableTimings = mod.timings || [mod.timing];
              const timingCounts = mod.activeTimingCounts || {};

              return (
                <tr
                  key={mod.id}
                  className="module-table-row module-table-row-clickable"
                  onClick={() => navigate(`/modules/${mod.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="module-table-td module-col-status">
                    <span onClick={(e) => e.stopPropagation()}>
                      <SimpleSwitch
                        isStandAlone
                        on={mod.enabled}
                        onChange={(val) => handleToggle(mod.id, val)}
                        inputProps={{
                          "aria-label": `Toggle ${mod.name}`,
                        }}
                      />
                    </span>
                  </td>
                  <td className="module-table-td module-col-name">
                    <span className="module-name-text">{mod.name}</span>
                    {mod.isBulk && (
                      <span className="module-bulk-badge">
                        <i className="fas fa-cubes" aria-hidden="true" />
                        Bulk
                      </span>
                    )}
                  </td>
                  <td className="module-table-td module-col-scopes">
                    <div className="scope-dots-row">
                      {(isMvp ? ALL_POSITIONS.filter((p) => p.id === "Post-Visitor") : ALL_POSITIONS).map((pos) => {
                        const isAvailable = availableTimings.includes(pos.id as any);
                        const count = timingCounts[pos.id as keyof typeof timingCounts] || 0;
                        const isUsed = count > 0;
                        const tooltipText = isUsed
                          ? `${pos.id}: ${count} instance${count !== 1 ? "s" : ""}`
                          : isAvailable
                            ? `${pos.id}: Available (no instances)`
                            : `${pos.id}: Not available`;
                        return (
                          <SimpleTooltip key={pos.id} title={tooltipText}>
                            <div className={`scope-dot-cell ${isAvailable ? "scope-dot-active" : "scope-dot-inactive"}`}>
                              <span className={`scope-dot ${isUsed ? "scope-dot-used" : isAvailable ? "scope-dot-available" : "scope-dot-off"}`}>
                                {isUsed && <span className="scope-dot-count">{count}</span>}
                              </span>
                              <span className="scope-dot-label">{pos.short}</span>
                            </div>
                          </SimpleTooltip>
                        );
                      })}
                    </div>
                  </td>
                  <td className="module-table-td module-col-instances">
                    <button
                      type="button"
                      className="module-instances-link"
                      onClick={(e) => { e.stopPropagation(); navigate(`/instances?ext=${mod.id}`); }}
                    >
                      <i className="fas fa-cubes" aria-hidden="true" />
                      {mod.instances} instance{mod.instances !== 1 ? "s" : ""}
                    </button>
                  </td>
                  <td className="module-table-td module-col-tests">
                    {hasTests ? (
                      <button
                        type="button"
                        className={`module-tests-badge ${
                          isRunning
                            ? "module-tests-badge-running"
                            : hasFailed
                              ? "module-tests-badge-fail"
                              : "module-tests-badge-pass"
                        }`}
                        onClick={(e) => { e.stopPropagation(); !isRunning && runTestsForModule(mod.id); }}
                        disabled={!mod.enabled || isRunning}
                        title={
                          isRunning
                            ? "Running…"
                            : mod.enabled
                              ? `Run tests for ${mod.name}`
                              : "Enable extension to run tests"
                        }
                      >
                        {isRunning ? (
                          <>
                            <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                            <span className="module-tests-badge-label">Running…</span>
                          </>
                        ) : (
                          <>
                            {hasFailed ? (
                              <i className="fas fa-times-circle" aria-hidden="true" />
                            ) : (
                              <i className="fas fa-check-circle" aria-hidden="true" />
                            )}
                            <span className="module-tests-badge-label">
                              {hasFailed ? `${mod.tests.failed} failed` : "Passed"}
                            </span>
                            <span className="module-tests-badge-count">
                              {mod.tests?.passed}/{mod.tests?.total}
                            </span>
                            {mod.enabled && (
                              <i className="fas fa-play module-tests-badge-play" aria-hidden="true" />
                            )}
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="module-tests-none">&ndash;</span>
                    )}
                  </td>
                  <td className="module-table-td module-col-warnings">
                    {RECENT_ERRORS[mod.id] ? (
                      <SimpleTooltip title={`${RECENT_ERRORS[mod.id].message}\n\n${RECENT_ERRORS[mod.id].recentInputs}`}>
                        <span className="module-warning-badge">
                          <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                          {((RECENT_ERRORS[mod.id].count / (EXECUTIONS_24H[mod.id] || 1)) * 100).toFixed(2)}% error rate
                        </span>
                      </SimpleTooltip>
                    ) : (
                      <span className="module-warnings-none">&ndash;</span>
                    )}
                  </td>
                  <td className="module-table-td module-col-modified">
                    {mod.lastModified}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modules.length === 0 && (
        <div className="module-empty-state">
          <i className="fas fa-code module-empty-icon" />
          <p>No server-side extensions configured yet.</p>
          <Button type="primary" onClick={() => navigate("/modules/new")}>
            <i className="fas fa-plus" aria-hidden="true" />
            <span>Create Your First Extension</span>
          </Button>
        </div>
      )}

    </div>
  );
}
