// src/lib/sessions.ts
import { supabase } from "./supabase";

export async function trackCurrentSession() {
  const [{ data: userRes }, { data: sessionRes }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);

  const user = userRes.user;
  const session = sessionRes.session;
  if (!user || !session) return;

  const ua = window.navigator.userAgent;
  let browser = "Browser";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";

  let platform = "Device";
  if (ua.includes("Mac OS X")) platform = "macOS";
  else if (ua.includes("Windows")) platform = "Windows";
  else if (/iPhone|iPad|iPod/.test(ua)) platform = "iOS";
  else if (/Android/.test(ua)) platform = "Android";

  const device_label = `${browser} on ${platform}`;

  // We’ll treat (user_id, device_label) as “one device”
  await supabase
    .from("user_sessions")
    .upsert(
      {
        device_label,
        user_agent: ua,
        // user_id comes from default auth.uid()
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,device_label",
      }
    );
}
