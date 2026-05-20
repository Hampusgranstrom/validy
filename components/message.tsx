"use client";

import { renderMarkdown } from "@/lib/markdown";
import { ToolCall, type ToolCallState } from "./tool-call";

export type ChatTurn = {
  role: "user" | "assistant";
  text: string;
  toolCalls?: ToolCallState[];
  streaming?: boolean;
};

export function Message({ turn }: { turn: ChatTurn }) {
  if (turn.role === "user") {
    return (
      <div className="fade-up flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-br-md bg-[color:var(--color-ink)] px-4 py-2.5 text-[14.5px] leading-relaxed text-[color:var(--color-paper)]">
          {turn.text}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up flex flex-col gap-1.5">
      {turn.toolCalls && turn.toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {turn.toolCalls.map((c) => (
            <ToolCall key={c.id} call={c} />
          ))}
        </div>
      )}
      <div
        className={
          "prose-msg text-[14.5px] text-[color:var(--color-ink)] " +
          (turn.streaming && !turn.text ? "min-h-[1.4em]" : "")
        }
      >
        {turn.text ? (
          <div
            dangerouslySetInnerHTML={{
              __html:
                renderMarkdown(turn.text) +
                (turn.streaming ? '<span class="cursor-blink"></span>' : ""),
            }}
          />
        ) : turn.streaming && (!turn.toolCalls || turn.toolCalls.length === 0) ? (
          <ThinkingDots />
        ) : null}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 text-[color:var(--color-muted)]">
      <span className="text-[12.5px]">Tänker</span>
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-[color:var(--color-muted)] pulse-dot" style={{ animationDelay: "0ms" }}></span>
        <span className="h-1 w-1 rounded-full bg-[color:var(--color-muted)] pulse-dot" style={{ animationDelay: "200ms" }}></span>
        <span className="h-1 w-1 rounded-full bg-[color:var(--color-muted)] pulse-dot" style={{ animationDelay: "400ms" }}></span>
      </span>
    </div>
  );
}
