import { LocationDetailView } from "@/components/hq/locations/LocationDetailView";

// No `notFound()` here any more. The row is fetched on the client through RLS,
// so the server cannot know whether this id exists FOR THIS CALLER without
// doing the read twice — and a 404 rendered from a fixture lookup, which is
// what this used to do, was answering about somebody else's data.
export default async function HQLocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LocationDetailView locationId={id} />;
}
