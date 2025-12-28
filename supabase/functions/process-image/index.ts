// supabase/functions/process-image/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  Image,
  encodeWebp,
} from "https://deno.land/x/imagescript@1.2.15/mod.ts";

type Body = {
  bucket: string;      // e.g. "media"
  key: string;         // e.g. "original/camps/<campId>/<file>"
  deleteOriginal?: boolean;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function assert(cond: any, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function downloadObject(bucket: string, key: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from(bucket).download(key);
  if (error) throw error;
  const buf = new Uint8Array(await data.arrayBuffer());
  return buf;
}

async function uploadObject(bucket: string, key: string, bytes: Uint8Array, contentType: string) {
  const { error } = await supabase.storage.from(bucket).upload(key, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
}

function makeVariantKeys(originalKey: string) {
  // original/camps/<campId>/<file.ext>  ->  card/camps/<campId>/<file>.webp, hero/...
  const parts = originalKey.split("/");
  // ["original","camps","<campId>","<file.ext>"]
  assert(parts.length >= 4 && parts[0] === "original", "Unexpected key format.");
  const file = parts[parts.length - 1];
  const base = file.replace(/\.[^/.]+$/, ""); // strip ext
  const subPath = parts.slice(1, -1).join("/"); // "camps/<campId>"
  return {
    cardKey: `card/${subPath}/${base}.webp`,
    heroKey: `hero/${subPath}/${base}.webp`,
  };
}

async function resizeToWebp(input: Uint8Array, width: number, quality: number) {
  // imagescript can decode common formats into Image
  const img = await Image.decode(input);

  // Preserve aspect ratio, clamp to width
  const targetW = Math.max(1, Math.min(width, img.width));
  const targetH = Math.max(1, Math.round((img.height * targetW) / img.width));

  const resized = img.resize(targetW, targetH);

  // Encode to webp
  const webp = await encodeWebp(resized, { quality });
  return webp;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = (await req.json()) as Body;
    assert(body?.bucket, "Missing bucket");
    assert(body?.key, "Missing key");

    // Only process originals
    if (!body.key.startsWith("original/")) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { "content-type": "application/json" },
      });
    }

    const originalBytes = await downloadObject(body.bucket, body.key);

    const { cardKey, heroKey } = makeVariantKeys(body.key);

    const [cardWebp, heroWebp] = await Promise.all([
      resizeToWebp(originalBytes, 640, 78),
      resizeToWebp(originalBytes, 1600, 82),
    ]);

    await Promise.all([
      uploadObject(body.bucket, cardKey, cardWebp, "image/webp"),
      uploadObject(body.bucket, heroKey, heroWebp, "image/webp"),
    ]);

    if (body.deleteOriginal) {
      // optional
      await supabase.storage.from(body.bucket).remove([body.key]);
    }

    return new Response(JSON.stringify({ ok: true, cardKey, heroKey }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
