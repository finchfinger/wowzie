// src/pages/host/HostEntryPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Container } from "../../components/layout/Container";

type HostStatus = "not_applied" | "pending" | "approved" | "rejected";

type HostProfileRow = {
  user_id: string;
  host_status?: HostStatus | null;
};

export const HostEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
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
        .select("user_id, host_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        // If anything goes wrong, send them to the gate instead of hanging.
        navigate("/host/gate", { replace: true });
        return;
      }

      const status = ((data as HostProfileRow | null)?.host_status ||
        "not_applied") as HostStatus;

      if (status === "approved") {
        navigate("/host/listings", { replace: true });
        return;
      }

      navigate("/host/gate", { replace: true });
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <main className="flex-1 bg-[#F5F1FF]">
      <Container className="py-10">
        <p className="text-sm text-gray-600">Loading…</p>
      </Container>
    </main>
  );
};

export default HostEntryPage;
