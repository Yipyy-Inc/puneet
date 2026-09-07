// The services a day-level block or override can apply to. Shared by
// ServiceDayBlockingCard, OneDayScheduleOverrideCard and
// DropOffPickUpOverrideCard, which is why it is not inside any of them.
//
// `label` is a FALLBACK, not the rendered string. Every call site passes it as
// the second argument to `useServiceTypeLabel()`, which answers from the
// service-type catalogue in the viewer's language and only falls back to this
// when a facility has renamed a service to something with no key. That is the
// §5q rule about a name the facility typed, and it is why these five stay
// English here.
//
// The check:ui-french `OBJECT_COPY` rule flags them, correctly — it cannot see
// three files away — so they are marked rather than translated. It found a
// real one doing it: DropOffPickUpOverrideCard rendered `?.label` straight,
// with no translator, while its two siblings did not.
export const SERVICE_BLOCK_OPTIONS: { id: string; label: string }[] = [
  // french-ok: fallback for useServiceTypeLabel, never rendered on its own
  { id: "daycare", label: "Daycare" },
  // french-ok: fallback for useServiceTypeLabel, never rendered on its own
  { id: "boarding", label: "Boarding" },
  // french-ok: fallback for useServiceTypeLabel, never rendered on its own
  { id: "grooming", label: "Grooming" },
  // french-ok: fallback for useServiceTypeLabel, never rendered on its own
  { id: "training", label: "Training" },
  // french-ok: fallback for useServiceTypeLabel, never rendered on its own
  { id: "evaluation", label: "Evaluation" },
];
