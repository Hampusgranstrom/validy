import Anthropic from "@anthropic-ai/sdk";
import { tools, runTool } from "@/lib/tools";
import { systemPrompt } from "@/lib/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const MAX_TURNS = 6;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY saknas i miljövariabler." }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Inga meddelanden." }), { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) => {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      // Convert chat history to Anthropic format
      const conversation: Anthropic.MessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const assistantBlocks: Anthropic.ContentBlock[] = [];

          const response = await client.messages.stream({
            model: MODEL,
            max_tokens: 2048,
            system: systemPrompt,
            tools: tools as unknown as Anthropic.Tool[],
            messages: conversation,
          });

          for await (const event of response) {
            if (event.type === "content_block_start") {
              const block = event.content_block;
              if (block.type === "text") {
                assistantBlocks.push({ type: "text", text: "", citations: null } as Anthropic.ContentBlock);
              } else if (block.type === "tool_use") {
                assistantBlocks.push({
                  type: "tool_use",
                  id: block.id,
                  name: block.name,
                  input: {},
                } as Anthropic.ContentBlock);
                send({ type: "tool_start", id: block.id, name: block.name });
              }
            } else if (event.type === "content_block_delta") {
              const delta = event.delta;
              const idx = event.index;
              const block = assistantBlocks[idx];
              if (delta.type === "text_delta" && block && block.type === "text") {
                block.text += delta.text;
                send({ type: "text", delta: delta.text });
              } else if (delta.type === "input_json_delta" && block && block.type === "tool_use") {
                // Accumulate partial JSON. We don't need to stream it to client.
                const cur = (block as Anthropic.ToolUseBlock & { _partial?: string })._partial ?? "";
                (block as Anthropic.ToolUseBlock & { _partial?: string })._partial = cur + delta.partial_json;
              }
            } else if (event.type === "content_block_stop") {
              const block = assistantBlocks[event.index];
              if (block && block.type === "tool_use") {
                const partial = (block as Anthropic.ToolUseBlock & { _partial?: string })._partial ?? "{}";
                try {
                  block.input = partial.trim() === "" ? {} : JSON.parse(partial);
                } catch {
                  block.input = {};
                }
              }
            }
          }

          const finalMessage = await response.finalMessage();

          // Add assistant turn to conversation
          conversation.push({ role: "assistant", content: finalMessage.content });

          const toolUses = finalMessage.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
          );

          if (toolUses.length === 0 || finalMessage.stop_reason !== "tool_use") {
            // Done
            send({ type: "done" });
            controller.close();
            return;
          }

          // Run tools and report results
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const tu of toolUses) {
            let result: unknown;
            try {
              result = await runTool(tu.name, tu.input as Record<string, unknown>);
            } catch (err) {
              result = { error: err instanceof Error ? err.message : String(err) };
            }
            send({ type: "tool_end", id: tu.id, result });
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: JSON.stringify(result),
            });
          }

          conversation.push({ role: "user", content: toolResults });
        }

        send({ type: "error", message: "För många resonemangssteg." });
        send({ type: "done" });
        controller.close();
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Okänt fel.",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
