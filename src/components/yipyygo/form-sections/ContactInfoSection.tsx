"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, User, Phone, Mail } from "lucide-react";
import { AdditionalContactsManager } from "@/components/clients/AdditionalContactsManager";
import type { AdditionalContact } from "@/types/client";
import type { YipyyGoFormSectionProps } from "@/types/yipyygo";
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import { formatList } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  additionalContacts: AdditionalContact[];
};

type ContactInfoSectionProps = YipyyGoFormSectionProps;

export function ContactInfoSection({
  customer,
  onNext,
  onBack,
}: ContactInfoSectionProps) {
  const t = useShellText("yipyygo");
  const locale = useShellLocale();
  const [values, setValues] = useState<ContactForm>(() => ({
    name: customer.name ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    additionalContacts: (customer.additionalContacts ??
      []) as AdditionalContact[],
  }));

  const missing = useMemo(() => {
    const list: string[] = [];
    if (!values.name.trim()) list.push(t("fullName"));
    if (!values.email.trim()) list.push(t("email"));
    if (!values.phone.trim()) list.push(t("phoneNumber"));
    values.additionalContacts.forEach((contact, idx) => {
      if (!contact.name.trim()) {
        list.push(t("additionalContactName").replace("{n}", String(idx + 1)));
      }
      if (!contact.phone.trim()) {
        list.push(t("additionalContactPhone").replace("{n}", String(idx + 1)));
      }
    });
    return list;
  }, [values, t]);

  const update = (updates: Partial<ContactForm>) =>
    setValues((v) => ({ ...v, ...updates }));

  const canContinue = missing.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="text-primary size-5" />
          {t("verifyYourContactInfo")}
        </CardTitle>
        <CardDescription>{t("prefilledFromAccount")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {missing.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              {rich(t("fillInToContinue"), {
                fields: <strong>{formatList(missing, locale)}</strong>,
              })}
            </AlertDescription>
          </Alert>
        )}
        {missing.length === 0 && (
          <Alert>
            <CheckCircle2 className="size-4 text-green-600" />
            <AlertDescription>
              {t("allContactInfoOnFile")}{" "}
              <Link
                href="/customer/settings"
                className="text-primary underline"
              >
                {t("editInAccountSettings")}
              </Link>{" "}
              {t("ifNeeded")}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t("primaryContact")}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">{t("fullName")}</Label>
              <Input
                id="contact-name"
                value={values.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder={t("fullName")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">
                <Phone className="mr-1 inline size-3" />
                {t("phone")}
              </Label>
              <Input
                id="contact-phone"
                value={values.phone}
                onChange={(e) => update({ phone: e.target.value })}
                placeholder="(514) 555-0123"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="contact-email">
                <Mail className="mr-1 inline size-3" />
                {t("email")}
              </Label>
              <Input
                id="contact-email"
                type="email"
                value={values.email}
                onChange={(e) => update({ email: e.target.value })}
                placeholder={t("youExampleCom")}
              />
            </div>
          </div>
        </div>

        <AdditionalContactsManager
          value={values.additionalContacts}
          onChange={(contacts) => update({ additionalContacts: contacts })}
          // The component's own defaults now come from the catalogue, so a
          // caller that wants the standard wording passes nothing.
        />

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} disabled>
            {t("back")}
          </Button>
          <Button onClick={onNext} disabled={!canContinue}>
            {t("nextPetDetails")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
