// ============================================================================
// The open screen's title and what it asks for. The title is an <h2> and the
// line under it the <p> right after it — the e2e specs read the Details
// screen's name as `h2 + p`, so the two stay adjacent siblings.
// The "Boarding · Sam's Lodge" chip is the client's mock's; a phone has no
// room for it (the top bar already names the service).
// ============================================================================

export function WizardHeader({
  title,
  subtitle,
  chip,
}: {
  title: string;
  subtitle?: string | null;
  chip?: string | null;
}) {
  return (
    <header className="border-line flex items-end justify-between gap-4 border-b px-4 pt-3.5 pb-3 sm:px-6 sm:pt-[18px] sm:pb-3.5 lg:px-8 lg:pt-6 lg:pb-[18px]">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-heading text-[18px]/[1.3] font-semibold tracking-[-0.01em] sm:text-[22px]">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-body text-ink-tertiary">{subtitle}</p>
        ) : null}
      </div>
      {chip ? (
        <span className="border-line bg-card text-meta text-ink-secondary hidden shrink-0 rounded-full border px-3.5 py-1.5 whitespace-nowrap sm:inline-flex">
          {chip}
        </span>
      ) : null}
    </header>
  );
}
