import React, { useLayoutEffect, useRef } from "react";

type AutoGrowTextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows">;

export default function AutoGrowTextarea({ className, value, ...rest }: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
  }, [value]);

  return <textarea ref={ref} rows={1} value={value} className={`ext-autogrow ${className ?? ""}`} spellCheck={false} {...rest} />;
}
