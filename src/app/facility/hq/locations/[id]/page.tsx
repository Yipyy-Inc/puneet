import { notFound } from "next/navigation";

import { getLocationById } from "@/data/locations";
import { LocationDetailView } from "@/components/hq/locations/LocationDetailView";

export default async function HQLocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const location = getLocationById(id);
  if (!location) notFound();
  return <LocationDetailView location={location} />;
}
