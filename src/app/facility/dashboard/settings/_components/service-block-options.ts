// The services a day-level block or override can apply to. Shared by
// ServiceDayBlockingCard, OneDayScheduleOverrideCard and
// DropOffPickUpOverrideCard, which is why it is not inside any of them.
export const SERVICE_BLOCK_OPTIONS: { id: string; label: string }[] = [
  { id: "daycare", label: "Daycare" },
  { id: "boarding", label: "Boarding" },
  { id: "grooming", label: "Grooming" },
  { id: "training", label: "Training" },
  { id: "evaluation", label: "Evaluation" },
];
