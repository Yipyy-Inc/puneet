"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fill } from "@/lib/medications/dose";
import { useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// An estimate for someone who is not a client yet ("New inquiry"): who they
// are, and each pet's name and weight — the weight decides the room category
// and the size price, so a pet without one cannot be priced. Staff-only, and
// only in estimate mode; the client's mock has no estimate, so this keeps the
// shape the old step gave it, in Yipyy's controls.
// ============================================================================

export function GuestInquiry({
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  petNames,
  setPetNames,
  petWeights,
  setPetWeights,
}: {
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  petNames: string[];
  setPetNames: Dispatch<SetStateAction<string[]>>;
  petWeights: string[];
  setPetWeights: Dispatch<SetStateAction<string[]>>;
}) {
  const t = useShellText("booking");
  const names = petNames.length > 0 ? petNames : [""];

  const setPetName = (index: number, value: string) =>
    setPetNames((prev) => {
      const next = prev.length > 0 ? [...prev] : [""];
      next[index] = value;
      return next;
    });
  const setPetWeight = (index: number, value: string) => {
    // Digits and one decimal point; anything else is ignored.
    const clean = value.replace(/[^\d.]/g, "");
    setPetWeights((prev) => {
      const next = prev.length > 0 ? [...prev] : [""];
      while (next.length <= index) next.push("");
      next[index] = clean;
      return next;
    });
  };
  const addPet = () =>
    setPetNames((prev) => [...(prev.length > 0 ? prev : [""]), ""]);
  const removePet = (index: number) =>
    setPetNames((prev) => {
      const next = (prev.length > 0 ? prev : [""]).filter(
        (_, i) => i !== index,
      );
      return next.length > 0 ? next : [""];
    });

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="guest-contact">
        <h3 id="guest-contact" className="text-section text-body-ink">
          {t("contactInformation")}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guest-name">{t("nameRequired")}</Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("customerNamePlaceholder")}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guest-email">{t("emailRequired")}</Label>
            <Input
              id="guest-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("guestEmailPlaceholder")}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="guest-phone">{t("phone")}</Label>
            <Input
              id="guest-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="guest-pets">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 id="guest-pets" className="text-section text-body-ink">
              {t("petInformation")}
            </h3>
            <p className="text-meta text-ink-tertiary">
              {t("petInformationHelp")}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={addPet}>
            <Plus aria-hidden />
            {t("addPet")}
          </Button>
        </div>
        <ul className="flex flex-col gap-2">
          {names.map((petName, index) => {
            const weight = petWeights[index] ?? "";
            const weightMissing =
              petName.trim().length > 0 && (!weight || Number(weight) <= 0);
            return (
              <li key={index} className="flex min-w-0 items-center gap-2">
                <Input
                  value={petName}
                  onChange={(event) => setPetName(index, event.target.value)}
                  aria-label={fill(t("petNumberName"), { n: index + 1 })}
                  placeholder={
                    index === 0
                      ? t("petNameExample")
                      : fill(t("petNumberName"), { n: index + 1 })
                  }
                  className="min-w-0 flex-1"
                />
                <div className="relative w-32 shrink-0">
                  <Input
                    value={weight}
                    onChange={(event) =>
                      setPetWeight(index, event.target.value)
                    }
                    inputMode="decimal"
                    placeholder={t("weight")}
                    aria-label={fill(t("petNumberWeight"), { n: index + 1 })}
                    aria-invalid={weightMissing}
                    className="pr-10"
                  />
                  <span className="text-meta text-ink-tertiary pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">
                    {t("unitLbs")}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={names.length <= 1}
                  onClick={() => removePet(index)}
                  aria-label={t("removePet")}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
