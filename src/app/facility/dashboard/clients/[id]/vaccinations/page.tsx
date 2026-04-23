"use client";

import { use, useState } from "react";
import { clients } from "@/data/clients";
import { vaccinationRecords } from "@/data/pet-data";
import { getVaccinationRules } from "@/data/vaccination-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  Syringe,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { VaccinationRecord } from "@/types/pet";

const MOCK_STAFF_NAME = "Sarah (Staff)";
const MOCK_STAFF_ID = 1;

type ReviewAction = "deny" | "exception";

interface ActiveReview {
  action: ReviewAction;
  note: string;
}

function getExpiryBadge(expiryDate: string, now: number) {
  const exp = new Date(expiryDate).getTime();
  const expired = exp < now;
  const expiringSoon = !expired && exp - now < 30 * 24 * 60 * 60 * 1000;
  if (expired) return { label: "Expired", variant: "destructive" as const };
  if (expiringSoon)
    return { label: "Expiring Soon", variant: "secondary" as const };
  return { label: "Current", variant: "outline" as const };
}

function StatusBadge({ status }: { status: VaccinationRecord["status"] }) {
  if (!status || status === "pending_review")
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="size-3" />
        Pending Review
      </Badge>
    );
  if (status === "approved")
    return (
      <Badge
        variant="default"
        className="gap-1 bg-emerald-600 hover:bg-emerald-700"
      >
        <CheckCircle2 className="size-3" />
        Approved
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="size-3" />
        Rejected
      </Badge>
    );
  if (status === "exception")
    return (
      <Badge
        variant="secondary"
        className="gap-1 border-amber-400 bg-amber-100 text-amber-800"
      >
        <ShieldAlert className="size-3" />
        Exception
      </Badge>
    );
  return null;
}

