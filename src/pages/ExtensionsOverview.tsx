import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../components/SimpleBadge";
import SimpleTooltip from "../components/SimpleTooltip";
import { useMvpMode } from "../contexts/MvpContext";
import "./ExtensionsOverview.css";

// ─── Mock data ───────────────────────────────────────────────────

interface ExtensionSummary {
  id: string;
  name: string;
  enabled: boolean;
  instances: number;
  activeInstances: number;
  isBulk: boolean;
}

interface ErrorEntry {
  extensionId: string;
  extensionName: string;
  instanceId: string;
  instanceName: string;
  timing: string;
  errorType: string;
  message: string;
  count: number;
  lastOccurred: string;
  recentInputs?: { viewCount: string; purchaseCount: string; ago: string }[];
}

interface UsageStat {
  extensionId: string;
  extensionName: string;
  executionsToday: number;
  executionsWeek: number;
  avgDurationMs: number;
  errorRate: number; // percentage
}

const EXTENSIONS: ExtensionSummary[] = [
  { id: "1", name: "Normalize Page URLs", enabled: true, instances: 2, activeInstances: 2, isBulk: true },
  { id: "2", name: "Compute Engagement Score", enabled: true, instances: 3, activeInstances: 3, isBulk: false },
  { id: "8", name: "Recency Frequency Scorer", enabled: true, instances: 4, activeInstances: 4, isBulk: false },
  { id: "10", name: "Tally Over Time", enabled: true, instances: 2, activeInstances: 2, isBulk: false },
  { id: "11", name: "Lowercase String", enabled: true, instances: 2, activeInstances: 2, isBulk: true },
];

const ERRORS: ErrorEntry[] = [
  {
    extensionId: "2", extensionName: "Compute Engagement Score",
    instanceId: "2-inst1", instanceName: "Engagement score from page views",
    timing: "Post-Visitor", errorType: "NaN Result",
    message: "Output 'score' expected number but got NaN",
    count: 1247, lastOccurred: "2 min ago",
    recentInputs: [
      { viewCount: "undefined", purchaseCount: "3", ago: "2 min ago" },
      { viewCount: "undefined", purchaseCount: "0", ago: "4 min ago" },
      { viewCount: "null", purchaseCount: "12", ago: "11 min ago" },
      { viewCount: "undefined", purchaseCount: "1", ago: "18 min ago" },
      { viewCount: "", purchaseCount: "7", ago: "23 min ago" },
    ],
  },
];

const USAGE_STATS: UsageStat[] = [
  { extensionId: "1", extensionName: "Normalize Page URLs", executionsToday: 184320, executionsWeek: 1_290_240, avgDurationMs: 0.3, errorRate: 0.0 },
  { extensionId: "11", extensionName: "Lowercase String", executionsToday: 184320, executionsWeek: 1_290_240, avgDurationMs: 0.1, errorRate: 0.0 },
  { extensionId: "2", extensionName: "Compute Engagement Score", executionsToday: 61440, executionsWeek: 430_080, avgDurationMs: 1.2, errorRate: 3.38 },
  { extensionId: "10", extensionName: "Tally Over Time", executionsToday: 61440, executionsWeek: 430_080, avgDurationMs: 2.8, errorRate: 0.0 },
  { extensionId: "8", extensionName: "Recency Frequency Scorer", executionsToday: 122880, executionsWeek: 860_160, avgDurationMs: 0.9, errorRate: 0.0 },
];

