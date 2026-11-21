"use client";

import { useLayoutEffect, useRef } from "react";

export function FitTextarea({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      if (el.scrollHeight > el.clientHeight) {
        el.style.height = `${el.scrollHeight}px`;
      }
    };

    fit();
    const box = el.parentElement ?? el;
    let width = box.clientWidth;
    const observer = new ResizeObserver(() => {
      if (box.clientWidth === width) return;
      width = box.clientWidth;
      fit();
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-wider text-muted"
      >
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        aria-label={label}
        rows={1}
        disabled={disabled}
        readOnly={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 block w-full resize-none overflow-hidden rounded-lg border border-border bg-surface px-3 py-1.5 text-sm leading-5 outline-none [field-sizing:content] focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-60"
      />
    </div>
  );
}
