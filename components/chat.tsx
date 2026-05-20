"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Message, type ChatTurn } from "./message";
import { Composer } from "./composer";
import type { ToolCallState } from "./tool-call";

const SUGGESTIONS = [
  "Hur ser bostadsrätten Katthusets förutsättningar ut om räntan höjs 2%?",
  "Vilken förening har lägst belåning per kvm?",
  "Jämför Katthuset och Bergskristallen ekonomiskt.",
  "Vad är planerat underhåll för Tallgården de närmaste åren?",
];

export function Chat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      const userTurn: ChatTurn = { role: "user", text: trimmed };
      const assistantTurn: ChatTurn = { role: "assistant", text: "", toolCalls: [], streaming: true };

      const next = [...turns, userTurn, assistantTurn];
      setTurns(next);
      setInput("");
      setBusy(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            messages: next
              .filter((t) => t.role === "user" || t.text)
              .slice(0, -1) // exclude the empty assistant placeholder
              .map((t) => ({ role: t.role, content: t.text })),
          }),
        });

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ error: "Nätverksfel." }));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        const updateLast = (mut: (t: ChatTurn) => ChatTurn) => {
          setTurns((prev) => {
            const out = prev.slice();
            out[out.length - 1] = mut(out[out.length - 1]);
            return out;
          });
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const events = buf.split("\n\n");
          buf = events.pop() ?? "";
          for (const ev of events) {
            const line = ev.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            let data: { type: string; [k: string]: unknown };
            try {
              data = JSON.parse(payload);
            } catch {
              continue;
            }

            if (data.type === "text") {
              updateLast((t) => ({ ...t, text: t.text + (data.delta as string) }));
            } else if (data.type === "tool_start") {
              const call: ToolCallState = {
                id: data.id as string,
                name: data.name as string,
                status: "running",
              };
              updateLast((t) => ({ ...t, toolCalls: [...(t.toolCalls ?? []), call] }));
            } else if (data.type === "tool_end") {
              updateLast((t) => ({
                ...t,
                toolCalls: (t.toolCalls ?? []).map((c) =>
                  c.id === data.id ? { ...c, status: "done", result: data.result } : c,
                ),
              }));
            } else if (data.type === "error") {
              updateLast((t) => ({
                ...t,
                text: t.text + (t.text ? "\n\n" : "") + "**Fel:** " + (data.message as string),
              }));
            } else if (data.type === "done") {
              updateLast((t) => ({ ...t, streaming: false }));
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          // Stopped by user
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          setTurns((prev) => {
            const out = prev.slice();
            out[out.length - 1] = {
              ...out[out.length - 1],
              text: (out[out.length - 1].text ? out[out.length - 1].text + "\n\n" : "") + "**Fel:** " + msg,
              streaming: false,
            };
            return out;
          });
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
        setTurns((prev) => {
          const out = prev.slice();
          if (out[out.length - 1]?.role === "assistant") {
            out[out.length - 1] = { ...out[out.length - 1], streaming: false };
          }
          return out;
        });
      }
    },
    [busy, turns],
  );

  const stop = () => {
    abortRef.current?.abort();
  };

  const empty = turns.length === 0;

  return (
    <div className="flex h-dvh w-full flex-col bg-[color:var(--color-paper)]">
      <header className="flex items-center justify-between border-b border-[color:var(--color-line)] px-6 py-3">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-[13.5px] font-medium tracking-tight text-[color:var(--color-ink)]">
            Validy
          </span>
          <span className="text-[11.5px] text-[color:var(--color-muted)]">
            · fråga din data
          </span>
        </div>
        {turns.length > 0 && (
          <button
            onClick={() => !busy && setTurns([])}
            className="text-[12px] text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] transition-colors"
            disabled={busy}
          >
            Ny chatt
          </button>
        )}
      </header>

      <div ref={scrollRef} className="scroll-fade flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-5 py-8">
          {empty ? (
            <Welcome onPick={(s) => send(s)} />
          ) : (
            <div className="flex flex-col gap-5">
              {turns.map((t, i) => (
                <Message key={i} turn={t} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[color:var(--color-line)] bg-gradient-to-b from-[color:var(--color-paper)]/0 to-[color:var(--color-paper)]">
        <div className="mx-auto w-full max-w-2xl px-5 py-4">
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={() => send(input)}
            disabled={busy}
            onStop={stop}
          />
          <p className="mt-2 text-center text-[10.5px] text-[color:var(--color-muted)]/85">
            Validy korsar data mellan föreningar, lån, årsredovisningar och underhållsplaner.
          </p>
        </div>
      </div>
    </div>
  );
}

function Welcome({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-12 pb-6 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--color-line)] bg-white">
        <Logo size={22} />
      </div>
      <h1 className="text-[26px] font-semibold tracking-tight text-[color:var(--color-ink)]">
        Fråga din data.
      </h1>
      <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-[color:var(--color-muted)]">
        Validy läser föreningens tabeller och drar slutsatser åt dig — räntor, kassaflöde, underhåll.
        Ställ frågan som du skulle ställa den till en styrelsekamrat.
      </p>

      <div className="mt-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="group rounded-xl border border-[color:var(--color-line)] bg-white/60 px-3.5 py-3 text-left text-[13px] leading-snug text-[color:var(--color-ink)]/85 transition-all hover:bg-white hover:border-[color:var(--color-ink)]/30 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]"
          >
            <span className="block">{s}</span>
            <span className="mt-1 inline-block text-[10.5px] text-[color:var(--color-muted)] group-hover:text-[color:var(--color-ink)]/60 transition-colors">
              ↵ kör frågan
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Logo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="var(--color-ink)" />
      <path
        d="M8 12.5l2.6 2.6L16 9.7"
        stroke="var(--color-paper)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
