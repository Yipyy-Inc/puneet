import TrainingPage from "@/app/facility/dashboard/services/training/page";
import { RequireAnyPermission } from "@/components/employee/AccessRestricted";

// OR-gate mirrors the nav section: trainers (own calendar) and managers
// (programme oversight) both reach Training.
export default function EmployeeTrainingPage() {
  return (
    <RequireAnyPermission
      permKeys={["training_view_own_calendar", "training_manage_programs"]}
    >
      <TrainingPage />
    </RequireAnyPermission>
  );
}
