"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FacilityLoyaltyConfig } from "@/types/loyalty";

type Settings = FacilityLoyaltyConfig["settings"];

interface GeneralSettingsEditorProps {
  value: Settings;
  onChange: (v: Settings) => void;
}

/** Parse an optional numeric input: empty string -> undefined, else Number. */
function parseOptionalNumber(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

export function GeneralSettingsEditor({
  value,
  onChange,
}: GeneralSettingsEditorProps) {
  const patch = (changes: Partial<Settings>) => {
    onChange({ ...value, ...changes });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Label className="text-base">Points Configuration</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pointsName">Points Name</Label>
              <Input
                id="pointsName"
                value={value.pointsName}
                onChange={(e) => patch({ pointsName: e.target.value })}
                placeholder="e.g., Points, Stars, Paw Points"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pointsValue">Points Value (100 pts = $?)</Label>
              <Input
                id="pointsValue"
                type="number"
                value={value.pointsValue}
                onChange={(e) =>
                  patch({ pointsValue: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minimumRedemptionPoints">
                Minimum Redemption Points
              </Label>
              <Input
                id="minimumRedemptionPoints"
                type="number"
                value={value.minimumRedemptionPoints ?? ""}
                onChange={(e) =>
                  patch({
                    minimumRedemptionPoints: parseOptionalNumber(
                      e.target.value,
                    ),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maximumRedemptionPerTransaction">
                Max Redemption per Transaction
              </Label>
              <Input
                id="maximumRedemptionPerTransaction"
                type="number"
                value={value.maximumRedemptionPerTransaction ?? ""}
                onChange={(e) =>
                  patch({
                    maximumRedemptionPerTransaction: parseOptionalNumber(
                      e.target.value,
                    ),
                  })
                }
                placeholder="Unlimited"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <Label className="text-base">Display &amp; Behavior</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="allowPartialRedemption"
                checked={value.allowPartialRedemption ?? false}
                onCheckedChange={(checked) =>
                  patch({ allowPartialRedemption: checked })
                }
              />
              <Label htmlFor="allowPartialRedemption">
                Allow Partial Redemption
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="showPointsOnReceipt"
                checked={value.showPointsOnReceipt ?? false}
                onCheckedChange={(checked) =>
                  patch({ showPointsOnReceipt: checked })
                }
              />
              <Label htmlFor="showPointsOnReceipt">
                Show Points on Receipt
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="showPointsInPortal"
                checked={value.showPointsInPortal ?? false}
                onCheckedChange={(checked) =>
                  patch({ showPointsInPortal: checked })
                }
              />
              <Label htmlFor="showPointsInPortal">
                Show in Customer Portal
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="allowPointsTransfer"
                checked={value.allowPointsTransfer ?? false}
                onCheckedChange={(checked) =>
                  patch({ allowPointsTransfer: checked })
                }
              />
              <Label htmlFor="allowPointsTransfer">Allow Points Transfer</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
