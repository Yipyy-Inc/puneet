import { BoardingRoomsClient } from "@/components/rooms/BoardingRoomsClient";

// No facility to name. `/api/rooms` answers with the session facility's rooms
// and stamps each row with that facility's own legacy ref; this page used to
// pass `FACILITY_ID = 11` into a client-side filter, so every facility whose
// legacy ref was not 11 managed an empty list of boarding rooms.
export default function BoardingRoomsPage() {
  return <BoardingRoomsClient />;
}
