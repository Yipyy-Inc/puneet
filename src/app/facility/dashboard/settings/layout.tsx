import { SettingsShell } from "./_components/settings-shell";

export default function FacilitySettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsShell>{children}</SettingsShell>;
}
