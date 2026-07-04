import { redirect } from "next/navigation";

// Export Data moved into the owner-only Owner Account section (Task 22). This old
// URL now forwards there, where the server-side owner guard applies.
export default function FacilityDataExportSettingsPage() {
  redirect("/facility/account/export");
}
