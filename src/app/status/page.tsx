import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import { type ComponentStatus } from "@/data/status-page";
import { cn } from "@/lib/utils";

import { ComponentList } from "./_components/component-list";
import { IncidentsSection } from "./_components/incidents-section";
import { MaintenanceSection } from "./_components/maintenance-section";
import { OverallBanner } from "./_components/overall-banner";
import { STATUS_META } from "./_components/status-styles";
import { StatusFreshness } from "./_components/status-freshness";
import { SubscribeForm } from "./_components/subscribe-form";

export const metadata: Metadata = {
  title: "Yipyy System Status",
  description:
    "Live status of Yipyy services — API, booking, payments, messaging, calling, and the customer portal — plus incident history and 90-day uptime.",
};

const LEGEND: ComponentStatus[] = [
  "operational",
  "degraded",
  "partial_outage",
  "major_outage",
  "maintenance",
];

export default function StatusPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      {/* Brand header */}
      <header className="mb-8 flex flex-col items-center gap-3 text-center">
        <Image
          src="/yipyy-transparent.png"
          alt="Yipyy"
          width={120}
          height={36}
          className="h-9 w-auto"
          priority
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Status</h1>
          <p className="text-muted-foreground text-sm">
            Real-time status of the Yipyy platform
          </p>
        </div>
      </header>

      <div className="space-y-8">
        <div className="space-y-2">
          <OverallBanner />
          <StatusFreshness />
        </div>

        <MaintenanceSection />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Current Status</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {LEGEND.map((s) => (
                <span
                  key={s}
                  className="text-muted-foreground flex items-center gap-1.5 text-[11px]"
                >
                  <span
                    className={cn("size-2 rounded-full", STATUS_META[s].dot)}
                  />
                  {STATUS_META[s].label}
                </span>
              ))}
            </div>
          </div>
          <ComponentList />
        </section>

        <IncidentsSection />

        <SubscribeForm />

        <p className="text-muted-foreground pt-2 text-center text-xs">
          Looking for the in-app view?{" "}
          <Link href="/facility/help" className="underline underline-offset-2">
            Visit the Help Center
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
