import { RequirePermission } from "@/components/employee/AccessRestricted";
import { EvaluationTemplates } from "@/app/facility/dashboard/evaluations/_components/evaluation-templates";

// The same builders, in the employee shell, behind the same key the
// evaluations list uses — so the move out of settings takes the screen away
// from nobody who could already reach it.
export default function EmployeeEvaluationTemplatesPage() {
  return (
    <RequirePermission permKey="view_evaluations">
      <EvaluationTemplates />
    </RequirePermission>
  );
}
