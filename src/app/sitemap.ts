import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://golly-roan.vercel.app";

const STATIC_ROUTES = [
  { url: "/", priority: 1.0, changeFrequency: "daily" },
  { url: "/activities", priority: 0.9, changeFrequency: "daily" },
  { url: "/search", priority: 0.8, changeFrequency: "daily" },
  { url: "/help", priority: 0.5, changeFrequency: "monthly" },
  { url: "/help/how-booking-works", priority: 0.4, changeFrequency: "monthly" },
  { url: "/help/cancellations-refunds", priority: 0.4, changeFrequency: "monthly" },
  { url: "/help/listing-camp-class", priority: 0.4, changeFrequency: "monthly" },
  { url: "/help/managing-kid-profiles", priority: 0.4, changeFrequency: "monthly" },
  { url: "/help/messaging-hosts", priority: 0.4, changeFrequency: "monthly" },
  { url: "/help/payments-payouts", priority: 0.4, changeFrequency: "monthly" },
  { url: "/help/reviews-feedback", priority: 0.4, changeFrequency: "monthly" },
  { url: "/help/safety-verification", priority: 0.4, changeFrequency: "monthly" },
  { url: "/contact", priority: 0.3, changeFrequency: "monthly" },
  { url: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { url: "/terms", priority: 0.2, changeFrequency: "yearly" },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${base}${r.url}`,
    priority: r.priority,
    changeFrequency: r.changeFrequency,
    lastModified: new Date(),
  }));

  // Dynamic camp pages
  let campEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: camps } = await supabase
      .from("camps")
      .select("slug, updated_at")
      .eq("is_published", true)
      .eq("is_active", true);

    if (camps) {
      campEntries = camps.map((camp) => ({
        url: `${base}/camp/${camp.slug}`,
        lastModified: camp.updated_at ? new Date(camp.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch (err) {
    console.error("sitemap: failed to fetch camps", err);
  }

  return [...staticEntries, ...campEntries];
}
