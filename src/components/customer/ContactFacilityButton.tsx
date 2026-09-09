"use client";

import { useShellText } from "@/lib/shell/use-shell-text";

import { useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Phone, Mail, MessageSquare } from "lucide-react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import Link from "next/link";

export function ContactFacilityButton() {
  const t = useShellText("customer");
  const { selectedFacility } = useCustomerFacility();
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();

  if (!hydrated || !selectedFacility) return null;

  const contact = selectedFacility.contact;
  const hasPhone = !!contact?.phone;
  const hasEmail = !!contact?.email;
  const hasChat = true; // TODO: Check if chat is enabled for facility

  if (!hasPhone && !hasEmail && !hasChat) {
    return null;
  }

  return (
    <>
      <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
        <MessageSquare className="size-5" />
        <span className="sr-only">{t("contactFacility")}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("contactTitle").replace("{facility}", selectedFacility.name)}
            </DialogTitle>
            <DialogDescription>{t("contactHow")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {hasChat && (
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/customer/messages">
                  <MessageSquare className="mr-2 size-4" />
                  {t("sendAMessage")}
                </Link>
              </Button>
            )}
            {hasPhone && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  window.location.href = `tel:${contact.phone}`;
                }}
              >
                <Phone className="mr-2 size-4" />
                {t("callNumber").replace("{phone}", contact.phone ?? "")}
              </Button>
            )}
            {hasEmail && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  window.location.href = `mailto:${contact.email}`;
                }}
              >
                <Mail className="mr-2 size-4" />
                {t("emailAddress").replace("{email}", contact.email ?? "")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
