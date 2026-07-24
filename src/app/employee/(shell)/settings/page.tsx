import SettingsPage from "@/app/facility/dashboard/settings/page";

// The SAME settings component the facility admin uses, filtered by the acting
// viewer's permissions (SettingsSidebar + section guards). Personal sections
// (My Profile, My Notifications) are always available, so this route carries NO
// route-level gate — an employee always has SOME settings. Facility-admin
// sections appear only when the viewer holds the key (e.g. manage_roles), so a
// manager with facility settings granted sees the full surface here too.
export default function EmployeeSettingsPage() {
  return <SettingsPage />;
}
