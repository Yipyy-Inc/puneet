import { DaycareAreasClient } from "@/components/rooms/DaycareAreasClient";
import { daycarePlayAreas, daycareSections } from "@/data/daycare-areas";

export default function DaycareRoomsPage() {
  return (
    <DaycareAreasClient
      initialAreas={daycarePlayAreas}
      initialSections={daycareSections}
      facilityId={11}
    />
  );
}
