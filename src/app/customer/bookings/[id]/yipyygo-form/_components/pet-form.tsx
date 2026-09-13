"use client";

import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  RotateCcw,
  Send,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TipPromptDialog } from "@/components/yipyygo/TipPromptDialog";
import { AddOnsSection } from "@/components/yipyygo/form-sections/AddOnsSection";
import { AnswersSummary } from "@/components/yipyygo/form-sections/AnswersSummary";
import { BehaviorSection } from "@/components/yipyygo/form-sections/BehaviorSection";
import { BelongingsSection } from "@/components/yipyygo/form-sections/BelongingsSection";
import { BookingDetailsSection } from "@/components/yipyygo/form-sections/BookingDetailsSection";
import { ContactInfoSection } from "@/components/yipyygo/form-sections/ContactInfoSection";
import { FeedingSection } from "@/components/yipyygo/form-sections/FeedingSection";
import { MedicationSection } from "@/components/yipyygo/form-sections/MedicationSection";
import { PetDetailsSection } from "@/components/yipyygo/form-sections/PetDetailsSection";
import { PhotoField } from "@/components/yipyygo/form-sections/PhotoField";
import type {
  CustomerYipyyGoBooking,
  CustomerYipyyGoPet,
} from "@/lib/api/customer-yipyy-go";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong } from "@/lib/i18n/format";
import { addOnLine, stayDaysFor } from "@/lib/yipyy-go/charges-preview";
import {
  yipyyGoFormSteps,
  type YipyyGoFormStep,
} from "@/lib/yipyy-go/owner-form";
import { customQuestionsOf } from "@/lib/yipyy-go/validate";
import type { Client } from "@/types/client";
import type { YipyyGoPhotoSlot } from "@/types/yipyygo";

import { BillEstimate } from "./bill-estimate";
import { CustomQuestionsSection } from "./custom-questions-section";
import { FormSentPanel } from "./form-sent-panel";
import { FormStepRail } from "./form-step-rail";
import { MissingAnswers } from "./missing-answers";
import { PetTabs } from "./pet-tabs";
import { useYipyyGoPetForm } from "./use-yipyy-go-pet-form";

const STEP_LABEL_KEYS: Record<YipyyGoFormStep, string> = {
  contact: "contactInfo",
  pet: "petDetails",
  booking: "booking",
  feeding: "feeding",
  medications: "medications",
  behavior: "behavior",
  addons: "addOns",
  belongings: "belongings",
  questions: "questions",
  review: "review",
};

interface PetFormProps {
  data: CustomerYipyyGoBooking;
  pet: CustomerYipyyGoPet;
  customer: Client | undefined;
  onSelectPet: (ref: number) => void;
}

