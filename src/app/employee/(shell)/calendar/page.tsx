import CalendarPage from "@/app/facility/dashboard/calendar/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Reuses the admin operations calendar, gated on the calendar-visibility key.
// assigned_only viewers still reach it, scoped in the data layer to their own
// calendar.
export default function EmployeeCalendarPage() {
  return (
    <RequirePermission permKey="view_all_calendars">
      <CalendarPage />
    </RequirePermission>
  );
}
