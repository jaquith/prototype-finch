import React, { useRef } from "react";

interface SimpleSwitchProps {
  isStandAlone?: boolean;
  on: boolean;
  onChange: (value: boolean) => void;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export default function SimpleSwitch({ on, onChange, inputProps }: SimpleSwitchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { "aria-label": ariaLabel, disabled, ...restInput } = inputProps || {};

  return (
    <label className="simple-switch" aria-label={ariaLabel}>
      <input
        ref={inputRef}
        type="checkbox"
        className="simple-switch-input"
        checked={on}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        aria-label={ariaLabel}
        {...restInput}
      />
      <span className={`simple-switch-track ${on ? "on" : ""} ${disabled ? "disabled" : ""}`}>
        <span className="simple-switch-thumb" />
      </span>
    </label>
  );
}
