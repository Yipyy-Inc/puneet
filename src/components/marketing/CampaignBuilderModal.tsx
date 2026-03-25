"use client";

import { useState } from "react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Stepper,
  StepperContent,
  StepperNavigation,
} from "@/components/ui/stepper";
import {
  Send,
  TestTube2,
  Plus,
  CalendarPlus,
  Scissors,
  Package,
  Gift,
  Sparkles,
  Mail,
  Users,
  Clock,
  Repeat,
  ChevronRight,
} from "lucide-react";
import {
  emailTemplates,
  customerSegments,
  CAMPAIGN_GOALS,
  facilityBranding,
  EMAIL_USE_CASE_LABELS,
  type Campaign,
  type CampaignGoal,
} from "@/data/marketing";
import { getContrastTextColor } from "@/lib/color-utils";
import { clients } from "@/data/clients";

interface CampaignBuilderModalProps {
  campaign?: Campaign | null;
  onClose: () => void;
}

const STEPS = [
  { id: "goal", title: "Goal", description: "Campaign objective" },
  { id: "audience", title: "Audience", description: "Select recipients" },
  { id: "content", title: "Content", description: "Choose template" },
  { id: "send", title: "Send", description: "Review & launch" },
];

const GOAL_ICONS: Record<string, typeof Mail> = {
  CalendarPlus,
  Scissors,
  Package,
  Gift,
  Sparkles,
  Mail,
};

const TEMPLATES_BY_USE_CASE = (() => {
  const groups: Record<string, typeof emailTemplates> = {};
  for (const tpl of emailTemplates) {
    const key = tpl.useCase || "other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(tpl);
  }
  return groups;
})();

const SAMPLE_RECIPIENTS = clients.slice(0, 5).map((c) => c.name);
const BRAND_TEXT_COLOR = getContrastTextColor(facilityBranding.primaryColor);
const EMPTY_OVERRIDES = { subject: "", body: "", offerHeadline: "", offerCode: "", buttonText: "", buttonLink: "" };

const SEND_OPTIONS = [
  { value: "now" as const, icon: Send, label: "Send Now", desc: "Campaign will be sent immediately" },
  { value: "schedule" as const, icon: Clock, label: "Schedule", desc: "Pick a date and time" },
  { value: "recurring" as const, icon: Repeat, label: "Recurring", desc: "Send on a regular schedule" },
] as const;

