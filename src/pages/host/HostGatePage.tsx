// src/pages/host/HostGatePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Container } from "../../components/layout/Container";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Grid } from "../../components/layout/Grid";
import { Button } from "../../components/ui/Button";

type HostStatus = "not_applied" | "pending" | "approved" | "rejected";

type HostProfileRow = {
  user_id: string;
  host_status?: HostStatus | null;
  applied_at?: string | null;
  updated_at?: string | null;
};

export const HostGatePage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<HostStatus>("not_applied");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setStatus("not_applied");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("host_profiles")
        .select("user_id, host_status, applied_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.warn("[HostGatePage] host_profiles read error:", error);
        setStatus("not_applied");
        setLoading(false);
        return;
      }

      const row = (data || null) as HostProfileRow | null;
      const next = (row?.host_status as HostStatus | null) || "not_applied";
      setStatus(next);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const cta = useMemo(() => {
    if (loading) {
      return { label: "Loading…", onClick: () => {}, disabled: true };
    }

    if (status === "pending") {
      return { label: "Application pending", onClick: () => {}, disabled: true };
    }

    if (status === "rejected") {
      return {
        label: "Contact support",
        onClick: () => navigate("/contact"),
        disabled: false,
      };
    }

    return {
      label: "Get started",
      onClick: () => navigate("/host/apply"),
      disabled: false,
    };
  }, [loading, status, navigate]);

  // This path expects the file here:
  // /public/images/host-gate.jpg  ->  "/images/host-gate.jpg"
  const heroImageUrl = "/images/host-gate.jpg";

  const cardTitle =
    status === "pending"
      ? "Application under review"
      : status === "rejected"
      ? "Application needs changes"
      : "Apply to host";

  const cardBody =
    status === "pending"
      ? "We’re reviewing your application. We’ll email you when you’re approved."
      : status === "rejected"
      ? "Your application was not approved. Reach out and we’ll help you understand what to adjust."
      : "Tell us about your organization and what families should expect. We’ll review quickly.";

  return (
    <main className="flex-1 bg-[#F5F1FF]">
      <Container className="py-10 pb-16">
        <Grid cols={12} gap="gap-8">
          <div className="col-span-12 lg:col-span-7">
            <SectionHeader
              title="Host Basecamp"
              subtitle="Offer camps and classes to families in your community. Apply once, then publish listings whenever you’re ready."
              actions={
                <Button onClick={cta.onClick} disabled={cta.disabled}>
                  {cta.label}
                </Button>
              }
            />

            <div className="mt-6 rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
              <div className="aspect-[16/9] bg-gray-100">
                <img
                  src={heroImageUrl}
                  alt="Kids doing an activity"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="p-5 sm:p-6">
                <p className="text-sm font-semibold text-gray-900">{cardTitle}</p>
                <p className="mt-1 text-sm text-gray-600">{cardBody}</p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {status !== "pending" && (
                    <button
                      type="button"
                      onClick={() => navigate("/help")}
                      className="text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      Read host FAQs
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <div className="rounded-2xl border border-black/5 bg-white shadow-sm p-5 sm:p-6">
              <p className="text-sm font-semibold text-gray-900">What we look for</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700 list-disc pl-5">
                <li>Clear description of what you offer</li>
                <li>Safe environment and age appropriate activities</li>
                <li>Reliable communication with families</li>
                <li>Transparent cancellations and refunds</li>
              </ul>

              <div className="mt-6 rounded-xl bg-gray-50 border border-black/5 p-4">
                <p className="text-xs font-semibold text-gray-900">Heads up</p>
                <p className="mt-1 text-xs text-gray-600">
                  This is an early flow. We’ll tighten language and policies later, after
                  legal review.
                </p>
              </div>
            </div>
          </div>
        </Grid>
      </Container>
    </main>
  );
};

export default HostGatePage;
