"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { clients } from "@/data/clients";
import { clientDocuments } from "@/data/documents";
import {
  BoardingBookingRequest,
  BOARDING_ROOMS,
  PaymentStatus,
  PreCheckAuditEvent,
  YipyyGoPreCheckForm,
} from "@/data/boarding-ops";
import { PetEligibilityList, EligibilityRow } from "./PetEligibilityList";
import { RoomAssignmentBoard, RoomAssignments } from "./RoomAssignmentBoard";
import { PreCheckReviewPanel } from "./PreCheckReviewPanel";
import { Check, X, DollarSign, Calendar, AlertTriangle } from "lucide-react";
import type { Evaluation, Pet } from "@/lib/types";

function getLatestEvaluation(pet?: Pet): Evaluation | null {
  const evals = pet?.evaluations ?? [];
  if (!evals.length) return null;
  const toTime = (e: Evaluation) => {
    const t = e.evaluatedAt ? Date.parse(e.evaluatedAt) : Number.NaN;
    return Number.isFinite(t) ? t : 0;
  };
  return [...evals].sort((a, b) => toTime(b) - toTime(a))[0];
}

function hasValidVaccination(petId: number) {
  const docs = clientDocuments.filter(
    (d) => d.petId === petId && d.type === "vaccination",
  );
  if (docs.length === 0) return false;
  // keep it simple: any vaccination doc counts as present
  return true;
}

function paymentBadge(status: PaymentStatus) {
  if (status === "paid") return <Badge variant="success">Paid</Badge>;
  if (status === "partial") return <Badge variant="secondary">Partial</Badge>;
  if (status === "deposit") return <Badge variant="warning">Deposit</Badge>;
  return <Badge variant="destructive">Unpaid</Badge>;
}

