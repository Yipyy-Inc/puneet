"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MobileGroomingSettings } from "@/components/facility/grooming/mobile-grooming-settings";
import { GroomingCheckInForms } from "@/components/facility/grooming/grooming-check-in-forms";
import { PageHeader } from "@/components/ui/page-header";
import { useSettingsHref } from "@/lib/settings/use-settings-href";

// ============================================================================
// Grooming settings — where each one is actually kept.
//
// This page was a form over `useState(DEFAULTS)`: General, Booking Rules,
// Capacity, Check-in, Report Cards, Cancellation, No-show and Staff
// Notifications, with a "Save Changes" button that toasted "Grooming settings
// saved" and wrote nothing. Every one of those is set somewhere real, and the
// grooming module reads it from there — so the page now sends people to the
// screen that saves each one, the way the booking-rules section did (§5s).
// What only this page offers — the check-in forms and mobile grooming — stays.
// ============================================================================

export default function GroomingSettingsPage() {
  const settingsPath = useSettingsHref();
  const places = [
    {
      href: settingsPath("grooming"),
      title: "Name and colour",
      detail: "How grooming appears on the calendar and the booking pages.",
    },
    {
      href: "/facility/dashboard/services/grooming/rates",
      title: "Prices, add-ons and the no-show fee",
      detail: "The menu, size pricing, add-ons and what a no-show costs.",
    },
    {
      href: settingsPath("booking-rules"),
      title: "Booking rules",
      detail:
        "How far ahead people can book, same-day booking, cancellation notice and fees, daily capacity.",
    },
    {
      href: settingsPath("yipyygo"),
      title: "Express check-in",
      detail: "The pre-visit form clients fill in before they arrive.",
    },
    {
      href: settingsPath("report-card-template"),
      title: "Report cards",
      detail: "What a groom's report card says and when it goes out.",
    },
    {
      href: settingsPath("notifications"),
      title: "Client notifications",
      detail: "Which messages clients get about their bookings.",
    },
    {
      href: settingsPath("staff-notifications"),
      title: "Staff notifications",
      detail: "Which alerts staff get.",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grooming Settings"
        description="Each setting is kept on its own screen. Open one to change it."
      />

      <Card>
        <CardHeader>
          <CardTitle>Where grooming is set up</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {places.map((place) => (
              <li key={place.title}>
                <Link
                  href={place.href}
                  className="hover:bg-muted/40 flex min-h-12 items-center gap-3 px-6 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">
                      {place.title}
                    </span>
                    <span className="text-muted-foreground block text-[13.5px]">
                      {place.detail}
                    </span>
                  </span>
                  <ChevronRight
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <GroomingCheckInForms />

      <Card>
        <CardHeader>
          <CardTitle>Mobile Grooming</CardTitle>
          <CardDescription>
            Master toggle for mobile operations — controls the Route Planner tab
            and service-area restrictions. Vans, areas, and the arrival window
            are configured inside the section below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MobileGroomingSettings />
        </CardContent>
      </Card>
    </div>
  );
}
