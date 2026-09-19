import Link from "next/link";
import { CheckCircle2, Clock, Info, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

// ============================================================================
// The pay page when there is nothing to pay, or no way to take a card.
//
// A white card, the glyph in its own status ink, and the words (§6 rule 2 —
// no tinted disc behind the glyph). The words arrive translated from the
// server page, which knows the reader's locale.
// ============================================================================

const TONES = {
  paid: { icon: CheckCircle2, ink: "text-success" },
  neutral: { icon: Info, ink: "text-ink-secondary" },
  waiting: { icon: Clock, ink: "text-ink-secondary" },
  problem: { icon: TriangleAlert, ink: "text-warning" },
} as const;

export function PayNotice({
  tone,
  title,
  body,
  back,
}: {
  tone: keyof typeof TONES;
  title: string;
  body: string;
  /** Where the booking can be read — the customer's page or the facility's. */
  back?: { href: string; label: string };
}) {
  const { icon: Icon, ink } = TONES[tone];
  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <section className="bg-card border-line shadow-card flex flex-col items-center gap-3 rounded-3xl border px-6 py-10 text-center">
        <Icon className={`size-6 ${ink}`} aria-hidden />
        <h1 className="text-heading text-[19px] font-bold">{title}</h1>
        <p className="text-ink-secondary text-[14.5px]">{body}</p>
        {back && (
          <Button variant="outline" asChild className="mt-2">
            <Link href={back.href}>{back.label}</Link>
          </Button>
        )}
      </section>
    </main>
  );
}
