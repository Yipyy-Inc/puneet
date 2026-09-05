"use client";

import dynamic from "next/dynamic";

// ssr: false, as it was on the switchboard — this reads a client store and
// cannot render on the server.
const YipyyPaySection = dynamic(
  () =>
    import("@/components/facility/yipyy-pay/YipyyPaySection").then(
      (mod) => mod.YipyyPaySection,
    ),
  { ssr: false },
);

// Named for the screen, not the section, because the component it renders is
// already called YipyyPaySection.
export function YipyyPayScreen() {
  return <YipyyPaySection />;
}
