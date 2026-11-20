import React, { useId } from "react";
import { useNavigate } from "react-router-dom";
import OperatorSentence from "./OperatorSentence";
import { plainLabel, type OperatorDef } from "../data/operators";
import { useAudiences } from "../data/audiences";
import { audienceUsesOf, enrichmentUsesOf } from "../data/operatorUsage";
import { operatorTestSummary } from "../utils/operatorRuntime";
import { usePopover } from "./usePopover";

export default function OperatorSummary({ op }: { op: OperatorDef }) {
  const navigate = useNavigate();
  const audiences = useAudiences();
  const { open, setOpen, rootRef, triggerRef } = usePopover();
  const titleId = useId();

  const tests = operatorTestSummary(op);
  const places = enrichmentUsesOf(op.id).length + audienceUsesOf(op.id, audiences).length;

  return (
    <div className="enr-summary" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="enr-summary-marker"
        aria-expanded={open}
        aria-label={`About custom operator ${plainLabel(op.label, op.operands)}`}
        onClick={() => setOpen(!open)}
      >
        ƒ
      </button>
      {open && (
        <div className="enr-summary-pop" role="dialog" aria-labelledby={titleId}>
          <p id={titleId} className="enr-summary-title">
            <OperatorSentence template={op.label} operands={op.operands} slotClassName="enr-summary-slot" />
          </p>
          {op.description && <p className="enr-summary-desc">{op.description}</p>}
          <dl className="enr-summary-facts">
            <div>
              <dt>Tests</dt>
              <dd>
                {tests.total === 0 ? (
                  "No tests"
                ) : (
                  <span className={tests.failing ? "op-fail" : "op-pass"}>
                    {tests.passed}/{tests.total} passing
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>Used in</dt>
              <dd>
                {places} {places === 1 ? "place" : "places"}
              </dd>
            </div>
          </dl>
          {tests.failing > 0 && (
            <p className="aud-attention">
              <i className="fas fa-exclamation-triangle" aria-hidden="true" /> Needs attention: failing {tests.failing} of {tests.total}{" "}
              {tests.total === 1 ? "test" : "tests"}
            </p>
          )}
          <button type="button" className="op-link" onClick={() => navigate(`/operators/${op.id}`)}>
            Open operator <i className="fas fa-arrow-right" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
