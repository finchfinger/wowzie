import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fzdhexysoleaegzwtryf.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// Returns bookings for a camp, but only if the requesting user is the camp's host.
export async function GET(req: NextRequest) {
  const campId = req.nextUrl.searchParams.get("campId");
  if (!campId) return NextResponse.json({ error: "Missing campId" }, { status: 400 });

  // Verify the requesting user is the camp host using their JWT
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const anonSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fzdhexysoleaegzwtryf.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6ZGhleHlzb2xlYWVnend0cnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzE2MDYsImV4cCI6MjA3ODEwNzYwNn0.kEU-hZW2TJ2sNz_TDPo_lNu0OYu6GKfn1t5Sv-UVj6U"
  );
  const { data: { user } } = await anonSupabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getServiceSupabase();

  // Confirm the user is the host of this camp
  const { data: camp } = await sb.from("camps").select("host_id").eq("id", campId).single();
  if (!camp || camp.host_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: bookings, error } = await sb
    .from("bookings")
    .select("id, camp_id, user_id, status, created_at, guests_count, contact_email")
    .eq("camp_id", campId)
    .not("status", "in", "(cancelled,expired)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(bookings ?? []);
}
