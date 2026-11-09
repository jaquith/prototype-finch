import React, { useState, useRef } from "react";

interface SimpleTooltipProps {
  title: string;
  children: React.ReactNode;
}

export default function SimpleTooltip({ title, children }: SimpleTooltipProps) {
  const [show, setShow] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={wrapperRef}
      className="simple-tooltip-wrapper"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
      role="button"
      aria-label={title}
    >
      {children}
      {show && (
        <span className="simple-tooltip-popup" role="tooltip" style={{ whiteSpace: "pre-line" }}>
          {title}
        </span>
      )}
    </span>
  );
}
