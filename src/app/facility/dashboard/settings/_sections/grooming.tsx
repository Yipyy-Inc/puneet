"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ServiceColorCard } from "@/components/facility/ServiceColorCard";

export function GroomingSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Grooming Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Grooming module configuration — scheduling, pricing, add-ons,
            stylists, and policies.
          </p>
          <Link
            href="/facility/dashboard/services/grooming/settings"
            className="text-primary mt-2 inline-block text-sm hover:underline"
          >
            Go to Grooming Settings →
          </Link>
        </CardContent>
      </Card>
      <ServiceColorCard service="Grooming" />
    </div>
  );
}
