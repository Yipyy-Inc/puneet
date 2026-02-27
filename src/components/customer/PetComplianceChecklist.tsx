"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { vaccinationRecords } from "@/data/pet-data";
import { clientDocuments } from "@/data/documents";
import { invoices } from "@/data/payments";
import { facilityConfig } from "@/data/facility-config";
import type { Pet } from "@/lib/types";

interface PetComplianceChecklistProps {
  pet: Pet;
  clientId: number;
  facilityId: number;
  compact?: boolean; // For use in pet cards vs detail page
}

export function PetComplianceChecklist({
  pet,
  clientId,
  facilityId,
  compact = false,
}: PetComplianceChecklistProps) {
  // Check vaccination compliance
  const vaccinationStatus = useMemo(() => {
    const petVaccinations = vaccinationRecords.filter((v) => v.petId === pet.id);
    const requiredVaccines = facilityConfig.vaccinationRequirements.requiredVaccinations.filter(
      (v) => v.required
    );

    let allValid = true;
    const missing: string[] = [];
    const expired: string[] = [];
    const expiringSoon: string[] = [];

    requiredVaccines.forEach((req) => {
      const vaccination = petVaccinations.find(
        (v) =>
          v.vaccineName.toLowerCase().includes(req.name.toLowerCase()) ||
          req.name.toLowerCase().includes(v.vaccineName.toLowerCase())
      );

      if (!vaccination) {
        allValid = false;
        missing.push(req.name);
      } else {
        const expiryDate = new Date(vaccination.expiryDate);
        const now = new Date();
        const daysUntilExpiry = Math.floor(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry < 0) {
          allValid = false;
          expired.push(req.name);
        } else if (daysUntilExpiry <= 30) {
          expiringSoon.push(req.name);
        }
      }
    });

    return {
      valid: allValid && missing.length === 0 && expired.length === 0,
      missing,
      expired,
      expiringSoon,
    };
  }, [pet.id]);

  // Check signed agreements
  const agreementsStatus = useMemo(() => {
    const requiredAgreements = [
      facilityConfig.waiversAndContracts.templates.liabilityWaiver,
      facilityConfig.waiversAndContracts.templates.daycareAgreement,
      facilityConfig.waiversAndContracts.templates.boardingContract,
    ].filter((a) => a.required);

    const clientDocs = clientDocuments.filter(
      (doc) => doc.clientId === clientId && doc.facilityId === facilityId
    );

    const signedAgreements = clientDocs.filter(
      (doc) =>
        (doc.type === "agreement" || doc.type === "waiver") &&
        doc.signedAt &&
        requiredAgreements.some((req) =>
          doc.name.toLowerCase().includes(req.name.toLowerCase())
        )
    );

    return {
      valid: signedAgreements.length >= requiredAgreements.length,
      count: signedAgreements.length,
      required: requiredAgreements.length,
    };
  }, [clientId, facilityId]);

  // Check evaluation (if required by facility)
  const evaluationStatus = useMemo(() => {
    // Check if pet has valid evaluation
    const hasValidEvaluation = pet.evaluations?.some(
      (e) => e.status === "passed" && e.isExpired !== true
    );

    // For now, we'll assume evaluation is required for daycare/boarding
    // In a real app, this would come from facility config
    const evaluationRequired = true; // TODO: Get from facility config

    return {
      valid: !evaluationRequired || hasValidEvaluation,
      required: evaluationRequired,
      hasEvaluation: !!hasValidEvaluation,
    };
  }, [pet.evaluations]);

  // Check overdue invoices
  const invoicesStatus = useMemo(() => {
    const clientInvoices = invoices.filter(
      (inv) => inv.clientId === clientId && inv.facilityId === facilityId
    );

    const overdueInvoices = clientInvoices.filter((inv) => inv.status === "overdue");

    return {
      valid: overdueInvoices.length === 0,
      count: overdueInvoices.length,
    };
  }, [clientId, facilityId]);

  const allCompliant =
    vaccinationStatus.valid &&
    agreementsStatus.valid &&
    evaluationStatus.valid &&
    invoicesStatus.valid;

  if (compact) {
    // Compact version for pet cards
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant={vaccinationStatus.valid ? "default" : "destructive"}
          className="text-xs"
        >
          {vaccinationStatus.valid ? (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          ) : (
            <XCircle className="h-3 w-3 mr-1" />
          )}
          Vaccines
        </Badge>
        <Badge
          variant={agreementsStatus.valid ? "default" : "destructive"}
          className="text-xs"
        >
          {agreementsStatus.valid ? (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          ) : (
            <XCircle className="h-3 w-3 mr-1" />
          )}
          Agreements
        </Badge>
        {evaluationStatus.required && (
          <Badge
            variant={evaluationStatus.valid ? "default" : "destructive"}
            className="text-xs"
          >
            {evaluationStatus.valid ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            Evaluation
          </Badge>
        )}
        <Badge
          variant={invoicesStatus.valid ? "default" : "destructive"}
          className="text-xs"
        >
          {invoicesStatus.valid ? (
            <CheckCircle2 className="h-3 w-3 mr-1" />
          ) : (
            <XCircle className="h-3 w-3 mr-1" />
          )}
          Invoices
        </Badge>
      </div>
    );
  }

  // Full version for detail page
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Compliance Checklist</h3>
        <Badge variant={allCompliant ? "default" : "destructive"}>
          {allCompliant ? "Eligible to Book" : "Action Required"}
        </Badge>
      </div>

      <div className="space-y-2">
        {/* Vaccines */}
        <div className="flex items-center justify-between p-2 rounded-lg border bg-card">
          <div className="flex items-center gap-2">
            {vaccinationStatus.valid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm font-medium">Vaccines Valid</span>
          </div>
          {!vaccinationStatus.valid && (
            <div className="text-xs text-muted-foreground">
              {vaccinationStatus.expired.length > 0 && (
                <span className="text-destructive">
                  {vaccinationStatus.expired.length} expired
                </span>
              )}
              {vaccinationStatus.missing.length > 0 && (
                <span className="text-destructive ml-2">
                  {vaccinationStatus.missing.length} missing
                </span>
              )}
            </div>
          )}
        </div>

        {/* Signed Agreements */}
        <div className="flex items-center justify-between p-2 rounded-lg border bg-card">
          <div className="flex items-center gap-2">
            {agreementsStatus.valid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm font-medium">Signed Agreements</span>
          </div>
          {!agreementsStatus.valid && (
            <div className="text-xs text-muted-foreground">
              {agreementsStatus.count}/{agreementsStatus.required} signed
            </div>
          )}
        </div>

        {/* Evaluation */}
        {evaluationStatus.required && (
          <div className="flex items-center justify-between p-2 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              {evaluationStatus.valid ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm font-medium">Evaluation Completed</span>
            </div>
            {!evaluationStatus.valid && (
              <div className="text-xs text-muted-foreground">Required</div>
            )}
          </div>
        )}

        {/* No Overdue Invoice */}
        <div className="flex items-center justify-between p-2 rounded-lg border bg-card">
          <div className="flex items-center gap-2">
            {invoicesStatus.valid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm font-medium">No Overdue Invoice</span>
          </div>
          {!invoicesStatus.valid && (
            <div className="text-xs text-destructive">
              {invoicesStatus.count} overdue
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
