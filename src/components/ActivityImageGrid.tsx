"use client";

import Image from "next/image";

type ActivityImageGridProps = {
  images: string[];
  alt: string;
  onImageClick?: (index: number) => void;
};

export function ActivityImageGrid({ images, alt, onImageClick }: ActivityImageGridProps) {
  const has4Plus = images.length >= 4;

  if (has4Plus) {
    const [a, b, c, d] = images;
    return (
      <div
        className="grid grid-cols-2 bg-muted overflow-hidden"
        style={{ gap: 2, borderRadius: 8 }}
      >
        {/* Top-left */}
        <div
          className="relative aspect-square overflow-hidden cursor-zoom-in"
          style={{ borderRadius: "8px 4px 4px 4px" }}
          onClick={() => onImageClick?.(0)}
        >
          <Image src={a} alt={alt} fill sizes="(max-width: 1024px) 50vw, 180px" className="object-cover" priority />
        </div>

        {/* Top-right */}
        <div
          className="relative aspect-square overflow-hidden cursor-zoom-in"
          style={{ borderRadius: "4px 8px 4px 4px" }}
          onClick={() => onImageClick?.(1)}
        >
          <Image src={b} alt={`${alt} 2`} fill sizes="(max-width: 1024px) 50vw, 180px" className="object-cover" />
        </div>

        {/* Bottom-left */}
        <div
          className="relative aspect-square overflow-hidden cursor-zoom-in"
          style={{ borderRadius: "4px 4px 4px 8px" }}
          onClick={() => onImageClick?.(2)}
        >
          <Image src={c} alt={`${alt} 3`} fill sizes="(max-width: 1024px) 50vw, 180px" className="object-cover" />
        </div>

        {/* Bottom-right */}
        <div
          className="relative aspect-square overflow-hidden cursor-zoom-in"
          style={{ borderRadius: "4px 4px 8px 4px" }}
          onClick={() => onImageClick?.(3)}
        >
          <Image src={d} alt={`${alt} 4`} fill sizes="(max-width: 1024px) 50vw, 180px" className="object-cover" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden bg-muted aspect-square cursor-zoom-in"
      style={{ borderRadius: 8 }}
      onClick={() => onImageClick?.(0)}
    >
      <Image
        src={images[0]}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 360px"
        className="object-cover"
        priority
      />
    </div>
  );
}
