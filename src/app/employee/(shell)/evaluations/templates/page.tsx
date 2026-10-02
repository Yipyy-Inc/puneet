import { redirect } from "next/navigation";

// The evaluation form and its report card are set up on the Evaluations page
// itself now, under Setup (the client's mock, 2026-10-02).
export default function EmployeeEvaluationTemplatesPage() {
  redirect("/employee/evaluations?tab=setup");
}
