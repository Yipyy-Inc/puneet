import { AdminBookingLookup } from "./_components/admin-booking-lookup";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  return <AdminBookingLookup initial={typeof q === "string" ? q : ""} />;
}
