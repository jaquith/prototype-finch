import React, { useRef } from "react";
import { highlightJS } from "../utils/highlightJS";

interface OperatorCodeFieldProps {
  value: string;
  onChange: (code: string) => void;
  identifier?: string;
  params: string[];
}

export default function OperatorCodeField({ value, onChange, identifier, params }: OperatorCodeFieldProps) {
  const highlightRef = useRef<HTMLPreElement>(null);
  const header = `function ${identifier || "evaluate"}(${["subject", ...params].join(", ")}) {`;
  const lineCount = value.split("\n").length;

  const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart, selectionEnd } = el;
    const next = value.slice(0, selectionStart) + "  " + value.slice(selectionEnd);
    onChange(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = selectionStart + 2;
    });
  };

  return (
    <div className="op-code">
      <pre className="op-code-fixed" dangerouslySetInnerHTML={{ __html: highlightJS(header) }} />
      <div className="op-code-wrapper">
        <div className="op-code-lines" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i}>{i + 2}</span>
          ))}
        </div>
        <div className="op-code-body">
          <pre
            ref={highlightRef}
            className="op-code-highlight"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightJS(value) + "\n" }}
          />
          <textarea
            className="op-code-area"
            value={value}
            spellCheck={false}
            aria-label="Operator function body"
            rows={Math.max(lineCount, 6)}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      <pre className="op-code-fixed op-code-fixed-end">{"}"}</pre>
    </div>
  );
}
