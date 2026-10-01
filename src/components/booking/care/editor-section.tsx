// ============================================================================
// One part of a care step's card — the Medications editor's Medication,
// Schedule, How it's given, Supply & notes; the Feeding plan's Meal times,
// What it eats, How it eats, Allergies & notes — headed by its micro label
// (§4), as the client's designs group them.
// ============================================================================

export function EditorSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
      <p className="text-micro text-ink-tertiary uppercase">{label}</p>
      {children}
    </div>
  );
}

/** A field's label line: 13.5/600 above it (§5c). */
export function FieldLabel({
  htmlFor,
  id,
  children,
  aside,
}: {
  htmlFor?: string;
  id?: string;
  children: React.ReactNode;
  /** Shown at the end of the line, like a summary. */
  aside?: React.ReactNode;
}) {
  const className = "text-body-ink text-meta font-semibold";
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      {htmlFor ? (
        <label htmlFor={htmlFor} id={id} className={className}>
          {children}
        </label>
      ) : (
        <span id={id} className={className}>
          {children}
        </span>
      )}
      {aside}
    </div>
  );
}
