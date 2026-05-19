import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /api/claim?token=XXX — verify a claim token and return the org name
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, legal_name, is_claimed")
    .eq("claim_token", token)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  if (data.is_claimed) return NextResponse.json({ error: "This listing has already been claimed" }, { status: 409 });

  return NextResponse.json({ id: data.id, legal_name: data.legal_name });
}

// POST /api/claim — mark a profile as claimed (requires auth)
export async function POST(req: NextRequest) {
  const authToken = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!authToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();
  const { data: userData, error: authError } = await supabase.auth.getUser(authToken);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { token?: string };
  if (!body.token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { data: profile, error: findError } = await supabase
    .from("profiles")
    .select("id, is_claimed")
    .eq("claim_token", body.token)
    .maybeSingle();

  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  if (profile.is_claimed) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      is_claimed: true,
      claim_token: null,
      email: userData.user.email ?? null,
    })
    .eq("id", profile.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true, profile_id: profile.id });
}
