import { Suspense } from "react";
import { StudentsPageShell } from "./_components/students-page-shell";

export default function TrainingStudentsPage() {
  return (
    <Suspense fallback={null}>
      <StudentsPageShell />
    </Suspense>
  );
}
