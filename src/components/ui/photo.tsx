"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { PhotoPlaceholder } from "./photo-placeholder";

// ============================================================================
// A facility's own picture — a room, a service, an add-on — or, when there is
// none or it will not load, the client's striped placeholder in its place
// (CLAUDE.md § "Client mocks decide the look": every missing photo looks the
// same). A broken URL used to leave an empty grey box.
//
// A plain <img>, as PetAvatar explains: these URLs are uploads on any host,
// and next/image refuses a host next.config does not list. Neither branch
// shrinks: a slot's size is the caller's, and a flex row must not squeeze it.
// ============================================================================

export function Photo({
  src,
  shape,
  label,
  tone,
  className,
  imgClassName,
}: {
  src?: string | null;
  shape: "band" | "square" | "tile";
  /** The placeholder's stripes: the report card's are `warm`. */
  tone?: "default" | "soft" | "warm";
  /** What belongs here, for the placeholder — translated by the caller. */
  label?: string;
  /** The slot's size and corners; the picture and the placeholder share it. */
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) {
    return (
      <PhotoPlaceholder
        shape={shape}
        tone={tone}
        label={label}
        className={className}
      />
    );
  }
  return (
    <span className={cn("block shrink-0 overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a facility's own upload may live on any host */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(src)}
        className={cn("size-full object-cover", imgClassName)}
      />
    </span>
  );
}
