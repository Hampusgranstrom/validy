"use client";

import { useState } from "react";

const TOOL_LABELS: Record<string, string> = {
  list_cooperatives: "Listar föreningar",
  search_cooperatives: "Söker förening",
  get_cooperative: "Hämtar föreningsdata",
  list_loans: "Läser lån",
  list_apartments: "Läser lägenheter",
  get_annual_reports: "Läser årsredovisningar",
  get_maintenance_plan: "Läser underhållsplan",
  simulate_interest_change: "Simulerar ränteförändring",
  compare_cooperatives: "Jämför föreningar",
};

export type ToolCallState = {
  id: string;
  name: string;
  result?: unknown;
  status: "running" | "done";
};

export function ToolCall({ call }: { call: ToolCallState }) {
  const [open, setOpen] = useState(false);
  const label = TOOL_LABELS[call.name] ?? call.name;

  return (
    <div className="fade-up my-2 inline-flex max-w-full flex-col rounded-md border border-[color:var(--color-line)] bg-[color:var(--color-faint)]/60 text-[12.5px]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 text-left text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] transition-colors"
      >
        <span className="relative flex h-1.5 w-1.5">
          {call.status === "running" ? (
            <>
              <span className="absolute inline-flex h-full w-full rounded-full bg-[color:var(--color-ink)]/50 pulse-dot"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--color-ink)]"></span>
            </>
          ) : (
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--color-ink)]/40"></span>
          )}
        </span>
        <span className="font-medium tracking-tight text-[color:var(--color-ink)]/85">
          {label}
        </span>
        {call.status === "done" && (
          <span className="text-[10px] text-[color:var(--color-muted)] ml-1">
            {open ? "dölj data" : "visa data"}
          </span>
        )}
      </button>
      {open && call.result !== undefined && (
        <pre className="max-h-72 overflow-auto scroll-fade border-t border-[color:var(--color-line)] bg-white/60 px-3 py-2 text-[11px] leading-snug text-[color:var(--color-muted)] font-mono">
{JSON.stringify(call.result, null, 2)}
        </pre>
      )}
    </div>
  );
}
