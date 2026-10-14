import React, { useId } from "react";

interface OperatorActivationSwitchProps {
  enabled: boolean;
  dependencyCount: number;
  operatorName: string;
  onChange: (enabled: boolean) => void;
  /** Longer status wording for the editor; the list uses the compact form. */
  verbose?: boolean;
}

export default function OperatorActivationSwitch({
  enabled,
  dependencyCount,
  operatorName,
  onChange,
  verbose = false,
}: OperatorActivationSwitchProps) {
  const statusId = useId();
  const locked = enabled && dependencyCount > 0;
  const dependencyText = `${dependencyCount} ${dependencyCount === 1 ? "dependency" : "dependencies"}`;
  const lockReason = `Used by ${dependencyCount} ${dependencyCount === 1 ? "enrichment" : "enrichments"}. Remove it from those conditions before disabling.`;

  let status: string;
  if (!enabled) status = verbose ? "Disabled" : "Off";
  else if (locked) status = dependencyText;
  else status = verbose ? "Available in conditions" : "No dependencies";

  return (
    <div className={`op-activation ${locked ? "op-activation-locked" : ""}`} title={locked ? lockReason : undefined}>
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
      <span id={statusId} className="op-activation-status">
        {locked && <i className="fas fa-lock" aria-hidden="true" />}
        {status}
        {locked && <span className="sr-only">. {lockReason}</span>}
      </span>
    </div>
  );
}
