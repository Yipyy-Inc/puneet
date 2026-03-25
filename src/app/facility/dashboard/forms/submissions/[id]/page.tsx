"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSubmission,
  getSubmissionRecord,
  updateSubmissionRecordStatus,
  linkSubmissionToCustomer,
} from "@/data/form-submissions";
import { getFormAuditLog } from "@/lib/form-audit";
import { notifyCustomerSubmissionConfirmed } from "@/lib/form-customer-notifications";
import { getFormById, type FormQuestion } from "@/data/forms";
import { clients } from "@/data/clients";
import {
  ArrowLeft,
  UserPlus,
  Link2,
  CheckCircle,
  FileText,
  History,
  AlertCircle,
  ArrowRight,
  Check,
  X,
  File,
  PenLine,
  AlertTriangle,
  CalendarPlus,
  PawPrint,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Format date for display without locale so server and client match (avoids hydration error) */
function formatSubmissionDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

/** Check if a value looks like an address object */
function isAddressObject(value: unknown): value is { street?: string; city?: string; state?: string; zip?: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return ("street" in v || "city" in v || "state" in v || "zip" in v);
}

/** Format address object to a single line */
function formatAddress(value: { street?: string; city?: string; state?: string; zip?: string }): string {
  const parts: string[] = [];
  if (value.street) parts.push(value.street);
  const cityStateZip: string[] = [];
  if (value.city) cityStateZip.push(value.city);
  if (value.state) cityStateZip.push(value.state);
  if (value.zip) cityStateZip.push(value.zip);
  if (cityStateZip.length > 0) {
    if (value.city && value.state) {
      parts.push(`${value.city}, ${value.state}${value.zip ? " " + value.zip : ""}`);
    } else {
      parts.push(cityStateZip.join(", "));
    }
  }
  return parts.join(", ") || "—";
}

function AnswerBlock({ question, value }: { question: FormQuestion; value: unknown }) {
  // File-type answers
  if (question.type === "file") {
    const filename = typeof value === "string" ? value : formatValue(value);
    return (
      <div className="space-y-1">
        <Label className="text-muted-foreground font-normal text-xs">{question.label}</Label>
        <div className="flex items-center gap-2 text-sm font-medium">
          <File className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{filename}</span>
        </div>
      </div>
    );
  }

  // Address-type answers
  if (question.type === "address" || isAddressObject(value)) {
    const addr = isAddressObject(value) ? value : null;
    return (
      <div className="space-y-1">
        <Label className="text-muted-foreground font-normal text-xs">{question.label}</Label>
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{addr ? formatAddress(addr) : formatValue(value)}</span>
        </div>
      </div>
    );
  }

  // Signature-type answers
  if (question.type === "signature") {
    return (
      <div className="space-y-1">
        <Label className="text-muted-foreground font-normal text-xs">{question.label}</Label>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium italic">{formatValue(value)}</p>
          <Badge variant="outline" className="text-[10px] h-5 gap-1 font-normal bg-violet-50 text-violet-700 border-violet-200">
            <PenLine className="h-2.5 w-2.5" />
            e-signed
          </Badge>
        </div>
      </div>
    );
  }

  // Boolean / yes_no / checkbox answers
  if (question.type === "yes_no" || question.type === "checkbox") {
    const boolVal = value === true || value === "yes" || value === "Yes" || value === "true";
    return (
      <div className="space-y-1">
        <Label className="text-muted-foreground font-normal text-xs">{question.label}</Label>
        <div className="flex items-center gap-2 text-sm font-medium">
          {boolVal ? (
            <div className="flex items-center gap-1.5 text-green-700">
              <Check className="h-4 w-4" />
              <span>Yes</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-red-600">
              <X className="h-4 w-4" />
              <span>No</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground font-normal text-xs">{question.label}</Label>
      <p className="text-sm font-medium">{formatValue(value)}</p>
    </div>
  );
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const submission = getSubmission(id);
  const record = getSubmissionRecord(id);
  const form = submission ? getFormById(submission.formId) : null;

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">(
    submission?.customerId ?? record?.relatedCustomerId ?? ""
  );
  const [mergeRule, setMergeRule] = useState<"submitted_wins" | "existing_wins" | "ask">("submitted_wins");
  const [selectedPetIds, setSelectedPetIds] = useState<number[]>([]);
  const [linkedCustomerName, setLinkedCustomerName] = useState<string>("");

  // Post-processing actions state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingServiceType, setBookingServiceType] = useState<string>("");
  const [bookingDate, setBookingDate] = useState<string>("");
  const [bookingNotes, setBookingNotes] = useState<string>("");

  useEffect(() => {
    if (record?.status === "unread") {
      updateSubmissionRecordStatus(id, "read");
    }
  }, [id, record?.status]);

  const answers = submission?.answers ?? {};
  const visibleQuestions = useMemo(() => {
    if (!form) return [];
    return form.questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== "");
  }, [form, answers]);

  // Group questions by section
  const sections = form?.sections ?? [];
  const hasSections = sections.length > 0;

  const groupedQuestions = useMemo(() => {
    if (!hasSections) return null;
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);
    const grouped: { section: typeof sections[0]; questions: FormQuestion[] }[] = [];
    const unsectioned: FormQuestion[] = [];
    for (const sec of sortedSections) {
      const secQuestions = visibleQuestions.filter((q) => q.sectionId === sec.id);
      if (secQuestions.length > 0) {
        grouped.push({ section: sec, questions: secQuestions });
      }
    }
    // Questions without a section
    for (const q of visibleQuestions) {
      if (!q.sectionId || !sections.find((s) => s.id === q.sectionId)) {
        unsectioned.push(q);
      }
    }
    if (unsectioned.length > 0) {
      grouped.push({
        section: { id: "_unsectioned", title: "Other", order: 999 },
        questions: unsectioned,
      });
    }
    return grouped;
  }, [hasSections, sections, visibleQuestions]);

  const emailFromAnswers = useMemo(() => {
    for (const v of Object.values(answers)) {
      const s = String(v);
      if (s.includes("@") && s.includes(".")) return s;
    }
    return "";
  }, [answers]);

  const phoneFromAnswers = useMemo(() => {
    for (const v of Object.values(answers)) {
      const s = String(v).replace(/\D/g, "");
      if (s.length >= 10) return String(v);
    }
    return "";
  }, [answers]);

  // Try to extract pet names from answers
  const petNamesFromAnswers = useMemo(() => {
    const names: string[] = [];
    if (!form) return names;
    for (const q of form.questions) {
      const val = answers[q.id];
      if (!val) continue;
      const lbl = q.label.toLowerCase();
      if (lbl.includes("pet name") || lbl.includes("pet's name") || lbl.includes("animal name") || lbl.includes("dog name") || lbl.includes("cat name")) {
        const s = String(val).trim();
        if (s) names.push(s);
      }
    }
    return names;
  }, [form, answers]);

  const submissionAuditEntries = useMemo(
    () => (id ? getFormAuditLog({ submissionId: id }) : []),
    [id]
  );

  const matchingCustomers = useMemo(() => {
    const out: typeof clients = [];
    const email = emailFromAnswers.trim().toLowerCase();
    const phone = phoneFromAnswers.replace(/\D/g, "");
    for (const c of clients) {
      if (email && c.email?.toLowerCase() === email) {
        out.push(c);
        continue;
      }
      if (phone && c.phone?.replace(/\D/g, "").includes(phone)) {
        out.push(c);
      }
    }
    return out;
  }, [emailFromAnswers, phoneFromAnswers]);

  // Customer pets when a customer is selected
  const selectedCustomer = clients.find((c) => c.id === selectedCustomerId);
  const customerPets = selectedCustomer?.pets ?? [];

  const handleMarkProcessed = () => {
    if (!id || !submission) return;
    updateSubmissionRecordStatus(id, "processed");
    notifyCustomerSubmissionConfirmed({
      facilityId: submission.facilityId,
      formId: submission.formId,
      formName: form?.name ?? submission.formId,
      submissionId: submission.id,
      customerId: submission.customerId ?? record?.relatedCustomerId,
    });
    toast.success("Marked as processed");
    router.push("/facility/dashboard/forms/submissions");
  };

  // Compute merge diff when a customer is selected
  const mergeDiff = useMemo(() => {
    if (!selectedCustomerId || !form) return [];
    const customer = clients.find((c) => c.id === selectedCustomerId);
    if (!customer) return [];
    const diffs: { field: string; label: string; submitted: string; existing: string; useSubmitted: boolean }[] = [];
    // Check field mappings
    const mappings = form.fieldMapping ?? [];
    for (const m of mappings) {
      const answer = answers[m.questionId];
      if (answer === undefined || answer === "") continue;
      const submitted = typeof answer === "object" ? JSON.stringify(answer) : String(answer);
      let existing = "";
      let label = m.target;
      if (m.target === "customer.name") { existing = customer.name ?? ""; label = "Name"; }
      else if (m.target === "customer.email") { existing = customer.email ?? ""; label = "Email"; }
      else if (m.target === "customer.phone") { existing = customer.phone ?? ""; label = "Phone"; }
      else if (m.target.startsWith("customer.address")) {
        const key = m.target.split(".").pop() ?? "";
        existing = (customer as Record<string, unknown>)[key] as string ?? "";
        label = `Address (${key})`;
      }
      if (submitted && existing && submitted !== existing) {
        diffs.push({ field: m.target, label, submitted, existing, useSubmitted: mergeRule === "submitted_wins" });
      } else if (submitted && !existing) {
        diffs.push({ field: m.target, label, submitted, existing: "(empty)", useSubmitted: true });
      }
    }
    return diffs;
  }, [selectedCustomerId, form, answers, mergeRule]);

  const [conflictChoices, setConflictChoices] = useState<Record<string, boolean>>({});

  const handleMatchExisting = (customerId: number) => {
    if (!id) return;
    const overrides = mergeDiff
      .filter((d) => d.existing !== "(empty)" && d.submitted !== d.existing)
      .map((d) => ({
        field: d.field,
        submittedValue: d.submitted,
        existingValue: d.existing,
        chosen: mergeRule === "ask" ? (conflictChoices[d.field] ?? true ? "submitted" : "existing") : mergeRule === "submitted_wins" ? "submitted" : "existing",
      }));
    linkSubmissionToCustomer(id, customerId, selectedPetIds.length > 0 ? selectedPetIds : undefined, {
      mergeRule: mergeRule,
      overrides,
      staffUserId: "staff-demo",
      staffUserName: "Staff",
    });
    const customer = clients.find((c) => c.id === customerId);
    setLinkedCustomerName(customer?.name ?? "Customer");
    setSelectedCustomerId(customerId);
    toast.success(`Linked to ${customer?.name ?? "customer"}`);
  };

  const [createdProfile, setCreatedProfile] = useState(false);
  const handleCreateNew = () => {
    if (!id || !submission) return;
    // Extract name/email/phone from answers
    const name = Object.values(answers).find((v) => typeof v === "string" && v.includes(" ") && !v.includes("@")) as string ?? "New Customer";
    const email = emailFromAnswers || undefined;
    const phone = phoneFromAnswers || undefined;
    // In production, this creates a real customer + pet record via API
    // For demo, we log the creation and mark as processed
    linkSubmissionToCustomer(id, 999, undefined, {
      mergeRule: "submitted_wins",
      overrides: [],
      staffUserId: "staff-demo",
      staffUserName: "Staff",
    });
    setCreatedProfile(true);
    toast.success(`New profile created: ${name}${email ? ` (${email})` : ""}`);
  };

  const handleCreateBookingRequest = () => {
    if (!bookingServiceType || !bookingDate) {
      toast.error("Please select a service type and date");
      return;
    }
    toast.success("Booking request created");
    setShowBookingForm(false);
    setBookingServiceType("");
    setBookingDate("");
    setBookingNotes("");
  };

  const handleFlagFollowUp = () => {
    toast.success("Follow-up alert created for staff");
  };

  const togglePetSelection = (petId: number) => {
    setSelectedPetIds((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId]
    );
  };

  if (!submission || !record) {
    return (
      <div className="flex-1 p-4">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Submission not found.
            <Button variant="link" onClick={() => router.push("/facility/dashboard/forms/submissions")}>
              Back to Inbox
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/facility/dashboard/forms/submissions")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Submission</h2>
          <p className="text-sm text-muted-foreground">
            {form?.name ?? submission.formId} · {formatSubmissionDate(submission.createdAt)}
          </p>
        </div>
        <Badge variant={record.status === "unread" ? "default" : "secondary"} className="ml-auto">
          {record.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Answers in form layout */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Answers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No answers recorded.</p>
            ) : hasSections && groupedQuestions ? (
              /* Section-grouped layout */
              groupedQuestions.map((group, gi) => (
                <div key={group.section.id}>
                  {gi > 0 && <Separator className="my-4" />}
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-foreground">{group.section.title}</h3>
                    {group.section.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{group.section.description}</p>
                    )}
                  </div>
                  <div className="space-y-3 pl-1">
                    {group.questions.map((q) => (
                      <AnswerBlock key={q.id} question={q} value={answers[q.id]} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              /* Flat layout (no sections) */
              visibleQuestions.map((q) => (
                <AnswerBlock key={q.id} question={q} value={answers[q.id]} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Matching panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Match to profile
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Match by email/phone from answers, or create a new customer.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Linked success state */}
            {linkedCustomerName && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Linked to {linkedCustomerName}</span>
                {selectedPetIds.length > 0 && (
                  <span className="text-green-700 text-xs ml-1">
                    ({selectedPetIds.length} pet{selectedPetIds.length !== 1 ? "s" : ""} selected)
                  </span>
                )}
              </div>
            )}

            {(emailFromAnswers || phoneFromAnswers) && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium mb-1">From submission</p>
                {emailFromAnswers && <p>Email: {emailFromAnswers}</p>}
                {phoneFromAnswers && <p>Phone: {phoneFromAnswers}</p>}
              </div>
            )}

            {matchingCustomers.length > 0 ? (
              <div className="space-y-2">
                <Label>Matching customers</Label>
                {/* Prompt when matches exist but no selection */}
                {!selectedCustomerId && !linkedCustomerName && (
                  <p className="text-xs text-muted-foreground italic">Select a customer to see merge preview</p>
                )}
                <div className="space-y-2">
                  {matchingCustomers.map((c) => (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                        selectedCustomerId === c.id ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                        {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant={selectedCustomerId === c.id ? "secondary" : "outline"}
                        onClick={() => setSelectedCustomerId(c.id)}
                      >
                        {selectedCustomerId === c.id ? (
                          <><Check className="h-3.5 w-3.5 mr-1" /> Selected</>
                        ) : "Select"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No existing customer matched by email/phone.</p>
            )}

            {/* Pet matching section */}
            {selectedCustomerId && customerPets.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <PawPrint className="h-3.5 w-3.5" />
                    Link pets
                  </Label>
                  {petNamesFromAnswers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Pet names from submission: <span className="font-medium">{petNamesFromAnswers.join(", ")}</span>
                    </p>
                  )}
                  <div className="space-y-1.5">
                    {customerPets.map((pet) => {
                      const isSelected = selectedPetIds.includes(pet.id);
                      const isLinked = linkedCustomerName && isSelected;
                      return (
                        <label
                          key={pet.id}
                          className={`flex items-center gap-3 rounded-md border p-2.5 cursor-pointer transition-colors ${
                            isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => togglePetSelection(pet.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{pet.name}</span>
                              {isLinked && <Check className="h-3.5 w-3.5 text-green-600" />}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {pet.breed ?? pet.type}
                              {pet.age != null ? ` · ${pet.age} yr${pet.age !== 1 ? "s" : ""} old` : ""}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>Merge rule</Label>
              <Select value={mergeRule} onValueChange={(v: "submitted_wins" | "existing_wins" | "ask") => setMergeRule(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted_wins">Submitted overrides existing</SelectItem>
                  <SelectItem value="existing_wins">Existing wins</SelectItem>
                  <SelectItem value="ask">Ask on each conflict</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Merge diff panel */}
            {selectedCustomerId && mergeDiff.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  Merge diff ({mergeDiff.filter((d) => d.existing !== "(empty)").length} conflict{mergeDiff.filter((d) => d.existing !== "(empty)").length !== 1 ? "s" : ""}, {mergeDiff.filter((d) => d.existing === "(empty)").length} new)
                </Label>
                <div className="space-y-1.5">
                  {mergeDiff.map((d) => (
                    <div key={d.field} className="rounded-md border p-2.5 text-sm">
                      <p className="font-medium text-xs text-muted-foreground mb-1">{d.label}</p>
                      {d.existing === "(empty)" ? (
                        <div className="flex items-center gap-2 text-green-700">
                          <span className="text-xs bg-green-100 text-green-800 rounded px-1.5 py-0.5">NEW</span>
                          <span>{d.submitted}</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`rounded px-1.5 py-0.5 ${
                              mergeRule === "ask"
                                ? (conflictChoices[d.field] ?? true) ? "bg-primary/10 text-primary font-medium" : "bg-muted text-muted-foreground"
                                : mergeRule === "submitted_wins" ? "bg-primary/10 text-primary font-medium" : "bg-muted text-muted-foreground line-through"
                            }`}>
                              Submitted: {d.submitted}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`rounded px-1.5 py-0.5 ${
                              mergeRule === "ask"
                                ? !(conflictChoices[d.field] ?? true) ? "bg-primary/10 text-primary font-medium" : "bg-muted text-muted-foreground"
                                : mergeRule === "existing_wins" ? "bg-primary/10 text-primary font-medium" : "bg-muted text-muted-foreground line-through"
                            }`}>
                              Existing: {d.existing}
                            </span>
                          </div>
                          {mergeRule === "ask" && (
                            <div className="flex gap-2 mt-1.5">
                              <Button
                                type="button"
                                variant={(conflictChoices[d.field] ?? true) ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setConflictChoices((prev) => ({ ...prev, [d.field]: true }))}
                              >
                                Use submitted
                              </Button>
                              <Button
                                type="button"
                                variant={!(conflictChoices[d.field] ?? true) ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setConflictChoices((prev) => ({ ...prev, [d.field]: false }))}
                              >
                                Keep existing
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {selectedCustomerId ? (
                <Button size="sm" onClick={() => handleMatchExisting(selectedCustomerId as number)}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Merge &amp; link
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={handleCreateNew} disabled={createdProfile}>
                <UserPlus className="h-4 w-4 mr-2" />
                {createdProfile ? "Profile created" : "Create new profile"}
              </Button>
              <Button size="sm" variant={selectedCustomerId || createdProfile ? "default" : "secondary"} onClick={handleMarkProcessed}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as processed
              </Button>
            </div>

            {/* Post-processing actions */}
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Post-processing actions</Label>

              {/* Create booking request */}
              <div className="space-y-2">
                {!showBookingForm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setShowBookingForm(true)}
                  >
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Create booking request
                  </Button>
                ) : (
                  <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">New booking request</p>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowBookingForm(false)}>
                        Cancel
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">Service type</Label>
                        <Select value={bookingServiceType} onValueChange={setBookingServiceType}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daycare">Daycare</SelectItem>
                            <SelectItem value="boarding">Boarding</SelectItem>
                            <SelectItem value="grooming">Grooming</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input
                          type="date"
                          className="h-8 text-sm"
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Notes (optional)</Label>
                        <Input
                          className="h-8 text-sm"
                          placeholder="Add any notes..."
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button size="sm" className="h-8 text-xs" onClick={handleCreateBookingRequest}>
                      Create request
                    </Button>
                  </div>
                )}
              </div>

              {/* Flag for follow-up */}
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-amber-700 border-amber-200 hover:bg-amber-50"
                onClick={handleFlagFollowUp}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Flag for follow-up
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit & compliance: timestamps, merge decision, audit trail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit & compliance
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Submission timestamps and merge decisions are logged for compliance.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-xs">Received at</Label>
              <p className="text-sm font-medium">{submission ? formatSubmissionDate(submission.createdAt) : "—"}</p>
            </div>
            {record?.submittedAt && (
              <div>
                <Label className="text-muted-foreground text-xs">Submitted at</Label>
                <p className="text-sm font-medium">{formatSubmissionDate(record.submittedAt)}</p>
              </div>
            )}
          </div>
          {record?.mergeDecision && typeof record.mergeDecision === "object" && "rule" in record.mergeDecision && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium mb-1">Merge decision</p>
              <p className="text-muted-foreground text-xs">
                Rule: {(record.mergeDecision as { rule?: string }).rule ?? "—"} · at {(record.mergeDecision as { at?: string }).at ?? "—"}
              </p>
              {Array.isArray((record.mergeDecision as { overrides?: unknown[] }).overrides) &&
                (record.mergeDecision as { overrides: { field: string; submittedValue: string; existingValue: string }[] }).overrides.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-xs">
                    {(record.mergeDecision as { overrides: { field: string; submittedValue: string; existingValue: string }[] }).overrides.map((o, i) => (
                      <li key={i}>{o.field}: submitted &quot;{o.submittedValue}&quot; vs existing &quot;{o.existingValue}&quot;</li>
                    ))}
                  </ul>
                )}
            </div>
          )}
          {submissionAuditEntries.length > 0 && (
            <div>
              <Label className="text-muted-foreground text-xs">Audit log (this submission)</Label>
              <ul className="mt-1 space-y-1 text-xs">
                {submissionAuditEntries.slice(0, 10).map((e) => (
                  <li key={e.id} className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">{e.timestamp.slice(0, 19).replace("T", " ")}</span>
                    <span>{e.action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
