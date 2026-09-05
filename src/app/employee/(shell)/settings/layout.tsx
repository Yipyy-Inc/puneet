import { SettingsShell } from "@/app/facility/dashboard/settings/_components/settings-shell";

// The same chrome, in the employee shell. `SettingsShell` reads the portal off
// the pathname, so the rail's links and the "All settings" back link stay
// inside /employee without being told which shell they are in.
export default function EmployeeSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsShell>{children}</SettingsShell>;
}
