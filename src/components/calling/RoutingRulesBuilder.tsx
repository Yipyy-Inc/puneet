"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ArrowRight,
  Info,
  PhoneForwarded,
  MessageSquareQuote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { staffMembers } from "@/data/staff";
import type {
  CallRoutingRule,
  RoutingField,
  RoutingTarget,
} from "@/types/calling";
import {
  ROUTING_FIELD_META,
  ROUTING_FIELD_OPTIONS,
  ROUTING_OPERATOR_LABEL,
  ROUTING_TARGET_LABEL,
  STAFF_GROUPS,
  CLIENT_TAG_OPTIONS,
  SERVICE_TYPE_OPTIONS,
  describeCondition,
  describeAction,
  makeDefaultRoutingRule,
  resetConditionForField,
  staffGroupName,
} from "@/lib/calling/routing-rules";

const ACTIVE_STAFF = staffMembers.filter((s) => s.isActive);
const staffName = (id?: string) =>
  staffMembers.find((s) => s.id === id)?.name ?? undefined;

export function RoutingRulesBuilder({ rules: seed }: { rules: CallRoutingRule[] }) {
  const [rules, setRules] = useState<CallRoutingRule[]>(() =>
    [...seed].sort((a, b) => a.priority - b.priority),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const patchRule = (id: string, patch: Partial<CallRoutingRule>) =>
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const patchCondition = (
    id: string,
    patch: Partial<CallRoutingRule["condition"]>,
  ) =>
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, condition: { ...r.condition, ...patch } } : r,
      ),
    );

  const patchAction = (id: string, patch: Partial<CallRoutingRule["action"]>) =>
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, action: { ...r.action, ...patch } } : r,
      ),
    );

  const addRule = () => {
    const id = `route-${Date.now()}`;
    setRules((prev) => [
      ...prev,
      makeDefaultRoutingRule(id, prev.length + 1),
    ]);
    setEditingId(id);
  };

  const removeRule = (id: string) =>
    setRules((prev) =>
      prev
        .filter((r) => r.id !== id)
        .map((r, i) => ({ ...r, priority: i + 1 })),
    );

  // Drag-to-reorder: dropping moves the dragged rule to the target slot and
  // renumbers every priority by its new position (1-based).
  const handleDrop = (targetId: string) => {
    setRules((prev) => {
      if (!dragId || dragId === targetId) return prev;
      const from = prev.findIndex((r) => r.id === dragId);
      const to = prev.findIndex((r) => r.id === targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((r, i) => ({ ...r, priority: i + 1 }));
    });
    setDragId(null);
    setDragOverId(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <PhoneForwarded className="size-4 text-indigo-600" />
              Smart Routing Rules
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Priority-based call routing from live CRM data
            </p>
          </div>
          <Button size="sm" onClick={addRule} className="gap-1.5">
            <Plus className="size-4" />
            Add Rule
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Evaluation order note */}
        <div className="flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-200">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            These rules run <strong>before</strong> the IVR menu. Calls are
            matched top-to-bottom — the first enabled rule that matches wins.
            Drag the handle to change priority.
          </span>
        </div>

        {rules.length === 0 && (
          <div className="rounded-xl border border-dashed py-10 text-center text-muted-foreground">
            <PhoneForwarded className="mx-auto mb-2 size-8 opacity-30" />
            <p className="text-sm">
              No routing rules yet. Add one to send the right calls to the right
              staff automatically.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {rules.map((rule) => {
            const isEditing = editingId === rule.id;
            const meta = ROUTING_FIELD_META[rule.condition.field];
            const isDragOver = dragOverId === rule.id && dragId !== rule.id;

            return (
              <div
                key={rule.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverId !== rule.id) setDragOverId(rule.id);
                }}
                onDrop={() => handleDrop(rule.id)}
                className={cn(
                  "rounded-xl border transition-all",
                  isEditing
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "bg-card",
                  isDragOver && "border-indigo-400 ring-1 ring-indigo-300",
                  !rule.enabled && "opacity-60",
                )}
              >
                {/* Collapsed row */}
                <div className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    draggable
                    onDragStart={() => setDragId(rule.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOverId(null);
                    }}
                    aria-label="Drag to reorder"
                    className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
                  >
                    <GripVertical className="size-4" />
                  </button>

                  <Badge
                    variant="outline"
                    className="shrink-0 tabular-nums"
                    title="Priority"
                  >
                    #{rule.priority}
                  </Badge>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingId(isEditing ? null : rule.id)
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-semibold">{rule.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate">
                        {describeCondition(rule.condition)}
                      </span>
                      <ArrowRight className="size-3 shrink-0" />
                      <span className="truncate font-medium text-foreground">
                        {describeAction(
                          rule.action,
                          staffName(rule.action.staffId),
                        )}
                      </span>
                      {rule.action.greeting && (
                        <MessageSquareQuote
                          className="size-3 shrink-0 text-indigo-500"
                          aria-label="Custom greeting"
                        />
                      )}
                    </p>
                  </button>

                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(enabled) =>
                      patchRule(rule.id, { enabled })
                    }
                    aria-label="Enable rule"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground/60"
                    onClick={() => setEditingId(isEditing ? null : rule.id)}
                    aria-label="Edit rule"
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        isEditing && "rotate-180",
                      )}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground/50 hover:text-destructive"
                    onClick={() => removeRule(rule.id)}
                    aria-label="Delete rule"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                {/* Expanded editor */}
                {isEditing && (
                  <div className="space-y-4 border-t px-3 pb-4 pt-3">
                    <div>
                      <Label className="mb-1 block text-xs">Rule name</Label>
                      <Input
                        className="h-8 text-sm"
                        value={rule.name}
                        onChange={(e) =>
                          patchRule(rule.id, { name: e.target.value })
                        }
                      />
                    </div>

                    {/* IF — condition */}
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        If the caller…
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div>
                          <Label className="mb-1 block text-xs">Field</Label>
                          <Select
                            value={rule.condition.field}
                            onValueChange={(v) =>
                              patchCondition(
                                rule.id,
                                resetConditionForField(v as RoutingField),
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROUTING_FIELD_OPTIONS.map((f) => (
                                <SelectItem key={f.value} value={f.value}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="mb-1 block text-xs">Operator</Label>
                          <Select
                            value={rule.condition.operator}
                            onValueChange={(v) =>
                              patchCondition(rule.id, {
                                operator: v as CallRoutingRule["condition"]["operator"],
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {meta.operators.map((op) => (
                                <SelectItem key={op} value={op}>
                                  {ROUTING_OPERATOR_LABEL[op]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="mb-1 block text-xs">Value</Label>
                          {meta.valueType === "none" ? (
                            <div className="flex h-8 items-center text-xs text-muted-foreground">
                              No value needed
                            </div>
                          ) : meta.valueType === "tag" ? (
                            <Select
                              value={rule.condition.value}
                              onValueChange={(v) =>
                                patchCondition(rule.id, { value: v })
                              }
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CLIENT_TAG_OPTIONS.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : meta.valueType === "service" ? (
                            <Select
                              value={rule.condition.value}
                              onValueChange={(v) =>
                                patchCondition(rule.id, { value: v })
                              }
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SERVICE_TYPE_OPTIONS.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="relative">
                              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                $
                              </span>
                              <Input
                                type="number"
                                min="0"
                                className="h-8 pl-5 text-sm"
                                value={rule.condition.value}
                                onChange={(e) =>
                                  patchCondition(rule.id, {
                                    value: e.target.value,
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* THEN — action */}
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Then route the call to…
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <Label className="mb-1 block text-xs">Destination</Label>
                          <Select
                            value={rule.action.routeTo}
                            onValueChange={(v) =>
                              patchAction(rule.id, {
                                routeTo: v as RoutingTarget,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                Object.keys(ROUTING_TARGET_LABEL) as RoutingTarget[]
                              ).map((t) => (
                                <SelectItem key={t} value={t}>
                                  {ROUTING_TARGET_LABEL[t]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {rule.action.routeTo === "staff_group" && (
                          <div>
                            <Label className="mb-1 block text-xs">
                              Staff group
                            </Label>
                            <Select
                              value={rule.action.staffGroupId ?? ""}
                              onValueChange={(v) =>
                                patchAction(rule.id, { staffGroupId: v })
                              }
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select group" />
                              </SelectTrigger>
                              <SelectContent>
                                {STAFF_GROUPS.map((g) => (
                                  <SelectItem key={g.id} value={g.id}>
                                    {g.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {rule.action.routeTo === "staff" && (
                          <div>
                            <Label className="mb-1 block text-xs">
                              Staff member
                            </Label>
                            <Select
                              value={rule.action.staffId ?? ""}
                              onValueChange={(v) =>
                                patchAction(rule.id, { staffId: v })
                              }
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select staff" />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTIVE_STAFF.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name} · {s.role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="mt-2">
                        <Label className="mb-1 block text-xs">
                          Custom greeting{" "}
                          <span className="text-muted-foreground">
                            (optional — played before connecting)
                          </span>
                        </Label>
                        <Textarea
                          rows={2}
                          className="text-sm"
                          placeholder="e.g. Welcome to Doggieville! We'll connect you with the right team…"
                          value={rule.action.greeting ?? ""}
                          onChange={(e) =>
                            patchAction(rule.id, {
                              greeting: e.target.value || undefined,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Plain-language summary */}
                    <div className="rounded-lg bg-background p-3 text-sm">
                      <span className="font-semibold text-indigo-600">If </span>
                      {describeCondition(rule.condition)}
                      <span className="font-semibold text-indigo-600">
                        {" "}
                        → then{" "}
                      </span>
                      {describeAction(rule.action, staffName(rule.action.staffId))}
                      {rule.action.routeTo === "staff_group" && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({staffGroupName(rule.action.staffGroupId)})
                        </span>
                      )}
                      .
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
