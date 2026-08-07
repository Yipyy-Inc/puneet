import { Database } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ============================================================================
// "This tab cannot show a real facility yet."
//
// Two tabs on the facility detail page — Data and Agreements — have nothing
// behind them. Not "a table keyed differently": nothing stores a signed
// agreement, and nothing has ever produced an export.
//
// It was five. `audit_log` (20260807460000) gave Logs a real source; `modules`
// and `facility_modules` (20260807540000, 20260807560000) gave one to Modules;
// and Reports needed no new table at all (20260807620000) — bookings and
// payments were already real and nothing had put them together. Worth checking
// for the last two before assuming the claim still holds.
//
// The alternative was to pass the uuid in anyway and let each tab render its
// own empty state. That reads as "this facility has no agreements", which is a
// different and false claim: we do not know, because nothing is stored. Saying
// which is which is the whole difference between a gap and a bug.
//
// Delete this component's usage one tab at a time as each gets a real table.
// ============================================================================

export function NotYetReal({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="text-muted-foreground size-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Nothing stores this yet. An empty list here would read as &ldquo;this
          facility has none&rdquo;, which is a different and stronger claim than
          the truth — we have never recorded any. It becomes available when this
          data gets a table.
        </p>
      </CardContent>
    </Card>
  );
}
