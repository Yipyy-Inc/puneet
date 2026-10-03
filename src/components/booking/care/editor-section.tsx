// ============================================================================
// One part of a care step's card — the Medications editor's Medication,
// Schedule, How it's given, Supply & notes; the Feeding plan's Meal times,
// What it eats, How it eats, Allergies & notes — headed by its micro label
// (§4), as the client's designs group them.
// ============================================================================

export function EditorSection({
  label,
  aside,
  children,
}: {
  label: string;
  /** A note at the end of the heading's line, as the mocks set one. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[12px] font-semibold tracking-[0.08em] text-(--care-micro) uppercase">
          {label}
        </p>
        {aside}
      </div>
      {children}
    </div>
  );
}

/** A field's label line: the care mocks' 14/500 above it. */
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
  const className = "text-body-ink text-[14px] font-medium";
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
