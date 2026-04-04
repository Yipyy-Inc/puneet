"use client";

import { useState } from "react";
import {
  Eye,
  Mail,
  Smartphone,
  LayoutTemplate,
  SlidersHorizontal,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/use-settings";
import { EvaluationResultCard } from "@/components/evaluations/EvaluationResultCard";
import type { EvaluationReportCardConfig } from "@/types/facility";
import type { EvaluationResultCardData } from "@/components/evaluations/EvaluationResultCard";

// ── Section toggles config ────────────────────────────────────────────────────

const SECTION_TOGGLES: Array<{
  key: keyof EvaluationReportCardConfig;
  label: string;
  description: string;
}> = [
  {
    key: "showEvaluatorName",
    label: "Evaluator name",
    description:
      "Show the name of the staff member who conducted the evaluation",
  },
  {
    key: "showEvaluationDate",
    label: "Evaluation date",
    description: "Show the date the evaluation took place",
  },
  {
    key: "showTemperament",
    label: "Temperament overview",
    description:
      "Dog-friendly, human-friendly, energy, anxiety and reactivity levels",
  },
  {
    key: "showPlayStyle",
    label: "Play style",
    description: "How the pet prefers to play with others",
  },
  {
    key: "showPlayGroup",
    label: "Play group assignment",
    description: "Which group the pet has been placed in",
  },
  {
    key: "showBehaviorTags",
    label: "Behavior tags",
    description: "Tags like 'food-motivated' or 'loves-fetch'",
  },
  {
    key: "showStaffNotes",
    label: "Staff notes",
    description: "The public-facing temperament notes written by staff",
  },
  {
    key: "showApprovedServices",
    label: "Unlocked services",
    description: "Show which services the pet is now approved for",
  },
];

// ── Preview mock data ─────────────────────────────────────────────────────────

const PREVIEW_DATA: EvaluationResultCardData = {
  petName: "Buddy",
  ownerName: "Alice Johnson",
  facilityName: "PawCare Facility",
  evaluatorName: "Emily Davis",
  evaluationDate: new Date().toISOString(),
  result: "pass",
  dogFriendly: "yes",
  humanFriendly: "yes",
  energyLevel: "high",
  anxietyLevel: "low",
  reactivity: "low",
  playStyle: "balanced",
  playGroup: "large",
  behaviorTags: ["food-motivated", "loves-fetch", "toy-driven"],
  staffNotes:
    "Buddy was a joy to work with. He settled quickly, engaged well with other dogs, and showed great recall.",
  approvedServices: { daycare: true, boarding: true, customApproved: [] },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function EvaluationReportCardBuilder() {
  const { evaluationReportCard, updateEvaluationReportCard } = useSettings();
  const [local, setLocal] =
    useState<EvaluationReportCardConfig>(evaluationReportCard);
  const [isEditing, setIsEditing] = useState(false);
  const [previewResult, setPreviewResult] = useState<"pass" | "fail">("pass");

  const handleSave = () => {
    updateEvaluationReportCard(local);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocal(evaluationReportCard);
    setIsEditing(false);
  };

  const set = <K extends keyof EvaluationReportCardConfig>(
    key: K,
    value: EvaluationReportCardConfig[K],
  ) => setLocal((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="rounded-xl border">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-200">
            <LayoutTemplate className="size-4 text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-semibold">Evaluation Result Card</p>
            <p className="text-muted-foreground text-xs">
              Customize the card sent to owners after an evaluation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="content" className="p-4">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="content" className="flex-1 gap-1.5">
            <SlidersHorizontal className="size-3.5" /> Content
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex-1 gap-1.5">
            <Mail className="size-3.5" /> Delivery
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex-1 gap-1.5">
            <Eye className="size-3.5" /> Preview
          </TabsTrigger>
        </TabsList>

        {/* ── Content tab ── */}
        <TabsContent value="content" className="space-y-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Enable result cards</p>
              <p className="text-muted-foreground text-xs">
                Send a result card to the pet owner after evaluation
              </p>
            </div>
            <Switch
              checked={local.enabled}
              disabled={!isEditing}
              onCheckedChange={(v) => set("enabled", v)}
            />
          </div>

          {/* Messages */}
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Messages
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Header message</Label>
              <Textarea
                rows={2}
                disabled={!isEditing}
                value={local.headerMessage}
                onChange={(e) => set("headerMessage", e.target.value)}
                placeholder="Opening line shown at the top of every card"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pass message</Label>
              <Textarea
                rows={3}
                disabled={!isEditing}
                value={local.passMessage}
                onChange={(e) => set("passMessage", e.target.value)}
                placeholder="Message shown when the pet passes evaluation"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fail message</Label>
              <Textarea
                rows={3}
                disabled={!isEditing}
                value={local.failMessage}
                onChange={(e) => set("failMessage", e.target.value)}
                placeholder="Message shown when the pet does not pass"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Footer note</Label>
              <Textarea
                rows={2}
                disabled={!isEditing}
                value={local.footerNote}
                onChange={(e) => set("footerNote", e.target.value)}
                placeholder="Closing message at the bottom of every card"
              />
            </div>
          </div>

          {/* Section toggles */}
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Sections to include
            </p>
            <div className="divide-y rounded-lg border">
              {SECTION_TOGGLES.map(({ key, label, description }) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-muted-foreground text-xs">
                      {description}
                    </p>
                  </div>
                  <Switch
                    checked={local[key] as boolean}
                    disabled={!isEditing}
                    onCheckedChange={(v) =>
                      set(key, v as EvaluationReportCardConfig[typeof key])
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Delivery tab ── */}
        <TabsContent value="delivery" className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Choose how the result card is delivered to the pet owner after the
            evaluation is submitted.
          </p>
          <div className="divide-y rounded-lg border">
            <div className="flex items-center justify-between px-3 py-3">
              <div className="flex items-center gap-2">
                <Mail className="text-muted-foreground size-4" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-muted-foreground text-xs">
                    Send the full card as an email to the owner
                  </p>
                </div>
              </div>
              <Switch
                checked={local.notifyViaEmail}
                disabled={!isEditing}
                onCheckedChange={(v) => set("notifyViaEmail", v)}
              />
            </div>
            <div className="flex items-center justify-between px-3 py-3">
              <div className="flex items-center gap-2">
                <Smartphone className="text-muted-foreground size-4" />
                <div>
                  <p className="text-sm font-medium">SMS</p>
                  <p className="text-muted-foreground text-xs">
                    Send a short result notification via text message
                  </p>
                </div>
              </div>
              <Switch
                checked={local.notifyViaSMS}
                disabled={!isEditing}
                onCheckedChange={(v) => set("notifyViaSMS", v)}
              />
            </div>
          </div>
        </TabsContent>

        {/* ── Preview tab ── */}
        <TabsContent value="preview" className="space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-xs">Preview as:</p>
            <div className="flex overflow-hidden rounded-md border text-xs">
              <button
                type="button"
                onClick={() => setPreviewResult("pass")}
                className={
                  previewResult === "pass"
                    ? "bg-primary text-primary-foreground px-3 py-1"
                    : "hover:bg-muted px-3 py-1"
                }
              >
                Passed
              </button>
              <button
                type="button"
                onClick={() => setPreviewResult("fail")}
                className={
                  previewResult === "fail"
                    ? "bg-primary text-primary-foreground px-3 py-1"
                    : "hover:bg-muted px-3 py-1"
                }
              >
                Not Approved
              </button>
            </div>
          </div>
          <EvaluationResultCard
            data={{ ...PREVIEW_DATA, result: previewResult }}
            config={local}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
