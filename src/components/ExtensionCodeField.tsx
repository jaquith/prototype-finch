import React, { useRef } from "react";
import { highlightJS } from "../utils/highlightJS";

interface ExtensionCodeFieldProps {
  header: string;
  footer: string;
  value: string;
  onChange: (code: string) => void;
}

export default function ExtensionCodeField({ header, footer, value, onChange }: ExtensionCodeFieldProps) {
  const highlightRef = useRef<HTMLPreElement>(null);
  const headerLines = header.split("\n").length;
  const bodyLines = value.split("\n").length;
  const footerLines = footer.split("\n").length;

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
    onChange(value.slice(0, selectionStart) + "  " + value.slice(selectionEnd));
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = selectionStart + 2;
    });
  };

  const numbers = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => <span key={i}>{from + i}</span>);

  return (
    <div className="op-code ext-code">
      <div className="ext-code-fixed-block" title="Generated from the extension's inputs and outputs. Edit the function body only.">
        <div className="op-code-lines" aria-hidden="true">{numbers(1, headerLines)}</div>
        <pre className="op-code-fixed" dangerouslySetInnerHTML={{ __html: highlightJS(header) }} />
        <i className="fas fa-lock ext-code-lock" aria-hidden="true" />
      </div>
      <div className="op-code-wrapper">
        <div className="op-code-lines" aria-hidden="true">{numbers(headerLines + 1, bodyLines)}</div>
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
            aria-label="Extension function body"
            rows={Math.max(bodyLines, 6)}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      <div className="ext-code-fixed-block">
        <div className="op-code-lines" aria-hidden="true">{numbers(headerLines + bodyLines + 1, footerLines)}</div>
        <pre className="op-code-fixed op-code-fixed-end" dangerouslySetInnerHTML={{ __html: highlightJS(footer) }} />
        <i className="fas fa-lock ext-code-lock" aria-hidden="true" />
      </div>
    </div>
  );
}
