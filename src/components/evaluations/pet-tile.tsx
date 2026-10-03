"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

// ============================================================================
// A pet as the evaluations mock draws one (docs/Yipyy%2BEvaluations.html,
// 2026-10-02): a rounded square in one of seven soft tints with the pet's
// initial in the tint's own ink — never the orange ring, which the module
// does not draw. A pet with a photograph shows it in the same square: pets
// get photographs.
//
// The tint is the pet's, not the row's: the same pet keeps its colour across
// the Today cards, the review queue and the table. Mocked screens only
// (CLAUDE.md § "Client mocks decide the look").
// ============================================================================

const TINTS = [
  "bg-(--pt-1-bg) text-(--pt-1-ink)",
  "bg-(--pt-2-bg) text-(--pt-2-ink)",
  "bg-(--pt-3-bg) text-(--pt-3-ink)",
  "bg-(--pt-4-bg) text-(--pt-4-ink)",
  "bg-(--pt-5-bg) text-(--pt-5-ink)",
  "bg-(--pt-6-bg) text-(--pt-6-ink)",
  "bg-(--pt-7-bg) text-(--pt-7-ink)",
] as const;

/** The mock's four sizes: a Today card, a queue row, a sent row, a table row. */
const SIZES = {
  48: "size-12 rounded-[16px] text-[18px]",
  42: "size-[42px] rounded-[14px] text-[15px]",
  38: "size-[38px] rounded-[12px] text-[14px]",
  34: "size-[34px] rounded-[11px] text-[13px]",
} as const;

function tintOf(key: string): string {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length]!;
}

export function PetTile({
  id,
  name,
  src,
  size,
  className,
}: {
  /** What keeps the tint the pet's own — its id. */
  id: string;
  name: string;
  src?: string | null;
  size: keyof typeof SIZES;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  // A photo that will not load shows the initial, never a broken image.
  const [failed, setFailed] = useState<string | null>(null);
  const photo = src && failed !== src ? src : null;
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden font-extrabold",
        SIZES[size],
        tintOf(id),
        className,
      )}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- a pet's own upload may live on any host
        <img
          src={photo}
          alt=""
          onError={() => setFailed(photo)}
          className="size-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}
