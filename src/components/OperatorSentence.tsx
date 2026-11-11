import React from "react";
import { labelSegments, type OperandDef } from "../data/operators";

interface OperatorSentenceProps {
  template: string;
  operands: OperandDef[];
  /** Filled-in operand values; when omitted, operand labels are shown as slots. */
  values?: string[];
  /** Replaces each operand slot, e.g. with an input in edit mode. */
  renderSlot?: (operand: OperandDef, index: number) => React.ReactNode;
  slotClassName?: string;
}

export default function OperatorSentence({ template, operands, values, renderSlot, slotClassName = "op-slot" }: OperatorSentenceProps) {
  return (
    <>
      {labelSegments(template, operands).map((seg, i) => {
        if (seg.kind === "text") {
          const text = seg.text.trim();
          return text ? <span key={i} className="op-slot-text">{text}</span> : null;
        }
        if (renderSlot) return <React.Fragment key={i}>{renderSlot(seg.operand, seg.index)}</React.Fragment>;
        const filled = values?.[seg.index];
        return (
          <code key={i} className={slotClassName} title={`${seg.operand.label || seg.operand.name} (${seg.operand.type})`}>
            {values ? filled || "—" : seg.operand.label || seg.operand.name}
          </code>
        );
      })}
    </>
  );
}
