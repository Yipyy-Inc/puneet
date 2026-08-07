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
// Five tabs on the facility detail page — Agreements, Modules, Reports, Logs
// and the suspension banner — read demo data keyed by a NUMERIC facility id.
// A provisioned facility has a uuid, so those lookups match nothing.
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
          This section still reads demo data, which is keyed differently from a
          real facility — so it would show nothing rather than something wrong.
          It becomes available when this data moves into the database.
        </p>
      </CardContent>
    </Card>
  );
}
