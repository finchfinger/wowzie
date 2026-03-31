import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: camp } = await supabase
    .from("camps")
    .select("name, description, hero_image_url, image_url, meta")
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
  const description = raw.length > 160 ? raw.slice(0, 157) + "…" : raw || "Book kids' camps and classes on Wowzi.";
  const image = (camp.hero_image_url as string | null) || (camp.image_url as string | null);
  const title = `${name} | Wowzi`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
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
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: camp } = await supabase
    .from("camps")
    .select("name, description, hero_image_url, image_url, price_cents, location, meta")
    .eq("slug", slug)
    .single();

  if (!camp) return null;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.heywowzi.com";
  const name = (camp.name as string) ?? "Camp";
  const description = (camp.description as string | null) ?? "";
  const image = (camp.hero_image_url as string | null) || (camp.image_url as string | null);
  const price = camp.price_cents ? (camp.price_cents / 100).toFixed(2) : null;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description,
    url: `${base}/camp/${slug}`,
    ...(image && { image }),
    eventStatus: "https://schema.org/EventScheduled",
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
      },
    }),
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
