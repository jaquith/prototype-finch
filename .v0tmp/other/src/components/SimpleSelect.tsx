import React, { useState, useRef, useEffect, useCallback } from "react";

interface SelectOption {
  label: string;
  value: string;
}

interface SimpleSelectProps {
  options: SelectOption[];
  value: SelectOption | null;
  onChange: (option: SelectOption | null) => void;
  placeholder?: string;
  isFullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function SimpleSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  isFullWidth,
  disabled,
  className,
}: SimpleSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
      setSearch("");
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, handleClickOutside]);

  const handleSelect = (opt: SelectOption) => {
    onChange(opt);
    setOpen(false);
    setSearch("");
  };

  return (
    <div
      ref={containerRef}
      className={`simple-select ${isFullWidth ? "simple-select-full" : ""} ${disabled ? "simple-select-disabled" : ""} ${className || ""}`}
    >
      <div
        className={`simple-select-control ${open ? "simple-select-control-open" : ""}`}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            if (!open) setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      >
        {open ? (
          <input
            ref={inputRef}
            className="simple-select-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={value ? value.label : placeholder}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`simple-select-value ${!value ? "simple-select-placeholder" : ""}`}>
            {value ? value.label : placeholder}
          </span>
        )}
        <i className={`fas fa-chevron-down simple-select-arrow ${open ? "simple-select-arrow-open" : ""}`} />
      </div>
      {open && (
        <div className="simple-select-menu">
          {filtered.length === 0 ? (
            <div className="simple-select-empty">No options</div>
          ) : (
            filtered.map((opt) => (
              <div
                key={opt.value}
                className={`simple-select-option ${value?.value === opt.value ? "simple-select-option-selected" : ""}`}
                onClick={() => handleSelect(opt)}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
