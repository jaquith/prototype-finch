import React, { useEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import OperatorSentence from "./OperatorSentence";
import { BUILT_IN_OPERATORS, MOCK_OPERATORS, customOperatorValue, operatorLabel } from "../data/operators";
import { usePopover } from "./usePopover";

interface OperatorPickerProps {
  value: string;
  attributeType?: string;
  /** Icon-only trigger, used when the condition already reads as a custom operator sentence. */
  compact?: boolean;
  invalid?: boolean;
  onSelect: (value: string) => void;
}

export default function OperatorPicker({ value, attributeType, compact = false, invalid = false, onSelect }: OperatorPickerProps) {
  const navigate = useNavigate();
  const { open, setOpen, rootRef, triggerRef } = usePopover();
  const popRef = useRef<HTMLDivElement>(null);
  const popId = useId();

  const enabled = MOCK_OPERATORS.filter((op) => op.enabled);
  const compatible = enabled.filter((op) => !attributeType || op.subjectTypes.some((t) => t === attributeType));
  const excluded = enabled.length - compatible.length;

  useEffect(() => {
    if (!open) return;
    const items = popRef.current?.querySelectorAll<HTMLButtonElement>(".enr-picker-item");
    const selected = popRef.current?.querySelector<HTMLButtonElement>('.enr-picker-item[aria-pressed="true"]');
    (selected ?? items?.[0])?.focus();
  }, [open]);

  const choose = (next: string) => {
    onSelect(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveFocus = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(popRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const goToOperators = () => {
    setOpen(false);
    navigate("/operators");
  };

  return (
    <div className="enr-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`enr-picker-trigger ${compact ? "enr-picker-trigger-compact" : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={popId}
        aria-invalid={invalid}
        aria-label={compact ? "Change operator" : undefined}
        title={compact ? "Change operator" : undefined}
        onClick={() => setOpen(!open)}
      >
        {!compact && <span>{operatorLabel(value)}</span>}
        <i className="fas fa-chevron-down" aria-hidden="true" />
      </button>

      {open && (
        <div id={popId} ref={popRef} className="enr-picker-pop" role="group" aria-label="Choose an operator" onKeyDown={moveFocus}>
          <p className="enr-picker-heading">Built-in</p>
          {BUILT_IN_OPERATORS.map((op) => (
            <button
              key={op.value}
              type="button"
              className="enr-picker-item"
              aria-pressed={value === op.value}
              onClick={() => choose(op.value)}
            >
              {op.label}
            </button>
          ))}

          <p className="enr-picker-heading">Custom</p>
          {compatible.map((op) => {
            const opValue = customOperatorValue(op);
            return (
              <button
                key={op.id}
                type="button"
                className="enr-picker-item enr-picker-item-custom"
                aria-pressed={value === opValue}
                title={op.description}
                onClick={() => choose(opValue)}
              >
                <span className="enr-picker-fx" aria-hidden="true">ƒ</span>
                <OperatorSentence
                  template={op.label}
                  operands={op.operands}
                  renderSlot={(operand) => <span className="enr-picker-slot">{operand.label || operand.name}</span>}
                />
                <span className="sr-only">. {op.description}</span>
              </button>
            );
          })}
          {compatible.length === 0 ? (
            <p className="enr-picker-note">
              No custom operators work with this attribute.{" "}
              <button type="button" className="op-link" onClick={goToOperators}>Custom Operators</button>
            </p>
          ) : (
            excluded > 0 && (
              <p className="enr-picker-note">
                {excluded} other custom {excluded === 1 ? "operator doesn't" : "operators don't"} work with this attribute.{" "}
                <button type="button" className="op-link" onClick={goToOperators}>Custom Operators</button>
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
