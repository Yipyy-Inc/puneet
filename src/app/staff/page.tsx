import { redirect } from "next/navigation";

// The /staff portal has been retired in favor of the canonical /employee shell
// (role hub + header + permission-driven sidebar). Its schedule / time-off /
// swap functionality now lives at /employee/schedule.
export default function RetiredStaffPortal() {
  redirect("/employee/schedule");
}
