import { hqSettings, getLocationsByFacility } from "@/data/locations";
import { HQSettingsClient } from "@/components/hq/HQSettingsClient";

export default function HQSettingsPage() {
  const locations = getLocationsByFacility(11);
  return <HQSettingsClient settings={hqSettings} locations={locations} />;
}
