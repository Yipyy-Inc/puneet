import { roomCategories, facilityRooms } from "@/data/rooms";
import { BoardingRoomsClient } from "@/components/rooms/BoardingRoomsClient";

const FACILITY_ID = 11;

export default function BoardingRoomsPage() {
  const categories = roomCategories.filter(
    (c) => c.facilityId === FACILITY_ID && c.service === "boarding",
  );
  const categoryIds = new Set(categories.map((c) => c.id));
  const rooms = facilityRooms.filter(
    (r) => r.facilityId === FACILITY_ID && categoryIds.has(r.categoryId),
  );

  return (
    <BoardingRoomsClient
      initialCategories={categories}
      initialRooms={rooms}
      facilityId={FACILITY_ID}
    />
  );
}
