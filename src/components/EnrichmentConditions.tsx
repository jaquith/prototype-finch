import React from "react";
import { useNavigate } from "react-router-dom";
import OperatorSentence from "./OperatorSentence";
import {
  BUILT_IN_OPERATORS,
  MOCK_OPERATORS,
  customOperatorValue,
  findCustomOperator,
  negatedOperatorLabel,
  operatorLabel,
  operatorOperands,
  plainLabel,
} from "../data/operators";
import "../pages/Operators.css";

export interface EnrichmentCondition {
  attribute: string;
  operator: string;
  /** One entry per operand slot of the operator. */
  values: string[];
  /** Inverts a custom operator's result. Errors still evaluate to FALSE. */
  negate?: boolean;
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

const INPUT_TYPES: Record<string, string> = { Number: "number", Date: "date" };

export default function EnrichmentConditions({ conditions, attributes, editing, onChange }: EnrichmentConditionsProps) {
  const navigate = useNavigate();

  const update = (index: number, patch: Partial<EnrichmentCondition>) => {
    const next = conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
    if (patch.operator !== undefined) {
      next[index].values = operatorOperands(patch.operator).map((_, j) => conditions[index].values[j] ?? "");
      if (!findCustomOperator(patch.operator)) next[index].negate = false;
    }
    onChange(next);
  };

  const setValue = (index: number, slot: number, value: string) => {
    const c = conditions[index];
    update(index, { values: operatorOperands(c.operator).map((_, j) => (j === slot ? value : c.values[j] ?? "")) });
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
                  className={`enr-cond-op enr-cond-op-custom ${c.negate ? "enr-cond-op-negated" : ""}`}
                  onClick={() => navigate(`/operators/${custom.id}`)}
                  title={c.negate ? `Inverse of: ${custom.description}` : custom.description}
                >
                  <span aria-hidden="true">ƒ</span>
                  {c.negate && <span className="sr-only">Negated:</span>}
                  <OperatorSentence
                    template={c.negate ? negatedOperatorLabel(custom) : custom.label}
                    operands={custom.operands}
                    values={c.values}
                    slotClassName="enr-cond-value"
                  />
                </button>
              ) : (
                <>
                  <span className="enr-cond-op">{operatorLabel(c.operator)}</span>
                  {operatorOperands(c.operator).length > 0 && <code className="enr-cond-value">{c.values[0] || "—"}</code>}
                </>
              )}
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
        const showStaleCustom = selectedCustom && !compatible.some((op) => op.id === selectedCustom.id);
        const slots = operatorOperands(c.operator);
        return (
          <div key={i} className="enr-cond-edit-row">
            <span className="enr-cond-and">{i === 0 ? "WHEN" : "AND"}</span>
            <select aria-label="Attribute" value={c.attribute} onChange={(e) => update(i, { attribute: e.target.value })}>
              <option value="">Select attribute…</option>
              {attributes.map((a) => (
                <option key={a.name} value={a.name}>{a.name} ({a.type})</option>
              ))}
            </select>
            {selectedCustom && (
              <button
                type="button"
                className={`enr-not-toggle ${c.negate ? "enr-not-toggle-on" : ""}`}
                aria-pressed={!!c.negate}
                title="Invert this operator's result"
                onClick={() => update(i, { negate: !c.negate })}
              >
                NOT
              </button>
            )}
            <select aria-label="Operator" value={c.operator} onChange={(e) => update(i, { operator: e.target.value })}>
              <optgroup label="Built-in">
                {BUILT_IN_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </optgroup>
              <optgroup label={compatible.length ? "Custom operators" : "Custom operators (none for this type)"}>
                {compatible.map((op) => (
                  <option key={op.id} value={customOperatorValue(op)}>
                    ƒ {plainLabel(c.negate && op.id === selectedCustom?.id ? negatedOperatorLabel(op) : op.label, op.operands)}
                  </option>
                ))}
                {showStaleCustom && (
                  <option value={c.operator}>ƒ {plainLabel(selectedCustom.label, selectedCustom.operands)} ({selectedCustom.enabled ? "not for this type" : "disabled"})</option>
                )}
              </optgroup>
            </select>
            {selectedCustom ? (
              <span className="enr-cond-slots">
                <OperatorSentence
                  template={c.negate ? negatedOperatorLabel(selectedCustom) : selectedCustom.label}
                  operands={selectedCustom.operands}
                  renderSlot={(operand, slot) => (
                    <input
                      aria-label={operand.label || operand.name}
                      placeholder={operand.label || operand.name}
                      type={INPUT_TYPES[operand.type] ?? "text"}
                      className={`enr-slot-input enr-slot-${operand.type === "Number" ? "narrow" : "wide"}`}
                      value={c.values[slot] ?? ""}
                      onChange={(e) => setValue(i, slot, e.target.value)}
                    />
                  )}
                />
              </span>
            ) : (
              slots.length > 0 && (
                <input aria-label="Value" placeholder="Value…" value={c.values[0] ?? ""} onChange={(e) => setValue(i, 0, e.target.value)} />
              )
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
        onClick={() => onChange([...conditions, { attribute: "", operator: "equals", values: [""] }])}
      >
        <i className="fas fa-plus" aria-hidden="true" /> Add condition
      </button>
    </div>
  );
}
