// src/pages/host/HostReviewingPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Container } from "../../components/layout/Container";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Button } from "../../components/ui/Button";

type HostStatus = "not_applied" | "pending" | "approved" | "rejected";

type HostProfileRow = {
  user_id: string;
  host_status?: HostStatus | null;
  applied_at?: string | null;
};

export const HostReviewingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<HostStatus>("pending");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        navigate("/", { replace: true });
        return;
      }

      const { data, error } = await supabase
        .from("host_profiles")
        .select("user_id, host_status, applied_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setStatus("pending");
        setLoading(false);
        return;
      }

      const next = ((data as HostProfileRow | null)?.host_status ||
        "pending") as HostStatus;

      if (next === "approved") {
        navigate("/host/listings", { replace: true });
        return;
      }

      setStatus(next);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const title =
    status === "rejected"
      ? "We can’t approve your application right now"
      : "We’re reviewing your application";

  const subtitle =
    status === "rejected"
      ? "If you think this is a mistake, contact support and we’ll take another look."
      : "Thanks for applying. A member of our team will review your information and email you when you’re approved.";

  return (
    <main className="flex-1 bg-gray-100">
      <Container className="max-w-2xl py-10">
        <div className="rounded-3xl border border-black/5 bg-white shadow-sm p-6 sm:p-8">
          <SectionHeader title={title} subtitle={subtitle} />

          {loading ? (
            <p className="mt-6 text-sm text-gray-600">Loading…</p>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              {status === "rejected" ? (
                <Button onClick={() => navigate("/contact")}>Contact support</Button>
              ) : (
                <Button onClick={() => navigate("/host/gate")} variant="secondary">
                  Back to host home
                </Button>
              )}

              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Return to home
              </button>
            </div>
          )}
        </div>
      </Container>
    </main>
  );
};

export default HostReviewingPage;
