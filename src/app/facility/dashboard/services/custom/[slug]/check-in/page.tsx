"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useCustomServices } from "@/hooks/use-custom-services";
import { ServiceCheckInBoard } from "@/components/facility/dashboard/service-check-in-board";

export default function CustomServiceCheckInPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { getModuleBySlug } = useCustomServices();
  const serviceModule = getModuleBySlug(slug ?? "");

  // The unified check-in data keys custom bookings by the module slug, so we
  // scope the shared dashboard board to this module's slug.
  const serviceKeys = useMemo(() => (slug ? [slug] : []), [slug]);

  if (!serviceModule) return null;

  return (
    <ServiceCheckInBoard
      serviceKeys={serviceKeys}
      title="Check-In / Check-Out"
      description={`Manage arrivals and departures for ${serviceModule.name} today`}
    />
  );
}
