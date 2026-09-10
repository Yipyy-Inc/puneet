"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateClient } from "@/lib/api/client";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { Client } from "@/types/client";

/**
 * A client's contact details and address, saved to their record.
 *
 * Mounted only once the client has loaded, so every field starts from what is
 * stored. The page used to seed `useState` before the query answered — the
 * fields opened EMPTY on a cold load — and its Save button was a toast that
 * said "Client profile updated" and wrote nothing.
 */
export function ClientEditForm({ client }: { client: Client }) {
  const { t, fill } = useStaffText("clientEdit");
  const update = useUpdateClient();

  const [name, setName] = useState(client.name ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [street, setStreet] = useState(client.address?.street ?? "");
  const [city, setCity] = useState(client.address?.city ?? "");
  const [state, setState] = useState(client.address?.state ?? "");
  const [zip, setZip] = useState(client.address?.zip ?? "");

  const changed =
    name !== (client.name ?? "") ||
    email !== (client.email ?? "") ||
    phone !== (client.phone ?? "") ||
    street !== (client.address?.street ?? "") ||
    city !== (client.address?.city ?? "") ||
    state !== (client.address?.state ?? "") ||
    zip !== (client.address?.zip ?? "");

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("nameRequired"));
      return;
    }
    update.mutate(
      {
        id: client.id,
        patch: {
          name: trimmed,
          email: email.trim(),
          phone: phone.trim(),
          address: {
            country: client.address?.country ?? "",
            street: street.trim(),
            city: city.trim(),
            state: state.trim(),
            zip: zip.trim(),
          },
        },
      },
      {
        onSuccess: () => toast.success(fill("saved", { name: trimmed })),
        onError: (error) =>
          toast.error(t("notSaved"), { description: error.message }),
      },
    );
  };

  return (
    <div className="space-y-6 p-4 pt-5 md:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Pencil className="size-5" />
        {fill("title", { name: client.name })}
      </h2>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {t("contact")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid gap-1.5">
              <Label htmlFor="client-name">{t("fullName")}</Label>
              <Input
                id="client-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="client-email">{t("email")}</Label>
              <Input
                id="client-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="client-phone">{t("phone")}</Label>
            <Input
              id="client-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {t("address")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="client-street">{t("street")}</Label>
            <Input
              id="client-street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid gap-1.5">
              <Label htmlFor="client-city">{t("city")}</Label>
              <Input
                id="client-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="client-state">{t("province")}</Label>
              <Input
                id="client-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="client-zip">{t("postalCode")}</Label>
              <Input
                id="client-zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={!changed || update.isPending}>
        {update.isPending
          ? t("saving")
          : fill("save", { name: name.trim() || client.name })}
      </Button>
    </div>
  );
}
