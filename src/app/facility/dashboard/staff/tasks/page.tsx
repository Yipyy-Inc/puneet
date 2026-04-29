import { redirect } from "next/navigation";

export default function StaffTasksRedirectPage() {
  redirect("/facility/dashboard/tasks?tab=staff");
}
