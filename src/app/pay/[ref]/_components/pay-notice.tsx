import { CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ============================================================================
// The states of /pay/[ref] where there is nothing to pay.
//
// A server component with no interactivity, so it costs no client JavaScript.
// Each caller says WHICH thing is missing — "paid in full" and "this facility
// has not connected an account" are the same shape but not the same news, and
// collapsing them into one "unavailable" screen sends the reader looking for
// the wrong person to fix it.
// ============================================================================

const TONES = {
  paid: {
    icon: CheckCircle2,
    ring: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30",
  },
  neutral: {
    icon: Info,
    ring: "bg-muted text-muted-foreground",
  },
  problem: {
    icon: TriangleAlert,
    ring: "bg-amber-50 text-amber-600 dark:bg-amber-950/30",
  },
} as const;

export function PayNotice({
  tone,
  title,
  body,
}: {
  tone: keyof typeof TONES;
  title: string;
  body: string;
}) {
  const { icon: Icon, ring } = TONES[tone];
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-full",
              ring,
            )}
          >
            <Icon className="size-6" />
          </div>
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-muted-foreground text-sm/relaxed">{body}</p>
        </CardContent>
      </Card>
    </div>
  );
}
