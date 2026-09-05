"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HqSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>HQ / Multi-Location</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Head-office controls for multi-location businesses — overview,
            cross-location comparison, reporting, shared service catalog, staff
            pool, and transfers.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              { href: "/facility/hq/overview", label: "HQ Overview" },
              {
                href: "/facility/hq/comparison",
                label: "Compare Locations",
              },
              {
                href: "/facility/hq/services",
                label: "Service Catalog",
              },
              { href: "/facility/hq/training", label: "Training" },
              { href: "/facility/hq/staff", label: "Staff Pool" },
              {
                href: "/facility/hq/transfers",
                label: "Transfer History",
              },
              { href: "/facility/hq/settings", label: "HQ Settings" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-primary text-sm hover:underline"
              >
                {link.label} →
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
