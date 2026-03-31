import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://golly-roan.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/activities", "/search", "/camp/", "/help/", "/contact", "/privacy", "/terms", "/data-transparency"],
        disallow: [
          "/host/",
          "/admin/",
          "/checkout/",
          "/bookings/",
          "/messages",
          "/notifications",
          "/settings/",
          "/profile/",
          "/review/",
          "/friends/",
          "/wishlist",
          "/ai-chat",
          "/auth/",
          "/api/",
          "/calendars/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
