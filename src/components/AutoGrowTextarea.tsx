import React, { useLayoutEffect, useRef } from "react";

type AutoGrowTextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows">;

export default function AutoGrowTextarea({ className, value, onPointerDown, ...rest }: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lastAutoHeight = useRef(0);
  const manualHeight = useRef(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const contentHeight = el.scrollHeight + (el.offsetHeight - el.clientHeight);
    const height = Math.max(contentHeight, manualHeight.current);
    el.style.height = `${height}px`;
    lastAutoHeight.current = height;
  }, [value]);

  // The native resize handle sets an inline height; remember it so typing never snaps the box back smaller.
  const handlePointerDown = (event: React.PointerEvent<HTMLTextAreaElement>) => {
    onPointerDown?.(event);
    const el = event.currentTarget;
    const startHeight = el.offsetHeight;
    window.addEventListener(
      "pointerup",
      () => {
        const height = el.offsetHeight;
        if (height !== startHeight && height !== lastAutoHeight.current) {
          manualHeight.current = height;
          lastAutoHeight.current = height;
        }
      },
      { once: true },
    );
  };

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={`ext-autogrow ${className ?? ""}`}
      spellCheck={false}
      onPointerDown={handlePointerDown}
      {...rest}
    />
  );
}
