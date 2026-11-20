import React from "react";
import { useNavigate } from "react-router-dom";
import OperatorSentence from "./OperatorSentence";
import OperatorPicker from "./OperatorPicker";
import OperatorSummary from "./OperatorSummary";
import { operatorTestSummary } from "../utils/operatorRuntime";
import {
  BUILT_IN_OPERATORS,
  CUSTOM_OPERATOR_PREFIX,
  MOCK_OPERATORS,
  type OperatorDef,
  customOperatorValue,
  findCustomOperator,
  negatedOperatorLabel,
  operatorLabel,
  operatorOperands,
  plainLabel,
} from "../data/operators";
import "../pages/Operators.css";
import "../pages/Audiences.css";

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
  /** Audience conditions use the rich operator picker, the summary marker and inline validation. */
  variant?: "enrichment" | "audience";
  /** Show completeness problems (set after a save attempt). */
  showErrors?: boolean;
}

const INPUT_TYPES: Record<string, string> = { Number: "number", Date: "date" };

export const INCOMPATIBLE_OPERATOR_MESSAGE = "This operator doesn't work with this attribute. Pick another operator.";

export function operatorWorksWith(op: OperatorDef, attrType: string | undefined): boolean {
  return !attrType || op.subjectTypes.some((t) => t === attrType);
}

/** Why a condition can't be saved yet, or null when it's complete. */
export function conditionProblem(c: EnrichmentCondition, attributes: AttributeOption[]): string | null {
  if (!c.attribute) return "Pick an attribute.";
  const custom = findCustomOperator(c.operator);
  if (c.operator.startsWith(CUSTOM_OPERATOR_PREFIX) && !custom) return "Operator not found. Pick another operator.";
  if (custom) {
    if (!operatorWorksWith(custom, attributes.find((a) => a.name === c.attribute)?.type)) return INCOMPATIBLE_OPERATOR_MESSAGE;
    if (!custom.enabled) return "This operator is disabled. Pick another operator.";
  }
  for (const [i, slot] of operatorOperands(c.operator).entries()) {
    const raw = (c.values[i] ?? "").trim();
    const label = custom ? slot.label || slot.name : "a value";
    if (!raw) return `Fill in ${label}.`;
    if (slot.type === "Number" && !Number.isFinite(Number(raw))) return `${custom ? label : "Value"} must be a number.`;
  }
  return null;
}

export default function EnrichmentConditions({
  conditions,
  attributes,
  editing,
  onChange,
  variant = "enrichment",
  showErrors = false,
}: EnrichmentConditionsProps) {
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

  const removeAt = (index: number) => onChange(conditions.filter((_, j) => j !== index));
  const addCondition = () => onChange([...conditions, { attribute: "", operator: "equals", values: [""] }]);

  if (variant === "audience") {
    return (
      <div className="enr-conds-edit aud-conds-edit">
        {conditions.map((c, i) => {
          const attrType = attributes.find((a) => a.name === c.attribute)?.type;
          const custom = findCustomOperator(c.operator);
          const missing = c.operator.startsWith(CUSTOM_OPERATOR_PREFIX) && !custom;
          const incompatible = !!custom && !!c.attribute && !operatorWorksWith(custom, attrType);
          const problem = conditionProblem(c, attributes);
          const visibleProblem = incompatible ? INCOMPATIBLE_OPERATOR_MESSAGE : showErrors && !missing ? problem : null;
          const tests = custom ? operatorTestSummary(custom) : null;
          const slots = operatorOperands(c.operator);
          const slotInvalid = (slot: number) => showErrors && !(c.values[slot] ?? "").trim();
          const errorId = `aud-cond-err-${i}-${c.attribute}`;
          return (
            <div key={i} className={`aud-cond ${visibleProblem || (showErrors && missing) ? "aud-cond-invalid" : ""}`}>
              <div className="enr-cond-edit-row aud-cond-row">
                <span className="enr-cond-and">{i === 0 ? "WHERE" : "AND"}</span>
                <select
                  aria-label="Attribute"
                  value={c.attribute}
                  aria-invalid={showErrors && !c.attribute}
                  onChange={(e) => update(i, { attribute: e.target.value })}
                >
                  <option value="">Select attribute…</option>
                  {attributes.map((a) => (
                    <option key={a.name} value={a.name}>{a.name} ({a.type})</option>
                  ))}
                </select>

                {missing ? (
                  <>
                    <span className="aud-op-missing">
                      <i className="fas fa-question-circle" aria-hidden="true" /> Operator not found{" "}
                      <button type="button" className="op-link" onClick={() => navigate("/operators")}>Custom Operators</button>
                    </span>
                    <OperatorPicker compact value={c.operator} attributeType={attrType} invalid={showErrors} onSelect={(v) => update(i, { operator: v })} />
                  </>
                ) : custom ? (
                  <>
                    <OperatorSummary op={custom} />
                    <button
                      type="button"
                      className={`enr-not-toggle ${c.negate ? "enr-not-toggle-on" : ""}`}
                      aria-pressed={!!c.negate}
                      title="Invert this operator's result"
                      onClick={() => update(i, { negate: !c.negate })}
                    >
                      NOT
                    </button>
                    <span className={`enr-cond-slots aud-cond-sentence ${incompatible ? "aud-cond-sentence-stale" : ""}`}>
                      <OperatorSentence
                        template={c.negate ? negatedOperatorLabel(custom) : custom.label}
                        operands={custom.operands}
                        renderSlot={(operand, slot) => (
                          <input
                            aria-label={operand.label || operand.name}
                            placeholder={operand.label || operand.name}
                            type={INPUT_TYPES[operand.type] ?? "text"}
                            aria-invalid={slotInvalid(slot)}
                            className={`enr-slot-input enr-slot-${operand.type === "Number" ? "narrow" : "wide"}`}
                            value={c.values[slot] ?? ""}
                            onChange={(e) => setValue(i, slot, e.target.value)}
                          />
                        )}
                      />
                    </span>
                    <OperatorPicker compact value={c.operator} attributeType={attrType} invalid={incompatible} onSelect={(v) => update(i, { operator: v })} />
                  </>
                ) : (
                  <>
                    <OperatorPicker value={c.operator} attributeType={attrType} onSelect={(v) => update(i, { operator: v })} />
                    {slots.length > 0 && (
                      <input
                        aria-label="Value"
                        placeholder="Value…"
                        aria-invalid={slotInvalid(0)}
                        value={c.values[0] ?? ""}
                        onChange={(e) => setValue(i, 0, e.target.value)}
                      />
                    )}
                  </>
                )}
                <button type="button" className="op-icon-btn" aria-label="Remove condition" onClick={() => removeAt(i)}>
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </div>
              {visibleProblem && (
                <p id={errorId} className="op-error-text aud-cond-msg">
                  {visibleProblem}
                </p>
              )}
              {tests && tests.failing > 0 && (
                <p className="aud-attention aud-cond-msg">
                  <i className="fas fa-exclamation-triangle" aria-hidden="true" /> Needs attention: this operator is failing{" "}
                  {tests.failing} of {tests.total} {tests.total === 1 ? "test" : "tests"}.{" "}
                  <button type="button" className="op-link" onClick={() => navigate(`/operators/${custom!.id}`)}>
                    Open operator
                  </button>
                </p>
              )}
            </div>
          );
        })}
        <button type="button" className="op-add-btn" onClick={addCondition}>
          <i className="fas fa-plus" aria-hidden="true" /> Add condition
        </button>
      </div>
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
