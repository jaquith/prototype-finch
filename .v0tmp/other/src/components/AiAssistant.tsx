import React, { useState, useEffect, useRef } from "react";
import "./AiAssistant.css";

interface LlmAction {
  type: string;
  label: string;
  detail: string;
  id: string;
}

export interface LlmMessage {
  role: "user" | "assistant";
  text: string;
  action?: LlmAction;
}

export interface AiAssistantProps {
  scope: string;
  placeholder?: string;
  suggestions: string[];
  getResponse: (msg: string) => { text: string; action?: LlmAction };
  onAction?: (action: LlmAction, accepted: boolean) => void;
}

export default function AiAssistant({
  scope,
  placeholder = "Ask me anything...",
  suggestions,
  getResponse,
  onAction,
}: AiAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<LlmMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.documentElement.classList.add("ai-panel-open");
    } else {
      document.documentElement.classList.remove("ai-panel-open");
    }
    return () => document.documentElement.classList.remove("ai-panel-open");
  }, [open]);

  useEffect(() => {
    const handler = (e: Event) => {
      setOpen(true);
      const detail = (e as CustomEvent).detail;
      if (detail?.prompt) {
        const prompt = detail.prompt as string;
        // Auto-send the prompt after a brief delay so the panel renders first
        setTimeout(() => {
          setMessages((prev) => [...prev, { role: "user", text: prompt }]);
          setTyping(true);
          const response = getResponse(prompt);
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", text: response.text, action: response.action },
            ]);
            setTyping(false);
          }, 800 + Math.random() * 600);
        }, 100);
      }
    };
    window.addEventListener("open-ai-builder", handler);
    return () => window.removeEventListener("open-ai-builder", handler);
  }, [getResponse]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg) return;
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setInput("");
    setTyping(true);
    const response = getResponse(msg);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: response.text, action: response.action },
      ]);
      setTyping(false);
    }, 800 + Math.random() * 600);
  };

  const handleAction = (action: LlmAction, accepted: boolean) => {
    setPendingActions((prev) => {
      const next = new Set(prev);
      next.add(action.id);
      return next;
    });
    if (!accepted) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "No problem, I won't make that change." },
      ]);
    }
    onAction?.(action, accepted);
    if (accepted) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Done — action applied successfully." },
      ]);
    }
  };

  return (
    <>
      {/* Thin left rail — always visible */}
      <button
        type="button"
        className={`ai-rail ${open ? "ai-rail-active" : ""}`}
        onClick={() => setOpen(!open)}
        aria-label="Tealium AI Builder"
      >
        <div className="ai-rail-inner">
          <span className="ai-rail-text"><span className="ai-rail-brand">Tealium</span> <span className="ai-rail-bold">AI Builder</span></span>
        </div>
        <div className="ai-rail-glow" />
        <span className="ai-rail-chevron"><i className="fas fa-chevron-right" aria-hidden="true" /></span>
      </button>

      {/* Expanded panel */}
      {open && (
        <div
          className="ai-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="llm-panel-header">
            <span className="llm-panel-header-icon">
              <i className="fas fa-wand-magic-sparkles" aria-hidden="true" />
            </span>
            <div className="llm-panel-header-text">
              <span className="llm-panel-header-title">Tealium AI Builder</span>
              <span className="llm-panel-header-subtitle">Create, configure, and implement</span>
            </div>
            <span className="llm-panel-header-scope">{scope}</span>
            <button
              type="button"
              className="llm-panel-close"
              onClick={() => setOpen(false)}
              aria-label="Close Tealium AI Builder"
            >
              <i className="fas fa-times" aria-hidden="true" />
            </button>
          </div>
          <div className="llm-quick-actions">
            {suggestions.slice(0, 4).map((s) => (
              <button
                key={s}
                type="button"
                className="llm-quick-action-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setInput(s);
                  setTimeout(() => {
                    setMessages((prev) => [...prev, { role: "user", text: s }]);
                    setTyping(true);
                    const response = getResponse(s);
                    setTimeout(() => {
                      setMessages((prev) => [
                        ...prev,
                        { role: "assistant", text: response.text, action: response.action },
                      ]);
                      setTyping(false);
                    }, 800 + Math.random() * 600);
                    setInput("");
                  }, 50);
                }}
              >
                <i className={`fas ${s.toLowerCase().includes('test') ? 'fa-flask' : s.toLowerCase().includes('add') || s.toLowerCase().includes('create') || s.toLowerCase().includes('new') ? 'fa-plus-circle' : s.toLowerCase().includes('run') ? 'fa-play' : s.toLowerCase().includes('error') || s.toLowerCase().includes('fail') ? 'fa-bug' : 'fa-cog'}`} aria-hidden="true" />
                <span>{s}</span>
              </button>
            ))}
          </div>
          <div className="llm-panel-messages">
            {messages.length === 0 && !typing && (
              <div className="llm-welcome">
                <div className="llm-welcome-icon">
                  <i className="fas fa-wand-magic-sparkles" aria-hidden="true" />
                </div>
                <p className="llm-welcome-title">What should I build for you?</p>
                <p className="llm-welcome-desc">I create extensions, configure instances, write tests, and wire up your entire setup. Use the actions above or describe what you need.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`llm-msg llm-msg-${m.role}`}>
                {m.role === "assistant" && (
                  <i
                    className="fas fa-wand-magic-sparkles llm-msg-icon"
                    aria-hidden="true"
                  />
                )}
                <div className="llm-msg-bubble">
                  {m.text.split("\n").map((line, j) => (
                    <span key={j}>
                      {line}
                      <br />
                    </span>
                  ))}
                  {m.action && !pendingActions.has(m.action.id) && (
                    <div className="llm-action-proposal">
                      <div className="llm-action-label">
                        <i className="fas fa-bolt" aria-hidden="true" />
                        {m.action.label}
                      </div>
                      <pre className="llm-action-detail">
                        {m.action.detail}
                      </pre>
                      <div className="llm-action-buttons">
                        <button
                          type="button"
                          className="llm-action-accept"
                          onClick={() => handleAction(m.action!, true)}
                        >
                          <i className="fas fa-check" aria-hidden="true" />{" "}
                          Apply
                        </button>
                        <button
                          type="button"
                          className="llm-action-reject"
                          onClick={() => handleAction(m.action!, false)}
                        >
                          <i className="fas fa-times" aria-hidden="true" />{" "}
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                  {m.action && pendingActions.has(m.action.id) && (
                    <div className="llm-action-done">
                      <i
                        className="fas fa-check-circle"
                        aria-hidden="true"
                      />{" "}
                      Action completed
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="llm-msg llm-msg-assistant">
                <i
                  className="fas fa-wand-magic-sparkles llm-msg-icon"
                  aria-hidden="true"
                />
                <div className="llm-msg-bubble llm-msg-typing">
                  <span className="llm-dot" />
                  <span className="llm-dot" />
                  <span className="llm-dot" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="llm-panel-input">
            <input
              type="text"
              className="llm-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder={placeholder}
            />
            <button
              type="button"
              className="llm-send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <i className="fas fa-paper-plane" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
