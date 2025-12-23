// src/pages/host/HostEntryPage.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Container } from "../../components/layout/Container";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Button } from "../../components/ui/Button";

export const HostEntryPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) throw userErr;

        if (!user) {
          setIsHost(false);
          setLoading(false);
          return;
        }

        // If you store host flag on "profiles"
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("is_host")
          .eq("id", user.id)
          .maybeSingle();

        if (profileErr) throw profileErr;

        setIsHost(!!profile?.is_host);
      } catch (e: any) {
        console.warn("[HostEntryPage] failed to load host status:", e);
        setError(e?.message ?? "Could not load host status.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  return (
    <main className="flex-1 bg-gray-100">
      <Container className="py-10">
        <SectionHeader title="Host" subtitle="Manage your listings and applications." />

        <div className="mt-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-gray-600">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : isHost ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                You’re set up as a host. Head to your dashboard to manage listings.
              </p>
              <Button onClick={() => navigate("/host/dashboard")}>
                Go to host dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Ready to host camps or classes on Wowzie?
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/host/apply">
                  <Button>Apply to host</Button>
                </Link>
                <Link to="/help/listing-camp-class">
                  <Button variant="outline">Learn more</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </Container>
    </main>
  );
};

export default HostEntryPage;
