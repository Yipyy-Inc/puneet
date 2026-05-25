"use client";

import type { TrainingEnrollment } from "@/lib/training-enrollment";
import type { TrainingSeries } from "@/lib/training-series";
import { PetProgressCharts } from "@/components/training/pet-progress-charts";

interface Props {
  petId: number;
  petName: string;
  enrollments: TrainingEnrollment[];
  seriesById: Map<string, TrainingSeries>;
}

/** Thin facility wrapper — the shared `PetProgressCharts` is mounted on both
 *  the trainer's Training Profile and the customer's My Pets → Progress
 *  sub-tab, so the trainer-side promise "clients see this same view" is
 *  literally true. */
export function TrainingProfileProgress(props: Props) {
  return <PetProgressCharts {...props} audience="facility" />;
}
