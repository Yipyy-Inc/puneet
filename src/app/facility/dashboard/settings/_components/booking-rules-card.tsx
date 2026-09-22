"use client";

import Link from "next/link";

import { useSettings } from "@/hooks/use-settings";

import { SettingsBlock } from "@/components/ui/settings-block";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// Booking Rules Component
export function BookingRulesCard() {
  const t = useSettingsText().section("booking-rules");
  // The employee shell renders this same component, so the link has to be
  // built for whichever portal is asking — an absolute /facility/… href is a
  // silent redirect to the schedule for anyone who is not a facility admin.
  const settingsPath = useSettingsHref();
  const { rules, updateRules } = useSettings();

  return (
    <SettingsBlock title={t("rulesTitle")} data={rules} onSave={updateRules}>
      {(isEditing, localRules, setLocalRules) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("minAdvance")}</Label>
              <Input
                type="number"
                value={localRules.minimumAdvanceBooking}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    minimumAdvanceBooking: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("maxAdvance")}</Label>
              <Input
                type="number"
                value={localRules.maximumAdvanceBooking}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    maximumAdvanceBooking: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("depositPercentage")}</Label>
              <Input
                type="number"
                value={localRules.depositPercentage}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    depositPercentage: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("facilityCapacity")}</Label>
              <Input
                type="number"
                value={localRules.capacityLimit}
                onChange={(e) =>
                  setLocalRules({
                    ...localRules,
                    capacityLimit: parseInt(e.target.value),
                  })
                }
                readOnly={!isEditing}
                className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("dailyCapacity")}</Label>
            <Input
              type="number"
              value={localRules.dailyCapacityLimit}
              onChange={(e) =>
                setLocalRules({
                  ...localRules,
                  dailyCapacityLimit: parseInt(e.target.value),
                })
              }
              readOnly={!isEditing}
              className={!isEditing ? "cursor-not-allowed bg-gray-100" : ""}
            />
          </div>

          {/* ── CANCELLATION LEFT THIS CARD ────────────────────────────
              Two number fields here — a notice window and a fee percentage —
              were one of FOUR places the product modelled a cancellation
              policy, and the only one the database read. They are now the
              FALLBACK that `private.cancellation_terms` uses when a facility
              has written no policy, which is not something to edit in a
              second place: a facility that sets 24 hours here and a 72-hour
              tier next door has two answers to one question.

              Deliberately NOT showing the stored numbers. Once a policy
              exists they decide nothing, and a value displayed after it stops
              deciding anything is exactly the inert switch this round of work
              set out to remove. The cancellation screen seeds itself from
              them, so nothing is lost and there is one place to look. */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <div className="font-medium">{t("cancellationMoved")}</div>
              <div className="text-muted-foreground text-sm">
                {t("cancellationMovedHelp")}
              </div>
            </div>
            <Link
              href={settingsPath("cancellation-policies")}
              className="text-primary shrink-0 font-medium hover:underline"
            >
              {t("cancellationMovedLink")}
            </Link>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">{t("requireDeposit")}</div>
              <div className="text-muted-foreground text-sm">
                {t("requireDepositHelp")}
              </div>
            </div>
            <Switch
              checked={localRules.depositRequired}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalRules({ ...localRules, depositRequired: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">{t("allowOverbooking")}</div>
              <div className="text-muted-foreground text-sm">
                {t("allowOverbookingHelp")}
              </div>
            </div>
            <Switch
              checked={localRules.allowOverBooking}
              disabled={!isEditing}
              onCheckedChange={(checked) =>
                setLocalRules({ ...localRules, allowOverBooking: checked })
              }
            />
          </div>
        </div>
      )}
    </SettingsBlock>
  );
}