export function BoardingRequestDialog({
  open,
  request,
  onOpenChange,
  onUpdateRequest,
}: {
  open: boolean;
  request: BoardingBookingRequest | null;
  onOpenChange: (open: boolean) => void;
  onUpdateRequest: (next: BoardingBookingRequest) => void;
}) {
  const [allowOverride, setAllowOverride] = useState(false);
  const [assignments, setAssignments] = useState<RoomAssignments>({});
  const [workingPreCheck, setWorkingPreCheck] = useState<YipyyGoPreCheckForm | null>(
    null,
  );
  const [staffPaymentNote, setStaffPaymentNote] = useState("");

  const eligibilityRows: EligibilityRow[] = useMemo(() => {
    if (!request) return [];
    return request.pets.map((p) => {
      const client = clients.find((c) => c.id === request.clientId);
      const pet = client?.pets.find((x) => x.id === p.petId);
      const latest = getLatestEvaluation(pet);

      const reasons: string[] = [];
      let evalIndicator: EligibilityRow["evaluationIndicator"];

      if (!hasValidVaccination(p.petId)) {
        reasons.push("Missing vaccination record");
      }

      if (p.evaluationRequired) {
        if (!latest) {
          reasons.push("Missing evaluation");
          evalIndicator = "missing";
        } else if (latest.isExpired) {
          reasons.push("Evaluation expired");
          evalIndicator = "expired";
        } else if (latest.status === "failed") {
          reasons.push("Evaluation failed");
          evalIndicator = "failed";
        } else if (latest.status !== "passed") {
          reasons.push(`Evaluation status: ${latest.status}`);
          evalIndicator = "failed";
        } else {
          evalIndicator = "valid";
        }
      }

      const eligible = reasons.length === 0;

      return {
        petId: p.petId,
        petName: p.petName,
        petType: p.petType,
        breed: p.breed,
        eligible,
        reasons,
        evaluationRequired: p.evaluationRequired,
        evaluationIndicator: evalIndicator,
      };
    });
  }, [request]);

  const assignablePets = useMemo(() => {
    return eligibilityRows.map((r) => ({
      petId: r.petId,
      petName: r.petName,
      petType: r.petType,
      eligible: r.eligible,
      reason: r.reasons[0],
    }));
  }, [eligibilityRows]);

  const auditColumns: ColumnDef<PreCheckAuditEvent>[] = useMemo(
    () => [
      { key: "at", label: "At", sortable: true, render: (e) => new Date(e.at).toLocaleString() },
      { key: "actorType", label: "Type", sortable: true, render: (e) => <Badge variant="outline" className="capitalize">{e.actorType}</Badge> },
      { key: "actorName", label: "Actor", sortable: true },
      { key: "action", label: "Action", sortable: true },
    ],
    [],
  );

  const ensureWorkingState = () => {
    if (!request) return;
    if (!workingPreCheck) setWorkingPreCheck(request.preCheck);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) ensureWorkingState();
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[98vw] max-w-none sm:max-w-none max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="truncate">Boarding Request • {request?.id}</span>
            {request ? paymentBadge(request.paymentStatus) : null}
          </DialogTitle>
          <DialogDescription>
            Staff review: eligibility, schedule, room assignment, add-ons, payment, and PreCheck.
          </DialogDescription>
        </DialogHeader>

        {!request ? (
          <div className="text-sm text-muted-foreground">No request selected.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Overview</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Client</div>
                    <div className="font-medium">{request.clientName}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Check-in / out
                    </div>
                    <div className="font-medium">
                      {request.checkInDate} → {request.checkOutDate}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">PreCheck</div>
                    <div className="font-medium capitalize">{request.preCheck.status.replace("-", " ")}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {eligibilityRows.some((r) => !r.eligible) ? (
                    <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-2">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                      <div>
                        <div className="font-medium">Eligibility issues</div>
                        <div className="text-xs text-muted-foreground">
                          Some pets are blocked. Fix before accepting.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-xs">
                      No eligibility warnings.
                    </div>
                  )}
                  {request.preCheck.status === "not-submitted" && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                      <div>
                        <div className="font-medium">PreCheck missing</div>
                        <div className="text-xs text-muted-foreground">
                          Staff can add details or request submission.
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="eligibility" className="space-y-4">
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
                <TabsTrigger value="rooms">Rooms</TabsTrigger>
                <TabsTrigger value="add-ons">Add-ons & Instructions</TabsTrigger>
                <TabsTrigger value="payment">Payment</TabsTrigger>
                <TabsTrigger value="precheck">PreCheck</TabsTrigger>
              </TabsList>

              <TabsContent value="eligibility" className="space-y-4">
                <PetEligibilityList rows={eligibilityRows} />
              </TabsContent>

              <TabsContent value="rooms" className="space-y-4">
                <RoomAssignmentBoard
                  rooms={BOARDING_ROOMS}
                  pets={assignablePets}
                  assignments={assignments}
                  allowOverride={allowOverride}
                  onToggleOverride={setAllowOverride}
                  onAssign={(petId, roomId) => {
                    setAssignments((prev) => {
                      const next: RoomAssignments = {};
                      // remove from any room
                      Object.keys(prev).forEach((rid) => {
                        next[rid] = (prev[rid] ?? []).filter((id) => id !== petId);
                      });
                      // add to target
                      next[roomId] = [...(next[roomId] ?? []), petId];
                      return next;
                    });
                  }}
                  onUnassign={(petId) => {
                    setAssignments((prev) => {
                      const next: RoomAssignments = {};
                      Object.keys(prev).forEach((rid) => {
                        next[rid] = (prev[rid] ?? []).filter((id) => id !== petId);
                      });
                      return next;
                    });
                  }}
                />
              </TabsContent>

              <TabsContent value="add-ons" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Add-ons (per pet)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {request.pets.map((p) => {
                      const addOns = request.addOnsByPetId[p.petId] ?? [];
                      return (
                        <div key={p.petId} className="rounded-md border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">
                              {p.petName}{" "}
                              <span className="text-muted-foreground font-normal">
                                ({p.breed})
                              </span>
                            </div>
                            <Badge variant="outline">{addOns.length} add-ons</Badge>
                          </div>
                          <div className="mt-2 grid gap-2">
                            {addOns.length === 0 ? (
                              <div className="text-xs text-muted-foreground">
                                None selected.
                              </div>
                            ) : (
                              addOns.map((a) => (
                                <div
                                  key={a.id}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <div>
                                    {a.name}{" "}
                                    <span className="text-muted-foreground">
                                      × {a.quantity}
                                    </span>
                                  </div>
                                  <div className="font-medium">
                                    ${a.unitPrice}
                                    {a.unit === "day" ? "/day" : ""}{" "}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Staff-editable instructions</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Feeding</div>
                      <Textarea placeholder="Staff edits override customer notes..." />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Medication</div>
                      <Textarea placeholder="Staff edits override customer notes..." />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <div className="text-sm font-medium">Internal staff notes</div>
                      <Textarea placeholder="Internal notes..." />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payment" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Payment & Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className="mt-1">{paymentBadge(request.paymentStatus)}</div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Estimate: <span className="font-medium text-foreground">${request.totalEstimate}</span>
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Tip</div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="text-sm font-medium">$</div>
                        <Input defaultValue={String(request.tipAmount)} className="max-w-[160px]" />
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Staff can adjust tip for in-person checkout.
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <div className="text-sm font-medium">Payment note</div>
                      <Textarea
                        value={staffPaymentNote}
                        onChange={(e) => setStaffPaymentNote(e.target.value)}
                        placeholder="Internal payment note..."
                      />
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" className="flex-1">
                          <DollarSign className="h-4 w-4 mr-2" />
                          Process in-person
                        </Button>
                        <Button type="button" className="flex-1">
                          <DollarSign className="h-4 w-4 mr-2" />
                          Process online
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="precheck" className="space-y-4">
                <PreCheckReviewPanel
                  form={workingPreCheck ?? request.preCheck}
                  onChange={(next) => setWorkingPreCheck(next)}
                  onApprove={() => {
                    const auditEvent: PreCheckAuditEvent = {
                      id: `ae-${Date.now()}`,
                      at: new Date().toISOString(),
                      actorType: "staff",
                      actorName: "Staff User",
                      action: "Approved PreCheck",
                    };
                    const next = {
                      ...(workingPreCheck ?? request.preCheck),
                      status: "approved" as const,
                      approvedAt: new Date().toISOString(),
                      audit: [
                        ...(workingPreCheck ?? request.preCheck).audit,
                        auditEvent,
                      ],
                    };
                    setWorkingPreCheck(next);
                  }}
                  onRequestCorrections={() => {
                    const auditEvent: PreCheckAuditEvent = {
                      id: `ae-${Date.now()}`,
                      at: new Date().toISOString(),
                      actorType: "staff",
                      actorName: "Staff User",
                      action: "Requested corrections",
                      details: "Customer needs to update PreCheck fields.",
                    };
                    const next = {
                      ...(workingPreCheck ?? request.preCheck),
                      status: "corrections-requested" as const,
                      audit: [
                        ...(workingPreCheck ?? request.preCheck).audit,
                        auditEvent,
                      ],
                    };
                    setWorkingPreCheck(next);
                  }}
                />
              </TabsContent>
            </Tabs>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Request Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    onUpdateRequest({ ...request, status: "declined" });
                    onOpenChange(false);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!allowOverride && eligibilityRows.some((r) => !r.eligible)}
                  onClick={() => {
                    const preCheck = workingPreCheck ?? request.preCheck;
                    onUpdateRequest({
                      ...request,
                      status: "accepted",
                      preCheck,
                    });
                    onOpenChange(false);
                  }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </Button>
              </CardContent>
              {!allowOverride && eligibilityRows.some((r) => !r.eligible) && (
                <div className="px-6 pb-6 text-xs text-muted-foreground">
                  Accept is disabled until eligibility issues are resolved (or override is enabled).
                </div>
              )}
            </Card>
          </div>
        )}

        {request ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

