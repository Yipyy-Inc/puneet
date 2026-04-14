import { BoardingRoomsClient } from "@/components/rooms/BoardingRoomsClient";

const FACILITY_ID = 11;

export default function BoardingRoomsPage() {
  return <BoardingRoomsClient facilityId={FACILITY_ID} />;
}
