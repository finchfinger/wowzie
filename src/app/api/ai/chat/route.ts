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

/* ── Rate limiting (in-memory, per-IP) ─────────────────── */
// 20 requests per hour per IP. Resets on cold start — good enough for
// basic abuse prevention without requiring Redis.

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const ipHits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

/* ── Intent detection ──────────────────────────────────── */

const PLANNING_RE = /plan|schedul|weeks?|full summer|whole summer|entire summer|summer plan|camp plan|line.?up|line up|months?|calendar|\d+\s*weeks/i;

type ApiMessage = { role: "user" | "assistant"; content: string };

function isPlanningQuery(messages: ApiMessage[]): boolean {
  const recent = messages
    .filter((m) => m.role === "user")
    .slice(-3)
    .map((m) => m.content)
    .join(" ");
  return PLANNING_RE.test(recent);
}

/* ── System prompts ────────────────────────────────────── */

const SEARCH_SYSTEM = `You are Scout, a friendly activity planning assistant for Wowzi — a platform that connects families with local camps, classes, and after-school activities for kids.

You help parents find the right camp, class, or activity based on their child's age, interests, and location.

You have access to real listings on Wowzi via the search_listings tool. Use it whenever a parent asks about activities — even vague requests. A quick search beats a generic answer.

When you get results:
- Be warm and conversational — don't just dump a list
- Highlight 2–3 that best fit what the parent described
- Format each as a markdown link: [Camp Name](/camp/slug)
- Include price and a one-line description if helpful
- Invite follow-up questions

If search returns nothing, say so and suggest /search.

Keep responses concise. Never make up camp names, prices, or availability.`;

const PLANNING_SYSTEM = `You are Scout, a summer planning assistant for Wowzi. You help parents build personalised multi-week activity plans for their kids using real listings from the platform.

Below is the full list of available camps and classes. Every listing is real and live.

When a parent asks for a plan:
1. If you don't know the child's age or key interests, ask — one question at a time, keep it brief
2. Once you have enough context, build a week-by-week schedule
3. Mix categories (sports, arts, STEM, outdoor etc) unless the parent wants focus
4. Format the plan clearly — a numbered or table layout works well
5. Format every camp as a markdown link: [Camp Name](/camp/slug)
6. Include the price for each and a running total estimate at the end
7. If you can't fill all the requested weeks, say so honestly and suggest /search for more options
8. Keep the tone warm and helpful — this is exciting for families

Never invent camps, prices, or dates. Only use camps from the list below.`;

/* ── Fetch all camps for planning ──────────────────────── */

async function fetchAllCampsContext(): Promise<string> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("camps")
    .select("name, slug, description, price_cents, price_unit, category, location, meta, is_promoted, start_time, end_time")
    .eq("is_published", true)
    .eq("is_active", true)
    .order("is_promoted", { ascending: false })
    .limit(80);

  if (error || !data?.length) {
    return "No camps currently available. Suggest the parent visits /search directly.";
  }

  const lines = (data as any[]).map((camp) => {
    const price = camp.price_cents
      ? `$${Math.round(camp.price_cents / 100)}${camp.price_unit ? `/${camp.price_unit}` : ""}`
      : "price varies";

    const location =
      camp.location ||
      camp.meta?.location_city ||
      null;

    const sessions: any[] = camp.meta?.campSessions ?? [];
    let dates = "";
    if (sessions.length > 0) {
      const first = sessions[0];
      const last = sessions[sessions.length - 1];
      const start = first?.startDate ?? "";
      const end = last?.endDate ?? "";
      dates = start ? (end && end !== start ? `${start} – ${end}` : start) : "";
    } else if (camp.meta?.fixedSchedule?.startDate) {
      const fs = camp.meta.fixedSchedule;
      dates = fs.endDate && fs.endDate !== fs.startDate
        ? `${fs.startDate} – ${fs.endDate}`
        : fs.startDate;
    } else if (camp.start_time) {
      dates = camp.start_time.slice(0, 10);
    }

    const minAge = camp.meta?.ageMin ?? camp.meta?.minAge ?? camp.meta?.age_min ?? null;
    const maxAge = camp.meta?.ageMax ?? camp.meta?.maxAge ?? camp.meta?.age_max ?? null;
    const ages = minAge || maxAge
      ? `ages ${minAge ?? "?"}–${maxAge ?? "?"}`
      : null;

    const desc = camp.description
      ? camp.description.slice(0, 100).trimEnd() + (camp.description.length > 100 ? "…" : "")
      : null;

    const details = [location, ages, dates, price].filter(Boolean).join(" · ");

    return `- [${camp.name}](/camp/${camp.slug})${details ? ` — ${details}` : ""}${camp.category ? ` [${camp.category}]` : ""}${desc ? `\n  ${desc}` : ""}`;
  });

  return lines.join("\n");
}

