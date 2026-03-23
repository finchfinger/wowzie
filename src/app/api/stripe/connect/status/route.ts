import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ status: "not_configured" });
  }

  const supabase = getSupabase();

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("stripe_account_id, stripe_connect_status")
    .eq("user_id", user.id)
    .single();

  if (!hostProfile?.stripe_account_id) {
    return NextResponse.json({ status: "not_connected" });
  }

  // Retrieve live status from Stripe
  const stripe = new Stripe(stripeSecretKey);
  const account = await stripe.accounts.retrieve(hostProfile.stripe_account_id);

  const isConnected = account.charges_enabled && account.payouts_enabled;
  const newStatus = isConnected ? "connected" : "pending";

  // Keep DB in sync
  if (newStatus !== hostProfile.stripe_connect_status) {
    await supabase
      .from("host_profiles")
      .update({ stripe_connect_status: newStatus })
      .eq("user_id", user.id);
  }

  return NextResponse.json({
    status: newStatus,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    stripe_account_id: hostProfile.stripe_account_id,
  });
}
