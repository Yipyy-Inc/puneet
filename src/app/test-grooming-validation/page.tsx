"use client";

import { useGroomingValidation } from "@/hooks/use-grooming-validation";
import { useHydrated } from "@/hooks/use-hydrated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Calendar,
  CreditCard,
  Users,
  Package,
} from "lucide-react";

export default function TestGroomingValidationPage() {
  const isMounted = useHydrated();
  const {
    isAvailable,
    availableCategories,
    groomerSelectionMode,
    canSelectGroomer,
    depositRequired,
    depositMessage,
    validation,
    nextAvailableSlot,
  } = useGroomingValidation();

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">
            Test: Grooming Pre-Booking Validation
          </h1>
          <p className="text-muted-foreground">
            Phase 1: Validation invisible au client (avant affichage des
            options)
          </p>
        </div>

        {/* Availability Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isAvailable ? (
                <CheckCircle2 className="size-5 text-green-500" />
              ) : (
                <XCircle className="size-5 text-red-500" />
              )}
              Statut de Disponibilité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={isAvailable ? "default" : "destructive"}
              className="px-4 py-2 text-lg"
            >
              {isAvailable ? "Service Disponible" : "Service Non Disponible"}
            </Badge>
            {!isAvailable && validation.validationErrors.length > 0 && (
              <div className="bg-destructive/10 mt-4 rounded-lg p-4">
                <p className="text-destructive mb-2 font-semibold">Erreurs:</p>
                <ul className="list-inside list-disc space-y-1">
                  {validation.validationErrors.map((error, i) => (
                    <li key={i} className="text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {isAvailable && (
          <>
            {/* Earliest Available Date */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="size-5" />
                  Date Disponible la Plus Proche
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isMounted ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : nextAvailableSlot ? (
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">
                      {nextAvailableSlot.toLocaleDateString("fr-FR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-muted-foreground">
                      {nextAvailableSlot.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Aucun créneau disponible
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Available Service Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="size-5" />
                  Catégories de Services Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableCategories.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {availableCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="bg-card flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{cat.name}</p>
                          {cat.hiddenWhenFullyBooked && (
                            <p className="text-muted-foreground text-xs">
                              Masqué si complètement réservé
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary">Activé</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Aucune catégorie disponible
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Groomer Selection Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5" />
                  Mode de Sélection du Toilettage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="font-medium">Mode:</span>
                  <Badge variant="outline" className="px-3 py-1 text-base">
                    {groomerSelectionMode === "stealth" &&
                      "Furtif (Système assigne)"}
                    {groomerSelectionMode === "optional" && "Optionnel"}
                    {groomerSelectionMode === "tier-only" &&
                      "Niveau uniquement"}
                    {groomerSelectionMode === "full-choice" && "Choix complet"}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-muted/50 rounded-lg border p-3">
                    <p className="mb-1 text-sm font-medium">
                      Sélection de Toilettage
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {canSelectGroomer ? "✓ Permis" : "✗ Non permis"}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg border p-3">
                    <p className="mb-1 text-sm font-medium">
                      Afficher les Noms
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {validation.groomerSelectionOptions.showGroomerNames
                        ? "✓ Oui"
                        : "✗ Non"}
                    </p>
                  </div>
                </div>

                {validation.groomerSelectionOptions.tiers &&
                  validation.groomerSelectionOptions.tiers.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 font-medium">Niveaux Disponibles:</p>
                      <div className="flex flex-wrap gap-2">
                        {validation.groomerSelectionOptions.tiers.map(
                          (tier) => (
                            <Badge key={tier.id} variant="secondary">
                              {tier.name}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Deposit Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="size-5" />
                  Informations sur l&apos;Acompte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="font-medium">Acompte Requis:</span>
                  <Badge variant={depositRequired ? "default" : "secondary"}>
                    {depositRequired ? "Oui" : "Non"}
                  </Badge>
                </div>

                {depositRequired && (
                  <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
                    <div>
                      <p className="mb-1 text-sm font-medium">Type:</p>
                      <Badge variant="outline">
                        {validation.depositInfo.type === "fixed" &&
                          "Montant Fixe"}
                        {validation.depositInfo.type === "percentage" &&
                          "Pourcentage"}
                        {validation.depositInfo.type === "none" && "Aucun"}
                      </Badge>
                    </div>

                    {validation.depositInfo.amount && (
                      <div>
                        <p className="mb-1 text-sm font-medium">Montant:</p>
                        <p className="text-lg font-bold">
                          ${validation.depositInfo.amount.toFixed(2)}
                        </p>
                      </div>
                    )}

                    {validation.depositInfo.percentage && (
                      <div>
                        <p className="mb-1 text-sm font-medium">Pourcentage:</p>
                        <p className="text-lg font-bold">
                          {validation.depositInfo.percentage}%
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="mb-1 text-sm font-medium">
                        Message Client:
                      </p>
                      <p className="text-muted-foreground text-sm italic">
                        {depositMessage || "Aucun message"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Full Validation Object (for debugging) */}
            <Card>
              <CardHeader>
                <CardTitle>Objet de Validation Complet (Debug)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted max-h-96 overflow-auto rounded-lg p-4 text-xs">
                  {JSON.stringify(validation, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
