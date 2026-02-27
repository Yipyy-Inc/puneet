"use client";

import { useState } from "react";
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
  const { selectedFacility } = useCustomerFacility();
  const [open, setOpen] = useState(false);

  if (!selectedFacility) return null;

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
        <MessageSquare className="h-5 w-5" />
        <span className="sr-only">Contact Facility</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact {selectedFacility.name}</DialogTitle>
            <DialogDescription>
              Choose how you'd like to reach us
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {hasChat && (
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href="/customer/messages">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send a Message
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
                <Phone className="mr-2 h-4 w-4" />
                Call {contact.phone}
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
                <Mail className="mr-2 h-4 w-4" />
                Email {contact.email}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
