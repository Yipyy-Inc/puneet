import { settingsSectionRoute } from "../_components/settings-routes";

export default async function FacilitySettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  return settingsSectionRoute({ params, portal: "facility" });
}
