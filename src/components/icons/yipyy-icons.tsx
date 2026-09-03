"use client";

import * as React from "react";

/**
 * The six custom glyphs from design-system.md §5b1 — the meanings lucide has no
 * adequate equivalent for. Drawn on lucide's 24px grid at its stroke and caps, so
 * they read as one family beside it.
 *
 * API matches lucide-react: <KennelRun className="size-5" /> or <KennelRun size={20} />.
 * Stroke steps to 2 at 16px per §5b1; pass strokeWidth to override.
 *
 * An icon never introduces a colour — it inherits its label's ink through currentColor.
 */

export interface YipyyIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
}

const glyph = (name: string, body: React.ReactNode) => {
  const C = React.forwardRef<SVGSVGElement, YipyyIconProps>(function Glyph(
    { size = 24, strokeWidth, ...rest },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth ?? (Number(size) <= 16 ? 2 : 1.75)}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {body}
      </svg>
    );
  });
  C.displayName = name;
  return C;
};

/** Kennel run — closest: fence. The unit the boarding business is measured in; Grid3X3 stands in for it today. A fence is a boundary; a run is one enclosure a named animal occupies. */
export const KennelRun = glyph(
  "KennelRun",
  <>
    <path d="M4 20.5V11.5a8 8 0 0 1 16 0v9" />
    <path d="M2.5 20.5h19" />
    <path d="M8 20.5v-6.2" />
    <path d="M12 20.5v-8" />
    <path d="M16 20.5v-6.2" />
  </>,
);

/** Occupancy — closest: grid-2x2-check. How full the building is — the figure orange marks. Fill is the meaning; grid-2x2-check means a grid that has been verified. */
export const Occupancy = glyph(
  "Occupancy",
  <>
    <rect
      x="3"
      y="3"
      width="7.5"
      height="7.5"
      rx="2"
      fill="currentColor"
      stroke="none"
    />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
    <rect
      x="3"
      y="13.5"
      width="7.5"
      height="7.5"
      rx="2"
      fill="currentColor"
      stroke="none"
    />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
  </>,
);

/** Boarding night — closest: moon-star. Boarding is priced by the night. moon-star already means dark mode in every product a user has opened; the paw pads are what make it a stay. */
export const BoardingNight = glyph(
  "BoardingNight",
  <>
    <path d="M20.5 15.2A8.6 8.6 0 1 1 10 4.2a6.7 6.7 0 0 0 10.5 11z" />
    <circle cx="10.9" cy="12.2" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="14.6" cy="10.1" r="1.4" fill="currentColor" stroke="none" />
  </>,
);

/** Playgroup — no candidate. Daycare's core object — several animals loose together. users and users-round are both people, and nothing in 1,756 glyphs is a group of animals. */
export const Playgroup = glyph(
  "Playgroup",
  <>
    <circle cx="7" cy="8.5" r="2.6" />
    <circle cx="16.4" cy="7.4" r="2.2" />
    <circle cx="12.5" cy="15.8" r="3.1" />
  </>,
);

/** Grooming table — no candidate. Distinguishes the grooming station from the service — scissors is the service. table and table-2 are both data tables. */
export const GroomingTable = glyph(
  "GroomingTable",
  <>
    <path d="M2.5 12h19" />
    <path d="M6 12v7.5" />
    <path d="M18 12v7.5" />
    <path d="M12 12V7a2.5 2.5 0 0 1 2.5-2.5h3.5" />
  </>,
);

/** Checked in — no candidate. The most-performed action in the product. paw-print says pet and circle-check says done; neither says the arrival, and it is one event so it needs one glyph. */
export const CheckedIn = glyph(
  "CheckedIn",
  <>
    <ellipse cx="6.6" cy="8.4" rx="1.85" ry="2.25" />
    <ellipse cx="11.1" cy="6.6" rx="1.85" ry="2.25" />
    <ellipse cx="15.6" cy="8.4" rx="1.85" ry="2.25" />
    <path d="M11.1 11.4c2.3 0 4 1.5 4.3 3.2" />
    <path d="M6.8 15.6c0-2.2 1.9-4.2 4.3-4.2" />
    <path d="M6.8 15.6c0 1.9 1.7 2.9 4.3 2.9" />
    <path d="M15.4 19.4l2.1 2.1 4-4.4" />
  </>,
);

export const yipyyIcons = {
  KennelRun,
  Occupancy,
  BoardingNight,
  Playgroup,
  GroomingTable,
  CheckedIn,
} as const;
export type YipyyIconName = keyof typeof yipyyIcons;
