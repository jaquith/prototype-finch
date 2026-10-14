import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BUILT_IN_OPERATORS,
  MOCK_OPERATORS,
  customOperatorValue,
  findCustomOperator,
  operatorLabel,
  operatorTakesValue,
} from "../data/operators";
import "../pages/Operators.css";

export interface EnrichmentCondition {
  attribute: string;
  operator: string;
  value: string;
}

interface AttributeOption {
  name: string;
  type: string;
}

interface EnrichmentConditionsProps {
  conditions: EnrichmentCondition[];
  attributes: AttributeOption[];
  editing: boolean;
  onChange: (conditions: EnrichmentCondition[]) => void;
}

export default function EnrichmentConditions({ conditions, attributes, editing, onChange }: EnrichmentConditionsProps) {
  const navigate = useNavigate();

  const update = (index: number, patch: Partial<EnrichmentCondition>) => {
    const next = conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
    if (patch.operator !== undefined && !operatorTakesValue(patch.operator)) next[index].value = "";
    onChange(next);
  };

  if (!editing) {
    if (conditions.length === 0) return null;
    return (
      <ul className="enr-conds" aria-label="Conditions">
        {conditions.map((c, i) => {
          const custom = findCustomOperator(c.operator);
          return (
            <li key={i} className="enr-cond">
              {i > 0 && <span className="enr-cond-and">AND</span>}
              <code className="enr-cond-attr">{c.attribute}</code>
              {custom ? (
                <button
                  type="button"
                  className="enr-cond-op enr-cond-op-custom"
                  onClick={() => navigate(`/operators/${custom.id}`)}
                  title={custom.description}
                >
                  <span aria-hidden="true">ƒ</span> {custom.label}
                </button>
              ) : (
                <span className="enr-cond-op">{operatorLabel(c.operator)}</span>
              )}
              {operatorTakesValue(c.operator) && <code className="enr-cond-value">{c.value || "—"}</code>}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="enr-conds-edit">
      {conditions.map((c, i) => {
        const attrType = attributes.find((a) => a.name === c.attribute)?.type;
        const compatible = MOCK_OPERATORS.filter(
          (op) => op.enabled && (!attrType || op.subjectTypes.some((t) => t === attrType)),
        );
        const selectedCustom = findCustomOperator(c.operator);
        const showStaleCustom = selectedCustom && !compatible.includes(selectedCustom);
        return (
          <div key={i} className="enr-cond-edit-row">
            <span className="enr-cond-and">{i === 0 ? "WHEN" : "AND"}</span>
            <select aria-label="Attribute" value={c.attribute} onChange={(e) => update(i, { attribute: e.target.value })}>
              <option value="">Select attribute…</option>
              {attributes.map((a) => (
                <option key={a.name} value={a.name}>{a.name} ({a.type})</option>
              ))}
            </select>
            <select aria-label="Operator" value={c.operator} onChange={(e) => update(i, { operator: e.target.value })}>
              <optgroup label="Built-in">
                {BUILT_IN_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </optgroup>
              <optgroup label={compatible.length ? "Custom operators" : "Custom operators (none for this type)"}>
                {compatible.map((op) => (
                  <option key={op.id} value={customOperatorValue(op)}>ƒ {op.label}</option>
                ))}
                {showStaleCustom && (
                  <option value={c.operator}>ƒ {selectedCustom.label} (unavailable)</option>
                )}
              </optgroup>
            </select>
            {operatorTakesValue(c.operator) && (
              <input
                aria-label="Value"
                placeholder={selectedCustom?.operandLabel ?? "Value…"}
                value={c.value}
                onChange={(e) => update(i, { value: e.target.value })}
              />
            )}
            <button type="button" className="op-icon-btn" aria-label="Remove condition" onClick={() => onChange(conditions.filter((_, j) => j !== i))}>
              <i className="fas fa-times" aria-hidden="true" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="op-add-btn"
        onClick={() => onChange([...conditions, { attribute: "", operator: "equals", value: "" }])}
      >
        <i className="fas fa-plus" aria-hidden="true" /> Add condition
      </button>
    </div>
  );
}