export default function ClientVaccinationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const client = clients.find((c) => c.id === parseInt(id, 10));
  const [now] = useState(() => Date.now());
  const [records, setRecords] = useState<VaccinationRecord[]>(() => {
    if (!client) return [];
    const petIds = client.pets.map((p) => p.id);
    return vaccinationRecords.filter((v) => petIds.includes(v.petId));
  });
  const [activeReviews, setActiveReviews] = useState<
    Record<string, ActiveReview | null>
  >({});

  if (!client) return null;

  const vaccinationRules = getVaccinationRules();

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const refreshRecords = () => {
    const petIds = client.pets.map((p) => p.id);
    setRecords([...vaccinationRecords.filter((v) => petIds.includes(v.petId))]);
  };

  const startReview = (id: string, action: ReviewAction) => {
    setActiveReviews((prev) => ({ ...prev, [id]: { action, note: "" } }));
  };

  const cancelReview = (id: string) => {
    setActiveReviews((prev) => ({ ...prev, [id]: null }));
  };

  const confirmApprove = (recordId: string) => {
    const record = vaccinationRecords.find((r) => r.id === recordId);
    if (!record) return;
    record.status = "approved";
    record.reviewedBy = MOCK_STAFF_NAME;
    record.reviewedById = MOCK_STAFF_ID;
    record.reviewedAt = new Date().toISOString();
    record.rejectionReason = undefined;
    record.exceptionReason = undefined;
    refreshRecords();
    toast.success(`${record.vaccineName} approved`);
  };

  const confirmDeny = (recordId: string) => {
    const review = activeReviews[recordId];
    const record = vaccinationRecords.find((r) => r.id === recordId);
    if (!record || !review) return;
    record.status = "rejected";
    record.reviewedBy = MOCK_STAFF_NAME;
    record.reviewedById = MOCK_STAFF_ID;
    record.reviewedAt = new Date().toISOString();
    record.rejectionReason = review.note || undefined;
    record.exceptionReason = undefined;
    refreshRecords();
    setActiveReviews((prev) => ({ ...prev, [recordId]: null }));
    toast.success(`${record.vaccineName} rejected`);
  };

  const confirmException = (recordId: string) => {
    const review = activeReviews[recordId];
    const record = vaccinationRecords.find((r) => r.id === recordId);
    if (!record || !review) return;
    record.status = "exception";
    record.reviewedBy = MOCK_STAFF_NAME;
    record.reviewedById = MOCK_STAFF_ID;
    record.reviewedAt = new Date().toISOString();
    record.exceptionReason = review.note || undefined;
    record.rejectionReason = undefined;
    refreshRecords();
    setActiveReviews((prev) => ({ ...prev, [recordId]: null }));
    toast.success(`Exception recorded for ${record.vaccineName}`);
  };

  const petsWithRecords = client.pets.filter((pet) =>
    records.some((r) => r.petId === pet.id),
  );

  const pendingCount = records.filter(
    (r) => !r.status || r.status === "pending_review",
  ).length;

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vaccinations</h2>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Clock className="size-3" />
            {pendingCount} pending review
          </Badge>
        )}
      </div>

      {records.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No vaccination records uploaded yet
        </p>
      ) : (
        petsWithRecords.map((pet) => {
          const petRecords = records.filter((r) => r.petId === pet.id);
          const petRules = vaccinationRules.filter(
            (r) => r.species.toLowerCase() === pet.type.toLowerCase(),
          );

          return (
            <Card key={pet.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Syringe className="text-muted-foreground size-4" />
                  {pet.name} — {pet.breed}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {petRecords.map((v) => {
                  const expiryBadge = getExpiryBadge(v.expiryDate, now);
                  const rule = petRules.find(
                    (r) =>
                      r.vaccineName.toLowerCase() ===
                        v.vaccineName.toLowerCase() ||
                      v.vaccineName
                        .toLowerCase()
                        .includes(r.vaccineName.toLowerCase()),
                  );
                  const activeReview = activeReviews[v.id] ?? null;
                  const alreadyReviewed =
                    v.status === "approved" ||
                    v.status === "rejected" ||
                    v.status === "exception";

                  return (
                    <div
                      key={v.id}
                      className="rounded-lg border p-4 transition-colors"
                      data-status={v.status ?? "pending_review"}
                    >
                      {/* Top row: name + badges + status */}
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{v.vaccineName}</span>
                          {rule && (
                            <Badge
                              variant={rule.required ? "default" : "outline"}
                              className="text-[10px]"
                            >
                              {rule.required ? "Required" : "Optional"}
                            </Badge>
                          )}
                          <Badge
                            variant={expiryBadge.variant}
                            className="text-[10px]"
                          >
                            {expiryBadge.label}
                          </Badge>
                        </div>
                        <StatusBadge status={v.status} />
                      </div>

                      {/* Meta info */}
                      <div className="text-muted-foreground mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                        {v.administeredDate && (
                          <div>
                            <span className="font-medium">Given:</span>{" "}
                            {formatDate(v.administeredDate)}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Expires:</span>{" "}
                          {formatDate(v.expiryDate)}
                        </div>
                        {v.veterinarianName && (
                          <div>
                            <span className="font-medium">Vet:</span>{" "}
                            {v.veterinarianName}
                          </div>
                        )}
                        {v.veterinaryClinic && (
                          <div>
                            <span className="font-medium">Clinic:</span>{" "}
                            {v.veterinaryClinic}
                          </div>
                        )}
                      </div>

                      {/* Document link */}
                      {v.documentUrl && (
                        <a
                          href={v.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary mb-3 flex w-fit items-center gap-1 text-xs hover:underline"
                        >
                          <FileText className="size-3" />
                          View uploaded document
                        </a>
                      )}

                      {/* Customer notes */}
                      {v.notes && (
                        <p className="text-muted-foreground mb-3 text-xs">
                          <span className="font-medium">Customer note:</span>{" "}
                          {v.notes}
                        </p>
                      )}

                      {/* Previous review info */}
                      {alreadyReviewed && v.reviewedBy && (
                        <p className="text-muted-foreground mb-3 text-xs">
                          Reviewed by {v.reviewedBy}
                          {v.reviewedAt
                            ? ` on ${formatDate(v.reviewedAt)}`
                            : ""}
                          {v.status === "rejected" && v.rejectionReason && (
                            <> — Reason: {v.rejectionReason}</>
                          )}
                          {v.status === "exception" && v.exceptionReason && (
                            <> — Exception note: {v.exceptionReason}</>
                          )}
                        </p>
                      )}

                      {/* Action buttons (always show, allow re-review) */}
                      {!activeReview && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={
                              v.status === "approved" ? "default" : "outline"
                            }
                            className={
                              v.status === "approved"
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                            }
                            onClick={() => confirmApprove(v.id)}
                          >
                            <ShieldCheck className="mr-1.5 size-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-400 text-red-600 hover:bg-red-50"
                            onClick={() => startReview(v.id, "deny")}
                          >
                            <ShieldX className="mr-1.5 size-3.5" />
                            Deny
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-400 text-amber-700 hover:bg-amber-50"
                            onClick={() => startReview(v.id, "exception")}
                          >
                            <ShieldAlert className="mr-1.5 size-3.5" />
                            Exception Made
                          </Button>
                        </div>
                      )}

                      {/* Inline form for deny / exception */}
                      {activeReview && (
                        <div className="bg-muted/40 mt-1 space-y-3 rounded-lg border p-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                              {activeReview.action === "deny"
                                ? "Reason for rejection (optional)"
                                : "Exception note (optional)"}
                            </Label>
                            <Textarea
                              value={activeReview.note}
                              onChange={(e) =>
                                setActiveReviews((prev) => ({
                                  ...prev,
                                  [v.id]: {
                                    action: activeReview.action,
                                    note: e.target.value,
                                  },
                                }))
                              }
                              placeholder={
                                activeReview.action === "deny"
                                  ? "e.g. Document unclear, please re-upload a legible copy"
                                  : "e.g. Dog owner confirmed Bordetella was given 3 weeks ago — waiving 2-week requirement"
                              }
                              rows={3}
                              className="text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={
                                activeReview.action === "deny"
                                  ? "destructive"
                                  : "default"
                              }
                              className={
                                activeReview.action === "exception"
                                  ? "bg-amber-600 hover:bg-amber-700"
                                  : ""
                              }
                              onClick={() =>
                                activeReview.action === "deny"
                                  ? confirmDeny(v.id)
                                  : confirmException(v.id)
                              }
                            >
                              {activeReview.action === "deny"
                                ? "Confirm Rejection"
                                : "Confirm Exception"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelReview(v.id)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Missing required vaccines */}
      {petsWithRecords.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
              <AlertTriangle className="size-3.5" />
              Missing required vaccines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.pets.map((pet) => {
              const petRules = getVaccinationRules().filter(
                (r) =>
                  r.required &&
                  r.species.toLowerCase() === pet.type.toLowerCase(),
              );
              const petRecords = records.filter((r) => r.petId === pet.id);
              const missing = petRules.filter(
                (rule) =>
                  !petRecords.some(
                    (rec) =>
                      rec.vaccineName
                        .toLowerCase()
                        .includes(rule.vaccineName.toLowerCase()) ||
                      rule.vaccineName
                        .toLowerCase()
                        .includes(rec.vaccineName.toLowerCase()),
                  ),
              );
              if (missing.length === 0) return null;
              return (
                <div key={pet.id} className="text-sm">
                  <span className="font-medium">{pet.name}:</span>{" "}
                  <span className="text-muted-foreground">
                    {missing.map((r) => r.vaccineName).join(", ")} — not yet
                    uploaded
                  </span>
                </div>
              );
            })}
            {client.pets.every((pet) => {
              const petRules = getVaccinationRules().filter(
                (r) =>
                  r.required &&
                  r.species.toLowerCase() === pet.type.toLowerCase(),
              );
              const petRecords = records.filter((r) => r.petId === pet.id);
              return petRules.every((rule) =>
                petRecords.some(
                  (rec) =>
                    rec.vaccineName
                      .toLowerCase()
                      .includes(rule.vaccineName.toLowerCase()) ||
                    rule.vaccineName
                      .toLowerCase()
                      .includes(rec.vaccineName.toLowerCase()),
                ),
              );
            }) && (
              <p className="text-muted-foreground text-sm">
                All required vaccines uploaded
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