export function PetForm({ data, pet, customer, onSelectPet }: PetFormProps) {
  const { t, fill, locale } = useCustomerText("yipyygo");
  const customerPet = customer?.pets?.find(
    (candidate) => candidate.id === pet.ref,
  );
  const steps = yipyyGoFormSteps(data.template, {
    contact: Boolean(customer),
    pet: Boolean(customerPet),
    addOns: data.offeredAddOns.length > 0,
  });
  const form = useYipyyGoPetForm({ data, pet, steps });

  if (form.sent) {
    return (
      <div className="space-y-6">
        <PetTabs pets={data.pets} currentRef={pet.ref} onSelect={onSelectPet} />
        <FormSentPanel
          data={data}
          pet={pet}
          result={form.sent}
          email={customer?.email}
          onSelectPet={onSelectPet}
        />
      </div>
    );
  }

  const questions = customQuestionsOf(data.template);
  const labelled = steps.map((id) => ({ id, label: t(STEP_LABEL_KEYS[id]) }));
  const index = form.stepIndex;
  const nextStep = labelled[index + 1];
  const stayDays = stayDaysFor(
    data.booking.service,
    data.booking.startDate,
    data.booking.endDate,
  );
  const hasMedications =
    !form.form.noMedications && form.form.medications.length > 0;
  // Every photo on the form goes through one field, which uploads it to this
  // booking and dog as soon as it is picked; the answers keep its id.
  const photoField = (slot: YipyyGoPhotoSlot) => (
    <PhotoField
      key={slot.id}
      id={slot.id}
      label={slot.label}
      bookingRef={data.booking.ref}
      petRef={pet.ref}
      kind={slot.kind}
      itemRef={slot.itemRef}
      photo={form.photoFor(slot.photoId)}
      invalid={
        slot.invalid ??
        (slot.kind === "belongings" && form.missing.includes("belongingsPhoto"))
      }
      onChange={(photo) => {
        if (photo) form.rememberPhoto(photo);
        slot.onChange(photo?.id);
      }}
    />
  );
  const sectionProps = {
    formData: form.form,
    updateFormData: form.updateForm,
    template: data.template,
    medicationFee: data.medicationFee,
    photoField,
  };

  // What a percentage tip is taken of. A form already on the bill has its
  // add-ons inside `amountDue`; otherwise they join it when the form is sent.
  const billed = form.status === "submitted" || form.status === "approved";
  const chosenAddOns = form.addOnRequests.reduce((sum, request) => {
    const offer = data.offeredAddOns.find(
      (candidate) => candidate.id === request.addOnId,
    );
    return offer
      ? sum + addOnLine(offer, request.quantity ?? 1, stayDays).total
      : sum;
  }, 0);
  const tipBase = data.booking.amountDue + (billed ? 0 : chosenAddOns);

  const renderStep = () => {
    switch (form.step) {
      case "contact":
        return customer ? <ContactInfoSection customer={customer} /> : null;
      case "pet":
        return customerPet ? <PetDetailsSection pet={customerPet} /> : null;
      case "booking":
        return (
          <BookingDetailsSection
            booking={{
              id: data.booking.ref,
              service: data.booking.service,
              startDate: data.booking.startDate,
              endDate: data.booking.endDate,
              checkInTime: data.booking.checkInTime,
              checkOutTime: data.booking.checkOutTime,
            }}
            pet={customerPet ?? { name: pet.name }}
          />
        );
      case "feeding":
        return <FeedingSection {...sectionProps} />;
      case "medications":
        return <MedicationSection {...sectionProps} />;
      case "behavior":
        return <BehaviorSection {...sectionProps} />;
      case "addons":
        return (
          <AddOnsSection
            petName={pet.name}
            offered={data.offeredAddOns}
            requests={form.addOnRequests}
            stayDays={stayDays}
            approval={data.addOnsApproval}
            onChange={form.updateAddOns}
          />
        );
      case "belongings":
        return <BelongingsSection {...sectionProps} />;
      case "questions":
        return (
          <CustomQuestionsSection
            petName={pet.name}
            questions={questions}
            answers={form.customAnswers}
            missing={form.missing}
            onChange={form.setCustomAnswer}
            photoField={photoField}
          />
        );
      case "review":
        return (
          <Card>
            <CardHeader>
              <CardTitle>{fill("reviewTitle", { pet: pet.name })}</CardTitle>
              <CardDescription>{t("reviewIntro")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <MissingAnswers
                missing={form.missing}
                petName={pet.name}
                questions={customQuestionsOf(data.template)}
                steps={steps}
                onGoTo={(target) =>
                  void form.goToStep(steps.indexOf(target), true)
                }
              />
              <AnswersSummary
                formData={form.form}
                questions={questions}
                customAnswers={form.customAnswers}
                show={{
                  feeding: steps.includes("feeding"),
                  medications: steps.includes("medications"),
                  behavior: steps.includes("behavior"),
                }}
              />
              <BillEstimate
                data={data}
                requests={steps.includes("addons") ? form.addOnRequests : []}
                stayDays={stayDays}
                hasMedications={hasMedications}
              />
              <p className="text-ink-secondary text-[13.5px]">
                {t("sendConfirmNote")}
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PetTabs
        pets={data.pets}
        currentRef={pet.ref}
        disabled={form.busy}
        onSelect={(ref) => void form.switchPet(() => onSelectPet(ref))}
      />

      {form.status === "changes_requested" && (
        <Alert>
          <CircleAlert aria-hidden />
          <AlertTitle>{t("changesRequestedTitle")}</AlertTitle>
          {pet.submission?.changesMessage && (
            <AlertDescription className="whitespace-pre-line">
              {pet.submission.changesMessage}
            </AlertDescription>
          )}
        </Alert>
      )}
      {form.status === "submitted" && pet.submission?.submittedAt && (
        <Alert>
          <CircleCheck aria-hidden />
          <AlertDescription>
            {fill("sentBefore", {
              date: formatDateLong(pet.submission.submittedAt, locale),
            })}
          </AlertDescription>
        </Alert>
      )}

      {form.canUseLastStay && index === 0 && (
        <section
          aria-labelledby="yipyy-go-last-stay"
          className="border-line bg-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
        >
          <div className="flex min-w-0 items-start gap-3">
            <RotateCcw
              className="text-ink-secondary mt-0.5 size-5 shrink-0"
              aria-hidden
            />
            <div className="min-w-0">
              <h2
                id="yipyy-go-last-stay"
                className="text-body-ink text-[15px] font-semibold"
              >
                {t("useSameAsLastTime")}
              </h2>
              <p className="text-ink-secondary text-[13.5px]">
                {t("copyFromLastStay")}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={form.applyLastStay}>
            {fill("copyLastAnswers", { pet: pet.name })}
          </Button>
        </section>
      )}

      <FormStepRail
        steps={labelled}
        current={index}
        disabled={form.busy}
        onSelect={(target) => void form.goToStep(target)}
      />

      {renderStep()}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => void form.goToStep(index - 1)}
          disabled={index === 0 || form.busy}
        >
          <ArrowLeft aria-hidden />
          {t("back")}
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {form.draftable && (
            <Button
              variant="ghost"
              onClick={() => void form.saveAndLeave()}
              loading={form.pending === "later"}
              disabled={form.busy}
            >
              {t("saveForLater")}
            </Button>
          )}
          {form.step === "review" ? (
            <Button
              onClick={() => void form.send()}
              loading={form.sending && !form.tipOpen}
              disabled={form.busy}
            >
              <Send aria-hidden />
              {fill(
                form.status === "submitted" ? "sendFormAgain" : "sendForm",
                { pet: pet.name },
              )}
            </Button>
          ) : (
            <Button
              onClick={() => void form.goToStep(index + 1)}
              loading={form.pending === "next"}
              disabled={form.busy}
            >
              {fill("continueTo", { step: nextStep?.label ?? "" })}
              <ArrowRight aria-hidden />
            </Button>
          )}
        </div>
      </div>

      {form.tipPrompt && (
        <TipPromptDialog
          open={form.tipOpen}
          onOpenChange={form.setTipOpen}
          config={form.tipPrompt}
          base={tipBase}
          petName={pet.name}
          initial={pet.submission?.tipChoice ?? null}
          sending={form.sending}
          onSend={(tip) => void form.send(tip)}
        />
      )}
    </div>
  );
}