export function CampaignBuilderModal({ campaign, onClose }: CampaignBuilderModalProps) {
  const isViewing = !!campaign;

  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState(campaign?.name || "");
  const [campaignType, setCampaignType] = useState<"email" | "sms">(campaign?.type || "email");
  const [goal, setGoal] = useState<CampaignGoal | "">(campaign?.goal || "");
  const [segmentId, setSegmentId] = useState(campaign?.segmentId || "");
  const [templateId, setTemplateId] = useState(campaign?.templateId || "");

  const [overrides, setOverrides] = useState(EMPTY_OVERRIDES);
  const [sendOption, setSendOption] = useState<"now" | "schedule" | "recurring">(
    campaign?.scheduledAt ? "schedule" : "now"
  );
  const [scheduledAt, setScheduledAt] = useState(campaign?.scheduledAt || "");
  const [recurringFreq, setRecurringFreq] = useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [abTestEnabled, setAbTestEnabled] = useState(campaign?.abTest?.enabled || false);
  const [abVariantB, setAbVariantB] = useState(campaign?.abTest?.variantB || "");
  const [abSplit, setAbSplit] = useState(campaign?.abTest?.splitPercentage || 50);

  const selectedSegment = customerSegments.find((s) => s.id === segmentId);
  const selectedTemplate = emailTemplates.find((t) => t.id === templateId);
  const suggestedSegmentIds = goal ? CAMPAIGN_GOALS.find((g) => g.value === goal)?.suggestedSegments || [] : [];
  const stats = campaign?.stats;

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true;
      case 1: return !!segmentId && !!name;
      case 2: return !!templateId;
      case 3: return sendOption !== "schedule" || !!scheduledAt;
      default: return true;
    }
  };

  const handleComplete = () => {
    console.log("Campaign created:", {
      name, type: campaignType, goal, segmentId, templateId, overrides, sendOption, scheduledAt,
      recurringFreq: sendOption === "recurring" ? recurringFreq : undefined,
      abTest: abTestEnabled ? { variantB: abVariantB, split: abSplit } : undefined,
    });
    onClose();
  };

  // VIEWING MODE
  if (isViewing && stats) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Campaign: {campaign.name}</DialogTitle>
          <DialogDescription>
            {campaign.goal && (
              <Badge variant="outline" className="mr-2 capitalize">
                {campaign.goal.replace(/_/g, " ")}
              </Badge>
            )}
            {campaign.status === "sent" ? `Sent on ${new Date(campaign.sentAt!).toLocaleDateString()}` : campaign.status}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>{" "}
              <span className="font-medium capitalize">{campaign.type}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Template:</span>{" "}
              <span className="font-medium">{emailTemplates.find((t) => t.id === campaign.templateId)?.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Segment:</span>{" "}
              <span className="font-medium">{customerSegments.find((s) => s.id === campaign.segmentId)?.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              <Badge variant={campaign.status === "sent" ? "default" : "secondary"} className="capitalize ml-1">
                {campaign.status}
              </Badge>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Sent</div>
                  <div className="text-2xl font-bold">{stats.sent}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Delivered</div>
                  <div className="text-2xl font-bold">{stats.delivered}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Opened</div>
                  <div className="text-2xl font-bold">
                    {stats.opened}
                    {stats.sent > 0 && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({((stats.opened / stats.sent) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Clicked</div>
                  <div className="text-2xl font-bold">
                    {stats.clicked}
                    {stats.opened > 0 && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({((stats.clicked / stats.opened) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Bounced</div>
                  <div className="text-2xl font-bold">{stats.bounced}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Unsubscribed</div>
                  <div className="text-2xl font-bold">{stats.unsubscribed}</div>
                </div>
              </div>
              {campaign.abTest?.winner && (
                <div className="mt-4 pt-4 border-t">
                  <Badge variant="default">
                    A/B Test Winner: Variant {campaign.abTest.winner}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </>
    );
  }

  // CREATE MODE — 4-step wizard
  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Campaign</DialogTitle>
        <DialogDescription>
          Build and send targeted email or SMS campaigns
        </DialogDescription>
      </DialogHeader>

      <Stepper steps={STEPS} currentStep={currentStep} onStepChange={setCurrentStep} />

      <ScrollArea className="max-h-[55vh]">
        <StepperContent className="py-4 pr-4">
          {/* STEP 1: Goal */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <Label className="text-sm text-muted-foreground">
                What&apos;s the objective? (optional — helps suggest segments)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Campaign goal">
                {CAMPAIGN_GOALS.map((g) => {
                  const Icon = GOAL_ICONS[g.icon] || Mail;
                  const isSelected = goal === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`text-left rounded-lg border p-4 transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border"}`}
                      onClick={() => setGoal(isSelected ? "" : g.value)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{g.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{g.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Audience */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., March Grooming Rebook"
                />
              </div>

              {suggestedSegmentIds.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Suggested for this goal:</Label>
                  <div className="flex gap-2 flex-wrap">
                    {suggestedSegmentIds.map((sid) => {
                      const seg = customerSegments.find((s) => s.id === sid);
                      if (!seg) return null;
                      return (
                        <Button
                          key={sid}
                          variant={segmentId === sid ? "default" : "outline"}
                          size="sm"
                          className="h-auto py-1 px-2.5 text-xs"
                          onClick={() => setSegmentId(sid)}
                        >
                          {seg.name} ({seg.customerCount})
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Select Segment *</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={segmentId} onValueChange={setSegmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a customer segment..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customerSegments.map((seg) => (
                          <SelectItem key={seg.id} value={seg.id}>
                            {seg.name} ({seg.customerCount} customers)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      console.log("Open segment builder — in production this opens the SegmentBuilderModal inline or as a nested dialog");
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    New Segment
                  </Button>
                </div>
              </div>

              {selectedSegment && (
                <Card className="bg-muted/30">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{selectedSegment.name}</span>
                      <Badge>
                        <Users className="h-3 w-3 mr-1" />
                        {selectedSegment.customerCount} recipients
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedSegment.description}</p>
                    <div className="mt-2 pt-2 border-t border-muted">
                      <span className="text-xs text-muted-foreground">Sample recipients: </span>
                      <span className="text-xs">{SAMPLE_RECIPIENTS.join(", ")}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* STEP 3: Content */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Type</Label>
                <div className="flex gap-2">
                  <Button
                    variant={campaignType === "email" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCampaignType("email")}
                    aria-pressed={campaignType === "email"}
                  >
                    <Mail className="h-3.5 w-3.5 mr-1" /> Email
                  </Button>
                  <Button
                    variant={campaignType === "sms" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCampaignType("sms")}
                    aria-pressed={campaignType === "sms"}
                  >
                    SMS
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Choose Template *</Label>
                <Select value={templateId} onValueChange={(v) => { setTemplateId(v); setOverrides(EMPTY_OVERRIDES); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATES_BY_USE_CASE).map(([useCase, templates]) => (
                      <SelectGroup key={useCase}>
                        <SelectLabel>{EMAIL_USE_CASE_LABELS[useCase as keyof typeof EMAIL_USE_CASE_LABELS] || useCase}</SelectLabel>
                        {templates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <>
                  {/* Editable fields */}
                  <div className="space-y-2">
                    <Label className="text-sm">Subject Line</Label>
                    <Input
                      value={overrides.subject || selectedTemplate.subject}
                      onChange={(e) => setOverrides((p) => ({ ...p, subject: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Email Body</Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      rows={4}
                      value={overrides.body || selectedTemplate.body}
                      onChange={(e) => setOverrides((p) => ({ ...p, body: e.target.value }))}
                    />
                  </div>

                  {/* Offer section editing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Offer Headline</Label>
                      <Input
                        className="h-8 text-sm"
                        value={overrides.offerHeadline || selectedTemplate.offerSection?.headline || ""}
                        onChange={(e) => setOverrides((p) => ({ ...p, offerHeadline: e.target.value }))}
                        placeholder="e.g., Special Offer"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Promo Code</Label>
                      <Input
                        className="h-8 text-sm font-mono uppercase"
                        value={overrides.offerCode || selectedTemplate.offerSection?.code || ""}
                        onChange={(e) => setOverrides((p) => ({ ...p, offerCode: e.target.value }))}
                        placeholder="e.g., SAVE20"
                      />
                    </div>
                  </div>

                  {/* CTA button editing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Button Text</Label>
                      <Input
                        className="h-8 text-sm"
                        value={overrides.buttonText || selectedTemplate.buttonText || ""}
                        onChange={(e) => setOverrides((p) => ({ ...p, buttonText: e.target.value }))}
                        placeholder="e.g., Book Now"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Button Link</Label>
                      <Input
                        className="h-8 text-sm"
                        value={overrides.buttonLink || selectedTemplate.buttonLink || ""}
                        onChange={(e) => setOverrides((p) => ({ ...p, buttonLink: e.target.value }))}
                        placeholder="e.g., {{booking_link}}"
                      />
                    </div>
                  </div>

                  {/* Branded mini preview */}
                  <Card className="overflow-hidden">
                    <div className="h-1.5" style={{ backgroundColor: facilityBranding.primaryColor }} />
                    <CardContent className="py-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: facilityBranding.primaryColor, color: BRAND_TEXT_COLOR }}
                        >
                          {facilityBranding.fromName.charAt(0)}
                        </div>
                        {facilityBranding.fromName}
                      </div>
                      <div className="text-sm font-medium">{overrides.subject || selectedTemplate.subject}</div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                        {overrides.body || selectedTemplate.body}
                      </div>
                      {(overrides.offerHeadline || selectedTemplate.offerSection) && (
                        <div className="text-center py-2 rounded bg-muted/50 text-xs">
                          <span className="font-semibold">{overrides.offerHeadline || selectedTemplate.offerSection?.headline}</span>
                          {(overrides.offerCode || selectedTemplate.offerSection?.code) && (
                            <span className="ml-2 font-mono">{overrides.offerCode || selectedTemplate.offerSection?.code}</span>
                          )}
                        </div>
                      )}
                      {(overrides.buttonText || selectedTemplate.buttonText) && (
                        <div className="text-center">
                          <span
                            className="inline-block px-4 py-1.5 rounded text-xs font-medium"
                            style={{ backgroundColor: facilityBranding.primaryColor, color: BRAND_TEXT_COLOR }}
                          >
                            {overrides.buttonText || selectedTemplate.buttonText}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* STEP 4: Send */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>When to send?</Label>
                <div className="space-y-2" role="radiogroup" aria-label="Send timing">
                  {SEND_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={sendOption === opt.value}
                      className={`w-full text-left rounded-lg border p-3 px-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${sendOption === opt.value ? "border-primary ring-1 ring-primary/20" : "border-border"}`}
                      onClick={() => setSendOption(opt.value)}
                    >
                      <div className="flex items-center gap-3">
                        <opt.icon className="h-4 w-4 shrink-0" />
                        <div>
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.desc}</div>
                        </div>
                      </div>
                      {opt.value === "schedule" && sendOption === "schedule" && (
                        <div className="mt-3 ml-7">
                          <Input
                            type="datetime-local"
                            value={scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 16) : ""}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            className="w-auto"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                      {opt.value === "recurring" && sendOption === "recurring" && (
                        <div className="mt-3 ml-7" onClick={(e) => e.stopPropagation()}>
                          <Select value={recurringFreq} onValueChange={(v: string) => setRecurringFreq(v as "weekly" | "biweekly" | "monthly")}>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Bi-weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* A/B Testing */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TestTube2 className="h-4 w-4" />
                    <CardTitle className="text-sm">A/B Testing (Optional)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="abTest"
                      checked={abTestEnabled}
                      onCheckedChange={(checked) => setAbTestEnabled(checked as boolean)}
                    />
                    <label htmlFor="abTest" className="text-sm cursor-pointer">
                      Enable A/B testing
                    </label>
                  </div>
                  {abTestEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs">Variant B Template</Label>
                        <Select value={abVariantB} onValueChange={setAbVariantB}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select alternative..." />
                          </SelectTrigger>
                          <SelectContent>
                            {emailTemplates.filter((t) => t.id !== templateId).map((tpl) => (
                              <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Split: {abSplit}% / {100 - abSplit}%</Label>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          step="10"
                          value={abSplit}
                          onChange={(e) => setAbSplit(parseInt(e.target.value))}
                          className="w-full accent-primary"
                          aria-label={`A/B test split: ${abSplit}% variant A, ${100 - abSplit}% variant B`}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Review Summary */}
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Review Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  {goal && (
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      <span className="text-muted-foreground">Goal:</span>
                      <span className="capitalize">{goal.replace(/_/g, " ")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">Campaign:</span>
                    <span>{name || "(unnamed)"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">Segment:</span>
                    <span>{selectedSegment?.name || "(none)"}</span>
                    {selectedSegment && (
                      <Badge variant="outline" className="text-xs">{selectedSegment.customerCount} recipients</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">Template:</span>
                    <span>{selectedTemplate?.name || "(none)"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">Send:</span>
                    <span>
                      {sendOption === "now" ? "Immediately" : sendOption === "schedule" ? `Scheduled: ${scheduledAt || "(pick date)"}` : `Recurring ${recurringFreq}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">Type:</span>
                    <span className="capitalize">{campaignType}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </StepperContent>
      </ScrollArea>

      <DialogFooter>
        <StepperNavigation
          currentStep={currentStep}
          totalSteps={STEPS.length}
          onNext={() => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))}
          onPrevious={() => setCurrentStep((s) => Math.max(s - 1, 0))}
          onComplete={handleComplete}
          canProceed={canProceed()}
          completeLabel={sendOption === "now" ? "Send Campaign" : sendOption === "schedule" ? "Schedule Campaign" : "Create Recurring"}
          nextLabel="Next"
          previousLabel="Back"
        />
      </DialogFooter>
    </>
  );
}
