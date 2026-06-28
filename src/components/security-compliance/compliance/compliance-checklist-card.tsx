"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  complianceRequirements,
  type ComplianceFrameworkKey,
  type RequirementStatus,
} from "@/data/compliance-checklist";
import { cn } from "@/lib/utils";

const FRAMEWORKS: ComplianceFrameworkKey[] = ["GDPR", "PIPEDA", "PCI-DSS"];

const STATUS_META: Record<
  RequirementStatus,
  {
    icon: typeof CheckCircle2;
    cls: string;
    badge: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  Met: { icon: CheckCircle2, cls: "text-emerald-600", badge: "default" },
  "In Progress": { icon: Clock, cls: "text-amber-600", badge: "secondary" },
  "Not Met": { icon: XCircle, cls: "text-rose-600", badge: "destructive" },
};

export function ComplianceChecklistCard({
  onFixTab,
}: {
  onFixTab: (tab: string) => void;
}) {
  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Compliance Checklist
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          GDPR, PIPEDA &amp; PCI-DSS requirements with current status. Use “Fix
          This” to jump to the relevant setting.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {FRAMEWORKS.map((fw) => {
          const items = complianceRequirements.filter(
            (r) => r.framework === fw,
          );
          const met = items.filter((r) => r.status === "Met").length;
          return (
            <div key={fw}>
              <div className="mb-2 flex items-center gap-2">
                <h4 className="font-semibold">{fw}</h4>
                <Badge variant="outline" className="text-xs">
                  {met}/{items.length} met
                </Badge>
              </div>
              <div className="space-y-1.5">
                {items.map((r) => {
                  const meta = STATUS_META[r.status];
                  const Icon = meta.icon;
                  const showFix = r.status !== "Met" && (r.fixTab || r.fixHref);
                  return (
                    <div
                      key={r.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <Icon
                          className={cn("mt-0.5 size-4 shrink-0", meta.cls)}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">
                              {r.requirement}
                            </span>
                            <Badge variant={meta.badge} className="text-xs">
                              {r.status}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {r.description}
                          </p>
                        </div>
                      </div>
                      {showFix &&
                        (r.fixTab ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-1"
                            onClick={() => onFixTab(r.fixTab!)}
                          >
                            Fix This
                            <ArrowRight className="size-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="shrink-0 gap-1"
                          >
                            <Link href={r.fixHref!}>
                              Fix This
                              <ArrowRight className="size-3.5" />
                            </Link>
                          </Button>
                        ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
