"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Paperclip, X } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { CURRENT_FACILITY } from "@/hooks/use-support-inbox";
import { submitFacilityTicket } from "@/lib/facility-tickets-store";
import { closeSupportDrawer } from "@/lib/support-drawer-store";
import type { FacilityTicket } from "@/types/facility-ticket";
import { useShellText } from "@/lib/shell/use-shell-text";

/**
 * The value is what the ticket system stores, so it stays English and stable;
 * only the label is translated. Translating the value would file a French
 * user's ticket under a category nothing else in the product knows.
 */
const CATEGORIES = [
  { value: "Technical Issue", key: "categoryTechnical" },
  { value: "Billing Question", key: "categoryBilling" },
  { value: "Feature Request", key: "categoryFeature" },
  { value: "Account Help", key: "categoryAccount" },
  { value: "Other", key: "categoryOther" },
];

export function SubmitTicketTab() {
  const t = useShellText("support");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [ticket, setTicket] = useState<FacilityTicket | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const valid = subject.trim().length > 0 && description.trim().length > 0;
  const email = CURRENT_FACILITY.contactEmail || t("emailOnFile");

  function submit() {
    if (!valid) return;
    const created = submitFacilityTicket({
      subject,
      category,
      description,
      attachmentName: file?.name,
    });
    setTicket(created);
  }

  // Confirmation state — replaces the form once the ticket is created.
  if (ticket) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
        </span>
        <div className="space-y-1.5">
          <h3 className="font-semibold tracking-tight">
            {t("ticketSubmitted")}
          </h3>
          <p className="text-sm">
            {t("ticketNumberIs").split("{number}")[0]}
            <span className="font-semibold">{ticket.number}</span>
            {t("ticketNumberIs").split("{number}")[1]}
          </p>
          <p className="text-muted-foreground mx-auto max-w-xs text-sm">
            {t("willEmail").split("{email}")[0]}
            <span className="text-foreground font-medium">{email}</span>
            {t("willEmail").split("{email}")[1]}
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button asChild className="w-full">
            <Link
              href="/facility/support/tickets"
              onClick={() => closeSupportDrawer()}
            >
              {t("viewMyTickets")}
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => closeSupportDrawer()}
          >
            {t("done")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1.5">
        <Label htmlFor="ticket-subject">{t("subject")}</Label>
        <Input
          id="ticket-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t("subjectPlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ticket-category">{t("category")}</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="ticket-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {t(c.key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ticket-description">{t("descriptionLabel")}</Label>
        <Textarea
          id="ticket-description"
          className="min-h-28"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("attachment")}</Label>
        {file ? (
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <Paperclip className="text-muted-foreground size-4 shrink-0" />
            <span className="flex-1 truncate">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setFile(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="mr-2 size-4" />
            {t("attachFile")}
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>

      <Button
        className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
        disabled={!valid}
        onClick={submit}
      >
        {t("submitTicket")}
      </Button>
    </div>
  );
}
