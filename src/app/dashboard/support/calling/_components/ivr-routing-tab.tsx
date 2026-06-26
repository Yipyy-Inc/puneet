"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Music, Phone, Play, Save, Voicemail } from "lucide-react";

import {
  HOLD_MUSIC_OPTIONS,
  defaultSupportIvrConfig,
} from "@/data/support-ivr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { HoldMusic, SupportIvrConfig } from "@/types/support-ivr";
import { IvrPreviewDialog } from "./ivr-preview-dialog";
import { MenuOptionsEditor } from "./menu-options-editor";
import { SmartRulesEditor } from "./smart-rules-editor";

export function IvrRoutingTab() {
  const [config, setConfig] = useState<SupportIvrConfig>(
    defaultSupportIvrConfig,
  );
  const [saved, setSaved] = useState(false);

  function patch(p: Partial<SupportIvrConfig>) {
    setConfig((c) => ({ ...c, ...p }));
  }
  function save() {
    setSaved(true);
    toast.success("IVR configuration saved");
    setTimeout(() => setSaved(false), 2000);
  }

  const words = config.greeting.trim()
    ? config.greeting.trim().split(/\s+/).length
    : 0;
  const readSec = Math.max(1, Math.round(words / 2.5));

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="bg-muted/30 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "size-2.5 rounded-full",
              config.enabled ? "bg-emerald-500" : "bg-muted-foreground",
            )}
          />
          <span className="font-semibold">IVR Auto-Attendant</span>
          <Badge variant={config.enabled ? "default" : "secondary"}>
            {config.enabled ? "Active" : "Disabled"}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="ivr-enabled" className="text-sm">
            Enabled
          </Label>
          <Switch
            id="ivr-enabled"
            checked={config.enabled}
            onCheckedChange={(v) => patch({ enabled: v })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Play className="size-4 text-emerald-600" />
                Main Greeting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                rows={4}
                value={config.greeting}
                onChange={(e) => patch({ greeting: e.target.value })}
                placeholder="Greeting callers hear when they call…"
                className="text-sm"
              />
              <p className="text-muted-foreground text-xs">
                {config.greeting.length} characters · ~{readSec}s read time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Voicemail className="size-4 text-slate-500" />
                After-Hours Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={3}
                value={config.afterHoursMessage}
                onChange={(e) => patch({ afterHoursMessage: e.target.value })}
                placeholder="Message played outside business hours…"
                className="text-sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Music className="size-4 text-violet-500" />
                Hold Music
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={config.holdMusic}
                onValueChange={(v) => patch({ holdMusic: v as HoldMusic })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOLD_MUSIC_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          <MenuOptionsEditor
            menu={config.menu}
            onChange={(menu) => patch({ menu })}
          />
          <SmartRulesEditor
            rules={config.rules}
            onChange={(rules) => patch({ rules })}
          />
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <IvrPreviewDialog
          config={config}
          trigger={
            <Button variant="outline">
              <Phone className="mr-2 size-4" />
              Preview IVR
            </Button>
          }
        />
        <Button onClick={save}>
          <Save className="mr-2 size-4" />
          {saved ? "Saved!" : "Save IVR Configuration"}
        </Button>
      </div>
    </div>
  );
}
