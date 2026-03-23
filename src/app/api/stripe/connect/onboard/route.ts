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

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabase = getSupabase();

  // Get the authenticated user from the Authorization header
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Check if host already has a Stripe account
  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("stripe_account_id")
    .eq("user_id", user.id)
    .single();

  let accountId = hostProfile?.stripe_account_id;

  // Create a new Express account if none exists
  if (!accountId) {
    const account = await stripe.accounts.create({ type: "express" });
    accountId = account.id;

    await supabase
      .from("host_profiles")
      .update({ stripe_account_id: accountId, stripe_connect_status: "pending" })
      .eq("user_id", user.id);
  }

  // Create an account link for onboarding
  const origin = req.headers.get("origin") || "http://localhost:3000";
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/host/financials?refresh=true`,
    return_url: `${origin}/host/financials?connected=true`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
