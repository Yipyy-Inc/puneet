"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      // min-w-0 for the same reason as Card: as a flex/grid item this defaults
      // to min-width:auto and refuses to shrink below its widest tab strip,
      // which then gets clipped by the page shell rather than scrolling.
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex gap-1 overflow-x-auto px-6", className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // ── 42px, MEASURED AT 599px (§6 rule 7) ──────────────────────────
        //
        // `px-4 py-2.5` on 14px type came to 42px — under the 48px floor rule
        // 7 sets below 1024px, and this one primitive was most of what the
        // rendering pass found left in settings: the species tabs on
        // vaccination requirements, the three tag scopes, and five of the
        // report-card template's own tabs.
        //
        // `min-h`, never `h`: a tab label is a translated string, and §5g's
        // rule is that a fixed height on one is a defect in its own right.
        // "Booking tags" is "Étiquettes de réservation" in French.
        // ── AND NOW IT IS ACTUALLY A TAB STRIP (§6 rule 1) ───────────────
        //
        // `data-[state=active]:bg-background` was a FILL on the active tab,
        // and rule 1 states the test mechanically: "an open rail with no
        // radius, no fill and no border box… if the thing has a radius or a
        // background, it is not a tab strip and the ban applies." With a fill,
        // the `border-b-2` underneath was a plain edge accent — banned.
        //
        // The settings restructure plan recorded this ("ui/tabs.tsx … fails
        // rule 1's mechanical test, so it is NOT a legal tab strip;
        // ui/saved-views.tsx is") while `check:edge-accents` passed the file.
        // They were measuring different things, and both were defensible:
        // the gate excludes `bg-background` as "the page, which is the same as
        // no fill", which is TRUE when a strip sits on the ground and false
        // here, because settings puts its tabs inside white Cards — where a
        // warm #FDFCFA active tab is plainly a fill.
        //
        // Removing it settles the ambiguity in the spec's favour rather than
        // widening the gate, which would have reported legitimate rails that
        // really do sit on the ground.
        //
        // Nothing is lost. The active tab still reads as active three ways —
        // a 2px `--primary` line under its own label, `--primary` ink, and the
        // weight it already had — which is exactly what §5s's Selected row
        // prescribes for a tab strip. `TabsList` was already an open rail.
        `text-muted-foreground hover:bg-muted/50 data-[state=active]:border-primary data-[state=active]:text-primary flex min-h-10 items-center gap-2 border-b px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors data-[state=active]:border-b-2 max-lg:min-h-12 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
