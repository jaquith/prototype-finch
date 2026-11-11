import React from "react";

interface SimpleBadgeProps {
  type?: "informative" | "positive" | "negative" | "warning" | "neutral";
  label: string;
  className?: string;
}

export default function SimpleBadge({ type = "informative", label, className }: SimpleBadgeProps) {
  return (
    <span className={`simple-badge simple-badge-${type} ${className || ""}`}>
      {label}
    </span>
  );
}
