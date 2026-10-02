import { Suspense } from "react";

import { EvaluationsModule } from "@/components/evaluations/module/evaluations-module";

// Operations › Evaluations (the client's mock, 2026-10-02). The module reads
// its tab from the address, so it renders inside a Suspense boundary.
export default function EvaluationsPage() {
  return (
    <Suspense>
      <EvaluationsModule />
    </Suspense>
  );
}
