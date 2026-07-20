"use client";

import { ServiceCheckInBoard } from "@/components/facility/dashboard/service-check-in-board";

// Module-level constant keeps a stable array reference for the board's memoized
// service scoping.
const TRAINING_KEYS = ["training"];

export default function TrainingCheckInPage() {
  return (
    <ServiceCheckInBoard
      serviceKeys={TRAINING_KEYS}
      title="Training Check-In / Check-Out"
      description="Manage arrivals and departures for today's training sessions"
    />
  );
}
