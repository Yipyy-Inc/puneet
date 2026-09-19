import { redirect } from "next/navigation";

import { CustomerBookingsView } from "./_components/customer-bookings-view";

// A link that names a service (/customer/bookings?service=grooming) is a link
// to book it, and goes to the booking form on the server — it was a
// window.location assignment in an effect, after the list had rendered.
export default async function CustomerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string | string[] }>;
}) {
  const { service } = await searchParams;
  if (typeof service === "string" && service) {
    redirect(`/customer/bookings/new?service=${encodeURIComponent(service)}`);
  }
  return <CustomerBookingsView />;
}
