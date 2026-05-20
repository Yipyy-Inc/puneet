"use client";

import { useState } from "react";
import { Package, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import { PreviewBeforeSend } from "../shared/PreviewBeforeSend";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 4.3 Take Action — package adoption campaign for frequent buyers
 * who have never purchased a package. Spec template: "You have visited us
 * X times — here is a package that saves you money on every visit."
 */

const FREQUENT_BUYERS: {
  firstName: string;
  lastName: string;
  petName: string;
  email: string;
  visitsPast90: number;
  bestPackage: string;
  savings: number;
}[] = [
  { firstName: "Brooke", lastName: "Mason", petName: "Atlas", email: "bmason@example.com", visitsPast90: 6, bestPackage: "Grooming 5-pack", savings: 65 },
  { firstName: "Tyler", lastName: "Yates", petName: "Cleo", email: "tyates@example.com", visitsPast90: 5, bestPackage: "Daycare 10-pack", savings: 120 },
  { firstName: "Naomi", lastName: "Reyes", petName: "Pepper", email: "nreyes@example.com", visitsPast90: 4, bestPackage: "Grooming 5-pack", savings: 65 },
  { firstName: "Felix", lastName: "Owen", petName: "Theo", email: "fowen@example.com", visitsPast90: 5, bestPackage: "Grooming 5-pack", savings: 65 },
  { firstName: "Iris", lastName: "Hwang", petName: "Mango", email: "ihwang@example.com", visitsPast90: 6, bestPackage: "Daycare 10-pack", savings: 120 },
  { firstName: "Quinn", lastName: "Adler", petName: "Bo", email: "qadler@example.com", visitsPast90: 4, bestPackage: "Grooming 5-pack", savings: 65 },
  { firstName: "Roman", lastName: "Doyle", petName: "Echo", email: "rdoyle@example.com", visitsPast90: 4, bestPackage: "Grooming 5-pack", savings: 65 },
  { firstName: "Beatrice", lastName: "Klein", petName: "Olive", email: "bklein@example.com", visitsPast90: 5, bestPackage: "Daycare 10-pack", savings: 120 },
  { firstName: "Daniel", lastName: "Cho", petName: "Juno", email: "dcho@example.com", visitsPast90: 6, bestPackage: "Grooming 5-pack", savings: 65 },
  { firstName: "Sarah", lastName: "Whitman", petName: "Ziggy", email: "swhitman@example.com", visitsPast90: 4, bestPackage: "Daycare 10-pack", savings: 120 },
  { firstName: "Owen", lastName: "Park", petName: "Rumi", email: "opark@example.com", visitsPast90: 4, bestPackage: "Grooming 5-pack", savings: 65 },
  { firstName: "Yara", lastName: "Boudreau", petName: "Hazel", email: "yboudreau@example.com", visitsPast90: 5, bestPackage: "Grooming 5-pack", savings: 65 },
  { firstName: "Linus", lastName: "Brodeur", petName: "Sage", email: "lbrodeur@example.com", visitsPast90: 4, bestPackage: "Daycare 10-pack", savings: 120 },
  { firstName: "Greta", lastName: "Vance", petName: "Otis", email: "gvance@example.com", visitsPast90: 4, bestPackage: "Grooming 5-pack", savings: 65 },
];

const TOTAL_SAVINGS = FREQUENT_BUYERS.reduce((s, c) => s + c.savings, 0);

const DEFAULT_SUBJECT = "You've visited us {{visitsPast90}} times — save with a package";
const DEFAULT_BODY = `Hi {{firstName}},

We've loved seeing {{petName}} so often — {{visitsPast90}} visits in the past 90 days! That's the kind of frequency where a package starts making real sense.

Our {{bestPackage}} would save you about ${"${{savings}}"} based on your current visit pattern — paid up front, used at your own pace.

Take a look: doggieville.ca/packages

No pressure — just thought you should know it's there.

Cheers,
The Doggieville team`;

export function PackageCampaignPanel({ onComplete, onCancel }: InsightPanelProps) {
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);

  if (step === "compose") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-slate-50 p-3">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            <Users className="size-3.5" />
            Recipients · {FREQUENT_BUYERS.length} frequent buyers
          </div>
          <p className="text-muted-foreground text-xs">
            Locked revenue potential if all convert:{" "}
            <span className="font-semibold text-emerald-700">
              ${TOTAL_SAVINGS} in savings shifted to packages
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FREQUENT_BUYERS.slice(0, 6).map((c) => (
              <Badge key={c.email} variant="outline" className="bg-white">
                <Package className="mr-1 size-3" />
                {c.firstName} · {c.visitsPast90}× visits
              </Badge>
            ))}
            <Badge variant="outline">+{FREQUENT_BUYERS.length - 6} more</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-muted-foreground text-xs">
            Tokens: <code>{"{{firstName}}"}</code>,{" "}
            <code>{"{{petName}}"}</code>, <code>{"{{visitsPast90}}"}</code>,{" "}
            <code>{"{{bestPackage}}"}</code>, <code>{"{{savings}}"}</code>
          </p>
        </div>
        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Preview"
            onPrimary={() => setStep("preview")}
            primaryDisabled={!subject.trim() || !body.trim()}
            onSecondary={onCancel}
          />
        </div>
      </div>
    );
  }

  const first = FREQUENT_BUYERS[0];
  const resolveTokens = (text: string) =>
    text
      .replaceAll("{{firstName}}", first.firstName)
      .replaceAll("{{petName}}", first.petName)
      .replaceAll("{{visitsPast90}}", String(first.visitsPast90))
      .replaceAll("{{bestPackage}}", first.bestPackage)
      .replaceAll("{{savings}}", String(first.savings));

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <PreviewBeforeSend
        channel="email"
        recipients={FREQUENT_BUYERS.map(
          (c) => `${c.firstName} ${c.lastName.charAt(0)}.`,
        )}
        subject={resolveTokens(subject)}
        body={resolveTokens(body)}
        meta={[
          { label: "Recipients", value: FREQUENT_BUYERS.length },
          { label: "Lockable revenue", value: `$${TOTAL_SAVINGS}` },
        ]}
      />
      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Send campaign"
          onPrimary={() =>
            onComplete({
              trackedMetric: "Package purchases within 30 days",
              baseline: 0,
              current: 0,
              target: FREQUENT_BUYERS.length,
              evaluatedAt: new Date().toISOString(),
              windowDays: 30,
            })
          }
          secondaryLabel="Back"
          onSecondary={() => setStep("compose")}
        />
      </div>
    </div>
  );
}
