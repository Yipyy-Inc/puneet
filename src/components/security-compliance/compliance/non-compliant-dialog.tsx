"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dataProtectionSettings } from "@/data/security-compliance";

const IMPACT_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Low: "secondary",
  Medium: "outline",
  High: "destructive",
};

// "Fix This" target per setting category — an in-page tab, or an external route.
function fixTarget(category: string): { tab?: string; href?: string } {
  switch (category) {
    case "Data Retention":
      return { tab: "data-retention" };
    case "Encryption":
    case "Access Control":
      return { href: "/dashboard/security-compliance/security-management" };
    case "Right to Erasure":
    case "Backup":
    case "Anonymization":
    default:
      return { href: "/dashboard/system-admin/data-management" };
  }
}

export function NonCompliantDialog({
  open,
  onOpenChange,
  onFixTab,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFixTab: (tab: string) => void;
}) {
  const items = dataProtectionSettings.filter((s) => !s.isCompliant);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-orange-600" />
            Non-Compliant Settings ({items.length})
          </DialogTitle>
          <DialogDescription>
            These settings need attention. Use “Fix This” to jump to the
            relevant setting.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {items.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Everything is compliant. 🎉
            </p>
          )}
          {items.map((s) => {
            const target = fixTarget(s.category);
            return (
              <div
                key={s.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{s.settingName}</span>
                    <Badge variant="outline" className="text-xs">
                      {s.category}
                    </Badge>
                    <Badge
                      variant={IMPACT_VARIANT[s.impact] ?? "outline"}
                      className="text-xs"
                    >
                      {s.impact} impact
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {s.description}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Current:{" "}
                    <span className="font-mono">{String(s.currentValue)}</span>{" "}
                    · Recommended:{" "}
                    <span className="font-mono text-emerald-600">
                      {String(s.recommendedValue)}
                    </span>
                  </p>
                </div>
                {target.tab ? (
                  <Button
                    size="sm"
                    className="shrink-0 gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => onFixTab(target.tab!)}
                  >
                    Fix This
                    <ArrowRight className="size-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    asChild
                    className="shrink-0 gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Link href={target.href!}>
                      Fix This
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
