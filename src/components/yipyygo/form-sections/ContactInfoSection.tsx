"use client";

import Link from "next/link";
import { CircleAlert, Mail, Phone, User } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatList, formatPhone } from "@/lib/i18n/format";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { Client } from "@/types/client";

import { OnFileRow } from "./OnFileRow";

// ============================================================================
// How the facility reaches the owner, as it has it on file.
//
// Read-only. The old step offered name, phone and email fields that saved
// nowhere: a changed number was gone the moment the owner pressed Next, while
// the facility kept calling the old one. Contact details change in the account
// settings, which write the client record the facility reads.
// ============================================================================

export function ContactInfoSection({ customer }: { customer: Client }) {
  const t = useShellText("yipyygo");
  const locale = useShellLocale();
  const missing = [
    customer.email?.trim() ? null : t("email"),
    customer.phone?.trim() ? null : t("phoneNumber"),
  ].filter((label): label is string => label !== null);
  const contacts = customer.additionalContacts ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-5" aria-hidden />
          {t("verifyYourContactInfo")}
        </CardTitle>
        <CardDescription>{t("contactOnFileHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {missing.length > 0 && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>
              {t("contactMissing").replace("{fields}", () =>
                formatList(missing, locale),
              )}
            </AlertDescription>
          </Alert>
        )}

        <dl className="divide-line divide-y">
          <OnFileRow label={t("fullName")} value={customer.name} icon={User} />
          <OnFileRow label={t("email")} value={customer.email} icon={Mail} />
          <OnFileRow
            label={t("phone")}
            value={customer.phone ? formatPhone(customer.phone, locale) : ""}
            icon={Phone}
          />
        </dl>

        {contacts.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-ink-tertiary text-[12px] font-bold tracking-[.06em] uppercase">
              {t("otherContacts")}
            </h3>
            <dl className="divide-line divide-y">
              {contacts.map((contact) => (
                <OnFileRow
                  key={contact.id}
                  label={
                    contact.relationship
                      ? `${contact.name} · ${contact.relationship}`
                      : contact.name
                  }
                  value={
                    contact.phone ? formatPhone(contact.phone, locale) : ""
                  }
                />
              ))}
            </dl>
          </div>
        )}

        <Button variant="outline" asChild>
          <Link href="/customer/settings">{t("changeContactDetails")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
