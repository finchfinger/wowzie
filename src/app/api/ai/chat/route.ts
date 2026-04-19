import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/* ── System prompt ─────────────────────────────────────── */

const SYSTEM_PROMPT = `You are Scout, a friendly activity planning assistant for Wowzi — a platform that connects families with local camps, classes, and after-school activities for kids.

You help parents:
- Find the right camp, class, or activity based on their child's age, interests, and location
- Plan summer schedules and after-school programmes
- Understand pricing, enrolment, and what to expect

You have access to real listings on the Wowzi platform via the search_listings tool. Use it whenever a parent is looking for activities — even if their request is vague. A quick search is always better than a generic answer.

When you get results back:
- Present them warmly and conversationally — don't just dump a list
- Highlight 2–3 that best fit what the parent described
- Format each listing as a markdown link: [Camp Name](/camp/slug)
- Include the price and a one-line description if helpful
- Invite follow-up questions

If search returns no results, say so honestly and suggest they browse the full search page at /search.

Keep responses concise and warm. Never make up camp names, prices, or availability.`;

/* ── Tool definition ───────────────────────────────────── */

const SEARCH_TOOL: Anthropic.Tool = {
  name: "search_listings",
  description:
    "Search for real camps, classes, and activities on the Wowzi platform. Use this whenever a parent asks about finding activities — even for vague requests like 'something fun for my 7 year old'.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Keywords to search for, e.g. 'art classes', 'soccer camp', 'coding for kids'",
      },
      category: {
        type: "string",
        description: "Activity category filter",
        enum: ["art", "sports", "stem", "music", "outdoor", "academic", "theater"],
      },
      min_age: {
        type: "number",
        description: "Minimum child age",
      },
      max_age: {
        type: "number",
        description: "Maximum child age",
      },
    },
    required: [],
  },
};

/* ── Tool execution ────────────────────────────────────── */

type SearchInput = {
  query?: string;
  category?: string;
  min_age?: number;
  max_age?: number;
};

async function executeSearch(input: SearchInput): Promise<string> {
  const supabase = getSupabase();

  let q = supabase
    .from("camps")
    .select("id, name, slug, description, price_cents, price_unit, category, location, meta, is_promoted, start_time")
    .eq("is_published", true)
    .eq("is_active", true)
    .order("is_promoted", { ascending: false })
    .limit(6);

  if (input.query) {
    const like = `%${input.query}%`;
    q = (q as any).or(`name.ilike.${like},description.ilike.${like}`);
  }
  if (input.category) q = (q as any).eq("category", input.category);

  const { data, error } = await q;

  if (error) {
    console.error("[scout] search error:", error.message);
    return "Search is temporarily unavailable. Suggest the parent visits /search directly.";
  }

  if (!data?.length) {
    return "No listings found matching those criteria on Wowzi right now. Suggest the parent tries a broader search at /search.";
  }

  const lines = (data as any[]).map((camp) => {
    const price = camp.price_cents
      ? `$${Math.round(camp.price_cents / 100)}${camp.price_unit ? `/${camp.price_unit}` : ""}`
      : null;
    const location =
      camp.location ||
      camp.meta?.location_city ||
      camp.meta?.fixedSchedule?.location ||
      null;
    const desc = camp.description
      ? camp.description.slice(0, 120).trimEnd() + (camp.description.length > 120 ? "…" : "")
      : null;

    const parts = [camp.name];
    if (location) parts.push(location);
    if (price) parts.push(price);

    return `[${camp.name}](/camp/${camp.slug}) — ${[location, price].filter(Boolean).join(" · ")}${desc ? `\n  ${desc}` : ""}`;
  });

  return lines.join("\n\n");
}

/* ── Route handler ─────────────────────────────────────── */

const SYSTEM_BLOCK: Anthropic.TextBlockParam = {
  type: "text",
  text: SYSTEM_PROMPT,
  cache_control: { type: "ephemeral" },
};

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!messages?.length) {
      return new Response("Missing messages", { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // ── First pass: may trigger tool use ──────────────
          const firstResponse = await client.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 1024,
            system: [SYSTEM_BLOCK],
            tools: [SEARCH_TOOL],
            messages,
          });

          if (firstResponse.stop_reason === "tool_use") {
            // Execute all tool calls
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of firstResponse.content) {
              if (block.type === "tool_use" && block.name === "search_listings") {
                const result = await executeSearch(block.input as SearchInput);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: result,
                });
              }
            }

            // ── Second pass: stream the final response ──────
            const finalMessages: Anthropic.MessageParam[] = [
              ...messages,
              { role: "assistant", content: firstResponse.content },
              { role: "user",      content: toolResults },
            ];

            const secondStream = client.messages.stream({
              model: "claude-haiku-4-5",
              max_tokens: 1024,
              system: [SYSTEM_BLOCK],
              messages: finalMessages,
            });

            for await (const event of secondStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                controller.enqueue(encoder.encode(event.delta.text));
              }
            }
          } else {
            // No tool use — stream text from first response directly
            for (const block of firstResponse.content) {
              if (block.type === "text") {
                controller.enqueue(encoder.encode(block.text));
              }
            }
          }

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[ai/chat] error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}
