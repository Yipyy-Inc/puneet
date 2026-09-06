"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

import { ServiceColorCard } from "@/components/facility/ServiceColorCard";

export function DaycareSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Daycare module configuration — pricing, evaluation, media, and basic
            info.
          </p>
          <Link
            href="/facility/dashboard/services/daycare/settings"
            className="text-primary mt-2 inline-block text-sm hover:underline"
          >
            Go to Daycare Settings →
          </Link>
        </CardContent>
      </Card>
      <ServiceColorCard service="Daycare" />
    </div>
  );
}
