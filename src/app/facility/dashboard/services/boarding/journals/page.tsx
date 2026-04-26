import { GuestJournal } from "@/components/facility/boarding/guest-journal";
import type { ViewMode } from "@/components/facility/boarding/guest-journal";

export default async function JournalsPage({
  searchParams,
}: {
  searchParams: Promise<{ guest?: string; view?: string }>;
}) {
  const params = await searchParams;
  const initialGuestId = params.guest;
  const rawView = params.view;
  const initialView: ViewMode | undefined =
    rawView === "guest" || rawView === "shift" || rawView === "manager"
      ? rawView
      : undefined;

  return <GuestJournal initialGuestId={initialGuestId} initialView={initialView} />;
}
