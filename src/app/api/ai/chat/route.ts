import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are Wowzi AI, a friendly activity planning assistant for Golly — a platform that connects families with local camps, classes, and after-school activities for kids.

You help parents:
- Plan summer camps and weekly schedules for their children
- Find the right class or activity based on their child's age, interests, and location
- Discover creative, educational, and fun programs nearby
- Navigate questions about enrollment, pricing, and what to expect

Keep responses warm, concise, and practical. When a parent describes their child, tailor your suggestions to their age and interests. If you don't have specific real-time camp data, give helpful general guidance and encourage them to search Golly for live listings.

Do not make up specific camp names, prices, or availability — stick to helpful advice and let the Golly platform surface the actual listings.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json() as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!messages?.length) {
      return new Response("Missing messages", { status: 400 });
    }

    // Stream the response back as plain text chunks (newline-delimited)
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = client.messages.stream({
            model: "claude-haiku-4-5",
            max_tokens: 1024,
            system: [
              {
                type: "text",
                text: SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" },
              },
            ],
            messages,
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
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
