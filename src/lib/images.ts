// src/lib/images.ts
import { supabase } from "./supabase";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type CampImageFields = {
  hero_image_url?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
};

export type UploadActivityImagesArgs = {
  slug: string;

  heroImage: File | null;
  galleryImages: File[];

  existingHeroUrl?: string | null;
  existingGalleryUrls?: string[];

  bucket?: string; // optional override
};

export type UploadActivityImagesResult = {
  heroUrl: string | null;
  galleryUrls: string[];
  anyFailed: boolean;
};

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_BUCKET = "activity-images";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function getExtension(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1
    ? parts[parts.length - 1].toLowerCase()
    : "jpg";
}

/* ------------------------------------------------------------------ */
/* Upload logic                                                       */
/* ------------------------------------------------------------------ */

export async function uploadActivityImages(
  args: UploadActivityImagesArgs
): Promise<UploadActivityImagesResult> {
  const bucket = args.bucket ?? DEFAULT_BUCKET;

  let heroUrl: string | null = args.existingHeroUrl ?? null;
  let galleryUrls: string[] = Array.isArray(args.existingGalleryUrls)
    ? [...args.existingGalleryUrls]
    : [];

  let anyFailed = false;

  /* ----------------------------- */
  /* Hero image                    */
  /* ----------------------------- */

  if (args.heroImage) {
    const ext = getExtension(args.heroImage);
    const path = `${args.slug}/hero.${ext}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, args.heroImage, {
        upsert: true,
        cacheControl: "3600",
      });

    if (error) {
      console.error("[uploadActivityImages] hero upload failed:", error);
      anyFailed = true;
    } else {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      heroUrl = data.publicUrl;
    }
  }

  /* ----------------------------- */
  /* Gallery images                */
  /* ----------------------------- */

  for (let i = 0; i < args.galleryImages.length; i++) {
    const file = args.galleryImages[i];
    if (!file) continue;

    const ext = getExtension(file);
    const path = `${args.slug}/gallery-${Date.now()}-${i}.${ext}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
        cacheControl: "3600",
      });

    if (error) {
      console.error(
        `[uploadActivityImages] gallery image ${i} failed:`,
        error
      );
      anyFailed = true;
      continue;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    galleryUrls.push(data.publicUrl);
  }

  /* ----------------------------- */
  /* Clean + de-dupe               */
  /* ----------------------------- */

  galleryUrls = galleryUrls
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    .map((u) => u.trim());

  galleryUrls = Array.from(new Set(galleryUrls));

  return {
    heroUrl,
    galleryUrls,
    anyFailed,
  };
}

/* ------------------------------------------------------------------ */
/* Read helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Best hero image, in order:
 * 1) hero_image_url
 * 2) image_url
 * 3) first image_urls entry
 */
export function getHeroImage(
  camp?: CampImageFields | null
): string | null {
  if (!camp) return null;

  const hero = camp.hero_image_url?.trim();
  if (hero) return hero;

  const single = camp.image_url?.trim();
  if (single) return single;

  const first = camp.image_urls?.find(
    (u) => typeof u === "string" && u.trim().length > 0
  );

  return first?.trim() ?? null;
}

export function getGalleryImages(
  camp?: CampImageFields | null,
  opts?: {
    includeHero?: boolean;
    max?: number;
  }
): string[] {
  if (!camp) return [];

  const includeHero = opts?.includeHero ?? false;
  const max = opts?.max ?? 8;

  const hero = getHeroImage(camp);

  const raw = Array.isArray(camp.image_urls)
    ? camp.image_urls
    : [];

  let images = raw
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    .map((u) => u.trim());

  images = Array.from(new Set(images));

  if (hero && !includeHero) {
    images = images.filter((u) => u !== hero);
  }

  if (hero && includeHero) {
    images = [hero, ...images.filter((u) => u !== hero)];
  }

  return images.slice(0, max);
}

/* ------------------------------------------------------------------ */
/* Placeholders                                                       */
/* ------------------------------------------------------------------ */

export const DEFAULT_PLACEHOLDER_IMAGE: string | null = null;
