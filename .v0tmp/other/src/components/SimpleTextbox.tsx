import React from "react";

interface SimpleTextboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isFullWidth?: boolean;
  disabled?: boolean;
  type?: string;
  className?: string;
}

export default function SimpleTextbox({
  value,
  onChange,
  placeholder,
  isFullWidth,
  disabled,
  type = "text",
  className,
}: SimpleTextboxProps) {
  return (
    <input
      type={type}
      className={`simple-textbox ${isFullWidth ? "simple-textbox-full" : ""} ${className || ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
