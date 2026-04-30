import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import AiAssistant from "./AiAssistant";
import { useMvpMode } from "../contexts/MvpContext";
import "./AppLayout.css";

const NAV_ITEMS = [
  { id: "attributes", title: "Attributes" },
  { id: "modules", title: "Server-Side Extensions" },
  { id: "audiences", title: "Audiences" },
  { id: "connectorActions", title: "Connector Actions" },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMvp, setIsMvp } = useMvpMode();
  const [activeTab, setActiveTab] = useState("modules");  // nav id unchanged

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    if (id === "modules") {
      navigate(isMvp ? "/extensions" : "/");
    } else if (id === "attributes") {
      navigate("/attributes");
    }
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <span className="header-logo">
            <i className="fas fa-cloud" aria-hidden="true" />
          </span>
          <span className="header-title">AudienceStream</span>
          <span className="header-separator">|</span>
          <span className="header-profile">My Profile</span>
        </div>
        <div className="header-right">
          <div className="header-mode-toggle">
            <button
              type="button"
              className={`header-mode-btn ${isMvp ? "header-mode-btn-active" : ""}`}
              onClick={() => setIsMvp(true)}
            >MVP</button>
            <button
              type="button"
              className={`header-mode-btn ${!isMvp ? "header-mode-btn-active" : ""}`}
              onClick={() => setIsMvp(false)}
            >FULL</button>
          </div>
          <span className="header-env-badge">Prototype</span>
        </div>
      </header>
      <div className="app-body">
        <nav className="app-sidebar">
          <div className="sidebar-section-title">AUDIENCESTREAM</div>
          {NAV_ITEMS.map((item) => (
            <React.Fragment key={item.id}>
              <button
                className={`sidebar-item ${activeTab === item.id ? "sidebar-item-active" : ""}`}
                onClick={() => handleTabClick(item.id)}
                type="button"
              >
                {item.id === "modules" && (
                  <i className="fas fa-code sidebar-item-icon" aria-hidden="true" />
                )}
                {item.id === "attributes" && (
                  <i className="fas fa-tag sidebar-item-icon" aria-hidden="true" />
                )}
                {item.id === "audiences" && (
                  <i className="fas fa-users sidebar-item-icon" aria-hidden="true" />
                )}
                {item.id === "connectorActions" && (
                  <i className="fas fa-plug sidebar-item-icon" aria-hidden="true" />
                )}
                {item.title}
                {item.id === "modules" && (
                  <span className="sidebar-new-badge">NEW</span>
                )}
              </button>
              {item.id === "modules" && activeTab === "modules" && (
                <>
                  <button
                    type="button"
                    className={`sidebar-sub-item ${location.pathname === "/extensions" || location.pathname.startsWith("/modules/") ? "sidebar-sub-item-active" : ""}`}
                    onClick={() => navigate("/extensions")}
                  >
                    <i className="fas fa-file-code sidebar-item-icon" aria-hidden="true" />
                    Extension Definitions
                  </button>
                  <button
                    type="button"
                    className={`sidebar-sub-item ${location.pathname === "/instances" ? "sidebar-sub-item-active" : ""}`}
                    onClick={() => navigate("/instances")}
                  >
                    <i className="fas fa-list-ol sidebar-item-icon" aria-hidden="true" />
                    Instances and Order
                  </button>
                </>
              )}
            </React.Fragment>
          ))}
        </nav>
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      <AiAssistant
        scope="AudienceStream"
        placeholder="Ask AI Builder anything..."
        suggestions={["Improve tests for this extension", "Add edge case tests", "Create a new extension", "How does the pipeline work?"]}
        getResponse={(msg: string) => {
          const lower = msg.toLowerCase();
          if (lower.includes("improve tests") && lower.includes("lowercase")) return { text: "I've analyzed the Lowercase String extension. Current tests cover basic lowercasing. I'd suggest adding tests for:\n\n1. Mixed-case strings with numbers (e.g. \"Page123URL\")\n2. Already-lowercase strings (no-op check)\n3. Empty string input\n4. Strings with special characters and Unicode\n\nWant me to generate these test cases?" };
          if (lower.includes("improve tests") && lower.includes("engagement")) return { text: "The Compute Engagement Score extension has 2 failing tests (t3, t4). The failures are in edge cases where viewCount or purchaseCount are zero. I can:\n\n1. Fix the failing tests by adjusting expected scores\n2. Add boundary tests for score clamping (0-100)\n3. Add tests for very large input values\n\nWhich approach would you prefer?" };
          if (lower.includes("improve tests") && lower.includes("normalize")) return { text: "The Normalize Page URLs extension passes all tests. To improve coverage, I'd recommend adding:\n\n1. URLs with query parameters and fragments\n2. URLs with encoded characters (%20, etc.)\n3. Protocol-relative URLs (//example.com)\n4. Malformed URL edge cases\n\nShall I generate these?" };
          if (lower.includes("improve tests") && lower.includes("tally")) return { text: "The Tally Over Time extension passes all tests. For better coverage:\n\n1. Empty timeline input\n2. Timeline with entries outside the window\n3. Window of 0 days (edge case)\n4. Very large tallies with many categories\n\nWant me to add these?" };
          if (lower.includes("improve tests") && lower.includes("recency")) return { text: "The Recency-Frequency Scorer passes all tests. I'd suggest adding:\n\n1. Activity from today (maximum recency)\n2. Activity beyond the window (should score 0)\n3. Zero count with recent date\n4. Future date edge case\n\nShall I generate these test cases?" };
          if (lower.includes("generate") && lower.includes("code") && lower.includes("lowercase")) return { text: "I've analyzed the Lowercase String extension. The current code handles basic `.toLowerCase()`. I can improve it by:\n\n1. Adding locale-aware lowercasing with `toLocaleLowerCase()`\n2. Handling null/undefined inputs gracefully\n3. Adding trim and normalization\n\nWant me to generate the updated code?" };
          if (lower.includes("generate") && lower.includes("code") && lower.includes("engagement")) return { text: "The Compute Engagement Score code calculates a composite score from page views and purchase data. I can improve it by:\n\n1. Adding NaN guards on all numeric inputs\n2. Normalizing the score to a 0–100 range\n3. Adding weighted factors for recency\n\nShall I generate the improved version?" };
          if (lower.includes("generate") && lower.includes("code") && lower.includes("normalize")) return { text: "The Normalize Page URLs code strips query params and fragments. I can enhance it by:\n\n1. Decoding percent-encoded characters\n2. Lowercasing the hostname only\n3. Removing trailing slashes consistently\n4. Handling protocol-relative URLs\n\nWant me to generate the updated code?" };
          if (lower.includes("generate") && lower.includes("code") && lower.includes("tally")) return { text: "The Tally Over Time code aggregates counts within a time window. I can improve it by:\n\n1. Adding configurable window granularity (hours/days)\n2. Handling timezone-aware date comparisons\n3. Adding overflow protection for large tallies\n\nShall I generate the improved version?" };
          if (lower.includes("generate") && lower.includes("code") && lower.includes("recency")) return { text: "The Recency-Frequency Scorer computes a combined score from last-activity date and event count. I can improve it by:\n\n1. Adding exponential decay for recency\n2. Normalizing frequency to a percentile\n3. Making the weight ratio configurable\n\nWant me to generate the updated code?" };
          if (lower.includes("generate") && lower.includes("code") || lower.includes("improve") && lower.includes("code")) return { text: "I can analyze the current extension code and suggest improvements for robustness, performance, and readability. I'll look at input validation, edge case handling, and code structure.\n\nWhich extension's code would you like me to work on?" };
          if (lower.includes("add") && lower.includes("new instance") || lower.includes("help") && lower.includes("instance")) return { text: "I can help you configure a new instance. Tell me:\n\n1. **Which extension** should it use? (e.g. Compute Engagement Score, Recency Frequency Scorer)\n2. **What attributes** should be mapped as inputs and outputs?\n3. **What trigger rule** should it fire on? (e.g. All Events, Page Views only, Purchases)\n\nFor example: \"Add a Recency Frequency Scorer instance that scores login recency over 14 days.\"\n\nWhat would you like to set up?" };
          if (lower.includes("generate") && lower.includes("new extension") || lower.includes("help") && lower.includes("generate") && lower.includes("extension")) return { text: "I can help you build a new extension from scratch. Tell me what you'd like it to do and I'll generate:\n\n1. **Name & description** for the extension\n2. **Input & output parameters** with types\n3. **Extension code** implementing the logic\n4. **Test cases** covering core and edge scenarios\n\nFor example: \"Create an extension that hashes email addresses for privacy\" or \"Build a score that combines recency and frequency.\"\n\nWhat should this extension do?" };
          if (lower.includes("generate") && lower.includes("explain") || lower.includes("improve") && lower.includes("explain")) return { text: "Here's what I can do for this extension:\n\n• **Explain** — Walk through the code logic, parameters, and how it fits in the pipeline\n• **Improve** — Suggest optimizations, better error handling, and cleaner structure\n• **Generate** — Rewrite or extend the code with new capabilities\n\nWhat would you like me to start with?" };
          if (lower.includes("improve test") || lower.includes("better test") || lower.includes("more test")) return { text: "I can improve the tests for the current extension. I'll analyze the parameters, identify gaps in coverage, and suggest new test cases for edge cases, boundary conditions, and error scenarios.\n\nWhich extension's tests would you like me to focus on?" };
          if (lower.includes("edge case")) return { text: "I'll analyze the extension's parameters and logic to identify edge cases. Common patterns I check for:\n\n• Empty/null inputs\n• Boundary values (0, negative, very large)\n• Type mismatches\n• Unicode and special characters\n• Concurrent/duplicate processing\n\nWant me to generate edge case tests for the current extension?" };
          if (lower.includes("fix") && lower.includes("fail")) return { text: "I can see the failing tests. Let me analyze the expected vs actual outputs and suggest corrections. Would you like me to fix the test expectations, or adjust the extension logic to match the expected behavior?" };
          if (lower.includes("extension")) return { text: "Extensions run server-side to enrich visitor profiles. You can create, configure, and test them from the Extensions page." };
          if (lower.includes("instance")) return { text: "Instances bind extension parameters to real attributes. Each instance maps inputs and outputs and can have its own trigger rule." };
          if (lower.includes("pipeline") || lower.includes("order")) return { text: "Extensions execute in a defined order during event processing. You can view and reorder them from Instances and Order." };
          if (lower.includes("attribute")) return { text: "Attributes store visitor, visit, and event data. Extensions enrich attributes by reading inputs and writing outputs." };
          return { text: "I can help you create extensions, configure instances, write tests, and understand the pipeline. What would you like to do?" };
        }}
      />
    </div>
  );
}
