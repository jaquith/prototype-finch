import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/SimpleButton";
import { MOCK_OPERATORS, OPERATOR_USAGE } from "../data/operators";
import { evaluateOperator, parseOperand, parseSubject } from "../utils/operatorRuntime";
import "./ModuleList.css";
import "./Operators.css";

function countPassing(opId: string): { passed: number; total: number } {
  const op = MOCK_OPERATORS.find((o) => o.id === opId)!;
  const subjectType = op.subjectTypes[0] ?? "String";
  const passed = op.tests.filter((t) => {
    const r = evaluateOperator(op.code, parseSubject(t.subject, subjectType), parseOperand(t.operand, op.operandType));
    return r.ok && r.value === t.expected;
  }).length;
  return { passed, total: op.tests.length };
}

export default function OperatorList() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MOCK_OPERATORS.map((o) => [o.id, o.enabled])),
  );

  const toggle = (id: string) => {
    setEnabled((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const op = MOCK_OPERATORS.find((o) => o.id === id);
      if (op) op.enabled = next[id];
      return next;
    });
  };

  return (
    <div className="module-list-page">
      <header className="module-list-header">
        <div className="module-list-title-section">
          <h1 className="module-list-title">Custom Operators</h1>
        </div>
        <p className="module-list-description">
          Function-based operators always evaluate to <strong>TRUE</strong> or <strong>FALSE</strong>. Once enabled,
          they appear next to built-in operators like <em>equals</em> and <em>contains</em> when you build the conditions
          of an enrichment.
        </p>
      </header>

      <div className="module-list-toolbar">
        <Button type="primary" onClick={() => navigate("/operators/new")}>
          <i className="fas fa-plus" aria-hidden="true" /> New Operator
        </Button>
      </div>

      <div className="module-table-container">
        <table className="module-table">
          <thead>
            <tr>
              <th className="module-table-th">Operator</th>
              <th className="module-table-th">Applies to</th>
              <th className="module-table-th">Operand</th>
              <th className="module-table-th">Tests</th>
              <th className="module-table-th">Used by</th>
              <th className="module-table-th">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_OPERATORS.map((op) => {
              const { passed, total } = countPassing(op.id);
              const usage = OPERATOR_USAGE[op.id] ?? [];
              return (
                <tr key={op.id} className="module-table-row op-row" onClick={() => navigate(`/operators/${op.id}`)}>
                  <td className="module-table-td">
                    <div className="op-name-cell">
                      <span className="op-fx" aria-hidden="true">ƒ</span>
                      <div>
                        <div className="module-name-text">{op.label}</div>
                        <code className="op-identifier">{op.identifier}()</code>
                      </div>
                    </div>
                  </td>
                  <td className="module-table-td">
                    <div className="op-chip-row">
                      {op.subjectTypes.map((t) => (
                        <span key={t} className="op-chip">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="module-table-td op-muted">
                    {op.operandType === "none" ? "None" : `${op.operandLabel ?? "Value"} (${op.operandType})`}
                  </td>
                  <td className="module-table-td">
                    {total === 0 ? (
                      <span className="op-muted">No tests</span>
                    ) : (
                      <span className={passed === total ? "op-pass" : "op-fail"}>
                        <i className={`fas ${passed === total ? "fa-check-circle" : "fa-times-circle"}`} aria-hidden="true" />{" "}
                        {passed}/{total} passing
                      </span>
                    )}
                  </td>
                  <td className="module-table-td op-muted">
                    {usage.length === 0 ? "Not used" : `${usage.length} enrichment${usage.length > 1 ? "s" : ""}`}
                  </td>
                  <td className="module-table-td" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled[op.id]}
                      aria-label={`${enabled[op.id] ? "Disable" : "Enable"} ${op.label}`}
                      className={`op-switch ${enabled[op.id] ? "op-switch-on" : ""}`}
                      onClick={() => toggle(op.id)}
                    >
                      <span className="op-switch-knob" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
