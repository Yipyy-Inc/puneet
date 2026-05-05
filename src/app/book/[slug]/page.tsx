import { notFound } from "next/navigation";
import { getLocationsByFacility } from "@/data/locations";
import { LocationBookingPage } from "@/components/booking/LocationBookingPage";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicLocationBooking({ params }: Props) {
  const { slug } = await params;
  const locations = getLocationsByFacility(11);

  // Match by either shortCode (lower) or a derived slug from the location name
  const location = locations.find(
    (l) =>
      l.shortCode.toLowerCase() === slug.toLowerCase() ||
      l.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .endsWith(slug.toLowerCase()),
  );

  if (!location) notFound();

  return <LocationBookingPage location={location} />;
}
