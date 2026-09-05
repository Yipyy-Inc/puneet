import { settingsIndexRoute } from "@/app/facility/dashboard/settings/_components/settings-routes";

// The same index the facility admin sees, filtered by the acting viewer's
// permissions, and the same ?section= front door — an employee's bookmarks are
// as old as anyone's. NO route-level gate, on purpose: personal sections (My
// profile, My notifications) belong to every employee, so an employee always
// has settings.
export default async function EmployeeSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return settingsIndexRoute({ searchParams, portal: "employee" });
}
