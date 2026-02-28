"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProfileRedirect() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const redirect = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.replace(`/profile/${data.user.id}`);
      } else {
        setError(true);
      }
    };
    void redirect();
  }, [router]);

  if (error) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Please sign in to view your profile.
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-sm text-muted-foreground">
      Loading profile...
    </main>
  );
}
