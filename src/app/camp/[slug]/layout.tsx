import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.heywowzi.com";

  const { data: camp } = await getSupabase()
    .from("camps")
    .select("name, description, hero_image_url, image_url, price_cents, price_unit, location, meta, category")
    .eq("slug", slug)
    .single();

  if (!camp) {
    return {
      title: "Camp not found | Wowzi",
      description: "Find and book kids' camps and classes on Wowzi.",
    };
  }

  const name = (camp.name as string) ?? "Camp";
  const raw = (camp.description as string | null) ?? "";
  const location = (camp.location as string | null) || (camp.meta as any)?.location_city || null;
  const price = camp.price_cents
    ? `$${Math.round((camp.price_cents as number) / 100)}${camp.price_unit ? `/${camp.price_unit}` : ""}`
    : null;

  // Build a rich description: actual description + location + price
  let description = raw.length > 0 ? (raw.length > 120 ? raw.slice(0, 117) + "…" : raw) : "";
  const suffix = [location, price ? `From ${price}` : null].filter(Boolean).join(" · ");
  if (suffix && description.length + suffix.length + 3 <= 160) {
    description = description ? `${description} · ${suffix}` : suffix;
  } else if (!description && suffix) {
    description = suffix;
  }
  if (!description) description = `Book ${name} on Wowzi — the easiest way to find kids' camps and classes.`;

  const image = (camp.hero_image_url as string | null) || (camp.image_url as string | null);
  const title = `${name} | Wowzi`;
  const canonical = `${base}/camp/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      siteName: "Wowzi",
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: name }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export async function generateJsonLd(slug: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.heywowzi.com";

  const { data: camp } = await getSupabase()
    .from("camps")
    .select("name, description, hero_image_url, image_url, price_cents, price_unit, location, meta, category, start_time, end_time")
    .eq("slug", slug)
    .single();

  if (!camp) return null;

  const name = (camp.name as string) ?? "Camp";
  const description = (camp.description as string | null) ?? "";
  const image = (camp.hero_image_url as string | null) || (camp.image_url as string | null);
  const price = camp.price_cents ? ((camp.price_cents as number) / 100).toFixed(2) : null;
  const meta = (camp.meta as any) ?? {};

  // Resolve location
  const locationName = (camp.location as string | null)
    || meta?.location_city
    || meta?.address
    || null;

  // Resolve start/end dates from sessions or fixed schedule or start_time
  let startDate: string | null = null;
  let endDate: string | null = null;

  const sessions: any[] = meta?.campSessions ?? [];
  if (sessions.length > 0) {
    startDate = sessions[0]?.startDate ?? null;
    endDate = sessions[sessions.length - 1]?.endDate ?? sessions[0]?.endDate ?? null;
  } else if (meta?.fixedSchedule?.startDate) {
    startDate = meta.fixedSchedule.startDate;
    endDate = meta.fixedSchedule.endDate ?? null;
  } else if (camp.start_time) {
    startDate = (camp.start_time as string).slice(0, 10);
    endDate = camp.end_time ? (camp.end_time as string).slice(0, 10) : null;
  }

  // Age range
  const minAge = meta?.ageMin ?? meta?.minAge ?? meta?.age_min ?? null;
  const maxAge = meta?.ageMax ?? meta?.maxAge ?? meta?.age_max ?? null;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description,
    url: `${base}/camp/${slug}`,
    ...(image && { image }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(locationName && {
      location: {
        "@type": "Place",
        name: locationName,
        address: locationName,
      },
    }),
    organizer: {
      "@type": "Organization",
      name: "Wowzi",
      url: base,
    },
    ...(price && {
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: `${base}/camp/${slug}`,
        validFrom: new Date().toISOString().slice(0, 10),
      },
    }),
    ...(minAge !== null && { typicalAgeRange: `${minAge}-${maxAge ?? 18}` }),
  };
}

export default async function CampSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const jsonLd = await generateJsonLd(slug);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
