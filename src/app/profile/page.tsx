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
      <main>
        <div className="page-container py-8">
          <div className="page-grid">
            <div className="span-8-center">
              <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Please sign in to view your profile.
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page-container py-8">
        <div className="page-grid">
          <div className="span-8-center text-sm text-muted-foreground">
            Loading profile...
          </div>
        </div>
      </div>
    </main>
  );
}