// Over-time data (hourly for 24h, daily for 7d)
const HOURLY_EXECUTIONS = [
  12400, 11200, 9800, 8100, 6200, 5400, 4800, 6100, 9200, 14300,
  18700, 21400, 23100, 22800, 21500, 20100, 19600, 18200, 16800, 15100,
  13400, 12800, 12100, 11600,
];
const DAILY_EXECUTIONS = [
  { day: "Mon", value: 580000 }, { day: "Tue", value: 612000 }, { day: "Wed", value: 595000 },
  { day: "Thu", value: 640000 }, { day: "Fri", value: 620000 }, { day: "Sat", value: 410000 },
  { day: "Sun", value: 390000 },
];
const HOURLY_ERRORS = [
  0, 0, 0, 0, 0, 0, 0, 12, 45, 89, 134, 156, 142, 128, 98, 76, 62, 55, 48, 41, 34, 28, 22, 18,
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ─── Component ───────────────────────────────────────────────────

export default function ExtensionsOverview() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<"24h" | "7d">("24h");
  const { isMvp } = useMvpMode();

  const visibleExtensions = isMvp ? EXTENSIONS.filter((e) => !e.isBulk) : EXTENSIONS;
  const visibleUsage = isMvp ? USAGE_STATS.filter((u) => !EXTENSIONS.find((e) => e.id === u.extensionId)?.isBulk) : USAGE_STATS;
  const visibleErrors = isMvp ? ERRORS.filter((e) => !EXTENSIONS.find((ex) => ex.id === e.extensionId)?.isBulk) : ERRORS;

  const totalExtensions = visibleExtensions.length;
  const totalInstances = visibleExtensions.reduce((s, e) => s + e.instances, 0);
  const totalErrors = visibleErrors.reduce((s, e) => s + e.count, 0);
  const totalExecutions = visibleUsage.reduce((s, u) => s + (timeRange === "24h" ? u.executionsToday : u.executionsWeek), 0);
  const errorPct = totalExecutions > 0 ? ((totalErrors / totalExecutions) * 100).toFixed(2) : "0.00";

  // Execution count per extension for percentage calculations
  const execByExtension: Record<string, number> = {};
  visibleUsage.forEach((u) => {
    execByExtension[u.extensionId] = timeRange === "24h" ? u.executionsToday : u.executionsWeek;
  });

  // Error counts by extension
  const errorsByExtension: Record<string, number> = {};
  visibleErrors.forEach((e) => {
    errorsByExtension[e.extensionId] = (errorsByExtension[e.extensionId] || 0) + e.count;
  });

  // Error counts by instance
  const errorsByInstance: Record<string, number> = {};
  visibleErrors.forEach((e) => {
    errorsByInstance[e.instanceId] = (errorsByInstance[e.instanceId] || 0) + e.count;
  });

  // Sort usage stats by executions
  const sortedUsage = [...visibleUsage].sort((a, b) =>
    (timeRange === "24h" ? b.executionsToday : b.executionsWeek) - (timeRange === "24h" ? a.executionsToday : a.executionsWeek)
  );

  return (
    <div className="eo-page">
      <nav className="editor-breadcrumb">
        <span className="breadcrumb-current">Server-Side Extensions</span>
      </nav>

      <div className="eo-header">
        <div className="eo-title-row">
          <h1 className="eo-title">Server-Side Extensions</h1>
          <Badge type="informative" label={`${totalExtensions} extensions`} />
        </div>
        <p className="eo-description">
          Overview of all server-side extensions, execution metrics, and error health across the pipeline.
        </p>
      </div>

      {/* Summary cards */}
      <div className="eo-summary-cards">
        <button type="button" className="eo-card" onClick={() => navigate("/extensions")}>
          <div className="eo-card-icon eo-card-icon-blue">
            <i className="fas fa-code" aria-hidden="true" />
          </div>
          <div className="eo-card-content">
            <span className="eo-card-value">{totalExtensions}</span>
            <span className="eo-card-label">Extensions</span>
          </div>
        </button>
        <button type="button" className="eo-card" onClick={() => navigate("/instances")}>
          <div className="eo-card-icon eo-card-icon-teal">
            <i className="fas fa-clone" aria-hidden="true" />
          </div>
          <div className="eo-card-content">
            <span className="eo-card-value">{totalInstances}</span>
            <span className="eo-card-label">Instances</span>
          </div>
        </button>
        {!isMvp && (
          <div className="eo-card">
            <div className="eo-card-icon eo-card-icon-green">
              <i className="fas fa-play" aria-hidden="true" />
            </div>
            <div className="eo-card-content">
              <span className="eo-card-value">{formatNumber(totalExecutions)}</span>
              <span className="eo-card-label">Executions in past {timeRange === "24h" ? "24 hours" : "7 days"}</span>
            </div>
          </div>
        )}
        <div className={`eo-card ${totalErrors > 0 ? "eo-card-error" : ""}`}>
          <div className={`eo-card-icon ${totalErrors > 0 ? "eo-card-icon-red" : "eo-card-icon-green"}`}>
            <i className={`fas ${totalErrors > 0 ? "fa-exclamation-triangle" : "fa-check-circle"}`} aria-hidden="true" />
          </div>
          <div className="eo-card-content">
            <span className="eo-card-value">{errorPct}%</span>
            <span className="eo-card-label">{isMvp ? "Error rate" : `Error rate (past ${timeRange === "24h" ? "24h" : "7d"})`}</span>
          </div>
        </div>
      </div>

      {/* Errors section */}
      <div className="eo-section">
        <div className="eo-section-header">
          <h2 className="eo-section-title">
            <i className="fas fa-exclamation-triangle" aria-hidden="true" />
            Recent Errors
          </h2>
          <span className="eo-section-count">{visibleErrors.length} error type{visibleErrors.length !== 1 ? "s" : ""}</span>
        </div>

        {visibleErrors.length === 0 ? (
          <div className="eo-empty-state">
            <i className="fas fa-check-circle" aria-hidden="true" />
            <p>No errors detected. All extensions are running smoothly.</p>
          </div>
        ) : (
          <div className="eo-error-list">
            {visibleErrors.map((err, i) => (
              <div key={i} className="eo-error-item">
                <div className="eo-error-top">
                  <span className="eo-error-type">
                    <i className="fas fa-times-circle" aria-hidden="true" />
                    {err.errorType}
                  </span>
                  <span className="eo-error-count">
                    {((err.count / (execByExtension[err.extensionId] || 1)) * 100).toFixed(2)}% of executions
                  </span>
                  <span className="eo-error-time">{err.lastOccurred}</span>
                </div>
                <p className="eo-error-message">{err.message}</p>
                <div className="eo-error-meta">
                  <button type="button" className="eo-error-ext-link" onClick={() => navigate(`/modules/${err.extensionId}`)}>
                    <i className="fas fa-file-code" aria-hidden="true" />
                    {err.extensionName}
                  </button>
                  <span className="eo-error-instance">
                    <i className="fas fa-clone" aria-hidden="true" />
                    {err.instanceName}
                  </span>
                  <span className="eo-error-timing">
                    <i className="fas fa-clock" aria-hidden="true" />
                    {err.timing}
                  </span>
                </div>
                {err.recentInputs && err.recentInputs.length > 0 && (
                  <div className="eo-error-inputs">
                    <span className="eo-error-inputs-title">Recent input values:</span>
                    <table className="eo-error-inputs-table">
                      <thead>
                        <tr>
                          <th>viewCount</th>
                          <th>purchaseCount</th>
                          <th>When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {err.recentInputs.map((inp, j) => (
                          <tr key={j}>
                            <td><code className={inp.viewCount === "undefined" || inp.viewCount === "null" || inp.viewCount === "" ? "eo-input-bad" : ""}>{inp.viewCount || '""'}</code></td>
                            <td><code>{inp.purchaseCount}</code></td>
                            <td className="eo-error-inputs-ago">{inp.ago}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage stats section */}
      {!isMvp && <div className="eo-section">
        <div className="eo-section-header">
          <h2 className="eo-section-title">
            <i className="fas fa-chart-bar" aria-hidden="true" />
            Execution Metrics
          </h2>
          <div className="eo-time-toggle">
            <button type="button" className={`eo-time-btn ${timeRange === "24h" ? "eo-time-btn-active" : ""}`}
              onClick={() => setTimeRange("24h")}>Past 24 Hours</button>
            <button type="button" className={`eo-time-btn ${timeRange === "7d" ? "eo-time-btn-active" : ""}`}
              onClick={() => setTimeRange("7d")}>Past 7 Days</button>
          </div>
        </div>

        <div className="eo-usage-table-wrap">
          <table className="eo-usage-table">
            <thead>
              <tr>
                <th className="eo-usage-th">Extension</th>
                <th className="eo-usage-th eo-usage-th-num">Executions</th>
                <th className="eo-usage-th eo-usage-th-num">Avg Duration</th>
                <th className="eo-usage-th eo-usage-th-num">Error Rate</th>
                <th className="eo-usage-th eo-usage-th-num">Errors</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsage.map((stat) => {
                const executions = timeRange === "24h" ? stat.executionsToday : stat.executionsWeek;
                const extErrors = errorsByExtension[stat.extensionId] || 0;
                const hasErrors = stat.errorRate > 0;
                return (
                  <tr key={stat.extensionId} className="eo-usage-row">
                    <td className="eo-usage-td">
                      <button type="button" className="eo-usage-ext-link" onClick={() => navigate(`/modules/${stat.extensionId}`)}>
                        {stat.extensionName}
                      </button>
                    </td>
                    <td className="eo-usage-td eo-usage-td-num">
                      <span className="eo-usage-exec-bar">
                        <span className="eo-usage-exec-fill" style={{ width: `${Math.min(100, (executions / (timeRange === "24h" ? 200000 : 1400000)) * 100)}%` }} />
                      </span>
                      <span className="eo-usage-exec-value">{formatNumber(executions)}</span>
                    </td>
                    <td className="eo-usage-td eo-usage-td-num">
                      <span className={`eo-usage-duration ${stat.avgDurationMs > 2 ? "eo-usage-duration-slow" : ""}`}>
                        {stat.avgDurationMs.toFixed(1)}ms
                      </span>
                    </td>
                    <td className="eo-usage-td eo-usage-td-num">
                      <span className={`eo-usage-error-rate ${hasErrors ? "eo-usage-error-rate-bad" : "eo-usage-error-rate-good"}`}>
                        {stat.errorRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="eo-usage-td eo-usage-td-num">
                      {extErrors > 0 ? (
                        <span className="eo-usage-error-count">{formatNumber(extErrors)}</span>
                      ) : (
                        <span className="eo-usage-no-errors">
                          <i className="fas fa-check" aria-hidden="true" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Executions over time */}
      {!isMvp && <div className="eo-section">
        <div className="eo-section-header">
          <h2 className="eo-section-title">
            <i className="fas fa-chart-line" aria-hidden="true" />
            {timeRange === "24h" ? "Executions Over Time (Hourly)" : "Executions Over Time (Daily)"}
          </h2>
        </div>
        <div className="eo-chart">
          {timeRange === "24h" ? (
            <div className="eo-bar-chart">
              {HOURLY_EXECUTIONS.map((val, i) => {
                const max = Math.max(...HOURLY_EXECUTIONS);
                const errVal = HOURLY_ERRORS[i] || 0;
                const errHeight = max > 0 ? (errVal / max) * 100 : 0;
                return (
                  <SimpleTooltip key={i} title={`${i}:00 — ${formatNumber(val)} executions, ${errVal} errors`}>
                    <div className="eo-bar-col">
                      <div className="eo-bar" style={{ height: `${(val / max) * 100}%` }}>
                        {errHeight > 0 && <div className="eo-bar-error" style={{ height: `${errHeight}%` }} />}
                      </div>
                      <span className="eo-bar-label">{i % 4 === 0 ? `${i}:00` : ""}</span>
                    </div>
                  </SimpleTooltip>
                );
              })}
            </div>
          ) : (
            <div className="eo-bar-chart eo-bar-chart-daily">
              {DAILY_EXECUTIONS.map((d) => {
                const max = Math.max(...DAILY_EXECUTIONS.map((x) => x.value));
                return (
                  <SimpleTooltip key={d.day} title={`${d.day} — ${formatNumber(d.value)} executions`}>
                    <div className="eo-bar-col">
                      <div className="eo-bar" style={{ height: `${(d.value / max) * 100}%` }} />
                      <span className="eo-bar-label">{d.day}</span>
                    </div>
                  </SimpleTooltip>
                );
              })}
            </div>
          )}
        </div>
      </div>}

      {/* Error frequency per instance */}
      {!isMvp && <div className="eo-section">
        <div className="eo-section-header">
          <h2 className="eo-section-title">
            <i className="fas fa-list" aria-hidden="true" />
            Error Frequency by Instance
          </h2>
        </div>

        <div className="eo-instance-errors">
          {[...visibleErrors].sort((a, b) => b.count - a.count).map((err, i) => {
            const maxCount = visibleErrors[0]?.count || 1;
            const barWidth = (err.count / maxCount) * 100;
            return (
              <div key={i} className="eo-inst-error-row">
                <div className="eo-inst-error-info">
                  <span className="eo-inst-error-name">{err.instanceName}</span>
                  <span className="eo-inst-error-ext">{err.extensionName}</span>
                </div>
                <div className="eo-inst-error-bar-wrap">
                  <div className="eo-inst-error-bar" style={{ width: `${barWidth}%` }} />
                </div>
                <span className="eo-inst-error-count">{formatNumber(err.count)}</span>
                <span className="eo-inst-error-type-tag">{err.errorType}</span>
              </div>
            );
          })}
          {visibleErrors.length === 0 && (
            <div className="eo-empty-state">
              <i className="fas fa-check-circle" aria-hidden="true" />
              <p>No instance errors to display.</p>
            </div>
          )}
        </div>
      </div>}

      {/* Quick links */}
      <div className="eo-quick-links">
        <button type="button" className="eo-quick-link" onClick={() => navigate("/extensions")}>
          <i className="fas fa-file-code" aria-hidden="true" />
          <span>Extension Definitions</span>
          <i className="fas fa-arrow-right eo-quick-link-arrow" aria-hidden="true" />
        </button>
        <button type="button" className="eo-quick-link" onClick={() => navigate("/instances")}>
          <i className="fas fa-list-ol" aria-hidden="true" />
          <span>Instances and Order</span>
          <i className="fas fa-arrow-right eo-quick-link-arrow" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
