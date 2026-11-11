import React, { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { OperatorUsage } from "../data/operators";

interface OperatorActivationSwitchProps {
  enabled: boolean;
  dependencies: OperatorUsage[];
  operatorName: string;
  onChange: (enabled: boolean) => void;
  /** Longer status wording for the editor; the list uses the compact form. */
  verbose?: boolean;
}

export default function OperatorActivationSwitch({
  enabled,
  dependencies,
  operatorName,
  onChange,
  verbose = false,
}: OperatorActivationSwitchProps) {
  const navigate = useNavigate();
  const statusId = useId();
  const popoverId = useId();
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  // Fixed positioning keeps the popover from being clipped by the table's scroll container.
  const openAt = (anchor: HTMLElement) => {
    window.clearTimeout(closeTimer.current);
    const rect = anchor.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
  };
  const scheduleClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setPos(null), 120);
  };

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const dependencyCount = dependencies.length;
  const locked = enabled && dependencyCount > 0;
  const dependencyText = `${dependencyCount} ${dependencyCount === 1 ? "dependency" : "dependencies"}`;
  const lockReason = `Used by ${dependencyCount} ${dependencyCount === 1 ? "enrichment" : "enrichments"}. Remove it from those conditions before disabling.`;

  let status: string;
  if (!enabled) status = verbose ? "Disabled" : "Off";
  else if (locked) status = dependencyText;
  else status = verbose ? "Available in conditions" : "No dependencies";

  return (
    <div className={`op-activation ${locked ? "op-activation-locked" : ""}`}>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-disabled={locked}
        aria-label={`${enabled ? "Disable" : "Enable"} ${operatorName}`}
        aria-describedby={statusId}
        className={`op-switch ${enabled ? "op-switch-on" : ""}`}
        onClick={() => {
          if (!locked) onChange(!enabled);
        }}
      >
        <span className="op-switch-knob" />
      </button>

      {locked ? (
        <div
          className="op-deps"
          onMouseEnter={(e) => openAt(e.currentTarget)}
          onMouseLeave={scheduleClose}
          onFocus={(e) => openAt(e.currentTarget)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPos(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setPos(null);
          }}
        >
          <button
            type="button"
            id={statusId}
            className="op-activation-status op-deps-trigger"
            aria-describedby={popoverId}
            aria-expanded={pos !== null}
            onClick={(e) => (pos ? setPos(null) : openAt(e.currentTarget.parentElement as HTMLElement))}
          >
            <i className="fas fa-lock" aria-hidden="true" />
            {status}
          </button>
          <div
            id={popoverId}
            role="tooltip"
            className="op-deps-pop"
            hidden={pos === null}
            style={pos ? { top: pos.top, right: pos.right } : undefined}
          >
            <p className="op-deps-reason">{lockReason}</p>
            <ul className="op-deps-list">
              {dependencies.map((d) => (
                <li key={`${d.attributeId}-${d.enrichment}`}>
                  <button
                    type="button"
                    className="op-deps-item"
                    onClick={() => navigate(`/attributes?attr=${d.attributeId}`)}
                  >
                    <i className="fas fa-magic" aria-hidden="true" />
                    <span className="op-deps-enrichment">{d.enrichment}</span>
                    <span className="op-deps-attr">{d.attribute}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <span id={statusId} className="op-activation-status">
          {status}
        </span>
      )}
    </div>
  );
}
