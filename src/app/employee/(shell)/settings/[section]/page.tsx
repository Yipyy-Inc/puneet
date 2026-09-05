import { settingsSectionRoute } from "@/app/facility/dashboard/settings/_components/settings-routes";

// The same section route the facility admin uses, deliberately ungated at the
// route level — an employee always has SOME settings, so a gate here would take
// away the one part of this screen that belongs to everybody. Facility-admin
// sections are filtered out of the rail and the index, and redirected away from
// by the switchboard, all from the acting viewer's own permission map.
export default async function EmployeeSettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  return settingsSectionRoute({ params, portal: "employee" });
}
