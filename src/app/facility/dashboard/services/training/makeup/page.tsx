import { MakeupSessionsBoard } from "./_components/makeup-sessions-board";

// The facility's missed training sessions and what happens next, from
// /api/training/makeups. It read the attendance fixture and kept its offers in
// the query cache, so "Offer sent to {owner}" was said over nothing.
export default function FacilityMakeupSessionsPage() {
  return <MakeupSessionsBoard />;
}
