import { Suspense } from "react";
import { SeriesList } from "./_components/series-list";

export default function TrainingSeriesPage() {
  return (
    <Suspense fallback={null}>
      <SeriesList />
    </Suspense>
  );
}
