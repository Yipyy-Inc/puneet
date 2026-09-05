import { settingsIndexRoute } from "./_components/settings-routes";

export default async function FacilitySettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return settingsIndexRoute({ searchParams, portal: "facility" });
}
