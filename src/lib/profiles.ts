import { supabase } from "./supabase";

export async function ensureProfileForCurrentUser(extra?: {
  legal_name?: string;
  preferred_first_name?: string;
  phone?: string;
  about?: string;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("No auth user when ensuring profile", userError);
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        legal_name: extra?.legal_name ?? null,
        preferred_first_name: extra?.preferred_first_name ?? null,
        phone: extra?.phone ?? null,
        about: extra?.about ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    console.error("Error upserting profile", error);
  }
}
