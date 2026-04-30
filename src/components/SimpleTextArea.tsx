import React from "react";

interface SimpleTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  width?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

export default function SimpleTextArea({
  value,
  onChange,
  placeholder,
  height,
  width,
  rows,
  disabled,
  className,
}: SimpleTextAreaProps) {
  return (
    <textarea
      className={`simple-textarea ${className || ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      style={{ height, width }}
    />
  );
}
