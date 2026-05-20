"use client";

import { useEffect, useRef } from "react";

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  onStop,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  onStop?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && value.trim()) onSubmit();
      }}
      className="relative flex items-end gap-2 rounded-2xl border border-[color:var(--color-line)] bg-white/70 backdrop-blur px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(0,0,0,0.08)] focus-within:border-[color:var(--color-ink)]/50 transition-colors"
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && value.trim()) onSubmit();
          }
        }}
        rows={1}
        placeholder="Fråga något om föreningen eller datan…"
        className="flex-1 resize-none bg-transparent text-[14.5px] leading-relaxed text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)]/80 outline-none"
      />
      {disabled ? (
        <button
          type="button"
          onClick={onStop}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-ink)] text-[color:var(--color-paper)] transition-colors hover:bg-[color:var(--color-ink)]/85"
          aria-label="Stoppa"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect width="10" height="10" rx="1.5" />
          </svg>
        </button>
      ) : (
        <button
          type="submit"
          disabled={!value.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-ink)] text-[color:var(--color-paper)] transition-opacity disabled:opacity-25"
          aria-label="Skicka"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      )}
    </form>
  );
}
