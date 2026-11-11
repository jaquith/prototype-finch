import React from "react";

interface SimpleButtonProps {
  type?: "primary" | "border" | "borderless";
  isIconOnly?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  attrProps?: Record<string, any>;
}

export default function SimpleButton({
  type = "border",
  isIconOnly,
  onClick,
  children,
  attrProps,
}: SimpleButtonProps) {
  const { className: extraClass, ...rest } = attrProps || {};

  return (
    <button
      className={`simple-btn simple-btn-${type} ${isIconOnly ? "simple-btn-icon" : ""} ${extraClass || ""}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
