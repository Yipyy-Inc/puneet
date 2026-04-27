import { GuestJournal } from "@/components/facility/boarding/guest-journal";

export default async function GuestJournalsPage({
  searchParams,
}: {
  searchParams: Promise<{ guest?: string }>;
}) {
  const params = await searchParams;
  const initialGuestId = params.guest;

  return (
    <GuestJournal
      scope="guest-journal"
      initialGuestId={initialGuestId}
    />
  );
}
