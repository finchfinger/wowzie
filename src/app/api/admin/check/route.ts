import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ admin: false }, { status: 401 });

  const supabase = getSupabase();
  const { data } = await supabase.auth.getUser(token);
  const email = data?.user?.email ?? "";

  if (!isAdminEmail(email)) {
    return NextResponse.json({ admin: false }, { status: 403 });
  }

  return NextResponse.json({ admin: true, email });
}
