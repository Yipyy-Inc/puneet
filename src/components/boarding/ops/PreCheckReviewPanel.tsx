"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { YipyyGoPreCheckForm, PreCheckAuditEvent } from "@/data/boarding-ops";
import { Check, QrCode, X, Plus, Clock } from "lucide-react";

function statusBadge(status: YipyyGoPreCheckForm["status"]) {
  if (status === "approved") return <Badge variant="success">Approved</Badge>;
  if (status === "submitted")
    return <Badge variant="secondary">Submitted</Badge>;
  if (status === "corrections-requested")
    return <Badge variant="destructive">Corrections requested</Badge>;
  return <Badge variant="warning">Not submitted</Badge>;
}

export function PreCheckReviewPanel({
  form,
  onChange,
  onApprove,
  onRequestCorrections,
}: {
  form: YipyyGoPreCheckForm;
  onChange: (next: YipyyGoPreCheckForm) => void;
  onApprove: () => void;
  onRequestCorrections: () => void;
}) {
  const [newBelonging, setNewBelonging] = useState("");

  const auditColumns: ColumnDef<PreCheckAuditEvent>[] = useMemo(
    () => [
      {
        key: "at",
        label: "Time",
        icon: Clock,
        sortable: true,
        render: (e) => new Date(e.at).toLocaleString(),
        sortValue: (e) => e.at,
      },
      {
        key: "actorType",
        label: "Actor",
        sortable: true,
        render: (e) => (
          <Badge variant="outline" className="capitalize">
            {e.actorType}
          </Badge>
        ),
      },
      { key: "actorName", label: "Name", sortable: true },
      { key: "action", label: "Action", sortable: true },
      {
        key: "details",
        label: "Details",
        defaultVisible: false,
        render: (e) => e.details ?? "—",
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">YipyyGo PreCheck</CardTitle>
              <div className="text-muted-foreground mt-1 text-xs">
                Staff can review, edit, approve, or request corrections.
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {statusBadge(form.status)}
              <Badge variant="outline" className="font-mono">
                <QrCode className="mr-1 inline h-3.5 w-3.5" />
                {form.qrCodeToken}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Belongings</div>
              <div className="grid gap-2">
                {form.belongings.length === 0 ? (
                  <div className="text-muted-foreground text-xs">
                    None listed.
                  </div>
                ) : (
                  form.belongings.map((item, idx) => (
                    <div
                      key={`${item}-${idx}`}
                      className="bg-muted/20 flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                    >
                      <div className="truncate text-sm">{item}</div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          const next = form.belongings.filter(
                            (_, i) => i !== idx,
                          );
                          onChange({ ...form, belongings: next });
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newBelonging}
                  onChange={(e) => setNewBelonging(e.target.value)}
                  placeholder="Add belonging..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const trimmed = newBelonging.trim();
                    if (!trimmed) return;
                    onChange({
                      ...form,
                      belongings: [...form.belongings, trimmed],
                    });
                    setNewBelonging("");
                  }}
                >
                  <Plus className="mr-2 size-4" />
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Staff Notes</div>
              <Textarea
                value={form.staffNotes}
                onChange={(e) =>
                  onChange({ ...form, staffNotes: e.target.value })
                }
                placeholder="Internal notes (not visible to customers)..."
                rows={6}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Feeding instructions</div>
              <Textarea
                value={form.feedingInstructions}
                onChange={(e) =>
                  onChange({ ...form, feedingInstructions: e.target.value })
                }
                placeholder="Feeding schedule, brand, amounts..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Medication instructions</div>
              <Textarea
                value={form.medicationInstructions}
                onChange={(e) =>
                  onChange({ ...form, medicationInstructions: e.target.value })
                }
                placeholder="Dosages, times, handling notes..."
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Behavior notes</div>
            <Textarea
              value={form.behaviorNotes}
              onChange={(e) =>
                onChange({ ...form, behaviorNotes: e.target.value })
              }
              placeholder="Behavior flags, triggers, handling guidance..."
              rows={4}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="destructive"
              className="sm:flex-1"
              onClick={onRequestCorrections}
            >
              <X className="mr-2 size-4" />
              Request corrections
            </Button>
            <Button
              type="button"
              variant="default"
              className="sm:flex-1"
              onClick={onApprove}
            >
              <Check className="mr-2 size-4" />
              Approve PreCheck
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Audit History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={form.audit}
            columns={auditColumns}
            searchKeys={["action", "actorName", "actorType"]}
            searchPlaceholder="Search audit..."
            itemsPerPage={5}
          />
        </CardContent>
      </Card>
    </div>
  );
}
