"use client";

import { useState } from "react";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Calendar, TestTube2 } from "lucide-react";
import { emailTemplates, customerSegments } from "@/data/marketing";

interface CampaignBuilderModalProps {
  campaign?: any;
  onClose: () => void;
}

export function CampaignBuilderModal({ campaign, onClose }: CampaignBuilderModalProps) {
  const [formData, setFormData] = useState({
    name: campaign?.name || "",
    type: campaign?.type || "email",
    templateId: campaign?.templateId || "",
    segmentId: campaign?.segmentId || "",
    scheduledAt: campaign?.scheduledAt || "",
    abTestEnabled: campaign?.abTest?.enabled || false,
    abTestVariantB: campaign?.abTest?.variantB || "",
    abTestSplit: campaign?.abTest?.splitPercentage || 50,
  });

  const selectedTemplate = emailTemplates.find((t) => t.id === formData.templateId);
  const selectedSegment = customerSegments.find((s) => s.id === formData.segmentId);

  const handleSave = () => {
    console.log("Saving campaign:", formData);
    onClose();
  };

  const handleSend = () => {
    console.log("Sending campaign immediately:", formData);
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {campaign ? "View Campaign" : "Create Campaign"}
        </DialogTitle>
        <DialogDescription>
          Schedule email or SMS campaigns with optional A/B testing
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Campaign Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Campaign Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., February Newsletter"
            disabled={!!campaign}
          />
        </div>

        {/* Campaign Type */}
        <div className="space-y-2">
          <Label htmlFor="type">Campaign Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
            disabled={!!campaign}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Template Selection */}
        <div className="space-y-2">
          <Label htmlFor="template">Email Template *</Label>
          <Select
            value={formData.templateId}
            onValueChange={(value) => setFormData({ ...formData, templateId: value })}
            disabled={!!campaign}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {emailTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <div className="text-sm text-muted-foreground mt-2">
              Subject: {selectedTemplate.subject}
            </div>
          )}
        </div>

        {/* Segment Selection */}
        <div className="space-y-2">
          <Label htmlFor="segment">Customer Segment *</Label>
          <Select
            value={formData.segmentId}
            onValueChange={(value) => setFormData({ ...formData, segmentId: value })}
            disabled={!!campaign}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select segment" />
            </SelectTrigger>
            <SelectContent>
              {customerSegments.map((segment) => (
                <SelectItem key={segment.id} value={segment.id}>
                  {segment.name} ({segment.customerCount} customers)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSegment && (
            <div className="text-sm text-muted-foreground mt-2">
              {selectedSegment.description}
            </div>
          )}
        </div>

        {/* A/B Testing */}
        {!campaign && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5" />
                <CardTitle className="text-base">A/B Testing (Optional)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="abTest"
                  checked={formData.abTestEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, abTestEnabled: checked as boolean })
                  }
                />
                <label
                  htmlFor="abTest"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Enable A/B testing
                </label>
              </div>

              {formData.abTestEnabled && (
                <>
                  <div className="space-y-2">
                    <Label>Variant A (Main Template)</Label>
                    <Input
                      value={selectedTemplate?.name || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Variant B (Alternative Template)</Label>
                    <Select
                      value={formData.abTestVariantB}
                      onValueChange={(value) =>
                        setFormData({ ...formData, abTestVariantB: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select alternative template" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailTemplates
                          .filter((t) => t.id !== formData.templateId)
                          .map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Split Percentage: {formData.abTestSplit}% / {100 - formData.abTestSplit}%</Label>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="10"
                      value={formData.abTestSplit}
                      onChange={(e) =>
                        setFormData({ ...formData, abTestSplit: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Variant A: {formData.abTestSplit}%</span>
                      <span>Variant B: {100 - formData.abTestSplit}%</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Schedule */}
        <div className="space-y-2">
          <Label htmlFor="schedule">
            <Calendar className="h-4 w-4 inline mr-2" />
            Schedule Send Time
          </Label>
          <Input
            id="schedule"
            type="datetime-local"
            value={formData.scheduledAt ? new Date(formData.scheduledAt).toISOString().slice(0, 16) : ""}
            onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
            disabled={!!campaign}
          />
          <p className="text-sm text-muted-foreground">
            Leave empty to send immediately
          </p>
        </div>

        {/* Campaign Stats (if viewing existing campaign) */}
        {campaign && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Sent</div>
                  <div className="text-2xl font-bold">{campaign.stats.sent}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Delivered</div>
                  <div className="text-2xl font-bold">{campaign.stats.delivered}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Opened</div>
                  <div className="text-2xl font-bold">
                    {campaign.stats.opened}
                    <span className="text-sm text-muted-foreground ml-2">
                      ({((campaign.stats.opened / campaign.stats.sent) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Clicked</div>
                  <div className="text-2xl font-bold">
                    {campaign.stats.clicked}
                    <span className="text-sm text-muted-foreground ml-2">
                      ({((campaign.stats.clicked / campaign.stats.opened) * 100).toFixed(1)}%)
                    </span>
                  </div>
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
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          {campaign ? "Close" : "Cancel"}
        </Button>
        {!campaign && (
          <>
            {formData.scheduledAt ? (
              <Button
                onClick={handleSave}
                disabled={!formData.name || !formData.templateId || !formData.segmentId}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Campaign
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!formData.name || !formData.templateId || !formData.segmentId}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </Button>
            )}
          </>
        )}
      </DialogFooter>
    </>
  );
}

