/**
 * Seed fake registrations for Saturday Coding Club
 * Run: node scripts/seed-coding-club.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SUPABASE_URL = "https://fzdhexysoleaegzwtryf.supabase.co";
const SERVICE_KEY =
  "process.env.SUPABASE_SERVICE_ROLE_KEY";

const CAMP_ID = "2f50ca9a-01aa-4de9-8df1-9525e3727d2e"; // Saturday Coding Club

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const FAMILIES = [
  { parent: { first: "Maria",   last: "Nguyen"    }, child: { first: "Leo",     emoji: "🦁" }, email: "maria.nguyen.fake@example.com"   },
  { parent: { first: "James",   last: "Okafor"    }, child: { first: "Amara",   emoji: "🌟" }, email: "james.okafor.fake@example.com"   },
  { parent: { first: "Sophie",  last: "Hernandez" }, child: { first: "Diego",   emoji: "🚀" }, email: "sophie.hernandez.fake@example.com"},
  { parent: { first: "Priya",   last: "Sharma"    }, child: { first: "Aryan",   emoji: "🎮" }, email: "priya.sharma.fake@example.com"   },
  { parent: { first: "Thomas",  last: "Walsh"     }, child: { first: "Nora",    emoji: "🌈" }, email: "thomas.walsh.fake@example.com"   },
  { parent: { first: "Fatima",  last: "Al-Hassan" }, child: { first: "Zara",    emoji: "⭐" }, email: "fatima.alhassan.fake@example.com" },
  { parent: { first: "Daniel",  last: "Kim"       }, child: { first: "Ethan",   emoji: "🤖" }, email: "daniel.kim.fake@example.com"     },
  { parent: { first: "Rachel",  last: "Torres"    }, child: { first: "Sofia",   emoji: "🦋" }, email: "rachel.torres.fake@example.com"  },
];

async function main() {
  console.log("Seeding Saturday Coding Club registrations…\n");

  for (const family of FAMILIES) {
    const childId = randomUUID();
    const bookingId = randomUUID();

    // 1. Create auth user (required for profiles FK)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: family.email,
      password: "FakePass123!",
      email_confirm: true,
    });
    if (authErr) { console.error(`Auth error for ${family.parent.first}:`, authErr.message); continue; }
    const userId = authData.user.id;

    // 2. Profile (parent)
    const { error: pErr } = await supabase.from("profiles").upsert({
      id: userId,
      legal_name: family.parent.last,
      preferred_first_name: family.parent.first,
      email: family.email,
    });
    if (pErr) { console.error(`Profile error for ${family.parent.first}:`, pErr.message); continue; }

    // 2. Child
    const { error: cErr } = await supabase.from("children").insert({
      id: childId,
      parent_id: userId,
      legal_name: family.child.first,
      preferred_name: family.child.first,
      avatar_emoji: family.child.emoji,
    });
    if (cErr) { console.error(`Child error for ${family.child.first}:`, cErr.message); continue; }

    // 3. Booking
    const { error: bErr } = await supabase.from("bookings").insert({
      id: bookingId,
      user_id: userId,
      camp_id: CAMP_ID,
      status: "confirmed",
      payment_status: "paid",
      guests_count: 1,
      total_cents: 80000,
      contact_email: family.email,
    });
    if (bErr) { console.error(`Booking error for ${family.parent.first}:`, bErr.message); continue; }

    console.log(`✓ ${family.parent.first} ${family.parent.last} → ${family.child.first} ${family.child.emoji}`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
