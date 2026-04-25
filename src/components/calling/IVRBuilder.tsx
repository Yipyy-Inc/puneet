"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Phone,
  Voicemail,
  Play,
  MessageSquare,
  Users,
  GripVertical,
  Plus,
  Trash2,
  ChevronRight,
  Hash,
  Music,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IVRConfig, IVRNode, IVRAction } from "@/types/calling";

const actionConfig: Record<
  IVRAction,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  route_staff: { label: "Route to Staff", icon: Users, color: "text-blue-600" },
  route_department: { label: "Route to Department", icon: Phone, color: "text-purple-600" },
  route_voicemail: { label: "Send to Voicemail", icon: Voicemail, color: "text-gray-600" },
  play_recording: { label: "Play Recording", icon: Play, color: "text-green-600" },
  send_sms: { label: "Send SMS Link", icon: MessageSquare, color: "text-teal-600" },
  submenu: { label: "Sub-Menu", icon: ChevronRight, color: "text-amber-600" },
  route_operator: { label: "Route to Operator", icon: Hash, color: "text-red-600" },
};

interface IVRBuilderProps {
  config: IVRConfig;
}

export function IVRBuilder({ config: initialConfig }: IVRBuilderProps) {
  const [config, setConfig] = useState<IVRConfig>(initialConfig);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const updateGreeting = (greeting: string) =>
    setConfig((c) => ({ ...c, greeting }));

  const updateAfterHours = (afterHoursMessage: string) =>
    setConfig((c) => ({ ...c, afterHoursMessage }));

  const toggleEnabled = (enabled: boolean) =>
    setConfig((c) => ({ ...c, enabled }));

  const updateNode = (id: string, patch: Partial<IVRNode>) =>
    setConfig((c) => ({
      ...c,
      nodes: c.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }));

  const addNode = () => {
    const usedKeys = new Set(config.nodes.map((n) => n.key));
    const nextKey =
      ["1","2","3","4","5","6","7","8","9","0","*","#"].find((k) => !usedKeys.has(k)) ?? "?";
    const newNode: IVRNode = {
      id: `node-${Date.now()}`,
      key: nextKey,
      label: "New Menu Option",
      action: "route_staff",
      destination: "",
    };
    setConfig((c) => ({ ...c, nodes: [...c.nodes, newNode] }));
    setEditingNode(newNode.id);
  };

  const removeNode = (id: string) =>
    setConfig((c) => ({ ...c, nodes: c.nodes.filter((n) => n.id !== id) }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sortedNodes = [...config.nodes].sort((a, b) => {
    const order = ["1","2","3","4","5","6","7","8","9","8","9","0","*","#","?"];
    return order.indexOf(a.key) - order.indexOf(b.key);
  });

  return (
    <div className="space-y-6">
      {/* IVR Status Bar */}
      <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className={cn("size-2.5 rounded-full", config.enabled ? "bg-green-500" : "bg-muted-foreground")} />
          <span className="font-semibold">IVR Auto-Attendant</span>
          <Badge variant={config.enabled ? "default" : "secondary"}>
            {config.enabled ? "Active" : "Disabled"}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-sm">Enabled</Label>
          <Switch checked={config.enabled} onCheckedChange={toggleEnabled} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Greeting & Settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Play className="size-4 text-green-600" />
                Main Greeting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={4}
                value={config.greeting}
                onChange={(e) => updateGreeting(e.target.value)}
                placeholder="Enter the greeting callers hear when they call…"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {config.greeting.length} characters · approx.{" "}
                {Math.ceil(config.greeting.split(" ").length / 2)}s read time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Voicemail className="size-4 text-gray-500" />
                After-Hours Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={3}
                value={config.afterHoursMessage ?? ""}
                onChange={(e) => updateAfterHours(e.target.value)}
                placeholder="Message played outside business hours…"
                className="text-sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Music className="size-4 text-purple-500" />
                Hold Music
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={config.holdMusic}
                onValueChange={(v) =>
                  setConfig((c) => ({
                    ...c,
                    holdMusic: v as IVRConfig["holdMusic"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No music (silence)</SelectItem>
                  <SelectItem value="jazz">Jazz — smooth background</SelectItem>
                  <SelectItem value="classical">Classical — elegant</SelectItem>
                  <SelectItem value="upbeat">Upbeat — energetic</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Right: Menu Nodes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Menu Options</h3>
            <Button size="sm" onClick={addNode} className="gap-1.5">
              <Plus className="size-4" />
              Add Option
            </Button>
          </div>

          {sortedNodes.length === 0 && (
            <div className="rounded-xl border border-dashed py-10 text-center text-muted-foreground">
              <Phone className="mx-auto mb-2 size-8 opacity-30" />
              <p className="text-sm">No menu options yet. Add one to get started.</p>
            </div>
          )}

          <div className="space-y-2">
            {sortedNodes.map((node) => {
              const cfg = actionConfig[node.action];
              const Icon = cfg.icon;
              const isEditing = editingNode === node.id;

              return (
                <div
                  key={node.id}
                  className={cn(
                    "rounded-xl border transition-all",
                    isEditing ? "border-primary/40 bg-primary/5 shadow-sm" : "bg-card",
                  )}
                >
                  {/* Collapsed row */}
                  <div
                    className="flex cursor-pointer items-center gap-3 p-3"
                    onClick={() =>
                      setEditingNode(isEditing ? null : node.id)
                    }
                  >
                    <GripVertical className="size-4 shrink-0 text-muted-foreground/40" />
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background font-bold text-base">
                      {node.key}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{node.label}</p>
                      <p className={cn("flex items-center gap-1 text-xs", cfg.color)}>
                        <Icon className="size-3" />
                        {cfg.label}
                        {node.destination && ` → ${node.destination}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground/50 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNode(node.id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  {/* Expanded editor */}
                  {isEditing && (
                    <div className="space-y-3 border-t px-3 pb-3 pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="mb-1 block text-xs">Key</Label>
                          <Select
                            value={node.key}
                            onValueChange={(v) => updateNode(node.id, { key: v })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["1","2","3","4","5","6","7","8","9","0","*","#"].map((k) => (
                                <SelectItem key={k} value={k}>Press {k}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="mb-1 block text-xs">Action</Label>
                          <Select
                            value={node.action}
                            onValueChange={(v) =>
                              updateNode(node.id, { action: v as IVRAction })
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(actionConfig) as IVRAction[]).map((a) => (
                                <SelectItem key={a} value={a}>
                                  {actionConfig[a].label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs">Label (spoken description)</Label>
                        <Input
                          className="h-8 text-sm"
                          value={node.label}
                          onChange={(e) => updateNode(node.id, { label: e.target.value })}
                        />
                      </div>
                      {(node.action === "route_staff" || node.action === "route_department" || node.action === "route_operator") && (
                        <div>
                          <Label className="mb-1 block text-xs">Destination</Label>
                          <Input
                            className="h-8 text-sm"
                            placeholder="e.g. Reception Team, Manager – Sophie R."
                            value={node.destination ?? ""}
                            onChange={(e) => updateNode(node.id, { destination: e.target.value })}
                          />
                        </div>
                      )}
                      {node.action === "play_recording" && (
                        <div>
                          <Label className="mb-1 block text-xs">Message to play</Label>
                          <Textarea
                            rows={2}
                            className="text-sm"
                            placeholder="Text that will be read aloud…"
                            value={node.message ?? ""}
                            onChange={(e) => updateNode(node.id, { message: e.target.value })}
                          />
                        </div>
                      )}
                      {node.action === "send_sms" && (
                        <div>
                          <Label className="mb-1 block text-xs">SMS message text</Label>
                          <Input
                            className="h-8 text-sm"
                            placeholder="Hi! Book here: https://…"
                            value={node.smsText ?? ""}
                            onChange={(e) => updateNode(node.id, { smsText: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleSave}
            variant={saved ? "default" : "default"}
          >
            <Save className="size-4" />
            {saved ? "Saved!" : "Save IVR Configuration"}
          </Button>
        </div>
      </div>
    </div>
  );
}
