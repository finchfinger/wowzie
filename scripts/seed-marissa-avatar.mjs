/**
 * Seeds a profile photo for Marissa Cooper.
 * Run: node scripts/seed-marissa-avatar.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fzdhexysoleaegzwtryf.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Realistic avatar via unavatar (pulls from Gravatar/social by name)
const AVATAR_URL = "https://i.pravatar.cc/256?u=marissa-cooper-golly";

async function run() {
  // Find by name in profiles
  const { data: profiles, error } = await sb
    .from("profiles")
    .select("id, legal_name, preferred_first_name")
    .ilike("legal_name", "%cooper%");

  if (error) { console.error("Error:", error.message); return; }

  console.log("Found profiles matching 'cooper':", profiles);

  const marissa = profiles?.find(p =>
    (p.preferred_first_name ?? "").toLowerCase().includes("marissa") ||
    (p.legal_name ?? "").toLowerCase().includes("marissa")
  );

  if (!marissa) {
    console.log("Marissa Cooper not found. All profiles with 'cooper':", profiles);
    return;
  }

  console.log("Updating avatar for:", marissa.id, marissa.legal_name);

  const { error: updateError } = await sb
    .from("profiles")
    .update({ avatar_url: AVATAR_URL })
    .eq("id", marissa.id);

  if (updateError) {
    console.error("Update failed:", updateError.message);
  } else {
    console.log("✓ Avatar set to:", AVATAR_URL);
  }
}

run().catch(console.error);