/* ── Tool definition (search path) ────────────────────── */

const SEARCH_TOOL: Anthropic.Tool = {
  name: "search_listings",
  description:
    "Search for real camps, classes, and activities on Wowzi. Use this whenever a parent asks about finding activities — even vague requests.",
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
      min_age: { type: "number", description: "Minimum child age" },
      max_age: { type: "number", description: "Maximum child age" },
    },
    required: [],
  },
};

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
    .select("name, slug, description, price_cents, price_unit, category, location, meta, is_promoted")
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
    return "Search temporarily unavailable. Suggest the parent visits /search.";
  }
  if (!data?.length) {
    return "No listings found. Suggest the parent tries a broader search at /search.";
  }

  return (data as any[]).map((camp) => {
    const price = camp.price_cents
      ? `$${Math.round(camp.price_cents / 100)}${camp.price_unit ? `/${camp.price_unit}` : ""}`
      : null;
    const location = camp.location || camp.meta?.location_city || null;
    const desc = camp.description
      ? camp.description.slice(0, 120).trimEnd() + (camp.description.length > 120 ? "…" : "")
      : null;
    return `[${camp.name}](/camp/${camp.slug}) — ${[location, price].filter(Boolean).join(" · ")}${desc ? `\n  ${desc}` : ""}`;
  }).join("\n\n");
}

/* ── Route handler ─────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    /* ── 1. Rate limit by IP ───────────────────────────── */
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      return new Response("Too many requests. Please try again later.", {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfter ?? 3600) },
      });
    }

    /* ── 2. Parse & validate body ──────────────────────── */
    const { messages } = (await req.json()) as { messages: ApiMessage[] };

    if (!messages?.length) {
      return new Response("Missing messages", { status: 400 });
    }

    // Cap message length — prevents token stuffing
    const MAX_MSG_LENGTH = 2000;
    if (messages.some((m) => m.content.length > MAX_MSG_LENGTH)) {
      return new Response("Message too long", { status: 400 });
    }

    // Trim history to last 10 messages — keeps costs predictable
    const trimmedMessages = messages.slice(-10);

    const planning = isPlanningQuery(trimmedMessages);

    /* ── 3. Auth gate for planning mode ────────────────── */
    if (planning) {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

      if (!token) {
        return new Response("Sign in to use planning mode", { status: 401 });
      }

      const supabase = getSupabase();
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return new Response("Invalid session — please sign in again", { status: 401 });
      }
    }

    /* ── 4. Stream response ────────────────────────────── */
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {

          /* ════════════════════════════════════════════════
             PLANNING MODE — Sonnet + full camp context
          ════════════════════════════════════════════════ */
          if (planning) {
            const campsContext = await fetchAllCampsContext();

            const planningStream = client.messages.stream({
              model: "claude-sonnet-4-5",
              max_tokens: 2048,
              system: [
                {
                  type: "text",
                  text: PLANNING_SYSTEM,
                  cache_control: { type: "ephemeral" },
                },
                {
                  type: "text",
                  text: `AVAILABLE CAMPS AND CLASSES:\n\n${campsContext}`,
                  cache_control: { type: "ephemeral" },
                },
              ],
              messages: trimmedMessages,
            });

            for await (const event of planningStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                controller.enqueue(encoder.encode(event.delta.text));
              }
            }

          /* ════════════════════════════════════════════════
             SEARCH MODE — Haiku + tool use
          ════════════════════════════════════════════════ */
          } else {
            const searchSystemBlock: Anthropic.TextBlockParam = {
              type: "text",
              text: SEARCH_SYSTEM,
              cache_control: { type: "ephemeral" },
            };

            const firstResponse = await client.messages.create({
              model: "claude-haiku-4-5",
              max_tokens: 1024,
              system: [searchSystemBlock],
              tools: [SEARCH_TOOL],
              messages: trimmedMessages,
            });

            if (firstResponse.stop_reason === "tool_use") {
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

              const finalMessages: Anthropic.MessageParam[] = [
                ...trimmedMessages,
                { role: "assistant", content: firstResponse.content },
                { role: "user",      content: toolResults },
              ];

              const secondStream = client.messages.stream({
                model: "claude-haiku-4-5",
                max_tokens: 1024,
                system: [searchSystemBlock],
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
              for (const block of firstResponse.content) {
                if (block.type === "text") {
                  controller.enqueue(encoder.encode(block.text));
                }
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
