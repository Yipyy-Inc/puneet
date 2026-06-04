"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { SaveBar } from "@/components/loyalty/config/SaveBar";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import {
  Coins,
  Crown,
  Gift,
  Medal,
  Target,
  Sparkles,
  RotateCcw,
} from "lucide-react";

export default function LoyaltyOverviewPage() {
  const { config, patchConfig, resetConfig } = useLoyaltyProgram();

  const [name, setName] = useState(() => config.programName ?? "");
  const [description, setDescription] = useState(
    () => config.programDescription ?? "",
  );

  const dirty =
    name !== (config.programName ?? "") ||
    description !== (config.programDescription ?? "");

  const handleSave = () => {
    patchConfig({
      programName: name.trim() || undefined,
      programDescription: description.trim() || undefined,
    });
    toast.success("Program details saved");
  };

  const handleReset = () => {
    setName(config.programName ?? "");
    setDescription(config.programDescription ?? "");
  };

  const enabledRewardTypes = config.rewardTypes.filter((r) => r.enabled).length;
  const badgeCount = config.badges?.length ?? 0;
  const referralOn = config.referralProgram?.enabled === true;
  const earnRules = config.earnRules ?? [];
  const activeEarnRules = earnRules.filter((r) => r.enabled).length;
  const tiers = config.tierDefinitions ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Program Overview</h2>
        <p className="text-muted-foreground text-sm">
          A snapshot of this facility&apos;s loyalty program and its identity.
          Use the tabs above to configure each area.
        </p>
      </div>

      {/* Guided setup CTA */}
      <Link
        href="/facility/dashboard/loyalty/setup"
        className="group flex items-center gap-4 rounded-xl border bg-linear-to-br from-amber-50 to-orange-50 p-4 transition-colors hover:border-amber-300 dark:from-amber-950/30 dark:to-orange-950/20"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-500">
          <Sparkles className="size-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Set up with the guided wizard</p>
          <p className="text-muted-foreground text-sm">
            Name your program, set earning, tiers, and rewards in five quick
            steps — most facilities finish in under 30 minutes.
          </p>
        </div>
        <span className="text-primary text-sm font-medium whitespace-nowrap group-hover:underline">
          Start setup →
        </span>
      </Link>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiTile
          label="Earn Rules"
          value={activeEarnRules}
          hint={`${earnRules.length} total · 100 ${config.settings.pointsName.toLowerCase()} = $${config.settings.pointsValue}`}
          icon={Coins}
          tone="amber"
        />
        <KpiTile
          label="Tiers"
          value={tiers.length}
          hint={
            tiers.length > 0
              ? [...tiers]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((t) => t.name)
                  .join(", ")
              : "No tiers configured"
          }
          icon={Crown}
          tone="violet"
        />
        <KpiTile
          label="Reward Types"
          value={enabledRewardTypes}
          hint={`${enabledRewardTypes} enabled`}
          icon={Gift}
          tone="emerald"
        />
        <KpiTile
          label="Badges"
          value={badgeCount}
          hint="Achievement badges"
          icon={Medal}
          tone="indigo"
        />
        <KpiTile
          label="Referral Program"
          value={referralOn ? "On" : "Off"}
          hint={
            referralOn
              ? config.referralProgram?.referrerReward.description
              : "Not enabled"
          }
          icon={Target}
          tone="rose"
        />
        <KpiTile
          label="Points Expiration"
          value={config.pointsExpiration.enabled ? "On" : "Off"}
          hint={
            config.pointsExpiration.enabled
              ? config.pointsExpiration.expirationType.replace(/_/g, " ")
              : "Points never expire"
          }
          icon={Sparkles}
          tone="slate"
        />
      </div>

      {/* Program identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Program Identity
            <Badge variant={config.enabled ? "default" : "secondary"}>
              {config.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Shown to customers in the rewards portal. Use the toggle in the
            header above to enable or disable the program.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program-name">Program Name</Label>
            <Input
              id="program-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Doggieville Rewards"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="program-description">Description</Label>
            <Textarea
              id="program-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Earn points on every visit and redeem them for rewards."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">Reset Configuration</CardTitle>
          <p className="text-muted-foreground text-sm">
            Discard all local changes and restore this facility&apos;s default
            loyalty configuration.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              resetConfig();
              setName(config.programName ?? "");
              setDescription(config.programDescription ?? "");
              toast.success("Configuration reset to defaults");
            }}
          >
            <RotateCcw className="mr-2 size-4" />
            Reset to defaults
          </Button>
        </CardContent>
      </Card>

      <SaveBar
        dirty={dirty}
        onSave={handleSave}
        onReset={handleReset}
        saveLabel="Save details"
      />

      {/* Quick links footer */}
      <div className="text-muted-foreground text-xs">
        Need the customer view?{" "}
        <Link
          href="/customer/rewards"
          className="text-primary underline-offset-2 hover:underline"
        >
          Open the rewards portal
        </Link>
      </div>
    </div>
  );
}
