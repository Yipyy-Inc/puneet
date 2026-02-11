"use client";

import { useGroomingValidation } from "@/hooks/use-grooming-validation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Calendar, CreditCard, Users, Package } from "lucide-react";

export default function TestGroomingValidationPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Test: Grooming Pre-Booking Validation</h1>
          <p className="text-muted-foreground">
            Phase 1: Validation invisible au client (avant affichage des options)
          </p>
        </div>

        {/* Availability Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isAvailable ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Statut de Disponibilité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={isAvailable ? "default" : "destructive"} className="text-lg px-4 py-2">
              {isAvailable ? "Service Disponible" : "Service Non Disponible"}
            </Badge>
            {!isAvailable && validation.validationErrors.length > 0 && (
              <div className="mt-4 p-4 bg-destructive/10 rounded-lg">
                <p className="font-semibold text-destructive mb-2">Erreurs:</p>
                <ul className="list-disc list-inside space-y-1">
                  {validation.validationErrors.map((error, i) => (
                    <li key={i} className="text-sm">{error}</li>
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
                  <Calendar className="h-5 w-5" />
                  Date Disponible la Plus Proche
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextAvailableSlot ? (
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
                  <p className="text-muted-foreground">Aucun créneau disponible</p>
                )}
              </CardContent>
            </Card>

            {/* Available Service Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Catégories de Services Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableCategories.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {availableCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div>
                          <p className="font-medium">{cat.name}</p>
                          {cat.hiddenWhenFullyBooked && (
                            <p className="text-xs text-muted-foreground">
                              Masqué si complètement réservé
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary">Activé</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Aucune catégorie disponible</p>
                )}
              </CardContent>
            </Card>

            {/* Groomer Selection Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Mode de Sélection du Toilettage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="font-medium">Mode:</span>
                  <Badge variant="outline" className="text-base px-3 py-1">
                    {groomerSelectionMode === "stealth" && "Furtif (Système assigne)"}
                    {groomerSelectionMode === "optional" && "Optionnel"}
                    {groomerSelectionMode === "tier-only" && "Niveau uniquement"}
                    {groomerSelectionMode === "full-choice" && "Choix complet"}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-sm font-medium mb-1">Sélection de Toilettage</p>
                    <p className="text-sm text-muted-foreground">
                      {canSelectGroomer ? "✓ Permis" : "✗ Non permis"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-sm font-medium mb-1">Afficher les Noms</p>
                    <p className="text-sm text-muted-foreground">
                      {validation.groomerSelectionOptions.showGroomerNames
                        ? "✓ Oui"
                        : "✗ Non"}
                    </p>
                  </div>
                </div>

                {validation.groomerSelectionOptions.tiers &&
                  validation.groomerSelectionOptions.tiers.length > 0 && (
                    <div className="mt-4">
                      <p className="font-medium mb-2">Niveaux Disponibles:</p>
                      <div className="flex flex-wrap gap-2">
                        {validation.groomerSelectionOptions.tiers.map((tier) => (
                          <Badge key={tier.id} variant="secondary">
                            {tier.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Deposit Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Informations sur l'Acompte
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
                  <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
                    <div>
                      <p className="text-sm font-medium mb-1">Type:</p>
                      <Badge variant="outline">
                        {validation.depositInfo.type === "fixed" && "Montant Fixe"}
                        {validation.depositInfo.type === "percentage" && "Pourcentage"}
                        {validation.depositInfo.type === "none" && "Aucun"}
                      </Badge>
                    </div>

                    {validation.depositInfo.amount && (
                      <div>
                        <p className="text-sm font-medium mb-1">Montant:</p>
                        <p className="text-lg font-bold">${validation.depositInfo.amount.toFixed(2)}</p>
                      </div>
                    )}

                    {validation.depositInfo.percentage && (
                      <div>
                        <p className="text-sm font-medium mb-1">Pourcentage:</p>
                        <p className="text-lg font-bold">{validation.depositInfo.percentage}%</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium mb-1">Message Client:</p>
                      <p className="text-sm text-muted-foreground italic">
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
                <pre className="p-4 rounded-lg bg-muted text-xs overflow-auto max-h-96">
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
