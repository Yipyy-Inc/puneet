"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

// ============================================================================
// Yipyy, the mascot. docs/design-system/design-system.md §5d1, §5d2.
//
// Twenty-three poses, shipped in public/mascot/. This component exists so no
// call site ever builds that path by hand, picks a size that is not one of the
// three, or floats a pose that must not float.
//
// ── HE IS NEVER THE MESSAGE ───────────────────────────────────────────────
//
// §5d1: "Delete the image and the surface must still say everything." The
// heading, the sentence and the status ink carry the meaning; he sits beside
// them. That is why `alt` is empty by design — a screen reader that announced
// "dog waving" would be reading decoration aloud — and why a failed load
// collapses the slot instead of leaving a broken-image frame.
// ============================================================================

/**
 * Empty and first-run — the fourteen poses for a surface with no data on it.
 * These are the only ones `yy-float` may run on (see `float` below).
 */
export const EMPTY_STATE_POSES = [
  "welcome",
  "presenting",
  "waiting",
  "searching",
  "speaking",
  "listening",
  "pointing",
  "reviewing",
  "working",
  "idea",
  "notification",
  "medal",
  "celebration",
  "sleeping",
] as const;

/**
 * The moment — nine poses for a confirmation, a permission, or a whole view
 * that failed. Compact 132 only (§5d1), never a toast, a field or a row.
 */
export const MOMENT_POSES = [
  "success",
  "loading",
  "secure",
  "question",
  "thinking",
  "confused",
  "warning",
  "error",
  "sad",
] as const;

export type EmptyStatePose = (typeof EMPTY_STATE_POSES)[number];
export type MomentPose = (typeof MOMENT_POSES)[number];
export type YipyyPose = EmptyStatePose | MomentPose;

/**
 * Three sizes, and §5d1 says there is no fourth: 320 square, 400 wide, 132
 * compact. 320 and 400 both resolve to "this pose's own full slot" — which of
 * the two you get is the POSE's business, not the caller's, because "the pose
 * dictates the slot, not the reverse". Only `sleeping` is wide.
 */
export type YipyyPoseSize = 132 | 320 | 400;

const EMPTY_STATE_POSE_SET = new Set<string>(EMPTY_STATE_POSES);

/**
 * `sleeping` is a curled dog, genuinely wide, and squaring him buys dead air
 * rather than a better image (§5d1). Verified against the shipped files:
 * 800×500 full, 264×165 compact, against 720×720 / 240×240 for the other
 * twenty-two.
 */
const WIDE_POSE: YipyyPose = "sleeping";

/** The rendered box for each pose shape at each slot. */
function slotFor(name: YipyyPose, size: YipyyPoseSize) {
  const compact = size === 132;
  if (name === WIDE_POSE) {
    return compact
      ? { width: 132, height: 83, compact } // source 264×165
      : { width: 400, height: 250, compact }; // source 800×500
  }
  return compact
    ? { width: 132, height: 132, compact } // source 240×240
    : { width: 320, height: 320, compact }; // source 720×720
}

export interface YipyyPoseProps {
  name: YipyyPose;
  /** Defaults to the compact 132 slot — the inline empty state (§5d). */
  size?: YipyyPoseSize;
  /**
   * `yy-float`, 4px over 6s (§4).
   *
   * Refused on every pose in the MOMENT family, which covers the four §5d1
   * names it out explicitly — `loading` (that surface already has a spinning
   * ring, and one moving thing per view is the rule), and `error`, `warning`
   * and `sad`, where "a dog gently bobbing above your failure is glib". §5d1's
   * own summary is broader than those four — "it is for the empty-state
   * poses" — so that is the line drawn here, and it makes the two statements
   * agree rather than picking one.
   */
  float?: boolean;
  /** Above the fold on a first-run screen. Off by default. */
  priority?: boolean;
  className?: string;
}

export function YipyyPose({
  name,
  size = 132,
  float = false,
  priority = false,
  className,
}: YipyyPoseProps) {
  const [failed, setFailed] = useState(false);

  // §5d1: "A missing pose collapses its slot: headline, body and CTA render
  // with no gap left behind. Never a broken-image frame, never a grey box."
  if (failed) return null;

  const { width, height, compact } = slotFor(name, size);
  const mayFloat = float && EMPTY_STATE_POSE_SET.has(name);

  return (
    <Image
      src={`/mascot/yipyy-mascot-${name}${compact ? "-sm" : ""}.webp`}
      // Empty by design — see the header. `alt=""` plus no ARIA role is what
      // marks an image decorative; a title or aria-label here would undo it.
      alt=""
      width={width}
      height={height}
      priority={priority}
      onError={() => setFailed(true)}
      // ── WHY THE OPTIMISER IS SKIPPED ────────────────────────────────────
      //
      // Each file is already WebP at exactly 2× its slot — 240px for the 132
      // box, 720px for the 320 — which is the output next/image would be
      // asked to produce. Since the move off Vercel it transcodes on the box's
      // own 2 vCPU (docker-compose.yml says so in as many words), so running
      // 46 already-correct files through it spends CPU that serves customers
      // and returns the same bytes.
      unoptimized
      className={cn(mayFloat && "yy-float", className)}
    />
  );
}
